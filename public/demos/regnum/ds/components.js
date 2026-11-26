// ════════════════════════════════════════════════════════════════════════════════════════
// Regnum DS — компоненты (React + htm). Стили — ds/components.css, цвета — ds/tokens.css.
// Компонент не знает конкретных цветов: SVG красится через style/CSS-классы на var(--токенах),
// поэтому смена темы перекрашивает и иконки, и колесо, и рамки.
// Механика (пружины, наклон, счётчики) — общая, из ../../_shared/motion.js.
// ════════════════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useId, useMemo } from 'react';
import { motion, animate } from 'framer-motion';
import { MagneticCTA, TiltCard, CountUp, html } from '../../_shared/motion.js';
import { GI, LINE } from './icons.js';

export { GI, LINE, html };

/* ───────────────────────────── Темы и ручки ───────────────────────────── */
export const THEMES = [
  { id: 'royal', name: 'Royal', note: 'золото · рубин · королевская ночь' },
  { id: 'elven', name: 'Elven', note: 'лунное серебро · изумруд · хвоя' },
  { id: 'arcane', name: 'Arcane', note: 'серебро-лёд · аметист · индиго' },
];
// Ручки, которые крутит лаба. Всё остальное в tokens.css выводится из них.
export const KNOBS = [
  { v: '--metal-h', label: 'Metal hue', min: 0, max: 360, step: 1, group: 'Metal' },
  { v: '--metal-c', label: 'Metal chroma', min: 0, max: 0.18, step: 0.005, group: 'Metal' },
  { v: '--accent-h', label: 'Accent hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--accent-c', label: 'Accent chroma', min: 0, max: 0.3, step: 0.005, group: 'Accent' },
  { v: '--fire-h', label: 'Accent top hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--gem-h', label: 'Gem hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--surface-h', label: 'Surface hue', min: 0, max: 360, step: 1, group: 'Surface' },
  { v: '--surface-c', label: 'Surface chroma', min: 0, max: 0.06, step: 0.001, group: 'Surface' },
  { v: '--pos-h', label: 'Positive hue', min: 0, max: 360, step: 1, group: 'Signals' },
  { v: '--magic-h', label: 'Magic hue', min: 0, max: 360, step: 1, group: 'Signals' },
  { v: '--glow', label: 'Glow strength', min: 0, max: 2, step: 0.05, group: 'Light & form' },
  { v: '--cut', label: 'Corner cut', min: 0, max: 28, step: 1, unit: 'px', group: 'Light & form' },
  { v: '--ornament', label: 'Ornament', min: 0, max: 1, step: 0.05, group: 'Light & form' },
];
const LS = 'regnum-ds-look';
// look = { theme: 'royal', vars: { '--metal-h': '120', … } } — общий для демо и лабы (один origin)
export function loadLook() { try { return JSON.parse(localStorage.getItem(LS)) || { theme: 'royal', vars: {} }; } catch { return { theme: 'royal', vars: {} }; } }
export function saveLook(look) { try { localStorage.setItem(LS, JSON.stringify(look)); } catch { /* приватный режим — живём без памяти */ } }
export function applyLook(look) {
  const r = document.documentElement;
  r.dataset.theme = look.theme || 'royal';
  KNOBS.forEach(({ v }) => r.style.removeProperty(v));
  Object.entries(look.vars || {}).forEach(([v, x]) => r.style.setProperty(v, x));
}
export function bootLook() {
  const look = loadLook();
  const q = new URLSearchParams(location.search).get('theme');
  if (q && THEMES.some((t) => t.id === q)) look.theme = q, look.vars = {};
  applyLook(look); return look;
}
export const lookCSS = (look) => `[data-theme="${look.theme}"]{\n${Object.entries(look.vars || {}).map(([v, x]) => `  ${v}: ${x};`).join('\n')}\n}`;

const uid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

/* ───────────────────────────── Примитивы ───────────────────────────── */
// Панель со срезанными углами. lit — ореол, sheen — блик, deco — завитки по углам, flat — плоское тело
export const Orn = ({ className = '', flat, lit, sheen, deco, children, style }) => html`<div class=${'ornw ' + (lit ? 'lit ' : '') + className} style=${style}>
  <div class=${'orn' + (flat ? ' flat' : '') + (sheen ? ' sheen' : '')}><div class="in">${deco && html`<i class="cr tl"></i><i class="cr tr"></i><i class="cr bl"></i><i class="cr br"></i>`}${children}</div></div></div>`;

export const Diamond = () => html`<span class="diamond"></span>`;
export const MetalText = ({ children, as = 'span' }) => html`<${as} class="metal-text">${children}<//>`;

