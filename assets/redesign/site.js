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
 function initializeLens(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(!gl)return;
  const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
  const fragment=`precision highp float;
  uniform vec2 resolution;uniform vec2 source;uniform float time;uniform float radius;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
   vec2 p=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.5;
   float r=max(length(p),.001);vec2 beta=p-radius*p/r-vec2(.045*p.x,-.045*p.y);vec2 q=beta-source;
   float ang=atan(p.y,p.x);float d=length(q*vec2(1.,1.3));
   float core=exp(-d*d/0.005);float halo=exp(-d*d/0.035);float haze=exp(-d*d/0.115);
   float structure=.83+.17*sin(ang*43.+sin(ang*11.)*3.+time*.15);
   vec3 color=vec3(.031,.043,.063);
   float radialGlow=exp(-pow((r-radius)/.16,2.));
   color+=vec3(.008,.024,.065)*radialGlow;
   color+=(vec3(.20,.46,.94)*halo*.78+vec3(.53,.78,1.)*core*2.3)*structure;
   color+=vec3(.022,.050,.12)*haze;
   float center=exp(-r*r/.004)*.90+exp(-r*r/.027)*.15+exp(-r*r/.17)*.025;
   color+=vec3(.80,.72,.57)*center;
   vec2 cell=floor(gl_FragCoord.xy/vec2(68.));vec2 inCell=fract(gl_FragCoord.xy/vec2(68.));
   vec2 starPos=vec2(hash(cell),hash(cell+23.7));float starDist=length((inCell-starPos)*68.);
   float star=exp(-starDist*starDist*1.5)*step(.38,hash(cell+9.1));
   color+=vec3(.38,.47,.62)*star*(.3+.3*hash(cell+37.));
   float grain=(hash(gl_FragCoord.xy)-.5)*.015;color+=grain;
   float vignette=1.-smoothstep(.7,1.9,r)*.7;color*=vignette;
   gl_FragColor=vec4(color,1.);
  }`;
  function shader(type,sourceCode){const s=gl.createShader(type);gl.shaderSource(s,sourceCode);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);if(!vs||!fs)return;
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  const uniforms={};for(const name of ['resolution','source','time','radius'])uniforms[name]=gl.getUniformLocation(program,name);
  let w=0,h=0,x=.035,y=.015,targetX=x,targetY=y,inside=false,visible=true,last=0,elapsed=0,frame=0;
  const section=canvas.closest('section')||canvas.parentElement;
  const radiusControl=section.querySelector('[data-lens-radius]');const alignment=section.querySelector('[data-lens-align]');
  const alignmentOutput=section.querySelector('[data-alignment-output]');
  function showAlignment(){if(alignmentOutput&&alignment)alignmentOutput.textContent=Number(alignment.value).toFixed(3);}
  const resize=new ResizeObserver(()=>{const bounds=canvas.getBoundingClientRect();const pixelRatio=Math.min(devicePixelRatio||1,1.5);w=Math.round(bounds.width*pixelRatio);h=Math.round(bounds.height*pixelRatio);canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);requestDraw();});resize.observe(canvas);
  function pointer(e){if(e.target.closest('a,button,input,label,.lab-intro'))return;if(e.pointerType==='touch'&&!e.buttons)return;const b=canvas.getBoundingClientRect();targetX=((e.clientX-b.left)/b.width-.5)*.4;targetY=(.5-(e.clientY-b.top)/b.height)*.35;inside=true;if(alignment){targetX=Math.max(Number(alignment.min),Math.min(Number(alignment.max),targetX));targetY=0;alignment.value=String(targetX);showAlignment();}requestDraw();}
  section.addEventListener('pointermove',pointer,{passive:true});section.addEventListener('pointerleave',()=>{inside=Boolean(alignment);requestDraw();});
  radiusControl?.addEventListener('input',()=>{section.querySelector('[data-radius-output]').textContent=Number(radiusControl.value).toFixed(2);requestDraw();});
  alignment?.addEventListener('input',()=>{inside=true;targetX=Number(alignment.value);targetY=0;showAlignment();requestDraw();});
  section.querySelector('[data-lens-reset]')?.addEventListener('click',()=>{inside=true;targetX=0;targetY=0;if(alignment)alignment.value='0';showAlignment();requestDraw();});
  function requestDraw(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function draw(now){frame=0;if(!visible||document.hidden||!w||!h)return;const delta=last?Math.min((now-last)/1000,.05):0;last=now;if(!paused)elapsed+=delta;
   if(!inside&&!alignment&&!paused){targetX=Math.sin(elapsed*.19)*.045+.015;targetY=Math.cos(elapsed*.14)*.035;}
   if(paused){x=targetX;y=targetY;}else{x+=(targetX-x)*.045;y+=(targetY-y)*.045;}
   gl.useProgram(program);gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.source,x,y);gl.uniform1f(uniforms.time,elapsed);gl.uniform1f(uniforms.radius,radiusControl?Number(radiusControl.value):.68);gl.drawArrays(gl.TRIANGLES,0,6);canvas.classList.add('ready');if(!paused)requestDraw();
  }
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=0;requestDraw();}else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'60px'}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=0;requestDraw();}else if(frame){cancelAnimationFrame(frame);frame=0;}});
  document.addEventListener('motionchange',()=>{requestDraw();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;canvas.classList.remove('ready');if(frame)cancelAnimationFrame(frame);});
 }
})();
