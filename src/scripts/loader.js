/* Прелоадер: держит экран до готовности шрифтов + window.load, минимум MIN_VISIBLE мс (не мелькает
   на быстром интернете), максимум HARD_TIMEOUT мс (не виснет навечно, если что-то не догрузилось). */
export function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const MIN_VISIBLE = reduced ? 0 : 450;
  const HARD_TIMEOUT = 4000;
  const bar = loader.querySelector('.loader-bar span');
  const t0 = performance.now();
  let hidden = false;

  document.documentElement.classList.add('loading');

  const setProgress = (p) => { if (bar) bar.style.width = Math.min(100, Math.max(0, p)) + '%'; };
  setProgress(20);

  document.fonts?.ready?.then(() => setProgress(65)).catch(() => {});

  function hide() {
    if (hidden) return;
    hidden = true;
    setProgress(100);
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
