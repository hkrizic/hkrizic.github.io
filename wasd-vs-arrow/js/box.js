// The collector box: a printed cardboard window box, one per team, with the figure standing inside.
// Front panel is a real door — it swings open when the player is ready and the figure hops out.
import * as THREE from 'three';
import { TEAM, PAL, FONT, SCRIPT, canvasTexture, matte, mesh } from './engine.js';
import { tween, ease } from './util.js';

const W = 1.4, H = 2.0, D = 0.92, T = 0.025;
const WIN = { x0: -0.56, x1: 0.56, y0: 0.4, y1: 1.68 }; // window cut-out, box coordinates
const PX = 400; // texture pixels per unit
export const BOX = { W, H, D, floor: WIN.y0 };

function stripes(g, w, h, color, gap = 34, width = 12) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  for (let x = -h; x < w + h; x += gap) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke(); }
  g.restore();
}
function keyChip(g, x, y, s, label, color) {
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.beginPath(); g.roundRect(x, y + s * 0.12, s, s, s * 0.22); g.fill();
  g.fillStyle = '#FFFFFF';
  g.beginPath(); g.roundRect(x, y, s, s, s * 0.22); g.fill();
  g.fillStyle = color;
  g.font = `800 ${s * 0.62}px ${FONT}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, x + s / 2, y + s / 2 + s * 0.04);
}
function fitText(g, text, maxW, size, weight = 800, font = FONT) {
  let s = size;
  do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

export class CollectorBox {
  constructor(team) {
    this.T = TEAM[team];
    this.team = team;
    this.group = new THREE.Group();
    this.inner = new THREE.Group(); // squash/bounce without moving the placement
    this.group.add(this.inner);
    this.look = null;

    const T_ = this.T;
    // ----- printed textures
    this.frontTex = canvasTexture(W * PX, H * PX, () => {});
    this.sideTex = canvasTexture(D * PX, H * PX, () => {});
    const backTex = canvasTexture(W * PX, H * PX, (g, w, h) => this.drawBack(g, w, h));
    const topTex = canvasTexture(W * PX, D * PX, (g, w, h) => {
      g.fillStyle = T_.dark; g.fillRect(0, 0, w, h);
      stripes(g, w, h, 'rgba(255,255,255,0.08)');
      g.fillStyle = '#FFFFFF';
      g.font = `800 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`TEAM ${T_.name}`, w / 2, h / 2);
    });
    const card = c => new THREE.MeshStandardMaterial({ map: c, roughness: 0.62, metalness: 0 });
    const inside = matte(T_.light, { rough: 0.85 });
    const plain = matte(T_.dark, { rough: 0.7 });

    // back (printed inside), sides, top, floor
    const back = mesh(new THREE.BoxGeometry(W, H, T), [plain, plain, plain, plain, card(backTex), plain]);
    back.position.set(0, H / 2, -D / 2);
    const sideMat = card(this.sideTex);
    const left = mesh(new THREE.BoxGeometry(T, H, D), [inside, sideMat, plain, plain, plain, plain]);
    left.position.set(-W / 2, H / 2, 0);
    const right = mesh(new THREE.BoxGeometry(T, H, D), [sideMat, inside, plain, plain, plain, plain]);
    right.position.set(W / 2, H / 2, 0);
    const top = mesh(new THREE.BoxGeometry(W + T, T, D + T), [plain, plain, card(topTex), inside, plain, plain]);
    top.position.set(0, H, 0);
    // the inner step the figure stands on, level with the bottom of the window
    const step = mesh(new THREE.BoxGeometry(W - T, WIN.y0, D - T), [inside, inside, matte(T_.color, { rough: 0.7 }), plain, plain, plain]);
    step.position.set(0, WIN.y0 / 2, 0);
    this.inner.add(back, left, right, top, step);

    // ----- the front door: printed frame with a window hole (+ plastic sheet)
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const hole = new THREE.Path();
    const r = 0.07;
    hole.moveTo(WIN.x0 + r, WIN.y0);
    hole.lineTo(WIN.x1 - r, WIN.y0); hole.quadraticCurveTo(WIN.x1, WIN.y0, WIN.x1, WIN.y0 + r);
    hole.lineTo(WIN.x1, WIN.y1 - r); hole.quadraticCurveTo(WIN.x1, WIN.y1, WIN.x1 - r, WIN.y1);
    hole.lineTo(WIN.x0 + r, WIN.y1); hole.quadraticCurveTo(WIN.x0, WIN.y1, WIN.x0, WIN.y1 - r);
    hole.lineTo(WIN.x0, WIN.y0 + r); hole.quadraticCurveTo(WIN.x0, WIN.y0, WIN.x0 + r, WIN.y0);
    s.holes.push(hole);
    const frontGeo = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 6 });
    this.frontTex.repeat.set(1 / W, 1 / H);
    this.frontTex.offset.set(0.5, 0);
    const front = mesh(frontGeo, [card(this.frontTex), plain]);
    const hinge = team === 0 ? -W / 2 : W / 2;
    this.door = new THREE.Group();
    this.door.position.set(hinge, 0, D / 2 - T);
    front.position.x = -hinge;
    this.door.add(front);
    // plastic window: a faint sheen with diagonal glare streaks
    const glare = canvasTexture(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const streak = (x, wd, a) => {
        const gr = g.createLinearGradient(x, 0, x + wd, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save(); g.translate(w / 2, h / 2); g.rotate(-0.5); g.translate(-w / 2, -h / 2);
        g.fillStyle = gr; g.fillRect(x, -h, wd, h * 3); g.restore();
      };
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, 0, w, h);
      streak(40, 50, 0.32); streak(105, 16, 0.22); streak(190, 36, 0.14);
    });
    const plastic = new THREE.Mesh(new THREE.PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), new THREE.MeshBasicMaterial({ map: glare, transparent: true, depthWrite: false, toneMapped: false }));
    plastic.position.set((WIN.x0 + WIN.x1) / 2 - hinge, (WIN.y0 + WIN.y1) / 2, T + 0.002);
    plastic.renderOrder = 5;
    this.door.add(plastic);
    this.inner.add(this.door);

    // where the figure stands
    this.slot = new THREE.Group();
    this.slot.position.set(0, WIN.y0, -0.06);
    this.inner.add(this.slot);
    this.open = false;
  }

  drawBack(g, w, h) {
    const T_ = this.T;
    g.fillStyle = T_.light; g.fillRect(0, 0, w, h);
    // sunburst behind the figure
    const cx = w / 2, cy = h * 0.42;
    g.save(); g.translate(cx, cy);
    for (let i = 0; i < 24; i++) {
      g.rotate(Math.PI * 2 / 24);
      if (i % 2) continue;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -h); g.lineTo(60, -h); g.closePath(); g.fill();
    }
    g.restore();
    // a scatter of tiny key legends
    g.font = `800 34px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = T_.color + '40';
    let n = 0;
    for (let y = 30; y < h; y += 70) for (let x = 30 + (y / 70 % 2) * 35; x < w; x += 70) g.fillText(T_.keys[n++ % 4], x, y);
    // soft floor shadow
    const gr = g.createRadialGradient(cx, h - 40, 10, cx, h - 40, 280);
    gr.addColorStop(0, 'rgba(35,43,69,0.18)'); gr.addColorStop(1, 'rgba(35,43,69,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }

  drawFront(look) {
    const T_ = this.T;
    this.frontTex.userData.redraw((g, w, h) => {
      g.fillStyle = T_.color; g.fillRect(0, 0, w, h);
      stripes(g, w, h, 'rgba(255,255,255,0.09)', 40, 14);
      const y = v => h - v * PX; // box units → canvas y
      // header: logo badge + collector number
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.roundRect(30, 22, 330, 92, 46); g.fill();
      g.fillStyle = PAL.ink; g.font = `800 40px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('WASD', 56, 70);
      g.fillStyle = PAL.mustard; g.font = `44px ${SCRIPT}`;
      g.fillText('vs', 172, 64);
      g.fillStyle = PAL.ink; g.font = `800 40px ${FONT}`;
      g.fillText('ARROW', 220, 70);
      g.fillStyle = PAL.ink;
      g.beginPath(); g.arc(w - 74, 68, 50, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#FFFFFF'; g.font = `800 48px ${FONT}`; g.textAlign = 'center';
      g.fillText(look.no ? String(look.no).padStart(2, '0') : '??', w - 74, 71);
      // window outline (printed)
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 10;
      g.beginPath(); g.roundRect((WIN.x0 + W / 2) * PX - 8, y(WIN.y1) - 8, (WIN.x1 - WIN.x0) * PX + 16, (WIN.y1 - WIN.y0) * PX + 16, 34); g.stroke();
      // side margins: team keys
      const s = 34;
      T_.keys.forEach((k, i) => keyChip(g, 7, y(WIN.y1) + 40 + i * 62, s, k, T_.color));
      T_.keys.forEach((k, i) => keyChip(g, w - s - 9, y(WIN.y1) + 40 + i * 62, s, k, T_.color));
      // name plate
      g.fillStyle = '#FFFFFF';
      g.beginPath(); g.roundRect(26, y(WIN.y0) + 22, w - 52, 118, 26); g.fill();
      g.fillStyle = PAL.ink; g.textAlign = 'center';
      fitText(g, look.name, w - 100, 68);
      g.fillText(look.name, w / 2, y(WIN.y0) + 72);
      g.font = `700 22px ${FONT}`; g.fillStyle = T_.dark;
      g.fillText(`VINYL FIGURE  ·  TEAM ${T_.name}`, w / 2, y(WIN.y0) + 118);
    });
    this.sideTex.userData.redraw((g, w, h) => {
      g.fillStyle = T_.color; g.fillRect(0, 0, w, h);
      stripes(g, w, h, 'rgba(255,255,255,0.09)', 40, 14);
      g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
      g.fillStyle = '#FFFFFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
      fitText(g, T_.name, h - 220, 190);
      g.fillText(T_.name, 0, -30);
      g.font = `700 40px ${FONT}`; g.fillStyle = T_.dark;
      g.fillText(`#${look.no ? String(look.no).padStart(2, '0') : '??'}  ${look.name}`, 0, 110);
      g.restore();
      T_.keys.forEach((k, i) => keyChip(g, w / 2 - 110 + i * 58, h - 110, 48, k, T_.color));
    });
  }

  setLook(look) { this.look = look; this.drawFront(look); }
  bounce() {
    tween(0.45, k => { const s = Math.sin(k * Math.PI) * (1 - k); this.inner.scale.set(1 + s * 0.08, 1 - s * 0.1, 1 + s * 0.08); }, { ease: ease.linear });
  }
  setOpen(open) {
    if (open === this.open) return;
    this.open = open;
    const from = this.door.rotation.y, to = open ? (this.team === 0 ? -1.9 : 1.9) : 0;
    tween(0.55, k => { this.door.rotation.y = from + (to - from) * k; }, { ease: open ? ease.outBack : ease.outCubic });
  }
  // world position just in front of the box (where a freed figure stands)
  frontSpot(target = new THREE.Vector3()) {
    return this.group.localToWorld(target.set(0, 0, D / 2 + 0.55));
  }
}
