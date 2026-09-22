import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {DEFAULTS,preset,eplDeflection,lensEquation,jacobian,buildLensCache,findImages,isEinsteinRing,renderBrightness,sersicBrightness} from '../assets/redesign/epl-model.mjs';

const near=(actual,expected,tolerance=1e-5)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≠ ${expected}`);
const validRoots=(images,p,s)=>{
 for(const image of images){
  const mapped=lensEquation(image.x,image.y,p);
  assert.ok(Math.hypot(mapped.bx-s.x,mapped.by-s.y)<1e-7);
  assert.ok(Number.isFinite(image.mu)&&image.mu>0);
 }
};

test('circular isothermal images match the analytic positions and magnifications',()=>{
 const p={...DEFAULTS,q:1,shear:0},s={x:.2,y:0};
 const images=findImages(p,s,buildLensCache(p,180)).sort((a,b)=>b.x-a.x);
 assert.equal(images.length,2);
 near(images[0].x,1.4);near(images[1].x,-1);
 near(images[0].y,0);near(images[1].y,0);
 near(images[0].mu,7,.001);near(images[1].mu,5,.001);
 assert.equal(images[0].parity,1);assert.equal(images[1].parity,-1);
});

test('a shallower circular profile resolves the third central image',()=>{
 const p={...DEFAULTS,q:1,shear:0,gamma:1.5},s={x:.1,y:0};
 const images=findImages(p,s,buildLensCache(p,180)).sort((a,b)=>b.x-a.x);
 assert.equal(images.length,3);
 const b=p.thetaE,u=s.x;
 const expected=[((Math.sqrt(b)+Math.sqrt(b+4*u))/2)**2,-(((Math.sqrt(b)-Math.sqrt(b-4*u))/2)**2),-(((Math.sqrt(b)+Math.sqrt(b-4*u))/2)**2)];
 images.forEach((image,i)=>{near(image.x,expected[i]);near(image.y,0);});
 validRoots(images,p,s);
});

test('EPL convergence follows the analytic mass profile and deflection is curl-free',()=>{
 for(const q of [.35,.7,1])for(const gamma of [1.5,2,2.5])for(const phi of [-40,0,70]){
  const p={...DEFAULTS,q,gamma,phi,cx:.2,cy:-.1},angle=phi*Math.PI/180;
  const x=1.1,y=.6,dx=x-p.cx,dy=y-p.cy;
  const R=Math.hypot(q*(Math.cos(angle)*dx+Math.sin(angle)*dy),-Math.sin(angle)*dx+Math.cos(angle)*dy);
  const expected=(3-gamma)/2*(p.thetaE/R)**(gamma-1),j=jacobian(x,y,p);
  near(1-(j.a+j.d)/2,expected,5e-5);near(j.b,j.c,5e-5);
 }
});

test('mobile and desktop presets produce the intended image configurations',()=>{
 for(const n of [180,260])for(const name of ['quad','double','cusp','fold','ring']){
  const {params:p,source:s}=preset(name),cache=buildLensCache(p,n),images=findImages(p,s,cache);
  assert.equal(images.length,{quad:4,double:2,cusp:4,fold:4,ring:0}[name],`${name} at ${n}px`);
  assert.equal(isEinsteinRing(p,s),name==='ring');validRoots(images,p,s);
  assert.ok(cache.curves.critical.length>100);
 }
});

test('crossing the fold caustic creates or removes an image pair',()=>{
 const {params:p,source:inside}=preset('fold'),cache=buildLensCache(p,260);
 const outside={x:inside.x*1.08/.94,y:inside.y*1.08/.94};
 assert.equal(findImages(p,inside,cache).length,4);
 assert.equal(findImages(p,outside,cache).length,2);
});

test('the circular critical curve has Einstein radius b and maps to a point caustic',()=>{
 const p={...DEFAULTS,q:1,shear:0,cx:.1,cy:-.2},cache=buildLensCache(p,180);
 for(const segment of cache.curves.critical)for(const [x,y] of [[segment[0],segment[1]],[segment[2],segment[3]]]){
  near(Math.hypot(x-p.cx,y-p.cy),p.thetaE,2e-5);
  near(jacobian(x,y,p).det,0,2e-5);
  const s=lensEquation(x,y,p);near(s.bx,p.cx,2e-5);near(s.by,p.cy,2e-5);
 }
});

test('roots remain valid for changes in slope, ellipticity, orientation and environment',()=>{
 for(const gamma of [1.5,2,2.5])for(const q of [.35,.7,1])for(const satellite of [false,true]){
  const p={...DEFAULTS,gamma,q,phi:34,cx:.15,cy:-.18,shear:.11,perturberOn:satellite},cache=buildLensCache(p,180);
  for(const s of [{x:.05,y:.02},{x:.6,y:.35},{x:-.3,y:.4}]){
   const images=findImages(p,s,cache);assert.ok(images.length>0);validRoots(images,p,s);
  }
 }
});

test('a disabled satellite has no effect; an enabled satellite changes the lens mapping',()=>{
 const a=eplDeflection(.2,.4,DEFAULTS),b=eplDeflection(.2,.4,{...DEFAULTS,pertThetaE:.3,pertX:1.4});
 assert.deepEqual(a,b);
 const c=eplDeflection(.2,.4,{...DEFAULTS,perturberOn:true});
 assert.ok(Math.hypot(c.ax-a.ax,c.ay-a.ay)>.05);
});

test('host brightness is finite at the centre and its control changes both rendered planes',()=>{
 const {params:p,source:s}=preset('quad'),cache=buildLensCache(p,180);
 for(const n of [.5,1,5])assert.ok(Number.isFinite(sersicBrightness(0,0,{...p,galN:n})));
 const dark=renderBrightness({...p,galFlux:0},s,cache);
 assert.ok(dark.sourcePixels.every(v=>v===0));assert.ok(dark.imagePixels.every(v=>v===0));
 const faint=renderBrightness({...p,galFlux:.2},s,cache),bright=renderBrightness({...p,galFlux:1},s,cache);
 for(const plane of ['sourcePixels','imagePixels']){
  assert.equal(bright[plane].length,180*180*4);
  assert.ok(bright[plane].reduce((a,b)=>a+b,0)>faint[plane].reduce((a,b)=>a+b,0)*1.2);
 }
});

test('the worker returns transferable images, reuses the lens across source updates, and accepts lens changes',async()=>{
 const url=new URL('../assets/redesign/epl-worker.js',import.meta.url).href;
 const shim=`import {parentPort} from 'node:worker_threads';
 globalThis.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};
 await import(${JSON.stringify(url)});
 parentPort.on('message',data=>self.onmessage({data}));`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(shim)));
 try{
  let id=0;
  for(const name of ['quad','double','ring']){
   const {params,source}=preset(name),reply=once(worker,'message');
   worker.postMessage({id:++id,params,source,resolution:180,sourceField:1.2});
   const [frame]=await reply;
   assert.equal(frame.id,id);assert.equal(frame.error,undefined);
   assert.equal(frame.images.length,{quad:4,double:2,ring:0}[name]);
   assert.ok(frame.imagePixels instanceof Uint8ClampedArray);
   assert.equal(frame.imagePixels.length,180*180*4);
   assert.ok(frame.curves.critical.length>100);
  }
 }finally{await worker.terminate();}
});
