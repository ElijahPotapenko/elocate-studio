/* Покадровый плеер: крутим JPG-секвенцию на <canvas> через requestAnimationFrame.
   Полный контроль, БЕЗ autoplay-политик/кодеков/конфликтов с браузером — мы сами решаем,
   когда играть. Тайминг привязан ко времени (стабильно при любом refresh-rate).

   Гейт: на мобиле и при prefers-reduced-motion крутим НЕ анимацию, а только постер-кадр
   (100+ декодированных кадров — это память, незачем грузить телефон). Пауза за кадром (IO). */
export function initFramePlayers() {
  document.querySelectorAll('canvas.work-frames').forEach(setup);

  function setup(cv) {
    const ctx = cv.getContext('2d');
    const base = cv.dataset.base;
    const ext = cv.dataset.ext || 'jpg';
    const count = +cv.dataset.count;
    const fps = +cv.dataset.fps || 12;
    const pad = +cv.dataset.pad || 3;
    const W = +cv.dataset.w || 480;
    const H = +cv.dataset.h || 360;
    if (!base || !count) return;

    cv.width = W; cv.height = H;
    const url = (i) => `${base}${String(i).padStart(pad, '0')}.${ext}`;

    // постер всегда (10-й кадр — fade-in уже прошёл, не чёрный)
    const poster = new Image();
    poster.onload = () => { if (!playing) ctx.drawImage(poster, 0, 0, W, H); };
    poster.src = url(Math.min(10, count));

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const heavyOK = window.matchMedia?.('(min-width: 740px)')?.matches;
    if (reduced || !heavyOK) return; // только постер — без преза 100+ кадров

    const frames = new Array(count + 1);
    let playing = false, raf = 0, cur = 1, last = 0, preStarted = false;
    const step = 1000 / fps;

    function preload() {
      if (preStarted) return;
      preStarted = true;
      for (let i = 1; i <= count; i++) {
        const img = new Image();
        img.src = url(i);
        frames[i] = img;
      }
    }
    function loop(ts) {
      if (!playing) return;
      if (!last) last = ts;
      const adv = Math.floor((ts - last) / step);
      if (adv > 0) {
        cur = ((cur - 1 + adv) % count) + 1;
        last += adv * step;
        const img = frames[cur];
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, W, H);
      }
      raf = requestAnimationFrame(loop);
    }
    function play() { if (!playing) { playing = true; last = 0; raf = requestAnimationFrame(loop); } }
    function pause() { playing = false; cancelAnimationFrame(raf); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { preload(); play(); } else pause();
      }, { threshold: 0.2 }).observe(cv);
    } else {
      preload(); play();
    }
  }
}
