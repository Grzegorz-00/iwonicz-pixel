#!/usr/bin/env python3
"""Refresh the city's OSM snapshot via the official API; curl honors proxy and CA trust."""
import argparse
import datetime
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET

API = 'https://api.openstreetmap.org/api/0.6/'
CITY_ID = 3015693
ROOT = Path(__file__).resolve().parent.parent
FEATURE_KEYS = {'building', 'highway', 'landuse', 'natural', 'leisure', 'waterway', 'water', 'amenity', 'tourism', 'historic'}

def tags(element):
    return {tag.get('k'): tag.get('v') for tag in element.findall('tag')}

def fetch(resource, cache):
    url = API + resource
    target = cache / (hashlib.sha256(url.encode()).hexdigest() + '.osm')
    if not target.exists() or time.time() - target.stat().st_mtime > 86400:
        print('Downloading', url, flush=True)
        temporary = target.with_suffix('.tmp')
        try:
            subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '90',
                            '--retry', '2', '--retry-delay', '3', '-A', 'IwoniczPixel/1.0 OSM importer',
                            url, '-o', str(temporary)], check=True)
            tree = ET.parse(temporary)
            if tree.getroot().tag != 'osm':
                raise ValueError('Response is not OSM XML')
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
    return ET.parse(target).getroot()

def convert(elements, boundary):
    nodes = {id: e for (kind, id), e in elements.items() if kind == 'node'}
    def geometry(way):
        refs = [nd.get('ref') for nd in way.findall('nd')]
        if any(ref not in nodes for ref in refs):
            raise ValueError('Incomplete geometry for way ' + way.get('id'))
        return [{'lat': float(nodes[ref].get('lat')), 'lon': float(nodes[ref].get('lon'))} for ref in refs]
    def common(element):
        return {'type': element.tag, 'id': int(element.get('id')), 'tags': tags(element)}
    def relation(element):
        result = common(element)
        result['members'] = []
        for member in element.findall('member'):
            if member.get('type') != 'way':
                continue
            way = elements.get(('way', member.get('ref')))
            if way is None:
                raise ValueError('Incomplete relation ' + element.get('id'))
            result['members'].append({'type': 'way', 'ref': int(member.get('ref')), 'role': member.get('role'), 'geometry': geometry(way)})
        return result
    result = []
    for element in elements.values():
        t = tags(element)
        if not FEATURE_KEYS.intersection(t):
            continue
        if element.tag == 'way':
            result.append({**common(element), 'geometry': geometry(element)})
        elif element.tag == 'node':
            result.append({**common(element), 'lat': float(element.get('lat')), 'lon': float(element.get('lon'))})
        elif t.get('type') == 'multipolygon':
            result.append(relation(element))
    if not any(e['tags'].get('building') for e in result) or not any(e['tags'].get('highway') for e in result):
        raise ValueError('Extract is missing buildings or roads')
    return {'source': 'OpenStreetMap', 'license': 'ODbL-1.0', 'attribution': '© OpenStreetMap contributors',
            'copyright': 'https://www.openstreetmap.org/copyright', 'api': API,
            'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'boundary': relation(boundary), 'elements': result}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', type=Path, default=Path(tempfile.gettempdir()) / 'iwonicz-osm-cache')
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    elements = {}
    def merge(tree):
        for e in tree:
            if e.tag in {'node', 'way', 'relation'}:
                elements[(e.tag, e.get('id'))] = e
    full = fetch(f'relation/{CITY_ID}/full', args.cache)
    merge(full)
    boundary = elements[('relation', str(CITY_ID))]
    if tags(boundary).get('name') != 'Iwonicz-Zdrój' or tags(boundary).get('admin_level') != '8':
        raise ValueError('Unexpected municipal boundary identity')
    points = [(float(n.get('lon')), float(n.get('lat'))) for n in full.findall('node')]
    west, south = min(p[0] for p in points), min(p[1] for p in points)
    east, north = max(p[0] for p in points), max(p[1] for p in points)
    # Small bounded requests avoid the OSM API node limit. The complete bbox covers every part of the city.
    nx, ny = math.ceil((east-west)/.012), math.ceil((north-south)/.012)
    for row in range(ny):
        for col in range(nx):
            bbox = [west+(east-west)*col/nx, south+(north-south)*row/ny,
                    west+(east-west)*(col+1)/nx, south+(north-south)*(row+1)/ny]
            merge(fetch('map?bbox=' + ','.join(f'{v:.7f}' for v in bbox), args.cache))
    # Map API relations can reference members outside the downloaded bbox.
    for e in list(elements.values()):
        t = tags(e)
        if e.tag == 'relation' and t.get('type') == 'multipolygon' and FEATURE_KEYS.intersection(t):
            merge(fetch(f'relation/{e.get("id")}/full', args.cache))
    snapshot = convert(elements, boundary)
    snapshot['bbox'] = [west, south, east, north]
    snapshot['coverage'] = 'Complete municipal bounding box; renderer clips layers to city boundary.'
    destination = ROOT / 'data' / 'iwonicz-osm.json'
    destination.parent.mkdir(exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temporary.replace(destination)
    print(f'Saved {len(snapshot["elements"])} features to {destination}', flush=True)

if __name__ == '__main__':
    main()
