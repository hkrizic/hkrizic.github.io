import {FIELD,preset} from './epl-model.mjs';

const container=document.querySelector('#lensed-quasars');
const root=document.documentElement;
const tr=(en,de)=>root.lang==='de'?de:en;
const srcCanvas=document.querySelector('#epl-source'),imgCanvas=document.querySelector('#epl-image');
const planes=document.querySelector('#sim-planes'),status=document.querySelector('#sim-image-status'),busyLabel=document.querySelector('#sim-busy');
const inputs=[...container.querySelectorAll('[data-sim-param]')];
const toggles=[...container.querySelectorAll('[data-sim-toggle]')];
const presetButtons=[...container.querySelectorAll('[data-epl-preset]')];
const sourceBitmap=document.createElement('canvas'),imageBitmap=document.createElement('canvas');
let {params,source}=preset('quad'),sourceField=1.2;
let display={caustics:true,critical:true,host:true,points:true,grid:true};
let selectedPreset='quad',worker=null,working=false,visible=false,latest=0,pending=null,frame=null,failed=false;
const colors={background:'#0b111a',ink:'#e6edf8',muted:'#9cabbf',caustic:'#e0c17c',critical:'#79c5ab',source:'#eea274',host:'#87baff',positive:'#f0e5d4',negative:'#8cb8ff',lens:'#d5bc8b',satellite:'#eea274'};

