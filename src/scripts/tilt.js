/* Лёгкий 3D-тилт на mousemove для элементов [data-tilt]. Off на reduced-motion / тач. */
export function initTilt() {
  const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!fine || reduced) return;

  const MAX = 9; // градусов
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.style.transformStyle = 'preserve-3d';
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(800px) rotateY(${px * MAX}deg) rotateX(${-py * MAX}deg)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}
