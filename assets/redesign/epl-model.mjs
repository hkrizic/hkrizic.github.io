// EPL deflection adapted from random/lensing_simulator.html.
// Tessore & Metcalf (2015), https://arxiv.org/abs/1507.01819.
// thetaE is the original simulator's major-axis normalization b; b is the
// Einstein radius only in the circular limit. All sky coordinates are arcseconds.
export const FIELD = 3;
export const DEFAULTS = Object.freeze({
 thetaE:1.2,gamma:2,q:.7,phi:0,cx:0,cy:0,shear:.04,shearAngle:15,
 perturberOn:false,pertThetaE:.1,pertX:.8,pertY:.8,
 qsoFlux:1,galReff:.15,galN:1,galQ:.7,galPA:30,galFlux:.5
});
export const LENS_KEYS = ['thetaE','gamma','q','phi','cx','cy','shear','shearAngle','perturberOn','pertThetaE','pertX','pertY'];
export function eplDeflection(theta_x, theta_y, params) {
  const { thetaE, gamma, q, phi: phiDeg, cx, cy } = params;
  const phiRad = phiDeg * Math.PI / 180;
  let dx = theta_x - cx, dy = theta_y - cy;
  const cosP = Math.cos(phiRad), sinP = Math.sin(phiRad);
  let x = cosP*dx + sinP*dy;
  let y = -sinP*dx + cosP*dy;

  const t = gamma - 1;
  const b = thetaE;
  let alpha_x, alpha_y;

  if (Math.abs(1 - q) < 1e-6) {
    // Circular EPL — exact closed form
    const r = Math.sqrt(x*x + y*y);
    if (r < 1e-12) { alpha_x = 0; alpha_y = 0; }
    else {
      const dm = Math.pow(b, t) / Math.pow(r, t - 1);
      alpha_x = dm * x / r;
      alpha_y = dm * y / r;
    }
  } else {
    // Elliptical EPL — Tessore & Metcalf (2015) hypergeometric series
    const R = Math.sqrt(q*q*x*x + y*y);
    if (R < 1e-12) { alpha_x = 0; alpha_y = 0; }
    else {
      const phiE = Math.atan2(y, q*x);
      const e = (1 - q)/(1 + q);
      const c2 = Math.cos(2*phiE), s2 = Math.sin(2*phiE);
      const zRe = -e*c2, zIm = -e*s2;
      // F = ₂F₁(1, t/2; 2-t/2; z) by series; |z| = e < 1 so it converges
      const aH = 1.0, bH = t/2, cH = 2 - t/2;
      let termRe = 1, termIm = 0, sumRe = 1, sumIm = 0;
      for (let n = 0; n < 80; n++) {
        const fac = (aH + n)*(bH + n)/((cH + n)*(n + 1));
        const trNew = fac*(termRe*zRe - termIm*zIm);
        const tiNew = fac*(termRe*zIm + termIm*zRe);
        termRe = trNew; termIm = tiNew;
        sumRe += termRe; sumIm += termIm;
        if (Math.hypot(termRe, termIm) < 1e-12) break;
      }
      const radial = (2*b/(1 + q)) * Math.pow(b/R, t - 1);
      const cE = Math.cos(phiE), sE = Math.sin(phiE);
      alpha_x = radial * (cE*sumRe - sE*sumIm);
      alpha_y = radial * (cE*sumIm + sE*sumRe);
    }
  }

  // Rotate back to sky frame
  let ax_sky = cosP*alpha_x - sinP*alpha_y;
  let ay_sky = sinP*alpha_x + cosP*alpha_y;

  // External shear (centred at lens position; constant offset is degenerate)
  const shRad = params.shearAngle * Math.PI / 180;
  const g1 = params.shear * Math.cos(2*shRad);
  const g2 = params.shear * Math.sin(2*shRad);
  ax_sky += g1*dx + g2*dy;
  ay_sky += g2*dx - g1*dy;

  // Perturber: softened isothermal sphere — α = θ_E,p · (θ−θ_p) / √(|θ−θ_p|² + r_c²)
  // Deflections add linearly, so dropping a satellite at θ_p just sums into α.
  if (params.perturberOn && params.pertThetaE > 0) {
    const px = theta_x - params.pertX;
    const py = theta_y - params.pertY;
    const rc2 = 1e-4; // small core to avoid singularity at the perturber centre
    const pr = Math.sqrt(px*px + py*py + rc2);
    ax_sky += params.pertThetaE * px / pr;
    ay_sky += params.pertThetaE * py / pr;
  }

  return { ax: ax_sky, ay: ay_sky };
}

