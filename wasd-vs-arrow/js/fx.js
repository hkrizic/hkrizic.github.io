// Particles: bursts, confetti, dust puffs, shockwave rings. Opaque bits shrink away instead of fading, which
// keeps them cheap (no transparency sorting) and looks like stylised toy-commercial effects.
import * as THREE from 'three';
import { sharedGeo, vinyl, PAL } from './engine.js';
import { starGeo } from './figures.js';
import { rand, pick } from './util.js';

const GEO = {
  sphere: () => sharedGeo('fx:sphere', () => new THREE.SphereGeometry(1, 12, 8)),
  box: () => sharedGeo('fx:box', () => new THREE.BoxGeometry(1, 1, 1)),
  confetti: () => sharedGeo('fx:confetti', () => new THREE.PlaneGeometry(1, 0.55)),
  star: () => starGeo(),
  ring: () => sharedGeo('fx:ring', () => new THREE.RingGeometry(0.82, 1, 48)),
  drop: () => sharedGeo('fx:drop', () => new THREE.CapsuleGeometry(0.5, 0.6, 4, 10)),
};
export const CONFETTI = [PAL.coral, PAL.mustard, PAL.teal, PAL.lilac, PAL.pink, PAL.mint, '#FFFFFF'];

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  spawn(geo, material, pos, vel, { size = 0.1, life = 0.8, gravity = -14, drag = 0.5, spin = 0, grow = 0, fade = false, flat = false, floor = -Infinity, sx = 1 } = {}) {
    const m = new THREE.Mesh(GEO[geo](), material);
    m.position.copy(pos);
    if (flat) m.rotation.x = -Math.PI / 2;
    else m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    m.scale.setScalar(size);
    m.castShadow = !fade;
    this.scene.add(m);
    this.items.push({ m, vel: vel.clone(), life, max: life, size, gravity, drag, spin: spin ? new THREE.Vector3(rand(-spin, spin), rand(-spin, spin), rand(-spin, spin)) : null, grow, fade, floor, sx });
    return m;
  }
  burst(pos, color, { n = 14, speed = 4, up = 3, size = 0.09, life = 0.7, gravity = -14, geo = 'sphere', spin = 8 } = {}) {
    const mat = vinyl(color, { rough: 0.35, coat: 0.6 });
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.4, 1) * speed;
      this.spawn(geo, mat, pos, new THREE.Vector3(Math.cos(a) * s, rand(0.3, 1) * up, Math.sin(a) * s), { size: size * rand(0.6, 1.3), life: life * rand(0.7, 1.2), gravity, spin, floor: 0.02 });
    }
  }
  stars(pos, n = 6) { this.burst(pos, PAL.mustard, { n, geo: 'star', size: 0.09, speed: 3, up: 4, life: 0.8, spin: 10 }); }
  confetti(pos, { n = 70, spread = 1.5, up = 7, colors = CONFETTI } = {}) {
    for (let i = 0; i < n; i++) {
      const mat = vinyl(pick(colors), { rough: 0.5, coat: 0.2, side: THREE.DoubleSide });
      const p = pos.clone().add(new THREE.Vector3(rand(-spread, spread), rand(0, 0.5), rand(-spread, spread)));
      this.spawn('confetti', mat, p, new THREE.Vector3(rand(-3, 3), rand(0.5, 1) * up, rand(-3, 3)), { size: rand(0.08, 0.14), life: rand(1.8, 3), gravity: -6, drag: 2.2, spin: 12, floor: 0.01 });
    }
  }
  puff(pos, { n = 6, color = '#FFFFFF', size = 0.22, speed = 1.6, up = 0.8, life = 0.6 } = {}) {
    const mat = vinyl(color, { rough: 0.8, coat: 0 });
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      this.spawn('sphere', mat, pos, new THREE.Vector3(Math.cos(a) * speed, rand(0.2, 1) * up, Math.sin(a) * speed), { size: size * rand(0.6, 1.2), life: life * rand(0.7, 1.2), gravity: 1.5, drag: 3, grow: 1.4 });
    }
  }
  shockwave(pos, color, { size = 2.2, life = 0.45 } = {}) {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
    const p = pos.clone(); p.y = Math.max(p.y, 0.05);
    this.spawn('ring', mat, p, new THREE.Vector3(), { size: 0.2, life, gravity: 0, drag: 0, flat: true, grow: size / life, fade: true });
  }
  // a single sphere that swells and fades (fireballs)
  blob(pos, color, { size = 1.5, life = 0.5, emissive = false } = {}) {
    const mat = emissive
      ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.9, roughness: 0.9, depthWrite: false });
    this.spawn('sphere', mat, pos, new THREE.Vector3(0, 0.6, 0), { size: size * 0.3, life, gravity: 0, drag: 0, grow: size / life, fade: true });
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.life <= 0) {
        this.scene.remove(it.m);
        if (it.fade) it.m.material.dispose();
        this.items.splice(i, 1);
        continue;
      }
      it.vel.y += it.gravity * dt;
      it.vel.multiplyScalar(Math.exp(-it.drag * dt));
      it.m.position.addScaledVector(it.vel, dt);
      if (it.m.position.y < it.floor) { it.m.position.y = it.floor; it.vel.y *= -0.35; it.vel.x *= 0.6; it.vel.z *= 0.6; }
      if (it.spin) { it.m.rotation.x += it.spin.x * dt; it.m.rotation.y += it.spin.y * dt; it.m.rotation.z += it.spin.z * dt; }
      const k = it.life / it.max;
      if (it.fade) {
        it.size += it.grow * dt;
        it.m.scale.setScalar(it.size);
        it.m.material.opacity = Math.min(1, k * 1.6) * 0.9;
      } else {
        if (it.grow) it.size += it.grow * it.size * dt;
        const s = it.size * Math.min(1, k / 0.35);
        it.m.scale.setScalar(s);
      }
    }
  }
  clear() {
    for (const it of this.items) { this.scene.remove(it.m); if (it.fade) it.m.material.dispose(); }
    this.items = [];
  }
}
