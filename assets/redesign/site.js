'use strict';
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let paused=reduced.matches;
 try{const saved=sessionStorage.getItem("hk-motion-paused");if(saved!==null)paused=reduced.matches||saved==="true";}catch{}
 const root=document.documentElement;
 const motionButton=document.querySelector('.motion-toggle');
 const navToggle=document.querySelector('.menu-toggle');
 const nav=document.querySelector('.navigation');
 function setMenuInert(value){document.querySelector('main').inert=value;document.querySelector('footer').inert=value;}
 function closeMenu(){document.body.classList.remove('menu-open');setMenuInert(false);navToggle?.setAttribute('aria-expanded','false');navToggle?.setAttribute('aria-label',root.lang==='de'?'Menü öffnen':'Open menu');}
 navToggle?.addEventListener('click',()=>{const open=document.body.classList.toggle('menu-open');navToggle.setAttribute('aria-expanded',String(open));setMenuInert(open);navToggle.setAttribute('aria-label',root.lang==='de'?(open?'Menü schliessen':'Menü öffnen'):(open?'Close menu':'Open menu'));});
 nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('menu-open')){closeMenu();navToggle.focus();}if(e.key==='Tab'&&document.body.classList.contains('menu-open')){const items=[...document.querySelector('.site-header').querySelectorAll('a,button')].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 matchMedia('(min-width: 761px)').addEventListener('change',e=>{if(e.matches)closeMenu();});
 function setMotion(value){paused=value;root.classList.toggle('motion-paused',paused);motionButton?.setAttribute('aria-pressed',String(paused));const label=document.documentElement.lang==='de'?(paused?'Animationen abspielen':'Animationen pausieren'):(paused?'Play animations':'Pause animations');motionButton?.setAttribute('aria-label',label);if(motionButton){motionButton.title=label;motionButton.firstElementChild.textContent=paused?'▷':'Ⅱ';}document.dispatchEvent(new CustomEvent('motionchange',{detail:paused}));}
 motionButton?.addEventListener('click',()=>{setMotion(!paused);try{sessionStorage.setItem('hk-motion-paused',String(paused));}catch{}});
 reduced.addEventListener('change',e=>setMotion(e.matches));
 new MutationObserver(()=>{setMotion(paused);if(!document.body.classList.contains('menu-open'))navToggle?.setAttribute('aria-label',root.lang==='de'?'Menü öffnen':'Open menu');}).observe(root,{attributes:true,attributeFilter:['lang']});
 setMotion(paused);
 const progress=document.querySelector('.scroll-progress');
 const header=document.querySelector('.site-header');
 let scrollQueued=false;
 function scroll(){if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(()=>{header?.classList.toggle('is-scrolled',scrollY>Math.min(innerHeight*.65,550));const max=root.scrollHeight-innerHeight;if(progress)progress.style.transform=`scaleX(${max>0?scrollY/max:0})`;scrollQueued=false;});}
 addEventListener('scroll',scroll,{passive:true});scroll();
 const observer=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);}},{threshold:.08});
 document.querySelectorAll('[data-reveal]').forEach(el=>{el.classList.add('will-reveal');observer.observe(el);});
 const canvases=[...document.querySelectorAll('.lens-canvas')];
 for(const canvas of canvases)initializeLens(canvas);
 function backgroundOf(element){for(let node=element;node;node=node.parentElement){const channels=getComputedStyle(node).backgroundColor.match(/[\d.]+/g);if(channels&&(channels.length<4||Number(channels[3])>0))return channels.slice(0,3).map(value=>value/255);}return [0,0,0];}
 async function initializeLens(canvas){
  const isQuad=canvas.dataset.lens==='quad';
  let quadModel=null,sky;
  try{[quadModel,sky]=await Promise.all([isQuad?import('./lensing-model.mjs?v=3'):null,import('./lens-sky.mjs?v=1')]);}catch{return;}
  const quad=quadModel?.HERO_QUASAR;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(!gl)return;
  const lensAngle=quad?.angle??0,shear=quad?.shear??.045;
  const renderer=sky.createLensSky(gl,{quad:isQuad,lensAngle,background:backgroundOf(canvas)});
  if(!renderer)return;
  const quasarPoints=new Float32Array(16),cosAngle=Math.cos(lensAngle),sinAngle=Math.sin(lensAngle);
  let w=0,h=0,x=quad?.sourceX??.035,y=quad?.sourceY??.015,targetX=x,targetY=y,inside=false,visible=true,last=0,elapsed=0,frame=0;
  const section=canvas.closest('section')||canvas.parentElement;
  const radiusControl=section.querySelector('[data-lens-radius]');const alignment=section.querySelector('[data-lens-align]');
  const alignmentOutput=section.querySelector('[data-alignment-output]');
  function showAlignment(){if(alignmentOutput&&alignment)alignmentOutput.textContent=Number(alignment.value).toFixed(3);}
  const resize=new ResizeObserver(()=>{const bounds=canvas.getBoundingClientRect();const pixelRatio=Math.min(devicePixelRatio||1,1.5);w=Math.round(bounds.width*pixelRatio);h=Math.round(bounds.height*pixelRatio);if(!w||!h)return;canvas.width=w;canvas.height=h;renderer.resize(w,h);requestDraw();});resize.observe(canvas);
  function pointer(e){if(e.target.closest('a,button,input,label,.lab-intro'))return;if(e.pointerType==='touch'&&!e.buttons)return;const b=canvas.getBoundingClientRect();targetX=((e.clientX-b.left)/b.width-.5)*.4;targetY=(.5-(e.clientY-b.top)/b.height)*.35;
   if(quad){targetX=Math.max(-quad.limitX,Math.min(quad.limitX,targetX*.3));targetY=Math.max(-quad.limitY,Math.min(quad.limitY,targetY*.3));}
   inside=true;if(alignment){targetX=Math.max(Number(alignment.min),Math.min(Number(alignment.max),targetX));targetY=0;alignment.value=String(targetX);showAlignment();}requestDraw();}
  section.addEventListener('pointermove',pointer,{passive:true});section.addEventListener('pointerleave',()=>{inside=Boolean(alignment);requestDraw();});
  radiusControl?.addEventListener('input',()=>{section.querySelector('[data-radius-output]').textContent=Number(radiusControl.value).toFixed(2);requestDraw();});
  alignment?.addEventListener('input',()=>{inside=true;targetX=Number(alignment.value);targetY=0;showAlignment();requestDraw();});
  section.querySelector('[data-lens-reset]')?.addEventListener('click',()=>{inside=true;targetX=0;targetY=0;if(alignment)alignment.value='0';showAlignment();requestDraw();});
  function requestDraw(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(now){frame=0;if(!visible||document.hidden||!w||!h)return;const delta=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused)elapsed+=delta;
   if(!inside&&!alignment&&!paused){targetX=Math.sin(elapsed*.19)*(quad ? .02 : .045)+.015;targetY=Math.cos(elapsed*.14)*(quad ? .018 : .035);}
   if(paused){x=targetX;y=targetY;}else{x+=(targetX-x)*.045;y+=(targetY-y)*.045;}
   if(quad){
    // Point images from the lens equation, rotated from the lens frame into the canvas.
    const images=quadModel.solveQuasarImages(x,y,quad.radius,quad.shear),fluxes=quadModel.heroImageFluxes(images,elapsed);
    quasarPoints.fill(0);
    images.slice(0,4).forEach((image,i)=>{quasarPoints[i*4]=cosAngle*image.x-sinAngle*image.y;quasarPoints[i*4+1]=sinAngle*image.x+cosAngle*image.y;quasarPoints[i*4+2]=4*fluxes[i];});
   }
   renderer.render({source:[x,y],radius:radiusControl?Number(radiusControl.value):(quad?.radius??.68),shear,quasars:quad?quasarPoints:null});canvas.classList.add('ready');if(!paused)requestDraw();
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;requestDraw();}else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'60px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=0;requestDraw();}else if(frame){cancelAnimationFrame(frame);frame=0;}});
  document.addEventListener('motionchange',()=>{requestDraw();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;canvas.classList.remove('ready');if(frame)cancelAnimationFrame(frame);});
 }
})();
