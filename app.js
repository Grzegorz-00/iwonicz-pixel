import {createOSMMap,RASTER_DENSITY} from './osm-map.js';
import {locateSpecialCar} from './special-car.js';
import {buildNetwork,createSimulation,drawAgent} from './traffic.js';
const canvas=document.querySelector('#map'),ctx=canvas.getContext('2d');
let mapData;
try {
 const response=await fetch('./data/iwonicz-osm.json');
 if(!response.ok)throw new Error('HTTP '+response.status);
 mapData=await response.json();
} catch(error) {
 const notice=document.createElement('div');notice.className='map-error';notice.textContent='Nie udało się wczytać danych mapy. Odśwież stronę lub sprawdź połączenie.';
 document.querySelector('.map').append(notice);throw error;
}
const photoResponse=await fetch('./data/ortho-observations.json');
if(!photoResponse.ok)throw new Error('Nie udało się wczytać metadanych ortofotomapy');
const photoObservations=await photoResponse.json();
const osm=createOSMMap(mapData,photoObservations),scene=osm.scene,places=osm.places;
const specialCar=locateSpecialCar(mapData,osm.projection.project);
places.push({id:'zdrojowa-87',name:'Zdrojowa 87 · skurwysyn',kind:'Szary SUV z 1990 roku',category:'architecture',icon:'⌂',x:specialCar.x,y:specialCar.y,osmType:'way',osmId:specialCar.houseId,desc:'Zaparkowany szary SUV inspirowany Cherokee XJ z 1990 roku. Autorski dodatek do mapy przy adresie Zdrojowa 87; nie przedstawia rzeczywistego stanu parkowania.'});
const simulation=createSimulation(buildNetwork(mapData.elements,osm.projection.project,osm.isInside));
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let paused=motionPreference.matches,simulationSpeed=1;
const WORLD_W=osm.projection.width,WORLD_H=osm.projection.height,MAX_ZOOM=12;
const home=()=>({x:WORLD_W/2,y:WORLD_H/2,z:1});
const escaped=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelBoxes=new Map(),drawnMarkers=new Set();
document.querySelector('#map-status').textContent=`${osm.stats.buildings} budynków · ${osm.stats.observedRoofs} dachów wg ortofotomapy`;
document.querySelector('#source-date').textContent=new Date(mapData.retrievedAt).toLocaleDateString('pl-PL');
let view={...home(),...osm.places.find(p=>p.id==='pijalnia'),z:innerWidth<760?6:3},selected=null,labels=true,filter='all',query='',width=0,height=0,fit=1,drag=null,moved=false,pointers=new Map(),pinch=null;
const hash=location.hash.match(/^#(?:iso|osm)@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,([a-z0-9-]+))?$/);if(hash){view={x:Math.max(0,Math.min(location.hash.startsWith('#osm@')?osm.projection.base.width:WORLD_W,+hash[1])),y:Math.max(0,Math.min(location.hash.startsWith('#osm@')?osm.projection.base.height:WORLD_H,+hash[2])),z:Math.max(.65,Math.min(MAX_ZOOM,+hash[3]))};selected=places.find(p=>p.id===hash[4])||null;}
if(hash&&location.hash.startsWith('#osm@')){view={...view,...osm.projection.toIso(view)};}
function save(){history.replaceState(null,'',`#iso@${Math.round(view.x)},${Math.round(view.y)},${view.z.toFixed(2)}${selected?','+selected.id:''}`);}
function point(x,y){return {x:(x-view.x)*fit*view.z+width/2,y:(y-view.y)*fit*view.z+height/2};}
function draw(){
 ctx.setTransform(devicePixelRatio*RASTER_DENSITY,0,0,devicePixelRatio*RASTER_DENSITY,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#42612c';ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
 const s=fit*view.z;ctx.drawImage(scene,width/2-view.x*s,height/2-view.y*s,WORLD_W*s,WORLD_H*s);
 // One world coordinate system for terrain, buildings, traffic, labels and pointer picking.
 const left=view.x-width/2/s,top=view.y-height/2/s,right=left+width/s,bottom=top+height/s;
 ctx.save();ctx.translate(width/2-view.x*s,height/2-view.y*s);ctx.scale(s,s);ctx.clip(osm.boundaryPath,'evenodd');
 const sprites=osm.buildings.filter(b=>b.x+b.width>left&&b.x<right&&b.y+b.height>top&&b.y<bottom).map(b=>({...b,kind:'building'}));
 for(const actor of [...simulation.positions(),specialCar])if(actor.x>left-20&&actor.x<right+20&&actor.y>top-20&&actor.y<bottom+20)sprites.push({...actor,depth:actor.y});
 sprites.sort((a,b)=>a.depth-b.depth);
 for(const sprite of sprites){if(sprite.kind==='building')ctx.drawImage(sprite.image,sprite.x,sprite.y,sprite.width,sprite.height);else drawAgent(ctx,sprite);}
 ctx.restore();
 const parkedPoint=point(specialCar.x,specialCar.y),bubble=document.querySelector('#special-bubble');
 bubble.hidden=!(parkedPoint.x>20&&parkedPoint.x<width-20&&parkedPoint.y>65&&parkedPoint.y<height-90);
 if(!bubble.hidden){bubble.style.left=parkedPoint.x+'px';bubble.style.top=(parkedPoint.y-16*s)+'px';}
 labelBoxes.clear();drawnMarkers.clear();const occupied=[];
 if(labels&&view.z>=4){ctx.font='10px Arial';ctx.fillStyle='#e9efd0';for(const road of osm.roadLabels){const pos=point(road.x,road.y);if(pos.x<20||pos.x>width-100||pos.y<70||pos.y>height-90)continue;ctx.fillText(road.name,pos.x,pos.y);}}
 const visible=visiblePlaces().slice().sort((a,b)=>(b.id===selected?.id)-(a.id===selected?.id));
 for(const p of visible){if(view.z<4&&!p.featured&&!query&&filter==='all'&&p.id!==selected?.id)continue;const pos=point(p.x,p.y);if(pos.x<0||pos.x>width||pos.y<60||pos.y>height-80)continue;
 drawnMarkers.add(p.id);ctx.fillStyle=selected?.id===p.id?'#214f40':'#fafaf0';ctx.strokeStyle='#94a37e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(pos.x,pos.y,selected?.id===p.id?9:5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=selected?.id===p.id?'#f8edc4':'#7a9366';ctx.fillRect(pos.x-2,pos.y-2,4,4);
 if(labels){ctx.font='10px Arial';const tw=ctx.measureText(p.name).width;const box={x:pos.x-tw/2-8,y:pos.y+12,w:tw+16,h:23};
 if(box.x<4||box.x+box.w>width-4||occupied.some(b=>box.x<b.x+b.w+5&&box.x+box.w+5>b.x&&box.y<b.y+b.h+5&&box.y+box.h+5>b.y))continue;
 occupied.push(box);labelBoxes.set(p.id,box);ctx.fillStyle=selected?.id===p.id?'#214f40':'#fafbf0ed';ctx.fillRect(box.x,box.y,box.w,box.h);ctx.strokeStyle='#c9d3b8';ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.fillStyle=selected?.id===p.id?'#fff8dd':'#536c4b';ctx.fillText(p.name,box.x+8,box.y+15);}
 }
 document.querySelector('#zoom-level').textContent=Math.round(view.z*100)+'%';
 if(s>0){const metresPerPixel=osm.projection.metresPerUnit/Math.SQRT2/s;const target=100*metresPerPixel;const unit=10**Math.floor(Math.log10(target));const distance=[1,2,5,10].map(v=>v*unit).find(v=>v>=target)||unit*10;const pixels=distance/metresPerPixel;document.querySelector('#scale-bar').style.width=pixels+'px';document.querySelector('#scale-label').textContent=distance>=1000?distance/1000+' km':distance+' m';}
}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;canvas.width=Math.round(width*devicePixelRatio*RASTER_DENSITY);canvas.height=Math.round(height*devicePixelRatio*RASTER_DENSITY);fit=Math.min(width/WORLD_W,height/WORLD_H)*.94;draw();}new ResizeObserver(resize).observe(canvas);
function visiblePlaces(){return places.filter(p=>(filter==='all'||p.category===filter)&&(p.name+" "+p.kind).toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl')));}
function renderList(){const list=document.querySelector('#places');list.replaceChildren();const visible=visiblePlaces();document.querySelector('#count').textContent=String(visible.length).padStart(2,'0');if(!visible.length){const el=document.createElement('p');el.className='empty';el.textContent='Nie znaleziono miejsca. Spróbuj innej nazwy lub kategorii.';list.append(el);}for(const p of visible){const button=document.createElement('button');button.className='place'+(selected?.id===p.id?' selected':'');button.setAttribute('aria-pressed',String(selected?.id===p.id));button.innerHTML=`<span class="place-icon ${p.category==='nature'?'green':''}">${p.icon}</span><span class="place-copy"><strong>${escaped(p.name)}</strong><small>${escaped(p.kind)}</small></span><span class="place-arrow">→</span>`;button.onclick=()=>select(p);list.append(button);}draw();}
function renderCard(){const card=document.querySelector('#card');card.hidden=!selected;if(!selected)return;card.innerHTML=`<button class="close" aria-label="Zamknij opis">×</button><span class="tag">${selected.category==='nature'?'NATURA I SPACERY':'ARCHITEKTURA UZDROWISKA'}</span><h2>${escaped(selected.name)}</h2><p>${escaped(selected.desc)}</p>${selected.roofObserved?'<p class="photo-source">Kolor dachu: ortofotomapa GUGiK, 19.06.2024 · pomiar przybliżony.</p>':''}<div class="card-foot"><a href="https://www.openstreetmap.org/${selected.osmType}/${selected.osmId}" target="_blank" rel="noopener noreferrer">Zobacz obiekt w OpenStreetMap →</a></div>`;card.querySelector('button').onclick=()=>{selected=null;renderCard();renderList();save();};}
function select(p){selected=p;view.x=p.x;view.z=Math.max(view.z,p.id==='zdrojowa-87'?9:4);view.y=p.y+height*(width<600&&p.id==='zdrojowa-87'?.05:.28)/(fit*view.z);renderCard();renderList();save();}
function zoom(amount,anchor){const old=view.z;view.z=Math.max(.65,Math.min(MAX_ZOOM,view.z*amount));if(anchor){view.x+=(anchor.x-width/2)/fit*(1/old-1/view.z);view.y+=(anchor.y-height/2)/fit*(1/old-1/view.z);}draw();save();}
document.querySelector('#zoom-in').onclick=()=>zoom(1.2);document.querySelector('#zoom-out').onclick=()=>zoom(1/1.2);document.querySelector('#reset').onclick=()=>{view=home();selected=null;renderCard();renderList();save();};document.querySelector('#labels').onclick=e=>{labels=!labels;e.currentTarget.setAttribute('aria-pressed',String(labels));draw();};
document.querySelector('#search').oninput=e=>{query=e.target.value;if(selected&&!visiblePlaces().includes(selected)){selected=null;renderCard();save();}renderList();};document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el===b));if(selected&&!visiblePlaces().includes(selected)){selected=null;renderCard();save();}renderList();});
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoom(e.deltaY<0?1.1:1/1.1,{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
canvas.onpointerdown=e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};moved=false;if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),z:view.z};moved=true;}};
canvas.onpointermove=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&pinch){const [a,b]=[...pointers.values()];view.z=Math.max(.65,Math.min(MAX_ZOOM,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));moved=true;draw();return;}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;view.x=Math.max(-100,Math.min(WORLD_W+100,drag.vx-dx/(fit*view.z)));view.y=Math.max(-100,Math.min(WORLD_H+100,drag.vy-dy/(fit*view.z)));draw();};
canvas.onpointerup=e=>{pointers.delete(e.pointerId);if(!moved&&drag){const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const p=visiblePlaces().find(p=>{const pos=point(p.x,p.y);return drawnMarkers.has(p.id)&&(Math.hypot(pos.x-x,pos.y-y)<18||(labelBoxes.has(p.id)&&(()=>{const b=labelBoxes.get(p.id);return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;})()));});if(p)select(p);}drag=null;pinch=null;save();};canvas.onpointercancel=e=>{pointers.delete(e.pointerId);drag=null;pinch=null;};
canvas.onkeydown=e=>{if(['+','=','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(e.key==='+'||e.key==='=')zoom(1.2);else if(e.key==='-')zoom(1/1.2);else{view.x+=e.key==='ArrowLeft'?-35:e.key==='ArrowRight'?35:0;view.y+=e.key==='ArrowUp'?-35:e.key==='ArrowDown'?35:0;draw();save();}}};
const dialog=document.querySelector('#info');document.querySelector('#about').onclick=()=>dialog.showModal();document.querySelector('#close-info').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}};document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!dialog.open){e.preventDefault();document.querySelector('#search').focus();}if(e.key==='Escape'&&!dialog.open){selected=null;renderCard();renderList();save();}});renderList();renderCard();

