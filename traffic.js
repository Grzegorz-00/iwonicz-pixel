/** Decorative local simulation, not real traffic data or a navigation router. */
export function buildNetwork(elements,project,isInside=()=>true){
 const networks={car:new Map(),person:new Map()};
 const drive=new Set(['primary','secondary','tertiary','unclassified','residential','living_street','service']);
 const walk=new Set([...drive,'pedestrian','footway','path','steps','track','cycleway']);
 const key=p=>p.lat.toFixed(7)+','+p.lon.toFixed(7);
 function add(mode,a,b,tags,way){const graph=networks[mode];const ak=key(a),bk=key(b);if(ak===bk)return;
  const pa=project(a),pb=project(b);if(!isInside(pa)||!isInside(pb)||!isInside({x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2}))return;
  if(!graph.has(ak))graph.set(ak,{...pa,id:ak,edges:[]});if(!graph.has(bk))graph.set(bk,{...pb,id:bk,edges:[]});
  const source=graph.get(ak),target=graph.get(bk),length=Math.hypot(pb.x-pa.x,pb.y-pa.y);if(length<.05)return;
  if(!source.edges.some(e=>e.to.id===bk))source.edges.push({from:source,to:target,length,way,highway:tags.highway,road:drive.has(tags.highway)});
 }
 for(const way of elements){const t=way.tags||{},g=way.geometry;if(way.type!=='way'||!g||!t.highway||['private','no'].includes(t.access)||t.area==='yes'||t.construction)continue;
  const car=drive.has(t.highway)&&!['no','private'].includes(t.motor_vehicle)&&!['no','private'].includes(t.vehicle)&&!['no','private'].includes(t.motorcar);
  const person=walk.has(t.highway)&&t.foot!=='no'&&(t.highway!=='cycleway'||t.foot==='yes'||t.foot==='designated');
  for(let i=1;i<g.length;i++){if(car){if(t.oneway!=='-1')add('car',g[i-1],g[i],t,way.id);if(t.oneway==='-1'||(!['yes','1','true'].includes(t.oneway)&&(t.junction!=='roundabout'||t.oneway==='no')))add('car',g[i],g[i-1],t,way.id);}if(person){add('person',g[i-1],g[i],t,way.id);add('person',g[i],g[i-1],t,way.id);}}
 }
 return networks;
}
export function createSimulation(networks,{cars=100,people=160,seed=17}={}){
 let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};const agents=[];
 for(const [kind,count]of [['car',cars],['person',people]]){const edges=[...networks[kind].values()].flatMap(n=>n.edges);if(!edges.length)continue;
  const total=edges.reduce((sum,e)=>sum+e.length,0);
  for(let i=0;i<count;i++){let weight=random()*total;const edge=edges.find(e=>(weight-=e.length)<=0)||edges.at(-1);agents.push({id:agents.length,kind,edge,distance:random()*edge.length,speed:kind==='car'?15+random()*10:2.5+random()*2,color:Math.floor(random()*6),phase:random()*6,wait:0});}
 }
 let time=0;
 function advance(seconds){if(!Number.isFinite(seconds)||seconds<=0)return;const dt=Math.min(seconds,.5);time+=dt;
  for(const a of agents){if(a.wait>0){a.wait-=dt;continue;}let speed=a.speed;
   if(a.kind==='car'&&agents.some(b=>b!==a&&b.kind==='car'&&b.edge===a.edge&&b.distance>a.distance&&b.distance-a.distance<13))speed=0;
   a.distance+=speed*dt;
   for(let i=0;a.distance>=a.edge.length&&i<30;i++){const previous=a.edge;let options=previous.to.edges.filter(e=>e.to.id!==previous.from.id);if(!options.length)options=previous.to.edges;if(!options.length){a.distance=previous.length;break;}
    a.distance-=previous.length;a.edge=options[Math.floor(random()*options.length)];if(a.kind==='person'&&random()<.05)a.wait=1+random()*3;
   }
  }
 }
 function positions(){return agents.map(a=>{const e=a.edge,t=Math.min(1,a.distance/e.length),dx=(e.to.x-e.from.x)/e.length,dy=(e.to.y-e.from.y)/e.length;const offset=a.kind==='car'?2.4:e.road?7:(a.id%2?1:-1);
  return {id:a.id,kind:a.kind,x:e.from.x+(e.to.x-e.from.x)*t-dy*offset,y:e.from.y+(e.to.y-e.from.y)*t+dx*offset,dx,dy,color:a.color,phase:a.phase+time*(a.kind==='person'?7:1),moving:a.wait<=0};});}
 return {agents,advance,positions,get time(){return time;},counts:{cars:agents.filter(a=>a.kind==='car').length,people:agents.filter(a=>a.kind==='person').length}};
}
export function drawAgent(c,a){
 const colors=['#bc3e34','#d6b43e','#f2e6c4','#3775a4','#6e89a1','#454e4c'];
 const x=Math.round(a.x),y=Math.round(a.y);
 if(a.kind==='person'){const step=a.moving?Math.round(Math.sin(a.phase)):0;c.fillStyle='#263f3066';c.fillRect(x-1,y+1,4,2);c.fillStyle='#293c39';c.fillRect(x-1-step,y-2,1,3);c.fillRect(x+1+step,y-2,1,3);c.fillStyle=colors[a.color];c.fillRect(x-1,y-6,3,4);c.fillStyle='#ecc393';c.fillRect(x,y-9,2,3);c.fillStyle='#614733';c.fillRect(x,y-10,2,1);return;}
 const angle=Math.round(Math.atan2(a.dy,a.dx)/(Math.PI/4))*Math.PI/4;
 const u={x:Math.cos(angle)*7,y:Math.sin(angle)*7},v={x:-Math.sin(angle)*3,y:Math.cos(angle)*3};
 const corners=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>({x:Math.round(x+u.x*i+v.x*j),y:Math.round(y+u.y*i+v.y*j)}));
 function poly(points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();}
 poly(corners.map(p=>({x:p.x+2,y:p.y+2})),'#30452b55');poly(corners,'#303a38');poly(corners.map(p=>({x:p.x,y:p.y-3})),colors[a.color]);
 const roof=corners.map(p=>({x:x+(p.x-x)*.55,y:y+(p.y-y)*.7-5}));poly(roof,colors[a.color]);
 const windshield=[roof[1],roof[2],{x:corners[2].x,y:corners[2].y-3},{x:corners[1].x,y:corners[1].y-3}];poly(windshield,'#a5d5d3');
 c.fillStyle='#fff4bd';c.fillRect(Math.round(x+u.x),Math.round(y+u.y-3),2,1);c.fillStyle='#f4b09a';c.fillRect(Math.round(x-u.x),Math.round(y-u.y-3),1,1);
}