export function lensEquation(x,y,p){const a=eplDeflection(x,y,p);return {bx:x-a.ax,by:y-a.ay};}
export function jacobian(x,y,p){
 const h=1e-5,s=lensEquation(x,y,p),sx=lensEquation(x+h,y,p),sy=lensEquation(x,y+h,p);
 const a=(sx.bx-s.bx)/h,b=(sy.bx-s.bx)/h,c=(sx.by-s.by)/h,d=(sy.by-s.by)/h;
 return {a,b,c,d,det:a*d-b*c};
}
export function sersicBrightness(dx,dy,p){
 if(p.galFlux<=0)return 0;
 const angle=p.galPA*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const x=c*dx+s*dy,y=(-s*dx+c*dy)/p.galQ,r=Math.hypot(x,y);
 const n=p.galN,bn=2*n-1/3+4/(405*n)+46/(25515*n*n);
 // galFlux is I_e (surface brightness at R_eff), including at the finite centre.
 return p.galFlux*Math.exp(-bn*(Math.pow(r/p.galReff,1/n)-1));
}
export function buildLensCache(p,n=220){
 const bx=new Float64Array(n*n),by=new Float64Array(n*n);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const x=-FIELD+2*FIELD*(i+.5)/n,y=FIELD-2*FIELD*(j+.5)/n,s=lensEquation(x,y,p),k=j*n+i;
  bx[k]=s.bx;by[k]=s.by;
 }
 return {n,bx,by,curves:criticalCurves(p)};
}
export function criticalCurves(p,resolution=160){
 const size=resolution+1,step=2*FIELD/resolution,det=new Float64Array(size*size);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++)det[j*size+i]=jacobian(-FIELD+i*step,-FIELD+j*step,p).det;
 const critical=[],caustic=[];
 function add(a,b){
  if(Math.hypot(a.x-b.x,a.y-b.y)>step*2)return;
  if(Math.min(Math.hypot(a.x-p.cx,a.y-p.cy),Math.hypot(b.x-p.cx,b.y-p.cy))<.004)return;
  const sa=lensEquation(a.x,a.y,p),sb=lensEquation(b.x,b.y,p);
  if(Math.hypot(sa.bx-sb.bx,sa.by-sb.by)>1)return;
  critical.push([a.x,a.y,b.x,b.y]);caustic.push([sa.bx,sa.by,sb.bx,sb.by]);
 }
 for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
  const x=-FIELD+i*step,y=-FIELD+j*step;
  const corners=[{x,y,v:det[j*size+i]},{x:x+step,y,v:det[j*size+i+1]},{x:x+step,y:y+step,v:det[(j+1)*size+i+1]},{x,y:y+step,v:det[(j+1)*size+i]}];
  const crosses=[];
  for(let e=0;e<4;e++){
   const a=corners[e],b=corners[(e+1)%4];
   if(!Number.isFinite(a.v+b.v)||(a.v<0)===(b.v<0))continue;
   let lo=0,hi=1,lv=a.v;
   // Refine crossings instead of interpolating steep determinant values near a lens centre.
   for(let k=0;k<12;k++){const mid=(lo+hi)/2,mv=jacobian(a.x+(b.x-a.x)*mid,a.y+(b.y-a.y)*mid,p).det;if((lv<0)===(mv<0)){lo=mid;lv=mv;}else hi=mid;}
   const f=(lo+hi)/2;crosses.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,edge:e});
  }
  if(crosses.length===2)add(crosses[0],crosses[1]);
  if(crosses.length===4){
   const center=jacobian(x+step/2,y+step/2,p).det;
   if((center<0)===(corners[0].v<0)){add(crosses[0],crosses[1]);add(crosses[2],crosses[3]);}
   else{add(crosses[0],crosses[3]);add(crosses[1],crosses[2]);}
  }
 }
 return {critical,caustic};
}
export function isEinsteinRing(p,s){return Math.abs(p.q-1)<1e-8&&p.shear<1e-8&&(!p.perturberOn||p.pertThetaE===0)&&Math.hypot(s.x-p.cx,s.y-p.cy)<1e-7;}
export function findImages(p,source,cache){
 if(isEinsteinRing(p,source))return [];
 const candidates=[],{n,bx,by}=cache,step=2*FIELD/n;
 for(let j=0;j<n;j+=2)for(let i=0;i<n;i+=2){
  const k=j*n+i,d=Math.hypot(bx[k]-source.x,by[k]-source.y);
  if(d<step*5)candidates.push({x:-FIELD+(i+.5)*step,y:FIELD-(j+.5)*step,d});
 }
 candidates.sort((a,b)=>a.d-b.d);candidates.length=Math.min(candidates.length,240);
 for(const r of [.01,.12,.5,1,1.5,2.2])for(let k=0;k<40;k++)candidates.push({x:p.cx+p.thetaE*r*Math.cos(k*Math.PI/20),y:p.cy+p.thetaE*r*Math.sin(k*Math.PI/20)});
 if(p.perturberOn)for(let k=0;k<24;k++)candidates.push({x:p.pertX+p.pertThetaE*Math.cos(k*Math.PI/12),y:p.pertY+p.pertThetaE*Math.sin(k*Math.PI/12)});
 const images=[];
 for(const candidate of candidates){
  let x=candidate.x,y=candidate.y;
  for(let k=0;k<45;k++){
   const s=lensEquation(x,y,p),fx=s.bx-source.x,fy=s.by-source.y,error=Math.hypot(fx,fy);
   if(error<1e-9)break;
   const {a,b,c,d,det}=jacobian(x,y,p);if(Math.abs(det)<1e-12)break;
   const dx=(d*fx-b*fy)/det,dy=(a*fy-c*fx)/det;
   let scale=Math.min(1,.6/Math.max(Math.hypot(dx,dy),1e-10));
   // A short line search makes caustic-adjacent roots stable while dragging.
   for(let attempt=0;attempt<6;attempt++){
    const trial=lensEquation(x-scale*dx,y-scale*dy,p);
    if(Math.hypot(trial.bx-source.x,trial.by-source.y)<error)break;
    scale*=.5;
   }
   x-=dx*scale;y-=dy*scale;
   if(!Number.isFinite(x+y)||Math.hypot(x,y)>FIELD*2)break;
  }
  if(Math.abs(x)>FIELD||Math.abs(y)>FIELD||Math.hypot(x-p.cx,y-p.cy)<1e-6)continue;
  const s=lensEquation(x,y,p);
  if(Math.hypot(s.bx-source.x,s.by-source.y)>1e-7)continue;
  if(images.some(im=>Math.hypot(im.x-x,im.y-y)<1e-4))continue;
  const det=jacobian(x,y,p).det;
  if(!Number.isFinite(det))continue;
  images.push({x,y,mu:Math.abs(1/det),parity:det>0?1:-1});
 }
 return images.sort((a,b)=>b.mu-a.mu);
}

