import { intrinsicFlux, imageFlux, SIMULATED_DELAY_DAYS } from './lensing-model.mjs';

const root = document.documentElement;
const isGerman = () => root.lang === 'de';
const label = (en, de) => isGerman() ? de : en;
const blue = '#94bdff';
const amber = '#dec298';
const ink = '#e9eef5';
const muted = '#a0aabb';

function drawingSurface(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return null;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width, height = rect.height;
  if (width < 1 || height < 1) return null;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth; canvas.height = pixelHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.font = '14px "DM Sans", Arial, sans-serif';
  context.lineCap = 'round';
  return { context, width, height };
}

function text(ctx, value, x, y, color = muted, align = 'left') {
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y);
}
const shiftControl=document.querySelector('#quasar-shift');
const shiftOutput=document.querySelector('#quasar-shift-value');
const shiftResult=document.querySelector('#delay-result');
const curveCanvas=document.querySelector('#delay-canvas');
function drawCurves(){
  const shift=Number(shiftControl.value), aligned=shift===SIMULATED_DELAY_DAYS;
  shiftOutput.textContent=label(`${shift} days`,`${shift} Tage`);
  shiftResult.textContent=aligned?label('The curves align: image B arrives 24 days later.','Die Kurven stimmen überein: Bild B kommt 24 Tage später an.'):label('Move the dashed curve until the variations overlap.','Verschiebe die gestrichelte Kurve, bis die Schwankungen übereinanderliegen.');
  shiftResult.classList.toggle('aligned',aligned);
  curveCanvas.setAttribute('aria-label',label(`Image B is shifted ${shift} days earlier. ${aligned?'The curves match.':'The curves are not aligned.'}`,`Bild B ist um ${shift} Tage nach vorne verschoben. ${aligned?'Die Kurven stimmen überein.':'Die Kurven sind nicht ausgerichtet.'}`));
  const surface=drawingSurface(curveCanvas);if(!surface)return;
  const {context:ctx,width:w,height:h}=surface;
  const plot={left:43,right:w-16,top:38,bottom:h-48};
  const px=t=>plot.left+t/120*(plot.right-plot.left);
  const py=f=>plot.bottom-(f-.7)/.9*(plot.bottom-plot.top);
  text(ctx,label('Normalized brightness','Normierte Helligkeit'),plot.left,19,muted);
  ctx.lineWidth=1;ctx.strokeStyle='#8095b326';
  for(const f of [.8,1,1.2,1.4]){ctx.beginPath();ctx.moveTo(plot.left,py(f));ctx.lineTo(plot.right,py(f));ctx.stroke();text(ctx,f.toFixed(1),plot.left-9,py(f)+5,muted,'right');}
  for(const t of [0,30,60,90,120])text(ctx,String(t),px(t),plot.bottom+23,muted,'center');
  text(ctx,label('Time (days)','Zeit (Tage)'),(plot.left+plot.right)/2,h-6,muted,'center');
  ctx.save();ctx.beginPath();ctx.rect(plot.left,plot.top,plot.right-plot.left,plot.bottom-plot.top);ctx.clip();
  function curve(fn,color,dashed){ctx.beginPath();ctx.strokeStyle=color;ctx.lineWidth=2.2;ctx.setLineDash(dashed?[7,5]:[]);for(let i=0;i<=480;i++){const t=i/4;if(i===0)ctx.moveTo(px(t),py(fn(t)));else ctx.lineTo(px(t),py(fn(t)));}ctx.stroke();ctx.setLineDash([]);}
  curve(intrinsicFlux,blue,false);curve(t=>imageFlux(t,shift),amber,true);ctx.restore();
}
shiftControl.addEventListener('input',drawCurves);
document.querySelector('#align-curves').addEventListener('click',()=>{shiftControl.value=String(SIMULATED_DELAY_DAYS);drawCurves();});
document.querySelector('#reset-curves').addEventListener('click',()=>{shiftControl.value='0';drawCurves();});

// Redraw only when a control, layout, or language changes; these diagrams have no idle animation loop.
const resize=new ResizeObserver(()=>{drawCurves();});
resize.observe(curveCanvas);
new MutationObserver(()=>{drawCurves();}).observe(root,{attributes:true,attributeFilter:['lang']});
document.fonts?.ready.then(()=>{drawCurves();});
drawCurves();
