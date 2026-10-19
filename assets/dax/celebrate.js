// A short confetti + glitter burst for a correct solution. Drawn on a canvas (no inline styles, CSP-safe),
// skipped entirely for visitors who prefer reduced motion, and removed from the page when it finishes.
const COLORS = ['#245e53', '#3f8f7b', '#8fd6b5', '#f0cf8a', '#f6b17a', '#ec7fa9', '#9ec9ff', '#ffffff'];

export function celebrate({ duration = 3800 } = {}) {
  if (typeof document === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'dax-confetti';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); };
  resize();
  addEventListener('resize', resize);

  const rand = (a, b) => a + Math.random() * (b - a);
  const count = Math.min(220, Math.round(innerWidth / 5));
  // two cannons at the bottom corners plus a soft rain from the top
  const pieces = Array.from({ length: count }, (_, i) => {
    const cannon = i % 3;
    const fromLeft = cannon === 0, fromRight = cannon === 1;
    const x = fromLeft ? rand(0, innerWidth * 0.1) : fromRight ? rand(innerWidth * 0.9, innerWidth) : rand(0, innerWidth);
    const y = cannon === 2 ? rand(-innerHeight * 0.3, 0) : innerHeight + 10;
    const angle = fromLeft ? rand(-1.35, -0.7) : fromRight ? rand(-2.4, -1.8) : Math.PI / 2 + rand(-0.4, 0.4);
    const speed = cannon === 2 ? rand(1, 3) : rand(11, 20);
    return {
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: rand(5, 11), color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() < 0.55 ? 'rect' : Math.random() < 0.5 ? 'circle' : 'star',
      rot: rand(0, Math.PI * 2), vr: rand(-0.25, 0.25), tilt: rand(0, Math.PI * 2), tiltSpeed: rand(0.05, 0.2),
      twinkle: rand(0, Math.PI * 2), glitter: Math.random() < 0.35, life: rand(0.75, 1),
    };
  });

  const star = (r) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  };

  const start = performance.now();
  let raf = 0;
  const frame = now => {
    const t = (now - start) / duration;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of pieces) {
      p.vy += 0.38; p.vx *= 0.992; p.vy *= 0.992;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.tilt += p.tiltSpeed; p.twinkle += 0.3;
      const fade = Math.max(0, Math.min(1, (p.life - t) * 3));
      if (fade <= 0) continue;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = fade * (p.glitter ? 0.55 + 0.45 * Math.abs(Math.sin(p.twinkle)) : 1);
      ctx.fillStyle = p.color;
      if (p.glitter) { ctx.shadowColor = p.color; ctx.shadowBlur = 10; }
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, (-p.size / 4) * Math.abs(Math.cos(p.tilt)) - 1, p.size, (p.size / 2) * Math.abs(Math.cos(p.tilt)) + 2);
      else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else star(p.size * 0.8);
      ctx.restore();
    }
    if (t < 1) raf = requestAnimationFrame(frame);
    else { removeEventListener('resize', resize); canvas.remove(); }
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); canvas.remove(); };
}
