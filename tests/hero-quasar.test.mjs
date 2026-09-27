import test from 'node:test';
import assert from 'node:assert/strict';
import {HERO_QUASAR as lens,HERO_DELAY_SECONDS,heroImageFluxes,heroVariability,solveQuasarImages,sourcePosition} from '../assets/redesign/lensing-model.mjs';

test('the homepage source remains a quad throughout its pointer range',()=>{
 for(let i=0;i<=12;i++)for(let j=0;j<=12;j++){
  const sx=(i/6-1)*lens.limitX,sy=(j/6-1)*lens.limitY;
  const images=solveQuasarImages(sx,sy,lens.radius,lens.shear);
  assert.equal(images.length,4,`source (${sx}, ${sy})`);
  assert.equal(images.filter(image=>image.magnification>0).length,2);
  assert.equal(images.filter(image=>image.magnification<0).length,2);
  for(const image of images){
   const [bx,by]=sourcePosition(image.x,image.y,lens.radius,lens.shear);
   assert.ok(Math.hypot(bx-sx,by-sy)<1e-7);
   assert.ok(Number.isFinite(image.magnification));
   assert.ok(Math.hypot(image.x,image.y)<1.1);
  }
 }
});

test('the starting source produces four well-separated quasar point images',()=>{
 const images=solveQuasarImages(lens.sourceX,lens.sourceY,lens.radius,lens.shear);
 assert.equal(images.length,4);
 for(let i=0;i<images.length;i++)for(let j=i+1;j<images.length;j++){
  assert.ok(Math.hypot(images[i].x-images[j].x,images[i].y-images[j].y)>.5);
 }
});

test('each image repeats the same flicker after its own time delay',()=>{
 const images=solveQuasarImages(lens.sourceX,lens.sourceY,lens.radius,lens.shear);
 for(const t of [0,2.5,7,31]){
  const fluxes=heroImageFluxes(images,t);
  images.forEach((image,i)=>{
   const delay=(image.arrival-images[0].arrival)*HERO_DELAY_SECONDS;
   assert.ok(delay>=0&&delay<4);
   assert.ok(Math.abs(fluxes[i]-Math.abs(image.magnification)*heroVariability(t-delay))<1e-12);
  });
 }
});
