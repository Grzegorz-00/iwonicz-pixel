#!/usr/bin/env python3
"""Sample roof colors from an explicitly dated EPSG:2180 GeoTIFF (Pillow, numpy, pyproj).
Outputs observations, not corrections to OSM footprints or building heights.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import hashlib
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent

def sample(image, coordinates, margin=2, min_pixels=40):
    xs, ys = zip(*coordinates)
    left, top, right, bottom = int(min(xs)), int(min(ys)), int(max(xs))+1, int(max(ys))+1
    if left < 0 or top < 0 or right > image.width or bottom > image.height or right-left < 5 or bottom-top < 5:
        return None
    crop = image.crop((left, top, right, bottom)).convert('RGB')
    mask = Image.new('L', crop.size)
    ImageDraw.Draw(mask).polygon([(x-left,y-top) for x,y in coordinates], fill=255)
    if margin:
        mask = mask.filter(ImageFilter.MinFilter(margin*2+1))
    rgb = np.asarray(crop)[np.asarray(mask)>0]
    if len(rgb) < min_pixels:
        return None
    light = rgb.mean(axis=1)
    rgb = rgb[(light > 38) & (light < 240)]
    if len(rgb) < min_pixels:
        return None
    # Trim deep shadows and bright outliers. Preserve green metal roofs as well as red/gray roofs.
    light = rgb.mean(axis=1)
    rgb = rgb[(light >= np.percentile(light, 25)) & (light <= np.percentile(light, 90))]
    if len(rgb) < min_pixels:
        return None
    median = np.median(rgb,axis=0)
    spread = float(np.median(np.abs(rgb.astype(float)-median)))
    if spread > 35:
        return None
    return {'color':'#'+''.join(f'{int(c):02x}' for c in median), 'samples':len(rgb),'spread':round(spread,1)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('image',type=Path)
    parser.add_argument('--source-url',required=True)
    parser.add_argument('--date',required=True)
    args = parser.parse_args()
    # Expected source is about 90 million pixels. Bound allocation while allowing this documented sheet.
    Image.MAX_IMAGE_PIXELS = 110_000_000
    with Image.open(args.image) as image:
        scale = image.tag_v2.get(33550)
        tie = image.tag_v2.get(33922)
        keys = image.tag_v2.get(34735)
        if not scale or not tie or not keys or 2180 not in keys or image.width*image.height>110_000_000:
            raise ValueError('Expected a bounded north-up EPSG:2180 GeoTIFF')
        image.load()
        transform = Transformer.from_crs(4326,2180,always_xy=True)
        def pixel(p):
            x,y=transform.transform(p['lon'],p['lat'])
            return ((x-tie[3])/scale[0]+tie[0],(tie[4]-y)/scale[1]+tie[1])
        osm = json.loads((ROOT/'data/iwonicz-osm.json').read_text())
        observations = {}
        for feature in osm['elements']:
            if feature['type']!='way' or not feature.get('geometry') or not feature['tags'].get('building'):
                continue
            points=feature['geometry']
            if len(points)<4 or points[0]!=points[-1]:
                continue
            result=sample(image,[pixel(p) for p in points])
            if result:
                observations['way/'+str(feature['id'])]=result
        if not observations:
            raise ValueError('No valid building observations')
        out={'source':'GUGiK / PZGiK — ortofotomapa RGB','sourceUrl':args.source_url,'imageryDate':args.date,
             'pixelSizeMetres':scale[0],'sheet':'M-34-92-B-c-1-4','processedAt':datetime.now(timezone.utc).isoformat(),
             'sha256':hashlib.sha256(args.image.read_bytes()).hexdigest(),
             'method':'Median RGB inside OSM building footprints, eroded 0.5 m; omit deep shadows and outliers. Approximate roof appearance, not material identification.',
             'limitations':'One sheet only. No inferred heights, facade colors or footprint corrections. Trees, shadows and OSM misalignment can affect samples.',
             'buildings':observations}
        destination=ROOT/'data/ortho-observations.json'
        destination.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
        print(f'Sampled {len(observations)} building footprints into {destination}')
        # A small reference image is kept outside the project, not shipped to visitors.
        center=[pixel({'lon':lon,'lat':lat}) for lon,lat in [(21.7865,49.5605),(21.7925,49.5605),(21.7925,49.563),(21.7865,49.563)]]
        xs,ys=zip(*center)
        crop=image.crop((max(0,int(min(xs))),max(0,int(min(ys))),min(image.width,int(max(xs))),min(image.height,int(max(ys)))))
        crop.thumbnail((1600,1600))
        crop.save('/tmp/iwonicz-spa-2024.jpg',quality=92)

if __name__=='__main__':
    main()
