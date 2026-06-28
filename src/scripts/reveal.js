/* Появление секций при скролле: добавляет .in элементам .reveal через IntersectionObserver. */
export function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  els.forEach((el) => io.observe(el));
}
