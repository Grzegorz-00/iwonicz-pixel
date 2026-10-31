/** Stylized residential profiles; source tags/footprints are never rewritten. */
const HOUSE_TYPES=new Set(['detached','house','semidetached_house','bungalow','terrace','allotment_house']);
export function buildingProfile(feature,baseRing=[]){
 const t=feature.tags||{};let area=0;for(let i=0,j=baseRing.length-1;i<baseRing.length;j=i++)area+=baseRing[j].x*baseRing[i].y-baseRing[i].x*baseRing[j].y;area=Math.abs(area)/2;
 const tagged=HOUSE_TYPES.has(t.building);
 const inferred=t.building==='yes'&&!!t['addr:housenumber']&&!t.amenity&&!t.tourism&&!t.shop&&!t.office&&!t.name&&area>15&&area<280&&(!t['building:levels']||Number(t['building:levels'])<=2);
 const house=tagged||inferred,provided=Number(t['building:levels']);
 const floors=house?Math.max(1,Math.min(2,Number.isFinite(provided)&&provided>0?Math.floor(provided):t.building==='bungalow'?1:2)):Math.max(1,Math.min(6,provided||((feature.id%5===0)?3:2)));
 return {house,floors,roofShape:house?'gabled':t['roof:shape']||'flat',inferred:!tagged&&!!inferred};
}

/** A ridge aligned with the minimum-area oriented bounding rectangle of the footprint. */
export function gabledRoof(ring){
 const points=ring.slice();if(points.length>1&&Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<1e-8)points.pop();
 if(points.length<3)return null;
 let box=null;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.05)continue;
  let u={x:(b.x-a.x)/length,y:(b.y-a.y)/length},v={x:-u.y,y:u.x};
  const xs=points.map(p=>p.x*u.x+p.y*u.y),ys=points.map(p=>p.x*v.x+p.y*v.y);
  let minU=Math.min(...xs),maxU=Math.max(...xs),minV=Math.min(...ys),maxV=Math.max(...ys);
  const score=(maxU-minU)*(maxV-minV);if(box&&score>=box.score-.00001)continue;
  if(maxU-minU<maxV-minV){[u,v]=[v,{x:-u.x,y:-u.y}];[minU,maxU,minV,maxV]=[minV,maxV,-maxU,-minU];}
  box={u,v,minU,maxU,minV,maxV,score};
 }
 if(!box||box.maxV-box.minV<.05)return null;
 const center=(box.minV+box.maxV)/2,half=(box.maxV-box.minV)/2,rise=Math.max(1.8,Math.min(10,half*.65));
 const side=p=>p.x*box.v.x+p.y*box.v.y-center;
 const height=p=>rise*Math.max(0,1-Math.abs(side(p))/half);
 function intersection(a,b){const da=side(a),db=side(b),t=da/(da-db);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
 function clip(sign){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],insideA=side(a)*sign>=-1e-8,insideB=side(b)*sign>=-1e-8;if(insideA)out.push(a);if(insideA!==insideB)out.push(intersection(a,b));}return out;}
 const wall=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];wall.push(a);if(side(a)*side(b)<-1e-8)wall.push(intersection(a,b));}
 return {faces:[clip(1),clip(-1)].filter(p=>p.length>=3),wallRing:[...wall,wall[0]],height,rise,axis:box.u};
}
