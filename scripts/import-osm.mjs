import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const result=spawnSync('python3',[fileURLToPath(new URL('./import-osm.py',import.meta.url)),...process.argv.slice(2)],{stdio:'inherit'});
if(result.error)console.error(result.error.message);
process.exitCode=result.status??1;
