/* Простой кастомный курсор: белая точка, следует за мышью МГНОВЕННО.
   Без rAF-цикла и без transition на transform → нулевой лаг.
   Включается только на fine-pointer без reduced-motion. Стили — в Layout (.cursor-dot). */
export function initCursor() {
  // ВЫКЛЮЧЕНО по слову Элайджи (2026-11-18): «ломается», несмотря на починенный зазор
  // нативный/точка на навигации (см. комментарий ниже + tests/cursor.spec.ts, зелёные
  // в Chromium И Firefox). Раз живьём всё ещё не ок — не гадать дальше, выключить целиком
  // и вернуться отдельным заходом. Логика ниже не тронута, просто не запускается.
  return;
  // eslint-disable-next-line no-unreachable
  const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!fine || reduced) return;

  const root = document.documentElement;
  // НЕ прячем нативный курсор сразу: .cursor-dot до первого mousemove стоит в (0,0) (левый верхний угол) —
  // если сразу дать cursor:none на <html>, между загрузкой страницы и первым движением мыши не видно НИЧЕГО
  // (ни настоящего курсора, ни точки на месте мыши) — баг «пропадает курсор» на каждой полной навигации
  // (сегодня особенно заметно — много переходов между главной и новыми кейсами). Прячем только ПОСЛЕ того,
  // как точка впервые встала на реальную позицию мыши — подмена происходит бесшовно, в один кадр.

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(dot);

  addEventListener('mousemove', (e) => {
    dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  }, { passive: true });
  addEventListener('mousemove', () => root.classList.add('has-custom-cursor'), { passive: true, once: true });

  // прячем точку, когда мышь ушла из окна
  const hide = (v) => root.classList.toggle('cursor-hidden', v);
  addEventListener('mouseleave', () => hide(true));
  addEventListener('mouseenter', () => hide(false));
  addEventListener('blur', () => hide(true));

  // лёгкое укрупнение над интерактивом (только CSS-класс, без логики в кадре)
  const sel = 'a, button, input, textarea, select, [role="button"], .work-item';
  document.addEventListener('mouseover', (e) => {
    if (e.target instanceof Element && e.target.closest(sel)) root.classList.add('cursor-hover');
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    const to = e.relatedTarget instanceof Element ? e.relatedTarget.closest(sel) : null;
    const from = e.target instanceof Element ? e.target.closest(sel) : null;
    if (from && !to) root.classList.remove('cursor-hover');
  }, { passive: true });
}
