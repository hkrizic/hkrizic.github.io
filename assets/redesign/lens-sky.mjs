// A lensed galaxy field rendered like a space-telescope colour composite rather than a glow effect.
// Everything is accumulated as linear flux per channel (red, green, blue ~ long, middle, short
// infrared filters) and only then mapped to the screen with an asinh stretch (Lupton et al. 2004).
// Point sources get a chromatic, JWST-like PSF with six hexagonal diffraction spikes; the sky has
// detector noise. The field (lens galaxy, stars, background galaxies, noise) is static and drawn once
// per size into a texture; the lensed host galaxy and quasar images are drawn every frame on top.

const VERTEX = 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';

// Linear flux is stored in an 8-bit texture as asinh(flux / ENCODE_SOFT), which keeps sky noise and
// bright galaxy cores within one byte per channel.
const ENCODE_SOFT = '2.', ENCODE_RANGE = '11.5';

const COMMON = `precision highp float;
uniform vec2 resolution;
const vec3 LAMBDA=vec3(1.25,1.,.8);
vec2 fieldPosition(){return (gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y)*2.5;}
float hash(vec2 p){vec3 q=fract(p.xyx*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float gauss(vec2 p){return sqrt(-2.*log(max(hash(p),1e-6)))*cos(6.2832*hash(p+17.17));}
vec3 gauss3(vec2 p){return .55*gauss(p)+.45*vec3(gauss(p+31.7),gauss(p+57.3),gauss(p+83.9));}
mat2 rotation(float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float sersic(float r,float re,float n){return exp(-(2.*n-.33)*(pow(r/re,1./n)-1.));}
vec3 asinh3(vec3 x){return sign(x)*log(abs(x)+sqrt(x*x+1.));}
// Point-spread function: a diffraction core and first hexagonal ring, a scattered-light halo and
// three diffraction-spike axes (six spikes) plus the fainter horizontal pair from the support strut.
// Every term scales with wavelength, so the spikes are longer and redder in the red channel.
vec3 psf(vec2 o,float flux){
 float d2=dot(o,o);
 if(flux<=0.||d2>.12)return vec3(0.);
 vec3 s=.0105*LAMBDA,s2=s*s;
 vec3 core=exp(-.5*d2/s2)/(6.2832*s2);
 vec3 a2=9.*s2;
 vec3 halo=1.5/(3.1416*a2)*pow(1.+d2/a2,vec3(-2.5));
 float d=sqrt(d2),angle=atan(o.y,o.x);
 vec3 ring=exp(-pow((d-3.3*s)/(.9*s),vec3(2.)))*(1.+.45*cos(6.*angle-3.1416))/(18.*s2);
 vec3 spikes=vec3(0.);
 for(int k=0;k<4;k++){
  float spikeAngle=k==3?0.:1.5708+float(k)*1.0472;
  vec2 dir=vec2(cos(spikeAngle),sin(spikeAngle));
  float along=abs(dot(o,dir)),across=dot(o,vec2(-dir.y,dir.x));
  vec3 width=.32*s;
  vec3 profile=exp(-.5*across*across/(width*width))/(2.5066*width);
  vec3 beads=.72+.28*cos(6.2832*along/(.021*LAMBDA));
  spikes+=(k==3?.3:1.)*profile*beads*LAMBDA/(along*along+4.*s2);
 }
 return flux*(.8*core+.13*halo+.02*ring+5e-5*spikes);
}
`;

