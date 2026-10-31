import {buildingProfile,gabledRoof} from './building-model.js';
import {roofAppearance,shade} from './appearance.js';
import {makeIsometricProjection,polygonRings,featureCenter,contains} from './geography.js';
export const RASTER_DENSITY=2;
export function createOSMMap(data,observations={}){
 const projection=makeIsometricProjection(data.bbox);const {width,height,project}=projection;
 const boundaryRings=polygonRings(data.boundary).map(r=>r.map(project));
 const makePath=rings=>{const p=new Path2D();for(const ring of rings){ring.forEach((v,i)=>i?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));p.closePath();}return p;};
 const boundary=makePath(boundaryRings);
 const features=data.elements.map(e=>{const rings=polygonRings(e).map(r=>r.map(project));return {...e,rings,path:rings.length?makePath(rings):null,points:e.geometry?.map(project),center:featureCenter(e,project)};});
 const canvas=document.createElement('canvas');canvas.width=width*RASTER_DENSITY;canvas.height=height*RASTER_DENSITY;const c=canvas.getContext('2d');c.scale(RASTER_DENSITY,RASTER_DENSITY);c.imageSmoothingEnabled=false;
 c.fillStyle='#42612c';c.fillRect(0,0,width,height);c.fillStyle='#76a447';c.fill(boundary,'evenodd');c.save();c.clip(boundary,'evenodd');
 const areaColor=t=>t.natural==='water'||t.water?'#548fb0':t.landuse==='forest'||t.natural==='wood'?'#5b883c':t.landuse==='residential'?'#83a54f':t.landuse==='cemetery'?'#719153':t.leisure==='park'||t.leisure==='garden'?'#81ae50':t.landuse==='meadow'||t.landuse==='grass'||t.natural==='grassland'?'#91b65c':t.landuse==='farmland'?'#b2ae63':t.leisure==='pitch'?'#6e9d4f':t.natural==='scrub'?'#739c49':null;
 // Landcover first, then decorative trees only inside woodland polygons. All features are clipped to city limits.
 const areas=features.filter(f=>f.path&&!f.tags.building&&areaColor(f.tags));
 for(const f of areas){c.fillStyle=areaColor(f.tags);c.fill(f.path,'evenodd');}
 let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const forest=new Path2D();areas.filter(f=>f.tags.landuse==='forest'||f.tags.natural==='wood').forEach(f=>forest.addPath(f.path));
 // Repeated grass pixels and diamond parcel lines recall a classic isometric simulation.
 for(let i=0;i<55000;i++){const x=Math.floor(random()*width),y=Math.floor(random()*height);c.fillStyle=i%3?'#638d3930':'#b2c76840';c.fillRect(x,y,2,1);}
 c.strokeStyle='#466c3022';c.lineWidth=1;for(let n=-height;n<width;n+=40){c.beginPath();c.moveTo(n,0);c.lineTo(n+height*2,height);c.stroke();c.beginPath();c.moveTo(n,0);c.lineTo(n-height*2,height);c.stroke();}
 for(let i=0;i<14500;i++){const x=Math.round(random()*width),y=Math.round(random()*height);if(!c.isPointInPath(forest,x*RASTER_DENSITY,y*RASTER_DENSITY,'evenodd'))continue;const size=5+Math.floor(random()*5);c.fillStyle='#304d2d55';c.fillRect(x-2,y+1,10,3);c.fillStyle='#70573c';c.fillRect(x,y-3,2,6);c.fillStyle=i%3?'#2c6334':'#3d7337';c.fillRect(x-size/2,y-size,size,size-1);c.fillRect(x-size/2+2,y-size-4,size-4,6);c.fillRect(x-1,y-size-7,2,4);c.fillStyle='#649345';c.fillRect(x-size/2,y-size,2,size-4);c.fillRect(x-size/2+2,y-size-4,2,5);}
 const stroke=(f,color,lineWidth,dash=[])=>{if(!f.points?.length)return;c.beginPath();f.points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.strokeStyle=color;c.lineWidth=lineWidth;c.lineJoin='round';c.lineCap='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);};
 features.filter(f=>f.tags.waterway).forEach(f=>stroke(f,'#468ba6',f.tags.waterway==='river'?6:3));
 // Ground surfaces retain their OSM outlines; no new geometry is inferred from photos.
 for(const f of features.filter(f=>f.path&&(f.tags.amenity==='parking'||f.tags.highway==='pedestrian'&&f.tags.area==='yes'))){c.fillStyle=f.tags.amenity==='parking'?'#92958b':'#d1c9aa';c.fill(f.path,'evenodd');c.strokeStyle='#b9b49c';c.lineWidth=1;c.stroke(f.path);}
 for(const f of features.filter(f=>f.tags.amenity==='fountain'&&f.center)){c.fillStyle='#cbc6ac';c.fillRect(f.center.x-5,f.center.y-3,10,6);c.fillStyle='#66a6b6';c.fillRect(f.center.x-3,f.center.y-2,6,4);}
 const roads=features.filter(f=>f.tags.highway&&f.points&&f.tags.area!=='yes');
 const widths={primary:12,secondary:11,tertiary:10,residential:8,unclassified:8,living_street:7,service:5,pedestrian:7,track:3,footway:2,path:2,steps:2,cycleway:3};
 for(const f of roads)stroke(f,'#c0b89b',(widths[f.tags.highway]||3)+6);
 for(const f of roads)stroke(f,['path','track','footway','steps'].includes(f.tags.highway)?'#bca579':'#636d68',widths[f.tags.highway]||3,f.tags.highway==='path'?[3,2]:[]);
 for(const f of roads.filter(f=>['primary','secondary','tertiary','residential','unclassified'].includes(f.tags.highway)))stroke(f,'#ded7ae',.8,[4,6]);
 // Pre-render individual buildings so moving actors can be sorted behind their walls.
 const buildings=[];
 for(const f of features.filter(f=>f.tags.building&&f.path&&f.center&&contains(f.center,boundaryRings)).sort((a,b)=>a.center.y-b.center.y)){
  const roof=roofAppearance(f,observations);const baseRing=f.rings[0].map(projection.fromIso);const profile=buildingProfile(f,baseRing);const gable=profile.house?gabledRoof(baseRing):null;const all=f.rings.flat();const floors=profile.floors;const elevation=floors*4+3;const roofRise=gable?.rise||0;
  const left=Math.floor(Math.min(...all.map(p=>p.x)))-8,right=Math.ceil(Math.max(...all.map(p=>p.x)))+9;
  const top=Math.floor(Math.min(...all.map(p=>p.y)))-elevation-roofRise-8,bottom=Math.ceil(Math.max(...all.map(p=>p.y)))+8;
  const sprite=document.createElement('canvas');sprite.width=(right-left)*RASTER_DENSITY;sprite.height=(bottom-top)*RASTER_DENSITY;const b=sprite.getContext('2d');b.scale(RASTER_DENSITY,RASTER_DENSITY);b.translate(-left,-top);
  b.fillStyle='#263a2c55';b.save();b.translate(5,4);b.fill(f.path,'evenodd');b.restore();
  const wallRings=gable?[gable.wallRing.map(p=>({...projection.toIso(p),lift:gable.height(p)}))]:f.rings;
  for(const ring of wallRings){const winding=Math.sign(ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p.x*q.y-q.x*p.y;},0))||1;for(let i=1;i<ring.length;i++){const a=ring[i-1],z=ring[i];if((z.x-a.x)*winding>=0)continue;b.fillStyle=z.y>a.y?'#b99263':'#dfc795';b.beginPath();b.moveTo(a.x,a.y);b.lineTo(z.x,z.y);b.lineTo(z.x,z.y-elevation-(z.lift||0));b.lineTo(a.x,a.y-elevation-(a.lift||0));b.closePath();b.fill();b.strokeStyle='#665a42';b.lineWidth=.6;b.stroke();
   const length=Math.hypot(z.x-a.x,z.y-a.y);for(let row=0;row<floors;row++)for(let k=5;k<length-3;k+=6){const t=k/length;b.fillStyle='#385959';b.fillRect(Math.round(a.x+(z.x-a.x)*t),Math.round(a.y+(z.y-a.y)*t-3-row*4),2,2);}}
  }
  if(gable){
   const faces=gable.faces.map((face,index)=>({index,points:face.map(p=>{const q=projection.toIso(p);return {x:q.x,y:q.y-elevation-gable.height(p)};})})).sort((a,z)=>a.points.reduce((s,p)=>s+p.y,0)/a.points.length-z.points.reduce((s,p)=>s+p.y,0)/z.points.length);
   for(const face of faces){b.beginPath();face.points.forEach((p,i)=>i?b.lineTo(p.x,p.y):b.moveTo(p.x,p.y));b.closePath();b.fillStyle=shade(roof.color,face.index===0?15:-22);b.fill();b.strokeStyle=shade(roof.color,-38);b.lineWidth=.7;b.stroke();}
  }else{
   b.save();b.translate(0,-elevation);b.fillStyle=roof.color;b.fill(f.path,'evenodd');b.strokeStyle='#544b3b';b.lineWidth=1;b.stroke(f.path);b.restore();
   const long=f.rings[0];if(long.length>=4){b.strokeStyle=shade(roof.color,25);b.lineWidth=1;b.beginPath();b.moveTo(long[0].x,long[0].y-elevation-1);b.lineTo(long[1].x,long[1].y-elevation-1);b.stroke();}
  }
  buildings.push({image:sprite,x:left,y:top,depth:Math.max(...all.map(p=>p.y)),width:right-left,height:bottom-top});
 }
 c.restore();c.strokeStyle='#c3d38b';c.lineWidth=2;c.setLineDash([10,7]);c.stroke(boundary);c.setLineDash([]);
 const inside=f=>f.center&&contains(f.center,boundaryRings);
 const indexed=features.filter(inside);
 const curated=[['pijalnia','node',9894628355,'Pijalnia Wód Mineralnych','Serce uzdrowiska','Miejsce spotkania z naturalnymi wodami mineralnymi Iwonicza-Zdroju. Punkt na mapie odpowiada źródłu oznaczonemu w OSM jako „Pijalnia wód”.'],['stary-palac','way',139202248,'Stary Pałac','Dziedzictwo uzdrowiska','Zabytkowy drewniany pałac związany z rodziną Załuskich i historią rozwoju uzdrowiska.'],['bazar','way',139201989,'Bazar','Drewniana architektura','Charakterystyczny drewniany budynek w centrum Iwonicza-Zdroju, rozpoznawalny dzięki wieży zegarowej.'],['park','way',139202038,'Plac Józefa Dietla','Park w sercu uzdrowiska','Zielony plac w centrum uzdrowiska, oznaczony w OpenStreetMap jako park.'],['belkotka','way',1167601497,'Źródło Bełkotka','Leśna osobliwość','Źródło na zboczu Przedziwnej, znane z odgłosów wydobywającego się gazu.'],['kosciol','way',139202273,'Kościół św. Iwona','Zabytkowa świątynia','Drewniany kościół św. Iwona i Matki Bożej Uzdrowienia Chorych w historycznym centrum uzdrowiska.']];
 const places=[];const used=new Set();
 function add(f,id,name,kind,desc){const nature=id!=='pijalnia'&&!!(f.tags.natural||f.tags.leisure||f.tags.landuse==='forest');places.push({id,name,kind,desc,category:nature?'nature':'architecture',icon:nature?'♠':'⌂',x:f.center.x,y:f.center.y,osmType:f.type,osmId:f.id,roofObserved:roofAppearance(f,observations).observed});used.add(f.type+'/'+f.id);}
 for(const [id,type,osmId,name,kind,desc] of curated){const f=indexed.find(f=>f.type===type&&f.id===osmId);if(f){add(f,id,name,kind,desc);places.at(-1).featured=true;}}
 for(const f of indexed){if(!f.tags.name||used.has(f.type+'/'+f.id)||f.tags.highway||f.tags.waterway)continue;if(!(f.tags.tourism||f.tags.historic||f.tags.leisure||f.tags.natural==='spring'||f.tags.natural==='peak'||f.tags.amenity==='place_of_worship'||f.tags.building))continue;
  if(places.some(p=>p.name===f.tags.name))continue;
  const kind=f.tags.natural==='peak'?'Wzgórze':f.tags.natural==='spring'?'Źródło':f.tags.leisure==='park'?'Park':f.tags.tourism==='hotel'?'Hotel / sanatorium':f.tags.historic?'Dziedzictwo':'Miejsce w Iwoniczu';
  add(f,`${f.type}-${f.id}`,f.tags.name,kind,`Obiekt oznaczony w OpenStreetMap jako „${f.tags.name}”. Położenie pochodzi z danych OSM. Szczegóły i aktualność oznaczenia można sprawdzić w źródle.`);
 }
 const roadLabels=[];const names=new Set();for(const f of roads){if(!f.tags.name||names.has(f.tags.name)||!inside(f))continue;names.add(f.tags.name);roadLabels.push({name:f.tags.name,...f.center});}
 return {scene:canvas,projection,places,roadLabels,boundaryRings,boundaryPath:boundary,buildings,stats:{observedRoofs:indexed.filter(f=>f.tags.building&&roofAppearance(f,observations).observed).length,buildings:indexed.filter(f=>f.tags.building).length,roads:roads.length,features:data.elements.length},isInside:p=>contains(p,boundaryRings)};
}