function tangentialCaustic(p,angle){
 const dx=Math.cos(angle),dy=Math.sin(angle);let previous=.03,prev=jacobian(p.cx+previous*dx,p.cy+previous*dy,p).det,last=null;
 for(let k=1;k<=180;k++){
  const radius=.03+k*(2.9-.03)/180,value=jacobian(p.cx+radius*dx,p.cy+radius*dy,p).det;
  if(value*prev<0){let lo=previous,hi=radius,lv=prev;for(let j=0;j<40;j++){const mid=(lo+hi)/2,mv=jacobian(p.cx+mid*dx,p.cy+mid*dy,p).det;if(lv*mv<0)hi=mid;else{lo=mid;lv=mv;}}last=(lo+hi)/2;}
  previous=radius;prev=value;
 }
 const s=lensEquation(p.cx+last*dx,p.cy+last*dy,p);return {x:s.bx,y:s.by};
}
export function preset(name){
 const p={...DEFAULTS};let source={x:.05,y:.02};
 if(name==='double')source={x:.65,y:.4};
 if(name==='cusp'||name==='fold'){
  p.shear=0;p.q=.65;
  const boundary=tangentialCaustic(p,name==='cusp'?Math.PI/2:Math.PI/4);
  source={x:boundary.x*.94,y:boundary.y*.94};
 }
 if(name==='ring'){p.q=1;p.shear=0;p.galQ=1;p.galReff=.09;source={x:0,y:0};}
 return {params:p,source};
}
export function renderBrightness(p,source,cache,sourceField=1.2){
 const {n,bx,by}=cache,src=new Float64Array(n*n),img=new Float64Array(n*n);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const k=j*n+i,x=-sourceField+2*sourceField*(i+.5)/n,y=sourceField-2*sourceField*(j+.5)/n;
  src[k]=sersicBrightness(x-source.x,y-source.y,p);
  img[k]=sersicBrightness(bx[k]-source.x,by[k]-source.y,p);
 }
 // Fixed, identical exposure in both planes preserves surface-brightness comparisons
 // and lets the brightness slider change the display without being normalized away.
 const denominator=Math.asinh(8),normalization=8/2.5;
 function colorize(values){const pixels=new Uint8ClampedArray(n*n*4);for(let k=0;k<values.length;k++){
  const f=Math.min(1,Math.asinh(values[k]*normalization)/denominator),i=k*4;
  pixels[i]=Math.round(45*f+200*f*f*f);pixels[i+1]=Math.round(110*f+140*f*f);pixels[i+2]=Math.round(220*f+35*f*f);pixels[i+3]=Math.round(255*Math.min(1,3*f));
 }return pixels;}
 return {sourcePixels:colorize(src),imagePixels:colorize(img)};
}
