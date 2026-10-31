import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('importer rejects missing geometries and retains license and source without editor metadata',()=>{
const result=execFileSync('python3',['-c',`
import importlib.util, xml.etree.ElementTree as E
s=importlib.util.spec_from_file_location('osm','scripts/import-osm.py'); m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
x=E.fromstring('''<osm><node id="1" lat="49.55" lon="21.77" user="editor" uid="1"/><node id="2" lat="49.56" lon="21.78"/><node id="3" lat="49.57" lon="21.79"/><way id="4"><nd ref="1"/><nd ref="2"/><nd ref="3"/><nd ref="1"/><tag k="building" v="yes"/></way><way id="5"><nd ref="1"/><nd ref="2"/><tag k="highway" v="residential"/></way><relation id="3015693"><member type="way" ref="4" role="outer"/><tag k="name" v="Iwonicz-Zdrój"/></relation></osm>''')
elements={(e.tag,e.get('id')):e for e in x};boundary=elements[('relation','3015693')];data=m.convert(elements,boundary)
assert data['license']=='ODbL-1.0' and data['source']=='OpenStreetMap'
assert data['boundary']['members'][0]['geometry'][0]=={'lat':49.55,'lon':21.77}
assert all('user' not in e and 'uid' not in e for e in data['elements'])
del elements[('node','2')]
try: m.convert(elements,boundary)
except ValueError: pass
else: raise AssertionError('Incomplete geometry accepted')
print('OK')
`],{cwd:new URL('../',import.meta.url),encoding:'utf8'});assert.equal(result.trim(),'OK');});
