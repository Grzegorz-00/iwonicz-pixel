import {featureCenter,polygonRings,contains} from './geography.js';
export function locateSpecialCar(data,project){
 const house=data.elements.find(f=>f.tags?.['addr:street']==='Zdrojowa'&&f.tags?.['addr:housenumber']==='87'&&f.tags?.building);
 if(!house)throw new Error('Brak adresu Zdrojowa 87 w danych OSM');
 const center=featureCenter(house,project),outline=polygonRings(house).map(r=>r.map(project));let best=null;
 for(const road of data.elements.filter(f=>f.tags?.highway==='service'&&f.geometry))for(let i=1;i<road.geometry.length;i++){
  const a=project(road.geometry[i-1]),b=project(road.geometry[i]);const dx=b.x-a.x,dy=b.y-a.y,len2=dx*dx+dy*dy;if(!len2)continue;
  const t=Math.max(0,Math.min(1,((center.x-a.x)*dx+(center.y-a.y)*dy)/len2));const p={x:a.x+dx*t,y:a.y+dy*t};const distance=Math.hypot(p.x-center.x,p.y-center.y);
  if(!best||distance<best.distance)best={...p,dx:dx/Math.sqrt(len2),dy:dy/Math.sqrt(len2),distance,roadId:road.id};
 }
 if(!best||best.distance>150)throw new Error('Brak pobliskiego dojazdu dla Zdrojowej 87');
 const distance=Math.max(1,best.distance);let parking={x:best.x+(center.x-best.x)/distance*5,y:best.y+(center.y-best.y)/distance*5};
 if(contains(parking,outline))parking={x:best.x,y:best.y};
 return {...parking,dx:best.dx,dy:best.dy,id:'skurwysyn',kind:'car',model:'cherokee-1990',color:4,stationary:true,moving:false,label:'skurwysyn',address:'Zdrojowa 87',houseId:house.id,roadId:best.roadId,houseCenter:center};
}