const FIELD_SHADER = `${COMMON}
uniform float lensAngle;uniform float seed;uniform vec4 stars[2];uniform vec4 companion;
void main(){
 vec2 p=fieldPosition();
 vec3 f=vec3(0.);
 // Foreground lens: a de Vaucouleurs elliptical whose major axis follows the mass model.
 vec2 a=rotation(-lensAngle)*p;
 float r=sqrt(a.x*a.x/.76+a.y*a.y*.76+1.2e-4);
 f+=vec3(1.3,1.,.7)*9.*sersic(r,.4,4.);
 // A small group member next to the lens.
 vec2 c=rotation(-.6)*(p-companion.xy);
 f+=vec3(1.3,1.,.72)*companion.w*sersic(sqrt(c.x*c.x/.7+c.y*c.y*.7+4e-5),companion.z,3.);
 // Foreground stars.
 for(int i=0;i<2;i++)f+=vec3(1.1,1.,.88)*psf(p-stars[i].xy,stars[i].z);
 // Unrelated background galaxies: many faint and compact, a few larger ellipticals and spirals.
 for(int i=0;i<38;i++){
  float n=float(i)+seed*41.;
  vec2 center=(vec2(hash(vec2(n,1.3)),hash(vec2(n,7.1)))-.5)*vec2(6.,3.6);
  if(length(center)<1.1)continue;
  vec2 o=p-center;
  float kind=hash(vec2(n,3.7)),u=hash(vec2(n,5.9)),q=.3+.65*hash(vec2(n,9.2));
  float size=.008+.05*u*u*u;
  if(dot(o,o)>100.*size*size)continue;
  vec2 e=rotation(6.2832*hash(vec2(n,11.4)))*o;
  float radius=sqrt(e.x*e.x*q+e.y*e.y/q+2e-5);
  float bright=3.+55.*pow(hash(vec2(n,13.3)),5.);
  float tint=hash(vec2(n,15.8));
  if(kind<.35)f+=mix(vec3(1.3,1.,.72),vec3(1.9,.85,.42),tint)*bright*sersic(radius,size,4.);
  else if(kind<.8){
   float arms=1.+.7*u*cos(2.*atan(e.y*q,e.x)-5.*log(radius/size+.3));
   f+=mix(vec3(.85,1.,1.18),vec3(1.1,1.,.86),tint)*bright*(.6*arms*sersic(radius,size,1.)+.5*sersic(radius,.3*size,2.5));
  }
  else f+=vec3(2.,.78,.32)*bright*.7*sersic(radius,.6*size,1.5);
 }
 // Detector noise: sky and read noise, plus photon noise from the sources themselves.
 f+=gauss3(gl_FragCoord.xy)*(.85+.09*sqrt(max(f,0.)));
 gl_FragColor=vec4(.5+.5*clamp(asinh3(f/${ENCODE_SOFT})/${ENCODE_RANGE},-1.,1.),1.);
}`;

const SCENE_SHADER = `${COMMON}
uniform sampler2D field;uniform vec2 source;uniform float radius,shear,lensAngle,quasarMode,edgeFade;
uniform vec4 quasars[4];uniform vec3 background;
// Quasar host in the source plane: an inclined exponential disk with a bulge and bluer star-forming
// clumps. Its surface brightness is sampled through the lens equation, so arcs keep the clumps.
vec3 host(vec2 q){
 vec2 d=rotation(.7)*q;
 float r=sqrt(d.x*d.x+d.y*d.y/.42+1e-6);
 float arms=.75+.5*pow(.5+.5*cos(2.*atan(d.y/.65,d.x)-2.6*log(r/.02)),2.);
 vec3 light=vec3(1.6,.9,.5)*60.*exp(-r/.048)*arms;
 light+=vec3(1.5,1.,.66)*70.*exp(-dot(q,q)/(2.*.01*.01));
 const vec3 blue=vec3(.9,1.,1.2);
 light+=blue*22.*exp(-dot(q-vec2(.055,.03),q-vec2(.055,.03))/2.6e-4);
 light+=blue*17.*exp(-dot(q-vec2(-.035,.055),q-vec2(-.035,.055))/2.2e-4);
 light+=blue*20.*exp(-dot(q-vec2(-.07,-.022),q-vec2(-.07,-.022))/2.8e-4);
 light+=blue*14.*exp(-dot(q-vec2(.022,-.068),q-vec2(.022,-.068))/2e-4);
 light+=blue*11.*exp(-dot(q-vec2(.088,-.015),q-vec2(.088,-.015))/2.4e-4);
 return light;
}
void main(){
 vec2 p=fieldPosition(),uv=gl_FragCoord.xy/resolution;
 vec3 stored=(texture2D(field,uv).rgb-.5)*2.*${ENCODE_RANGE};
 vec3 f=${ENCODE_SOFT}*.5*(exp(stored)-exp(-stored));
 // Singular isothermal sphere plus external shear, in the lens frame.
 vec2 a=rotation(-lensAngle)*p;
 float r=max(length(a),1e-4);
 vec3 lensed=host(a-radius*a/r-shear*vec2(a.x,-a.y)-source);
 // Quasar images come from the same lens equation, solved on the CPU.
 if(quasarMode>.5)for(int i=0;i<4;i++)lensed+=vec3(.78,.96,1.3)*psf(p-quasars[i].xy,quasars[i].z);
 f+=lensed+gauss3(gl_FragCoord.xy+91.)*.09*sqrt(max(lensed,0.));
 // Display: asinh stretch, so faint arcs stay visible while bright cores saturate to white.
 vec3 value=asinh3(f/7.)/6.4;
 float fade=mix(1.,smoothstep(0.,.16,uv.y)*smoothstep(0.,.1,1.-uv.y),edgeFade);
 vec3 brighter=background+(1.-background)*min(value,1.)*fade,darker=background*(1.+1.6*max(value,-.6)*fade);
 gl_FragColor=vec4(mix(darker,brighter,step(0.,value)),1.);
}`;

