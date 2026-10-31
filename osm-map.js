import {makeProjection,polygonRings,featureCenter,contains} from './geography.js';
export function createOSMMap(data){
 const projection=makeProjection(data.bbox);const {width,height,project}=projection;
 const boundaryRings=polygonRings(data.boundary).map(r=>r.map(project));
 const makePath=rings=>{const p=new Path2D();for(const ring of rings){ring.forEach((v,i)=>i?p.lineTo(v.x,v.y):p.moveTo(v.x,v.y));p.closePath();}return p;};
 const boundary=makePath(boundaryRings);
 const features=data.elements.map(e=>{const rings=polygonRings(e).map(r=>r.map(project));return {...e,rings,path:rings.length?makePath(rings):null,points:e.geometry?.map(project),center:featureCenter(e,project)};});
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 c.fillStyle='#edf0e4';c.fillRect(0,0,width,height);c.fillStyle='#e2e8d2';c.fill(boundary,'evenodd');c.save();c.clip(boundary,'evenodd');
 const areaColor=t=>t.natural==='water'||t.water?'#b3cec2':t.landuse==='forest'||t.natural==='wood'?'#c0d0a4':t.landuse==='residential'?'#e9e3d0':t.landuse==='cemetery'?'#c5cfb0':t.leisure==='park'||t.leisure==='garden'?'#d0ddaf':t.landuse==='meadow'||t.landuse==='grass'||t.natural==='grassland'?'#d8e2bb':t.landuse==='farmland'?'#e4dfbd':t.leisure==='pitch'?'#bfcea2':t.natural==='scrub'?'#d0dcba':null;
 // Landcover first, then decorative trees only inside woodland polygons. All features are clipped to city limits.
 const areas=features.filter(f=>f.path&&!f.tags.building&&areaColor(f.tags));
 for(const f of areas){c.fillStyle=areaColor(f.tags);c.fill(f.path,'evenodd');}
 let seed=42;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const forest=new Path2D();areas.filter(f=>f.tags.landuse==='forest'||f.tags.natural==='wood').forEach(f=>forest.addPath(f.path));
 for(let i=0;i<22000;i++){const x=Math.round(random()*width),y=Math.round(random()*height);if(!c.isPointInPath(forest,x,y,'evenodd'))continue;const size=3+Math.floor(random()*4);c.fillStyle='#a6b98c';c.fillRect(x-1,y+2,3,3);c.fillStyle=i%3?'#8fa875':'#9eb582';c.fillRect(x-size/2,y-size,size,size);c.fillRect(x-size/2+1,y-size-2,size-2,2);c.fillStyle='#b1c294';c.fillRect(x-size/2,y-size,2,3);}
 const stroke=(f,color,lineWidth,dash=[])=>{if(!f.points?.length)return;c.beginPath();f.points.forEach((p,i)=>i?c.lineTo(Math.round(p.x),Math.round(p.y)):c.moveTo(Math.round(p.x),Math.round(p.y)));c.strokeStyle=color;c.lineWidth=lineWidth;c.lineJoin='round';c.lineCap='round';c.setLineDash(dash);c.stroke();c.setLineDash([]);};
 features.filter(f=>f.tags.waterway).forEach(f=>stroke(f,'#9ebfb7',f.tags.waterway==='river'?6:3));
 const roads=features.filter(f=>f.tags.highway&&f.points);
 const widths={primary:12,secondary:11,tertiary:10,residential:8,unclassified:8,living_street:7,service:5,pedestrian:7,track:3,footway:2,path:2,steps:2,cycleway:3};
 for(const f of roads)stroke(f,'#c2bfa6',(widths[f.tags.highway]||3)+2);
 for(const f of roads)stroke(f,['path','track','footway','steps'].includes(f.tags.highway)?'#f4e6bb':'#fbf2d9',widths[f.tags.highway]||3,f.tags.highway==='path'?[3,2]:[]);
 // Building roofs follow actual OSM footprints. Short vertical walls give a pixel illustration effect.
 for(const f of features.filter(f=>f.tags.building&&f.path).sort((a,b)=>a.center.y-b.center.y)){
  c.fillStyle='#7a806c33';c.save();c.translate(3,3);c.fill(f.path,'evenodd');c.restore();c.fillStyle='#dfc99e';c.fill(f.path,'evenodd');
  c.save();c.translate(0,-3);c.fillStyle=f.tags.building==='church'?'#7c8e7c':f.id%3?'#bb9874':'#a7aa89';c.fill(f.path,'evenodd');c.strokeStyle='#8c8064';c.lineWidth=.7;c.stroke(f.path);c.restore();
 }
 c.restore();c.strokeStyle='#7f9766';c.lineWidth=2;c.setLineDash([10,7]);c.stroke(boundary);c.setLineDash([]);
 const inside=f=>f.center&&contains(f.center,boundaryRings);
 const indexed=features.filter(inside);
 const curated=[['pijalnia','node',9894628355,'Pijalnia Wód Mineralnych','Serce uzdrowiska','Miejsce spotkania z naturalnymi wodami mineralnymi Iwonicza-Zdroju. Punkt na mapie odpowiada źródłu oznaczonemu w OSM jako „Pijalnia wód”.'],['stary-palac','way',139202248,'Stary Pałac','Dziedzictwo uzdrowiska','Zabytkowy drewniany pałac związany z rodziną Załuskich i historią rozwoju uzdrowiska.'],['bazar','way',139201989,'Bazar','Drewniana architektura','Charakterystyczny drewniany budynek w centrum Iwonicza-Zdroju, rozpoznawalny dzięki wieży zegarowej.'],['park','way',139202038,'Plac Józefa Dietla','Park w sercu uzdrowiska','Zielony plac w centrum uzdrowiska, oznaczony w OpenStreetMap jako park.'],['belkotka','way',1167601497,'Źródło Bełkotka','Leśna osobliwość','Źródło na zboczu Przedziwnej, znane z odgłosów wydobywającego się gazu.'],['kosciol','way',139202273,'Kościół św. Iwona','Zabytkowa świątynia','Drewniany kościół św. Iwona i Matki Bożej Uzdrowienia Chorych w historycznym centrum uzdrowiska.']];
 const places=[];const used=new Set();
 function add(f,id,name,kind,desc){const nature=id!=='pijalnia'&&!!(f.tags.natural||f.tags.leisure||f.tags.landuse==='forest');places.push({id,name,kind,desc,category:nature?'nature':'architecture',icon:nature?'♠':'⌂',x:f.center.x,y:f.center.y,osmType:f.type,osmId:f.id});used.add(f.type+'/'+f.id);}
 for(const [id,type,osmId,name,kind,desc] of curated){const f=indexed.find(f=>f.type===type&&f.id===osmId);if(f){add(f,id,name,kind,desc);places.at(-1).featured=true;}}
 for(const f of indexed){if(!f.tags.name||used.has(f.type+'/'+f.id)||f.tags.highway||f.tags.waterway)continue;if(!(f.tags.tourism||f.tags.historic||f.tags.leisure||f.tags.natural==='spring'||f.tags.natural==='peak'||f.tags.amenity==='place_of_worship'||f.tags.building))continue;
  if(places.some(p=>p.name===f.tags.name))continue;
  const kind=f.tags.natural==='peak'?'Wzgórze':f.tags.natural==='spring'?'Źródło':f.tags.leisure==='park'?'Park':f.tags.tourism==='hotel'?'Hotel / sanatorium':f.tags.historic?'Dziedzictwo':'Miejsce w Iwoniczu';
  add(f,`${f.type}-${f.id}`,f.tags.name,kind,`Obiekt oznaczony w OpenStreetMap jako „${f.tags.name}”. Położenie pochodzi z danych OSM. Szczegóły i aktualność oznaczenia można sprawdzić w źródle.`);
 }
 const roadLabels=[];const names=new Set();for(const f of roads){if(!f.tags.name||names.has(f.tags.name)||!inside(f))continue;names.add(f.tags.name);roadLabels.push({name:f.tags.name,...f.center});}
 return {scene:canvas,projection,places,roadLabels,boundaryRings,stats:{buildings:indexed.filter(f=>f.tags.building).length,roads:roads.length,features:data.elements.length},isInside:p=>contains(p,boundaryRings)};
}