const pauseButton=document.querySelector('#pause-traffic');
function updatePlayback(){pauseButton.textContent=paused?'Wznów':'Pauza';pauseButton.setAttribute('aria-pressed',String(paused));document.querySelector('#traffic-status').textContent=paused?'SYMULACJA WSTRZYMANA':'MIASTO ŻYJE';}
pauseButton.onclick=()=>{paused=!paused;updatePlayback();draw();};
document.querySelector('#traffic-speed').onclick=e=>{simulationSpeed=simulationSpeed===4?1:simulationSpeed*2;e.currentTarget.textContent=simulationSpeed+'×';e.currentTarget.setAttribute('aria-label','Prędkość symulacji: '+simulationSpeed+' razy');};
document.querySelector('#town-center').onclick=()=>{const p=places.find(p=>p.id==='pijalnia');view={x:p.x,y:p.y,z:width<600?6:3};selected=null;renderCard();renderList();save();};
document.querySelector('#traffic-count').textContent=simulation.counts.cars+' aut · '+simulation.counts.people+' pieszych';
motionPreference.addEventListener('change',e=>{if(e.matches){paused=true;updatePlayback();draw();}});
let animationFrame=null,lastFrame=0;
function tick(timestamp){animationFrame=null;if(document.hidden)return;if(timestamp-lastFrame>=1000/30){const dt=lastFrame?Math.min((timestamp-lastFrame)/1000,.1):0;lastFrame=timestamp;if(!paused){simulation.advance(dt*simulationSpeed);draw();}}animationFrame=requestAnimationFrame(tick);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(animationFrame);animationFrame=null;}else{lastFrame=0;if(animationFrame===null)animationFrame=requestAnimationFrame(tick);}});
updatePlayback();animationFrame=requestAnimationFrame(tick);

function focusSpecialCar(){select(places.find(p=>p.id==='zdrojowa-87'));}
document.querySelector('#special-bubble').onclick=focusSpecialCar;