// Кнопка-самоцвет. tone: accent | metal · size: sm | md | lg · magnetic — тянется к курсору
export function Gem({ label, href = '#', tone = 'accent', size = 'md', magnetic = false, onClick }) {
  const cls = 'gem' + (size !== 'md' ? ' ' + size : '') + (tone === 'metal' ? ' metal' : '');
  const inner = html`<span>${label}</span>`;
  return html`<span class=${'cta' + (tone === 'metal' ? ' metal' : '')}>${magnetic
    ? html`<${MagneticCTA} className=${cls} href=${href} label=${inner} strength=${0.22}/>`
    : html`<a class=${cls} href=${href} onClick=${onClick}>${inner}</a>`}</span>`;
}

// kind: new | hot | metal
export const Badge = ({ kind = 'new', children, className = '' }) => html`<span class=${'badge ' + (kind !== 'new' ? kind + ' ' : '') + className}>${children ?? kind.toUpperCase()}</span>`;

export const Icon = ({ n, w = 16 }) => html`<svg class="ico" width=${w} height=${w} viewBox="0 0 24 24" aria-hidden="true"><path d=${LINE[n]}/></svg>`;

// Металлическая эмблема из game-icons: подложка-тень, градиентное тело с кантом, блик, ореол
export function Emblem({ k, halo = true }) {
  const id = uid();
  const st = (c) => ({ stopColor: c });
  return html`<svg class="emb" viewBox="-24 -24 560 560" aria-hidden="true">
    <defs>
      <linearGradient id=${'g' + id} x1="0" y1="0" x2=".35" y2="1"><stop offset="0" style=${st('var(--metal-hi)')}/><stop offset=".38" style=${st('var(--metal)')}/><stop offset=".66" style=${st('var(--metal-mid)')}/><stop offset="1" style=${st('var(--metal)')}/></linearGradient>
      <linearGradient id=${'h' + id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style=${{ stopColor: '#fff', stopOpacity: 0.5 }}/><stop offset=".42" style=${{ stopColor: '#fff', stopOpacity: 0 }}/></linearGradient>
      <radialGradient id=${'r' + id}><stop offset="0" style=${st('var(--glow-metal)')}/><stop offset="1" style=${{ stopColor: 'var(--metal)', stopOpacity: 0 }}/></radialGradient>
    </defs>
    ${halo && html`<circle cx="256" cy="256" r="280" fill=${`url(#r${id})`}/>`}
    <path d=${GI[k]} style=${{ fill: 'var(--well)', opacity: 0.8 }} transform="translate(8 18)"/>
    <path d=${GI[k]} fill=${`url(#g${id})`} style=${{ stroke: 'var(--metal-shade)' }} stroke-width="4" paint-order="stroke"/>
    <path d=${GI[k]} fill=${`url(#h${id})`}/>
  </svg>`;
}

export function Crown({ size = 30 }) {
  const id = uid();
  return html`<svg width=${size} height=${size} viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id=${'c' + id} x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" style=${{ stopColor: 'var(--metal-hi)' }}/><stop offset=".45" style=${{ stopColor: 'var(--metal)' }}/><stop offset="1" style=${{ stopColor: 'var(--metal-deep)' }}/></linearGradient></defs>
    <path d=${GI['queen-crown']} fill=${`url(#c${id})`} style=${{ stroke: 'var(--metal-shade)' }} stroke-width="10" paint-order="stroke"/></svg>`;
}

export const Logo = ({ name = 'Regnum' }) => html`<a class="logo" href="#"><${Crown} size=${34}/><span class="metal-text">${name}</span></a>`;

export function Seg({ items, value, onChange }) {
  return html`<nav class="seg">${items.map((t) => html`<button key=${t} class=${value === t ? 'on' : ''} onClick=${() => onChange(t)}>${t.toUpperCase()}</button>`)}</nav>`;
}

export const Field = ({ placeholder }) => html`<label class="field"><${Icon} n="search" w=${16}/><input placeholder=${placeholder}/></label>`;

export const SectionHead = ({ title }) => html`<div class="sec-head"><${Diamond}/><h2 class="metal-text">${title}</h2><span class="line"></span></div>`;

// Фон под эмблему: тон — из данных (hue), яркость/насыщенность — из CSS
export const Art = ({ hue, framed, className = '', children }) => html`<div class=${'art ' + (framed ? 'framed ' : '') + className} style=${{ '--art-h': hue }}>${children}</div>`;

/* ───────────────────────────── Навигация ───────────────────────────── */
export const NavItem = ({ icon, label, on }) => html`<a class=${on ? 'on' : ''} href="#"><span class="ic"><${Icon} n=${icon}/></span>${label}</a>`;
export const GameRow = ({ game, kind }) => html`<a class=${'grow ' + kind} href="#"><span class="em art" style=${{ '--art-h': game.hue }}><${Emblem} k=${game.k} halo=${false}/></span>${game.name}<${Badge} kind=${kind}/></a>`;
export const SubHead = ({ children }) => html`<div class="sub-h"><${Diamond}/>${children}</div>`;

/* ───────────────────────────── Карточки и данные ───────────────────────────── */
export const GameCard = ({ game, tilt = true }) => {
  const body = html`<${Orn}><${Art} hue=${game.hue} framed>${game.badge && html`<${Badge} kind=${game.badge} className="tag"/>`}<${Emblem} k=${game.k}/><//>
    <h5>${game.name}</h5><div class="meta"><span>${game.studio || 'Regnum Originals'}</span><b>RTP ${game.rtp}</b></div><//>`;
  return tilt ? html`<${TiltCard} className="game" maxTilt=${8} hoverY=${-4}>${body}<//>` : html`<div class="game">${body}</div>`;
};

export const Stat = ({ k, to, prefix = '', delta }) => html`<${Orn} className="stat"><div class="k">${k}</div><div class="v metal-text">${prefix}<${CountUp} to=${to} locale/></div>${delta && html`<div class="d">${delta}</div>`}<//>`;

export function Meter({ title, value, min = 1, max = 5, className = '' }) {
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return html`<${Orn} className=${'meter ' + className}><div class="meter-head"><h4>${title}</h4><span>${value.toFixed(1)}× active</span></div>
    <div class="track"><${motion.div} class="fill" initial=${{ width: 0 }} whileInView=${{ width: `${(value - min) / (max - min) * 100}%` }} viewport=${{ once: true }} transition=${{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}/></div>
    <div class="ticks">${ticks.map((x) => html`<span key=${x} class=${x <= value ? 'hit' : ''}>${x}×</span>`)}</div><//>`;
}

export const VipBar = ({ pct, notches = [20, 40, 60] }) => html`<div class="vbar"><${motion.i} initial=${{ width: 0 }} whileInView=${{ width: `calc(${pct}% - 4px)` }} viewport=${{ once: true }} transition=${{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}/>
  ${notches.map((x) => html`<span key=${x} class="notch" style=${{ left: x + '%' }}></span>`)}<span class="tip" style=${{ left: pct + '%' }}></span></div>`;

// rungs: [['VII','Duchess'], …], cur — индекс текущей ступени
export function Ladder({ rungs, cur }) {
  const n = rungs.length, done = n > 1 ? (cur / (n - 1)) * (100 - 100 / n) : 0;
  return html`<div class="ladder" style=${{ '--n': n, '--done': done + '%' }}>${rungs.map(([num, t], i) => html`<div key=${num} class=${'rung ' + (i < cur ? 'done' : i === cur ? 'cur' : '')}><div class="medal"><b>${num}</b></div><span>${t}</span></div>`)}</div>`;
}

export const Perk = ({ value, label, lock }) => html`<div class=${'perk' + (lock ? ' next' : '')}><div class="pv metal-text">${value}</div><div class="pl">${label}</div>${lock && html`<${Badge} className="lock">${lock}<//>`}</div>`;

export function VipCard({ level, next, points, goal, rungs, cur, perks, className = 'span3' }) {
  return html`<${Orn} className=${'vipc ' + className}><div class="vip-head"><${Crown} size=${42}/><div class="t"><h4>VIP level ${level} → ${level + 1}</h4><small>${(goal - points).toLocaleString('en')} points to ${next}</small></div>
      <div class="pts metal-text"><${CountUp} to=${points} locale/><small> / ${goal.toLocaleString('en')}</small></div></div>
    <${VipBar} pct=${Math.round(points / goal * 100)}/>
    <${Ladder} rungs=${rungs} cur=${cur}/>
    <div class="perks">${perks.map((p) => html`<${Perk} key=${p.label} ...${p}/>`)}</div><//>`;
}

export const Crest = ({ children }) => {
  const id = uid();
  return html`<div class="crest"><svg viewBox="0 0 190 230" aria-hidden="true"><defs><linearGradient id=${'f' + id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style=${{ stopColor: 'var(--metal-hi)' }}/><stop offset="1" style=${{ stopColor: 'var(--metal-deep)' }}/></linearGradient></defs>
    <path d="M95 6 C 120 30, 150 26, 172 40 V150 C 172 190, 130 210, 95 224 C 60 210, 18 190, 18 150 V40 C 40 26, 70 30, 95 6 Z" style=${{ fill: 'var(--panel-hi)' }} stroke=${`url(#f${id})`} stroke-width="3"/>
    <path d="M95 18 C 116 38, 142 36, 160 46 V148 C 160 180, 126 198, 95 210 C 64 198, 30 180, 30 148 V46 C 48 36, 74 38, 95 18 Z" fill="none" style=${{ stroke: 'var(--metal-dim)', opacity: 0.5 }} stroke-width="1"/>
    <path d="M95 0 L101 8 L95 16 L89 8 Z" fill=${`url(#f${id})`}/></svg>${children}</div>`;
};
export const Avatar = ({ k = 'woman-elf-face' }) => html`<div class="ava"><${Emblem} k=${k} halo=${false}/></div>`;

export function Tabs({ items, value, onChange }) {
  return html`<div class="ptabs">${items.map(([k, l]) => html`<button key=${k} class=${value === k ? 'on' : ''} onClick=${() => onChange(k)}><${Icon} n=${k} w=${20}/>${l}</button>`)}</div>`;
}

export const Wallet = ({ sym, hue, amount, sub }) => html`<${Orn} className="wallet"><span class="glow" style=${{ '--coin-h': hue }}></span><div class="coin" style=${{ '--coin-h': hue }}>${sym}</div><div class="amt">${amount}</div><div class="sub">${sub}</div><//>`;

/* ───────────────────────────── Колесо ───────────────────────────── */
const BULBS = Array.from({ length: 24 }, (_, i) => { const a = i * 15 * Math.PI / 180, x = 110 + 104 * Math.cos(a), y = 110 + 104 * Math.sin(a);
  return html`<g key=${i} style=${{ '--k': i % 3 }}><circle class="bulb-halo" cx=${x} cy=${y} r="5.5"/><circle class="bulb" cx=${x} cy=${y} r="2.6"/></g>`; });
export const PRIZES = ['50 FS', '€25', '2× XP', '€100', '10 FS', 'VIP+', '€500', '25 FS'];
export function CrownWheel({ prizes = PRIZES, onWin }) {
  const ref = useRef(null), rot = useRef(0);
  const [spinning, setSpinning] = useState(false), [win, setWin] = useState(null);
  const seg = 360 / prizes.length;
  function spin() {
    if (spinning) return;
    const pick = Math.floor(Math.random() * prizes.length);
    const target = rot.current + 360 * 5 + (360 - pick * seg - seg / 2) - (rot.current % 360);
    setSpinning(true); setWin(null);
    animate(rot.current, target, { duration: 4.2, ease: [0.12, 0.8, 0.18, 1], onUpdate: (v) => { if (ref.current) ref.current.style.transform = `rotate(${v}deg)`; },
      onComplete: () => { rot.current = target; setSpinning(false); setWin(prizes[pick]); onWin && onWin(prizes[pick]); } });
  }
  const sectors = useMemo(() => prizes.map((p, i) => {
    const R = 100, a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180;
    const d = `M110 110 L${110 + R * Math.cos(a0)} ${110 + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${110 + R * Math.cos(a1)} ${110 + R * Math.sin(a1)} Z`;
    return html`<g key=${p + i}><path class=${i % 2 ? 'sb' : 'sa'} d=${d}/><text x="110" y="34" transform=${`rotate(${(i + 0.5) * seg} 110 110)`} text-anchor="middle">${p}</text></g>`;
  }), [prizes]);
  return html`<div class=${'wheel-wrap' + (spinning ? ' fast' : '')}>
    <div class="wheel-glow"></div>
    <svg class="pointer" viewBox="0 0 30 36"><path d="M15 36 L3 10 A12 12 0 1 1 27 10 Z"/><circle cx="15" cy="12" r="5"/></svg>
    <svg class="wheel" viewBox="0 0 220 220"><circle class="rim" cx="110" cy="110" r="108"/><g ref=${ref} style=${{ transformOrigin: '110px 110px' }}>${sectors}</g>${BULBS}</svg>
    <button class="spin-btn" onClick=${spin} disabled=${spinning}>${spinning ? '…' : 'SPIN'}</button>
    ${win && html`<${motion.div} class="win" initial=${{ opacity: 0, y: 8, scale: 0.9 }} animate=${{ opacity: 1, y: 0, scale: 1 }}>★ You won ${win}<//>`}
  </div>`;
}

/* ───────────────────────────── Атмосфера ───────────────────────────── */
export function Dust({ n = 18 }) {
  const dots = useMemo(() => Array.from({ length: n }, (_, i) => ({ left: (i * 37) % 100, d: 9 + (i * 7) % 11, delay: -((i * 13) % 20), s: 1 + (i % 3) })), [n]);
  return html`<div class="dust" aria-hidden="true">${dots.map((x, i) => html`<i key=${i} style=${{ left: x.left + '%', width: x.s * 2 + 'px', height: x.s * 2 + 'px', animationDuration: x.d + 's', animationDelay: x.delay + 's' }}></i>`)}</div>`;
}
