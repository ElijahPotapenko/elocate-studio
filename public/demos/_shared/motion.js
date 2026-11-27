/*
 * Общая МЕХАНИКА для demo-кейсов (public/demos/<case>/index.html) — никакой визуальной воли.
 * Каждый кейс красит это своими CSS-токенами/классами; этот файл не знает ни одного цвета.
 * Правило и зачем — public/demos/_shared/README.md. Версии в importmap каждого кейса,
 * которые этот файл реально использует (react, react-dom, framer-motion, htm), должны
 * совпадать с теми, что указаны в README — несовпадение версий framer-motion между кейсами
 * было реальной находкой при первом выносе (Nova: 11.11.17, Support Bot: 11.3.19).
 */
import React, { useRef, useEffect } from 'react';
import {
  motion, useMotionValue, useSpring, useTransform,
  useScroll, useVelocity, useAnimationFrame, useInView, animate,
} from 'framer-motion';
import htm from 'htm';

const html = htm.bind(React.createElement);

/** Кнопка/ссылка, тянущаяся к курсору. Цвет и форма — через `className`, не здесь. */
export function MagneticCTA({ label, href, onClick, className, strength = 0.28, spring = { damping: 18, stiffness: 260 }, tapScale = 0, children }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, spring);
  const sy = useSpring(y, spring);
  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  }
  function onLeave() { x.set(0); y.set(0); }
  const tapProps = tapScale
    ? { whileHover: { scale: 1 + tapScale }, whileTap: { scale: 1 - tapScale }, transition: { type: 'spring', ...spring } }
    : {};
  return html`
    <${motion.a} href=${href} onClick=${onClick} class=${className} style=${{ x: sx, y: sy }}
      onMouseMove=${onMove} onMouseLeave=${onLeave} ...${tapProps}>
      ${label}${children || null}
    <//>
  `;
}

/** Карточка с 3D-наклоном за курсором. Содержимое и фон — снаружи, через `children`/`className`. */
export function TiltCard({ children, className, maxTilt = 7, hoverY = 0, spring = { damping: 22, stiffness: 220 }, style = {} }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-100, 100], [maxTilt, -maxTilt]), spring);
  const rotateY = useSpring(useTransform(x, [-100, 100], [-maxTilt, maxTilt]), spring);
  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set(e.clientX - r.left - r.width / 2); y.set(e.clientY - r.top - r.height / 2);
  }
  function onLeave() { x.set(0); y.set(0); }
  const hoverProps = hoverY ? { whileHover: { y: hoverY }, transition: { type: 'spring', ...spring } } : {};
  return html`
    <${motion.div} class=${className} style=${{ rotateX, rotateY, transformPerspective: 900, ...style }}
      onMouseMove=${onMove} onMouseLeave=${onLeave} ...${hoverProps}>
      ${children}
    <//>
  `;
}

/**
 * Бегущая строка, реагирующая на скорость скролла (ускоряется/меняет направление).
 * `renderTrack()` возвращает содержимое ОДНОГО повтора — сам компонент размножает его ×4
 * для бесшовной петли и двигает общий `x`.
 */
export function VelocityMarquee({ renderTrack, baseSpeed = 4.2, className }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });
  const dir = useRef(1);

  useAnimationFrame((_, delta) => {
    let moveBy = dir.current * baseSpeed * (delta / 1000);
    if (velocityFactor.get() < 0) dir.current = -1; else if (velocityFactor.get() > 0) dir.current = 1;
    moveBy += dir.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() - moveBy);
  });

  return html`
    <div class=${className}>
      ${[0, 1, 2, 3].map((rep) => html`<${motion.div} key=${rep} style=${{ x: baseX, display: 'inline-flex' }}>${renderTrack()}<//>`)}
    </div>
  `;
}

/** Число, считающее вверх при попадании во вьюпорт. Один раз, не переигрывает. */
export function CountUp({ to, decimals = 0, duration = 1.4, suffix = '', locale = false }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, to, {
      duration, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        const n = decimals ? v.toFixed(decimals) : Math.round(v);
        if (ref.current) ref.current.textContent = (locale ? Number(n).toLocaleString('en-US') : n) + suffix;
      },
    });
    return () => controls.stop();
  }, [inView]);
  return html`<span ref=${ref}>0</span>`;
}

/** Плашка/блок, проявляющийся при скролле во вьюпорт — fade + лёгкий сдвиг вверх. Один раз. */
export function Reveal({ children, delay = 0, className, y = 18, duration = 0.7 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return html`
    <${motion.div}
      ref=${ref} class=${className}
      initial=${{ opacity: 0, y }}
      animate=${inView ? { opacity: 1, y: 0 } : {}}
      transition=${{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >${children}<//>
  `;
}

export { html };
