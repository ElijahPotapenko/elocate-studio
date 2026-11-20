/* Прелоадер: держит экран до готовности шрифтов + window.load, минимум MIN_VISIBLE мс (не мелькает
   на быстром интернете), максимум HARD_TIMEOUT мс (не виснет навечно, если что-то не догрузилось). */
export function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const MIN_VISIBLE = reduced ? 0 : 450;
  const HARD_TIMEOUT = 4000;
  const bar = loader.querySelector('.loader-bar span');
  const pct = loader.querySelector('.loader-pct');
  const t0 = performance.now();
  let hidden = false;

  document.documentElement.classList.add('loading');

  let last = 0;
  const setProgress = (p, force) => {
    const v = Math.min(100, Math.max(0, Math.round(p)));
    if (!force && v < last) return; // прогресс никогда не идёт назад
    last = v;
    if (bar) bar.style.width = v + '%';
    if (pct) pct.textContent = v + '%';
  };
  setProgress(20);

  document.fonts?.ready?.then(() => setProgress(65)).catch(() => {});

  // на медленном проде между 65% (шрифты) и 90% (load) реальных событий нет —
  // без этого цифра зависает на одном числе несколько секунд, выглядит сломанной.
  let creep = 20;
  const creepTimer = setInterval(() => {
    creep = Math.min(85, creep + 1);
    if (creep > 20) setProgress(creep);
  }, 120);

  function hide() {
    if (hidden) return;
    hidden = true;
    clearInterval(creepTimer);
    setProgress(100, true);
    const wait = Math.max(0, MIN_VISIBLE - (performance.now() - t0));
    setTimeout(() => {
      loader.classList.add('loader-hide');
      document.documentElement.classList.remove('loading');
      setTimeout(() => loader.remove(), 600);
    }, wait);
  }

  if (document.readyState === 'complete') { setProgress(90); hide(); }
  else addEventListener('load', () => { setProgress(90); hide(); }, { once: true });

  setTimeout(hide, HARD_TIMEOUT);
}
