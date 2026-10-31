/** Local equirectangular projection: equal x/y scale around Iwonicz (49.56° N). */
export function makeProjection(bbox, width=2400, padding=100) {
 const [west,south,east,north]=bbox;
 const longitudeScale=Math.cos((south+north)/2*Math.PI/180);
 const scale=(width-2*padding)/((east-west)*longitudeScale);
 const height=Math.ceil((north-south)*scale+2*padding);
 return {width,height,padding,metresPerUnit:111320/scale,
  project:({lat,lon})=>({x:padding+(lon-west)*longitudeScale*scale,y:padding+(north-lat)*scale}),
  unproject:({x,y})=>({lon:west+(x-padding)/(longitudeScale*scale),lat:north-(y-padding)/scale})};
}
const equal=(a,b)=>Math.abs(a.lat-b.lat)<1e-8&&Math.abs(a.lon-b.lon)<1e-8;
export function joinRings(parts) {
 const remaining=parts.filter(p=>p?.length>1).map(p=>p.slice());const rings=[];
 while(remaining.length){const ring=remaining.shift();while(!equal(ring[0],ring.at(-1))){const end=ring.at(-1);const index=remaining.findIndex(p=>equal(p[0],end)||equal(p.at(-1),end));if(index<0)throw new Error('Niekompletny obrys OSM');const next=remaining.splice(index,1)[0];if(!equal(next[0],end))next.reverse();ring.push(...next.slice(1));}rings.push(ring);}return rings;
}
export function polygonRings(element) {
 if(element.type==='way'&&element.geometry?.length>3&&equal(element.geometry[0],element.geometry.at(-1)))return [element.geometry];
 if(element.type!=='relation')return [];
 return ['outer','inner'].flatMap(role=>joinRings(element.members.filter(m=>(m.role||'outer')===role&&m.geometry).map(m=>m.geometry)));
}
export function contains(point,rings){let inside=false;for(const ring of rings){for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}}return inside;}
export function featureCenter(element,project){if(element.type==='node')return project(element);const geometry=element.geometry||element.members?.flatMap(m=>m.geometry||[])||[];if(!geometry.length)return null;const p=geometry.map(project);return {x:(Math.min(...p.map(p=>p.x))+Math.max(...p.map(p=>p.x)))/2,y:(Math.min(...p.map(p=>p.y))+Math.max(...p.map(p=>p.y)))/2};}
