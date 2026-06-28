/* Вайрфрейм-сфера на canvas (#bg-sphere). Тёмная тема: неон-штрих + свечение,
   лёгкое влияние курсора, fade задних граней. Уважает prefers-reduced-motion.
   Происхождение: стеш elocate (sphere3d.js), перекрашен и оптимизирован под редизайн.

   Оптимизация: стиль ставится РАЗ НА ЛИНИЮ (а не на точку — раньше ~2500 смен
   состояния/кадр впустую), DPR кап 1.5, лёгкая геометрия, и анимация ПАУЗИТСЯ,
   когда hero ушёл со скролла (IntersectionObserver). */
export function initSphere() {
  const canvas = document.getElementById('bg-sphere');
  if (!canvas) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduced) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const BASE_W = 1920, BASE_H = 1080;
  let dpr = 1, w = 0, h = 0;
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let mx = mouseX, my = mouseY;
  const lerp = (a, b, t) => a + (b - a) * t;

  function resize() {
    dpr = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1)); // кап 1.5 — меньше пикселей чистить
    w = Math.max(1, canvas.clientWidth || innerWidth);
    h = Math.max(1, canvas.clientHeight || innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Геометрия слегка облегчена (меньше точек на кадр).
  function buildSphere(linesLat = 8, linesLon = 12, segments = 72) {
    const lines = [];
    for (let i = 1; i <= linesLat; i++) {
      const phi = (i / (linesLat + 1) - 0.5) * Math.PI;
      const r = Math.cos(phi), y = Math.sin(phi);
      const ring = [];
      for (let s = 0; s <= segments; s++) {
        const t = (s / segments) * Math.PI * 2;
        ring.push([Math.cos(t) * r, y, Math.sin(t) * r]);
      }
      lines.push(ring);
    }
    for (let j = 0; j < linesLon; j++) {
      const theta0 = (j / linesLon) * Math.PI * 2;
      const meridian = [];
      for (let s = 0; s <= segments; s++) {
        const phi = (s / segments - 0.5) * Math.PI;
        const r = Math.cos(phi), y = Math.sin(phi);
        meridian.push([Math.cos(theta0) * r, y, Math.sin(theta0) * r]);
      }
      lines.push(meridian);
    }
    return lines;
  }

  const lines = buildSphere();
  // буфер проекции переиспользуем — без аллокаций в кадре
  const maxLen = Math.max(...lines.map((l) => l.length));
  const px = new Float32Array(maxLen);
  const py = new Float32Array(maxLen);

  // цвет штриха — из токена темы; обновляем по событию смены темы (без чтения в кадре)
  let stroke = 'rgb(63, 197, 104)';
  const readStroke = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--sphere-stroke').trim();
    if (v) stroke = v;
  };
  readStroke();
  addEventListener('themechange', readStroke);

  function draw(ts) {
    const t = ts * 0.001;
    mx = lerp(mx, mouseX, 0.08);
    my = lerp(my, mouseY, 0.08);
    ctx.clearRect(0, 0, w, h);

    const scale = Math.min(w / BASE_W, h / BASE_H);
    const cx = w * 0.5, cy = h * 0.5;
    const radius = Math.max(150, 300 * Math.max(scale, 0.55));

    const nx = (mx / Math.max(w, 1)) * 2 - 1;
    const ny = (my / Math.max(h, 1)) * 2 - 1;
    const ax = ny * 0.32 + Math.sin(t * 0.5) * 0.1;
    const ay = nx * 0.5 + t * 0.28;
    const cyy = Math.cos(ay), syy = Math.sin(ay);
    const cxx = Math.cos(ax), sxx = Math.sin(ax);
    const depth = 2.8;

    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; // из токена --sphere-stroke (адаптируется к теме)

    for (const line of lines) {
      const n = line.length;
      let sumFade = 0;
      for (let i = 0; i < n; i++) {
        const v = line[i];
        // rotate Y → X (инлайн, без вызовов/аллокаций)
        const x1 = v[0] * cyy + v[2] * syy;
        const z1 = -v[0] * syy + v[2] * cyy;
        const y2 = v[1] * cxx - z1 * sxx;
        const z2 = v[1] * sxx + z1 * cxx;
        const p = depth / (depth - z2);
        px[i] = cx + x1 * radius * p;
        py[i] = cy + y2 * radius * p;
        sumFade += Math.max(0, Math.min(1, (p - 0.62) / 0.7));
      }
      const fade = sumFade / n; // средняя «лицевость» линии
      if (fade < 0.06) continue; // полностью задние линии не рисуем

      ctx.globalAlpha = 0.08 + 0.62 * fade;
      ctx.lineWidth = 0.6 + 0.8 * fade;
      ctx.beginPath();
      ctx.moveTo(px[0], py[0]);
      for (let i = 1; i < n; i++) ctx.lineTo(px[i], py[i]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ── цикл с паузой, когда hero вне экрана ──
  let running = false;
  let rafId = 0;
  function loop(ts) {
    if (!running) return;
    draw(ts);
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (!running) { running = true; rafId = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });
  addEventListener('resize', resize, { passive: true });
  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 }
    ).observe(canvas);
  } else {
    start();
  }
}