function compile(gl, fragment) {
  const program = gl.createProgram();
  for (const [type, code] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

function locations(gl, program, names) {
  return Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
}

// The homepage and the research demo show different, fixed patches of sky.
const FIELDS = {
  quad: { seed: 1, stars: [1.32, .84, 5, 0, -1.02, -1.02, 1.2, 0], companion: [1.12, -.72, .05, 9] },
  arcs: { seed: 2, stars: [-1.42, .78, 3.5, 0, 1.5, -.9, .8, 0], companion: [-1.05, -.62, .045, 8] }
};

export function createLensSky(gl, { quad = false, lensAngle = 0, background = [0, 0, 0] } = {}) {
  const fieldProgram = compile(gl, FIELD_SHADER), sceneProgram = compile(gl, SCENE_SHADER);
  if (!fieldProgram || !sceneProgram) return null;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const bind = program => {
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  };
  const fieldUniforms = locations(gl, fieldProgram, ['resolution', 'lensAngle', 'seed', 'stars[0]', 'companion']);
  const sceneUniforms = locations(gl, sceneProgram, ['resolution', 'field', 'source', 'radius', 'shear', 'lensAngle', 'quasarMode', 'edgeFade', 'quasars[0]', 'background']);
  const texture = gl.createTexture(), framebuffer = gl.createFramebuffer();
  const patch = quad ? FIELDS.quad : FIELDS.arcs;
  let width = 0, height = 0;

  function resize(w, h) {
    width = w; height = h;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, key, value);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    bind(fieldProgram);
    gl.uniform2f(fieldUniforms.resolution, w, h);
    gl.uniform1f(fieldUniforms.lensAngle, lensAngle);
    gl.uniform1f(fieldUniforms.seed, patch.seed);
    gl.uniform4fv(fieldUniforms['stars[0]'], patch.stars);
    gl.uniform4fv(fieldUniforms.companion, patch.companion);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // quasars: [x, y, flux, 0] per image in canvas coordinates.
  function render({ source, radius, shear, quasars }) {
    if (!width || !height) return;
    gl.viewport(0, 0, width, height);
    bind(sceneProgram);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(sceneUniforms.field, 0);
    gl.uniform2f(sceneUniforms.resolution, width, height);
    gl.uniform2f(sceneUniforms.source, source[0], source[1]);
    gl.uniform1f(sceneUniforms.radius, radius);
    gl.uniform1f(sceneUniforms.shear, shear);
    gl.uniform1f(sceneUniforms.lensAngle, lensAngle);
    gl.uniform1f(sceneUniforms.quasarMode, quad ? 1 : 0);
    gl.uniform1f(sceneUniforms.edgeFade, quad ? 1 : 0);
    gl.uniform3fv(sceneUniforms.background, background);
    if (quasars) gl.uniform4fv(sceneUniforms['quasars[0]'], quasars);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  return { resize, render };
}