function format(key,value){
 if(['thetaE','cx','cy','pertX','pertY','sx','sy','sourceView'].includes(key))return value.toFixed(2)+'″';
 if(['galReff','pertThetaE'].includes(key))return value.toFixed(3)+'″';
 if(['phi','shearAngle','galPA'].includes(key))return Math.round(value)+'°';
 return value.toFixed(key==='shear'?3:2);
}
function reflectControls(){
 for(const input of inputs){const key=input.dataset.simParam,value=key==='sx'?source.x:key==='sy'?source.y:key==='sourceView'?sourceField:params[key];
  if(key==='sx'||key==='sy'){input.min=String(-sourceField);input.max=String(sourceField);}
  input.value=String(value);document.querySelector('#sim-value-'+key).textContent=format(key,value);
 }
 for(const toggle of toggles)toggle.checked=toggle.dataset.simToggle==='perturberOn'?params.perturberOn:display[toggle.dataset.simToggle];
 for(const input of document.querySelector('#sim-perturber-controls').querySelectorAll('input'))input.disabled=!params.perturberOn;
 imgCanvas.classList.toggle('satellite-active',params.perturberOn);
 for(const button of presetButtons)button.setAttribute('aria-pressed',String(selectedPreset===button.dataset.eplPreset));
 srcCanvas.setAttribute('aria-label',tr('Source plane. Drag or use arrow keys to move the quasar.','Quellenebene. Ziehen oder Pfeiltasten verwenden, um den Quasar zu verschieben.'));
 imgCanvas.setAttribute('aria-label',tr('Image plane with lensed quasar images and host-galaxy arcs.','Bildebene mit gelinsten Quasarbildern und Bögen der Wirtsgalaxie.'));
}
function workerError(){
 failed=true;working=false;planes.setAttribute('aria-busy','false');busyLabel.hidden=true;
 document.querySelector('#sim-error').hidden=false;
 document.querySelector('#sim-error').textContent=tr('The embedded simulator could not start. You can use the standalone simulator linked below.','Der eingebettete Simulator konnte nicht gestartet werden. Der eigenständige Simulator ist unten verlinkt.');
 status.textContent=tr('Simulator unavailable','Simulator nicht verfügbar');
 worker?.terminate();worker=null;
}
function startWorker(){
 if(worker||failed)return;
 try{worker=new Worker(new URL('./epl-worker.js',import.meta.url),{type:'module'});worker.addEventListener('message',receive);worker.addEventListener('error',workerError);}catch{workerError();}
}
function sendPending(){
 if(!visible||working||!pending||failed)return;
 startWorker();if(!worker)return;
 const request=pending;pending=null;working=true;worker.postMessage(request);
}
function requestFrame(){
 if(failed)return;
 latest++;
 const resolution=matchMedia('(max-width: 760px)').matches?180:260;
 pending={id:latest,params:{...params},source:{...source},sourceField,resolution};
 planes.setAttribute('aria-busy','true');busyLabel.hidden=false;sendPending();
}
function paintBitmap(canvas,pixels,size){canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');const data=ctx.createImageData(size,size);data.data.set(pixels);ctx.putImageData(data,0,0);}
function receive({data}){
 working=false;if(data.error){workerError();return;}
 // Show each completed frame during a continuous drag. Keeping only responses
 // that exactly match the newest pointer event would freeze the view until release.
 frame=data;paintBitmap(sourceBitmap,data.sourcePixels,data.resolution);paintBitmap(imageBitmap,data.imagePixels,data.resolution);
 const caughtUp=data.id===latest;
 planes.setAttribute('aria-busy',String(!caughtUp));busyLabel.hidden=caughtUp;draw();updateImageInfo();
 sendPending();
}
function surface(canvas){
 const size=canvas.getBoundingClientRect().width;if(size<1)return null;
 const dpr=Math.min(devicePixelRatio||1,2),pixels=Math.round(size*dpr);
 if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=colors.background;ctx.fillRect(0,0,size,size);
 ctx.font='12px "DM Sans", Arial, sans-serif';ctx.lineCap='round';return {ctx,size};
}
function xy(x,y,size,fov){return {x:size/2+x*size/(2*fov),y:size/2-y*size/(2*fov)};}
function text(ctx,value,x,y,color=colors.muted,align='left'){ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);}
function drawGrid(ctx,size,fov){
 const step=fov>1.5?1:.5;ctx.strokeStyle='#7c93b423';ctx.lineWidth=.7;
 for(let v=Math.ceil(-fov/step)*step;v<fov;v+=step){const p=xy(v,v,size,fov);ctx.beginPath();ctx.moveTo(p.x,0);ctx.lineTo(p.x,size);ctx.moveTo(0,p.y);ctx.lineTo(size,p.y);ctx.stroke();
  if(Math.abs(v)>.001){text(ctx,String(+v.toFixed(1))+'″',p.x,size-9,colors.muted,'center');text(ctx,String(+v.toFixed(1))+'″',9,p.y-5);}
 }
}
function drawSegments(ctx,segments,size,fov,color,dashed=false){
 ctx.strokeStyle=color;ctx.lineWidth=1.35;ctx.setLineDash(dashed?[4,3]:[]);ctx.beginPath();
 for(const segment of segments){const a=xy(segment[0],segment[1],size,fov),b=xy(segment[2],segment[3],size,fov);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}
 ctx.stroke();ctx.setLineDash([]);
}
function spot(ctx,x,y,r,color){
 const gradient=ctx.createRadialGradient(x,y,0,x,y,r*3);gradient.addColorStop(0,color+'aa');gradient.addColorStop(1,color+'00');
 ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r*3,0,2*Math.PI);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,2*Math.PI);ctx.fill();
}
function draw(){
 const a=surface(srcCanvas),b=surface(imgCanvas);if(!a||!b)return;
 if(!frame)return;
 const p=frame.params,s=frame.source,fov=frame.sourceField;
 if(display.grid){drawGrid(a.ctx,a.size,fov);drawGrid(b.ctx,b.size,FIELD);}
 if(display.host){a.ctx.drawImage(sourceBitmap,0,0,a.size,a.size);b.ctx.drawImage(imageBitmap,0,0,b.size,b.size);}
 if(display.caustics)drawSegments(a.ctx,frame.curves.caustic,a.size,fov,colors.caustic,true);
 if(display.critical)drawSegments(b.ctx,frame.curves.critical,b.size,FIELD,colors.critical);
 const sp=xy(s.x,s.y,a.size,fov);
 if(p.qsoFlux>0)spot(a.ctx,sp.x,sp.y,3+Math.sqrt(p.qsoFlux),colors.source);
 a.ctx.strokeStyle=colors.source;a.ctx.lineWidth=1.4;a.ctx.beginPath();a.ctx.moveTo(sp.x-10,sp.y);a.ctx.lineTo(sp.x+10,sp.y);a.ctx.moveTo(sp.x,sp.y-10);a.ctx.lineTo(sp.x,sp.y+10);a.ctx.stroke();
 const center=xy(p.cx,p.cy,b.size,FIELD);spot(b.ctx,center.x,center.y,4,colors.lens);text(b.ctx,'G',center.x+9,center.y-8,colors.lens);
 if(p.perturberOn){const pp=xy(p.pertX,p.pertY,b.size,FIELD);spot(b.ctx,pp.x,pp.y,4,colors.satellite);text(b.ctx,'G1',pp.x+9,pp.y-8,colors.satellite);}
 if(display.points&&p.qsoFlux>0){
  if(frame.ring){b.ctx.strokeStyle=colors.positive;b.ctx.lineWidth=2;b.ctx.beginPath();b.ctx.arc(center.x,center.y,p.thetaE*b.size/(2*FIELD),0,2*Math.PI);b.ctx.stroke();}
  else for(let i=0;i<frame.images.length;i++){
   const image=frame.images[i],ip=xy(image.x,image.y,b.size,FIELD);
   const radius=2.2+Math.min(8,Math.sqrt(image.mu*p.qsoFlux)*1.2),color=image.parity>0?colors.positive:colors.negative;
   spot(b.ctx,ip.x,ip.y,radius,color);text(b.ctx,String.fromCharCode(65+i),ip.x+radius+5,ip.y-5,color);
  }
 }
 document.querySelector('#sim-source-coordinates').textContent=`β = (${s.x.toFixed(2)}, ${s.y.toFixed(2)})″`;
}
function updateImageInfo(){
 if(!frame)return;
 const count=frame.images.length;
 status.textContent=frame.ring?tr('Einstein ring — a centred source behind a circular lens.','Einsteinring — eine zentrierte Quelle hinter einer kreisförmigen Linse.'):tr(`${count} images found in the displayed field.`,`${count} Bilder im dargestellten Feld gefunden.`);
 const body=document.querySelector('#sim-image-table');body.replaceChildren();
 if(frame.ring){const row=body.insertRow();const cell=row.insertCell();cell.colSpan=5;cell.textContent=tr('Continuous ring; no isolated point images.','Geschlossener Ring; keine einzelnen Punktbilder.');}
 for(let i=0;i<count;i++){
  const image=frame.images[i],row=body.insertRow();
  for(const value of [String.fromCharCode(65+i),image.x.toFixed(3),image.y.toFixed(3),image.mu>999?'≥999':image.mu.toFixed(1),image.parity>0?'+':'−'])row.insertCell().textContent=value;
 }
}
for(const input of inputs)input.addEventListener('input',()=>{
 const key=input.dataset.simParam,value=Number(input.value);selectedPreset=null;
 if(key==='sx')source.x=value;else if(key==='sy')source.y=value;
 else if(key==='sourceView'){sourceField=value;source.x=Math.max(-value,Math.min(value,source.x));source.y=Math.max(-value,Math.min(value,source.y));}
 else params[key]=value;
 reflectControls();requestFrame();
});
for(const toggle of toggles)toggle.addEventListener('change',()=>{
 const key=toggle.dataset.simToggle;
 if(key==='perturberOn'){params.perturberOn=toggle.checked;selectedPreset=null;reflectControls();requestFrame();}
 else{display[key]=toggle.checked;draw();}
});
function applyPreset(name){({params,source}=preset(name));selectedPreset=name;sourceField=1.2;reflectControls();requestFrame();}
for(const button of presetButtons)button.addEventListener('click',()=>applyPreset(button.dataset.eplPreset));
document.querySelector('#sim-reset').addEventListener('click',()=>{display={caustics:true,critical:true,host:true,points:true,grid:true};applyPreset('quad');});
function eventPosition(event,canvas,fov){const rect=canvas.getBoundingClientRect();return {x:((event.clientX-rect.left)/rect.width-.5)*2*fov,y:(.5-(event.clientY-rect.top)/rect.height)*2*fov};}
let sourcePointer=null,satellitePointer=null;
function moveSource(event){const pos=eventPosition(event,srcCanvas,sourceField);source={x:Math.max(-sourceField,Math.min(sourceField,pos.x)),y:Math.max(-sourceField,Math.min(sourceField,pos.y))};selectedPreset=null;reflectControls();requestFrame();}
srcCanvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;sourcePointer=event.pointerId;srcCanvas.setPointerCapture(event.pointerId);srcCanvas.focus({preventScroll:true});moveSource(event);});
srcCanvas.addEventListener('pointermove',event=>{if(event.pointerId===sourcePointer)moveSource(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])srcCanvas.addEventListener(type,()=>{sourcePointer=null;});
srcCanvas.addEventListener('keydown',event=>{
 const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};if(!steps[event.key])return;
 event.preventDefault();const step=event.shiftKey ? .05 : .01;source.x=Math.max(-sourceField,Math.min(sourceField,source.x+steps[event.key][0]*step));source.y=Math.max(-sourceField,Math.min(sourceField,source.y+steps[event.key][1]*step));selectedPreset=null;reflectControls();requestFrame();
});
function moveSatellite(event){const pos=eventPosition(event,imgCanvas,FIELD);params.pertX=Math.max(-2,Math.min(2,pos.x));params.pertY=Math.max(-2,Math.min(2,pos.y));selectedPreset=null;reflectControls();requestFrame();}
imgCanvas.addEventListener('pointerdown',event=>{
 if(!params.perturberOn||event.button!==0)return;const pos=eventPosition(event,imgCanvas,FIELD),tolerance=24*2*FIELD/imgCanvas.getBoundingClientRect().width;
 if(Math.hypot(pos.x-params.pertX,pos.y-params.pertY)>tolerance&&!event.shiftKey)return;
 satellitePointer=event.pointerId;imgCanvas.setPointerCapture(event.pointerId);moveSatellite(event);
});
imgCanvas.addEventListener('pointermove',event=>{if(event.pointerId===satellitePointer)moveSatellite(event);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])imgCanvas.addEventListener(type,()=>{satellitePointer=null;});
new ResizeObserver(draw).observe(planes);
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)sendPending();},{rootMargin:'450px'}).observe(container);
new MutationObserver(()=>{reflectControls();draw();updateImageInfo();if(failed)workerError();}).observe(root,{attributes:true,attributeFilter:['lang']});
document.fonts?.ready.then(draw);
window.addEventListener('pagehide',()=>{worker?.terminate();worker=null;working=false;});
window.addEventListener('pageshow',event=>{if(event.persisted)requestFrame();});
reflectControls();draw();requestFrame();
