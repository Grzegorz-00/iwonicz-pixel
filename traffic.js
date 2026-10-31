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
 drawVehicle(c,a,colors[a.color]);
}

/** Small 3D bodies with continuous headings, tires, glazing, bumpers and lights. */
export function drawVehicle(c,a,color='#7d858a'){
 const suv=a.model==='cherokee-1990',variant=suv?'suv':['sedan','hatchback','wagon'][a.id%3];
 const length=suv?10.5:variant==='wagon'?9.2:variant==='sedan'?8.7:7.4,width=suv?4.1:3.3;
 const bodyHeight=suv?4.8:3.2,roofHeight=suv?9:variant==='sedan'?5.4:variant==='wagon'?6.2:5.8;
 const magnitude=Math.hypot(a.dx,a.dy)||1,ux=a.dx/magnitude,uy=a.dy/magnitude,vx=-uy,vy=ux;
 const base=suv?'#858b8f':color;
 const shade=(hex,n)=>'#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,parseInt(v,16)+n)).toString(16).padStart(2,'0')).join('');
 const p=(t,w,z=0)=>({x:a.x+t*ux+w*vx,y:a.y+t*uy+w*vy-z});
 function polygon(points,fill,stroke){c.fillStyle=fill;c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.closePath();c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.45;c.stroke();}}
 function line(points,stroke,lineWidth=.6){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.strokeStyle=stroke;c.lineWidth=lineWidth;c.stroke();}
 const footprint=[p(-length,-width),p(length,-width),p(length,width),p(-length,width)];
 polygon(footprint.map(q=>({x:q.x+2,y:q.y+2})),'#172b2555');
 // Lower chassis and four exposed rubber tires.
 polygon(footprint,'#252c2e');
 const wheels=[];for(const t of [-length*.62,length*.61])for(const w of [-width-.1,width+.1])wheels.push({t,w,...p(t,w,1.2)});
 for(const wheel of wheels.sort((a,b)=>a.y-b.y)){c.fillStyle='#202426';c.beginPath();c.ellipse(wheel.x,wheel.y,1.65,2.3,Math.atan2(uy,ux),0,Math.PI*2);c.fill();c.fillStyle='#9ba2a1';c.beginPath();c.ellipse(wheel.x,wheel.y,.75,1.05,Math.atan2(uy,ux),0,Math.PI*2);c.fill();}
 const sides=[[-length,-width,length,-width],[length,-width,length,width],[length,width,-length,width],[-length,width,-length,-width]];
 for(const [t,w,t2,w2]of sides.sort((a,b)=>(p(a[0],a[1]).y+p(a[2],a[3]).y)-(p(b[0],b[1]).y+p(b[2],b[3]).y))){polygon([p(t,w,1),p(t2,w2,1),p(t2,w2,bodyHeight),p(t,w,bodyHeight)],shade(base,w>0?-22:-8),'#354043');}
 polygon([p(-length,-width,bodyHeight),p(length,-width,bodyHeight),p(length,width,bodyHeight),p(-length,width,bodyHeight)],shade(base,12),'#3c494b');
 const back=suv?-length*.87:variant==='sedan'?-length*.52:variant==='wagon'?-length*.85:-length*.8,front=suv?length*.28:variant==='sedan'?length*.2:length*.35,cabinW=width*.9;
 // Black window band and separate front / rear windscreens.
 for(const side of [-1,1]){
  polygon([p(back,side*width,bodyHeight),p(front,side*width,bodyHeight),p(front-.9,side*cabinW,roofHeight),p(back+.7,side*cabinW,roofHeight)],'#344b57','#27383b');
  const pillars=suv?[back+(front-back)*.32,back+(front-back)*.64]:[back+(front-back)*.5];
  for(const t of pillars)line([p(t,side*width,bodyHeight),p(t,side*cabinW,roofHeight)],shade(base,-5),suv?1:.7);
  line([p(back,side*width,bodyHeight-.7),p(length*.65,side*width,bodyHeight-.7)],'#3b4243',.6);
  for(const t of [back+(front-back)*.38,front-.8])line([p(t,side*width,bodyHeight-.8),p(t+.7,side*width,bodyHeight-.8)],'#d7dcda',.5);
 }
 polygon([p(front,-width,bodyHeight),p(front,width,bodyHeight),p(front-.9,cabinW,roofHeight),p(front-.9,-cabinW,roofHeight)],'#91b6bd','#34494c');
 polygon([p(back,-width,bodyHeight),p(back,width,bodyHeight),p(back+.7,cabinW,roofHeight),p(back+.7,-cabinW,roofHeight)],'#5d7f8b','#34494c');
 polygon([p(back+.7,-cabinW,roofHeight),p(front-.9,-cabinW,roofHeight),p(front-.9,cabinW,roofHeight),p(back+.7,cabinW,roofHeight)],shade(base,24),'#536061');
 line([p(front,-width*.8,bodyHeight+.1),p(length*.92,-width*.8,bodyHeight+.1)],shade(base,40),.5);
 // Separate headlights, seven-slot grille on the boxy gray SUV, rear lamps and bumpers.
 line([p(length,-width,1.5),p(length,width,1.5)],'#303638',1.3);
 line([p(-length,-width,1.5),p(-length,width,1.5)],'#303638',1.2);
 for(const side of [-1,1]){polygon([p(length,side*width*.95,2),p(length,side*width*.5,2),p(length,side*width*.5,bodyHeight-.35),p(length,side*width*.95,bodyHeight-.35)],'#fff0b8');polygon([p(-length,side*width*.95,2),p(-length,side*width*.65,2),p(-length,side*width*.65,bodyHeight-.4),p(-length,side*width*.95,bodyHeight-.4)],'#bb493d');}
 if(suv){for(let i=-3;i<=3;i++)line([p(length,i*.45,2),p(length,i*.45,bodyHeight-.3)],'#303a3d',.35);for(const side of [-1,1])line([p(back+1,side*cabinW*.75,roofHeight+1),p(front-1.3,side*cabinW*.75,roofHeight+1)],'#343d40',.8);line([p(length*.3,-width*1.1,bodyHeight+1),p(length*.3,-width*1.22,bodyHeight+.5)],'#374248',1);}
}
