// ════════════════════════════════════════════════════════════════════════════════════════
// Regnum DS — компоненты (React + htm). Стили — ds/components.css, цвета — ds/tokens.css.
// Компонент не знает конкретных цветов: SVG красится через style/CSS-классы на var(--токенах),
// поэтому смена темы перекрашивает и иконки, и колесо, и рамки.
// Механика (пружины, наклон, счётчики) — общая, из ../../_shared/motion.js.
// ════════════════════════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useId, useMemo, useEffect } from 'react';
import { motion, animate } from 'framer-motion';
import { MagneticCTA, TiltCard, CountUp, html } from '../../_shared/motion.js';
import { LINE, SUITS, PH, PORTRAITS } from './icons.js';

export { LINE, SUITS, PH, PORTRAITS, html };

/* ───────────────────────────── Темы и ручки ───────────────────────────── */
export const THEMES = [
  { id: 'elven', name: 'Elven', note: 'лунное серебро · изумруд · хвоя' },
  { id: 'noir', name: 'Noir', note: 'шампань · бордо · чёрный бархат, без свечений' },
  { id: 'royal', name: 'Royal', note: 'золото · рубин · королевская ночь' },
  { id: 'arcane', name: 'Arcane', note: 'серебро-лёд · аметист · индиго' },
];
// Ручки, которые крутит лаба. Всё остальное в tokens.css выводится из них.
export const KNOBS = [
  { v: '--metal-h', label: 'Metal hue', min: 0, max: 360, step: 1, group: 'Metal' },
  { v: '--metal-c', label: 'Metal chroma', min: 0, max: 0.18, step: 0.005, group: 'Metal' },
  { v: '--accent-h', label: 'Accent hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--accent-c', label: 'Accent chroma', min: 0, max: 0.3, step: 0.005, group: 'Accent' },
  { v: '--accent-l', label: 'Accent lightness', min: -25, max: 10, step: 1, unit: '%', group: 'Accent' },
  { v: '--fire-h', label: 'Accent top hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--gem-h', label: 'Gem hue', min: 0, max: 360, step: 1, group: 'Accent' },
  { v: '--surface-h', label: 'Surface hue', min: 0, max: 360, step: 1, group: 'Surface' },
  { v: '--surface-c', label: 'Surface chroma', min: 0, max: 0.06, step: 0.001, group: 'Surface' },
  { v: '--surface-l', label: 'Surface lightness', min: -6, max: 6, step: 0.5, unit: '%', group: 'Surface' },
  { v: '--art-c', label: 'Game art chroma', min: 0, max: 1.5, step: 0.05, group: 'Surface' },
  { v: '--art-l', label: 'Game art lightness', min: -20, max: 10, step: 1, unit: '%', group: 'Surface' },
  { v: '--pos-h', label: 'Positive hue', min: 0, max: 360, step: 1, group: 'Signals' },
  { v: '--magic-h', label: 'Magic hue', min: 0, max: 360, step: 1, group: 'Signals' },
  { v: '--sig-c', label: 'Signal chroma', min: 0, max: 0.2, step: 0.005, group: 'Signals' },
  { v: '--ts', label: 'Type scale', min: 0.85, max: 1.2, step: 0.01, group: 'Type' },
  { v: '--glow', label: 'Glow strength', min: 0, max: 2, step: 0.05, group: 'Light & form' },
  { v: '--depth', label: 'Shadow depth', min: 0, max: 1.5, step: 0.05, group: 'Light & form' },
  { v: '--texture', label: 'Texture', min: 0, max: 1.5, step: 0.05, group: 'Light & form' },
  { v: '--fx', label: 'Effects (dust · sheen · halos)', type: 'switch', on: 'block', off: 'none', group: 'Light & form' },
  { v: '--cut', label: 'Corner cut', min: 0, max: 28, step: 1, unit: 'px', group: 'Light & form' },
  { v: '--ornament', label: 'Ornament', min: 0, max: 1, step: 0.05, group: 'Light & form' },
];
const LS = 'regnum-ds-look-v3';   // v3: тема по умолчанию стала elven — старые подкрутки не тянем
// look = { theme: 'royal', vars: { '--metal-h': '120', … } } — общий для демо и лабы (один origin)
export function loadLook() { try { return JSON.parse(localStorage.getItem(LS)) || { theme: 'elven', vars: {} }; } catch { return { theme: 'elven', vars: {} }; } }
export function saveLook(look) { try { localStorage.setItem(LS, JSON.stringify(look)); } catch { /* приватный режим — живём без памяти */ } }
export function applyLook(look) {
  const r = document.documentElement;
  r.dataset.theme = look.theme || 'elven';
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

// ── Текст: роли = text styles (tokens.css → --t-*). Любой текст интерфейса — одна из них ──
export const TYPE_ROLES = ["logo", "display", "title", "subtitle", "eyebrow", "eyebrow-sm", "num-xl", "num-md", "body", "label", "body-sm", "caption", "micro", "control", "control-sm"];
export const Text = ({ v = 'body', as = 'span', className = '', children, style }) => html`<${as} class=${'t-' + v + (className ? ' ' + className : '')} style=${style}>${children}<//>`;

// Аудит шрифтов: каждый элемент с собственным текстом должен совпасть с одной из ролей (семейство + размер + жирность).
// Эталоны снимаются с невидимых проб .t-* в том же документе (тот же вьюпорт, та же тема, тот же --ts).
// Встроенное выделение (b/strong/em) сверяется с родителем без учёта жирности. SVG-текст (колесо) вне шкалы.
export function typeAudit(root = document.body) {
  const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:-9999px';
  document.body.appendChild(probe);
  const sig = (cs) => ({ f: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), z: parseFloat(cs.fontSize), w: cs.fontWeight });
  const refs = TYPE_ROLES.map((r) => { const e = document.createElement('span'); e.className = 't-' + r; e.textContent = 'Ag'; probe.appendChild(e); return [r, sig(getComputedStyle(e))]; });
  probe.remove();
  const near = (a, b, weight = true) => a.f === b.f && Math.abs(a.z - b.z) < 0.6 && (!weight || a.w === b.w);
  const roleOf = (g, weight) => { const m = refs.find(([, r]) => near(g, r, weight)); return m && m[0]; };
  const out = { total: 0, on: 0, roles: {}, off: [], small: [] };   // small — текст мельче 11px (нечитаемо)
  for (const el of root.querySelectorAll('*')) {
    if (el.closest('svg, script, style, pre, code, .no-audit')) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !el.getClientRects().length) continue;
    const g = sig(getComputedStyle(el)); out.total++;
    if (g.z < 10.9) out.small.push(`${el.tagName.toLowerCase()} «${el.textContent.trim().slice(0, 24)}» ${g.z}px`);
    let role = roleOf(g, true);
    if (!role && /^(B|STRONG|EM|I)$/.test(el.tagName)) role = roleOf(g, false);
    if (role) { out.on++; out.roles[role] = (out.roles[role] || 0) + 1; }
    else out.off.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : '').toString().split(' ')[0]} «${el.textContent.trim().slice(0, 24)}» ${g.f} ${g.z}px ${g.w}`);
  }
  return out;
}

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

// Металлическая эмблема: Phosphor duotone — мягкая металлическая заливка + полированный контур
export function Emblem({ k, halo = true }) {
  const id = uid();
  const st = (c) => ({ stopColor: c });
  if (!PH[k]) return null;
  return html`<svg class="emb ph" viewBox="-30 -30 316 316" aria-hidden="true">
    <defs><linearGradient id=${'g' + id} x1="0" y1="0" x2=".4" y2="1"><stop offset="0" style=${st('var(--metal-hi)')}/><stop offset=".5" style=${st('var(--metal)')}/><stop offset="1" style=${st('var(--metal-2)')}/></linearGradient>
      <radialGradient id=${'r' + id}><stop offset="0" style=${st('var(--glow-metal)')}/><stop offset="1" style=${{ stopColor: 'var(--metal)', stopOpacity: 0 }}/></radialGradient></defs>
    ${halo && html`<circle cx="128" cy="128" r="150" fill=${`url(#r${id})`}/>`}
    <path d=${PH[k][0]} fill=${`url(#g${id})`} style=${{ opacity: 0.32 }}/>
    <path d=${PH[k][1]} fill=${`url(#g${id})`}/>
  </svg>`;
}

// Корона бренда — Phosphor crown (duotone), металлом темы
export function Crown({ size = 30 }) {
  const id = uid();
  return html`<svg class="crown" width=${size} height=${size} viewBox="0 0 256 256" aria-hidden="true"><defs><linearGradient id=${'c' + id} x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" style=${{ stopColor: 'var(--metal-hi)' }}/><stop offset=".5" style=${{ stopColor: 'var(--metal)' }}/><stop offset="1" style=${{ stopColor: 'var(--metal-2)' }}/></linearGradient></defs>
    <path d=${PH.crown[0]} fill=${`url(#c${id})`} style=${{ opacity: 0.35 }}/><path d=${PH.crown[1]} fill=${`url(#c${id})`}/></svg>`;
}

export const Logo = ({ name = 'Regnum' }) => html`<a class="logo" href="#"><${Crown} size=${34}/><span class="metal-text">${name}</span></a>`;

export function Seg({ items, value, onChange }) {
  return html`<nav class="seg">${items.map((t) => html`<button key=${t} class=${value === t ? 'on' : ''} onClick=${() => onChange(t)}>${t.toUpperCase()}</button>`)}</nav>`;
}

export const Field = ({ placeholder, value, onChange }) => html`<label class="field"><${Icon} n="search" w=${16}/><input type="search" placeholder=${placeholder} aria-label=${placeholder}
  value=${value} onInput=${onChange && ((e) => onChange(e.target.value))}/>${value && onChange && html`<button class="field-x" aria-label="Clear" onClick=${(e) => { e.preventDefault(); onChange(''); }}>×</button>`}</label>`;

export const SectionHead = ({ title }) => html`<div class="sec-head"><${Diamond}/><h2 class="metal-text">${title}</h2><span class="line"></span></div>`;

// Фон под эмблему: тон — из данных (hue), яркость/насыщенность — из CSS
export const Art = ({ hue, framed, className = '', children }) => html`<div class=${'art ' + (framed ? 'framed ' : '') + className} style=${{ '--art-h': hue }}>${children}</div>`;

/* ───────────────────────────── Навигация ───────────────────────────── */
export const NavItem = ({ icon, label, on, href = '#' }) => html`<a class=${on ? 'on' : ''} href=${href} aria-current=${on ? 'page' : undefined}><span class="ic"><${Icon} n=${icon}/></span>${label}</a>`;
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
// портрет Lorelei (PORTRAITS) или, если ключ не портрет, эмблема Phosphor
export const Avatar = ({ k = 'morgane' }) => html`<div class="ava">${PORTRAITS[k]
  ? html`<svg class="pt" viewBox="0 0 980 980" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: PORTRAITS[k] }}></svg>`
  : html`<${Emblem} k=${k} halo=${false}/>`}</div>`;
export const Presence = ({ label = 'Online' }) => html`<div class="online">${label}</div>`;

export function Tabs({ items, value, onChange }) {
  return html`<div class="ptabs">${items.map(([k, l]) => html`<button key=${k} class=${value === k ? 'on' : ''} onClick=${() => onChange(k)}><${Icon} n=${k} w=${20}/>${l}</button>`)}</div>`;
}

export const GhostButton = ({ icon, label, onClick, href = '#' }) => html`<a class="ghost-btn" href=${href} onClick=${onClick}>${icon && html`<${Icon} n=${icon} w=${14}/>`}<span>${label}</span></a>`;

export const Wallet = ({ sym, hue, amount, sub, actions = true }) => html`<${Orn} className="wallet"><span class="glow" style=${{ '--coin-h': hue }}></span>
  <div class="coin" style=${{ '--coin-h': hue }}>${sym}</div><div class="amt">${amount}</div><div class="sub">${sub}</div>
  ${actions && html`<div class="wallet-actions"><${GhostButton} icon="arrowDown" label="Deposit"/><${GhostButton} icon="arrowUp" label="Withdraw"/></div>`}<//>`;

/* ───────────────────────────── Колесо ─────────────────────────────
   Слои (снизу вверх): обод из шлифованного металла (CSS conic — свет «бегает» по кругу) →
   вращающееся лицо (SVG: сектора, эмблемы, насечка-шкала) → неподвижный свет (лак-блик) и лампы в гнёздах →
   ступица (рифлёное кольцо + полированный купол) → стрелка-маятник.
   Анимация: замах назад → разгон и долгое торможение с перекатом → пружинный возврат. Стрелка «щёлкает»
   на каждой границе сектора (прямо в DOM, без перерисовки React). Выигрыш: сектор вспыхивает, лампы мигают. */
const C = 120;                                                       // центр в координатах SVG 240×240
// Лампы: в SVG — статичные гнёзда и тусклые лампы; «огонь» — отдельные HTML-слои поверх, анимируется только opacity
// (композитор, без перерисовки SVG). Раньше анимировался fill внутри SVG → колесо перерисовывалось целиком на каждом шаге.
const LAMP_POS = Array.from({ length: 24 }, (_, i) => { const a = (i * 15 - 90) * Math.PI / 180; return [C + 112 * Math.cos(a), C + 112 * Math.sin(a)]; });
const BULBS = LAMP_POS.map(([x, y], i) => html`<g key=${i}><circle class="socket" cx=${x} cy=${y} r="3.6"/><circle class="bulb" cx=${x} cy=${y} r="2.3"/></g>`);
// 3 слоя (по фазе бегущего огня), в каждом 8 ламп: анимируется opacity группы — 3 текстуры вместо 24
const LAMPS = html`<div class="lamps" aria-hidden="true">${[0, 1, 2].map((k) => html`<div key=${k} class="lamp-group" style=${{ '--k': k }}>${LAMP_POS.filter((_, i) => i % 3 === k).map(([x, y], i) => html`<i key=${i} style=${{ left: (x / 240 * 100) + '%', top: (y / 240 * 100) + '%' }}></i>`)}</div>`)}</div>`;
const TICKS = Array.from({ length: 96 }, (_, i) => { const a = (i * 3.75 - 90) * Math.PI / 180, r1 = i % 4 ? 94 : 91;
  return html`<line key=${i} x1=${C + r1 * Math.cos(a)} y1=${C + r1 * Math.sin(a)} x2=${C + 97 * Math.cos(a)} y2=${C + 97 * Math.sin(a)}/>`; });
export const PRIZES = [   // масти по кругу ♠ ♦ ♣ ♥ — строгая казино-разметка вместо картинок
  { label: '50 FS', suit: 'spade' }, { label: '€25', suit: 'diamond' }, { label: '2× XP', suit: 'club' }, { label: '€100', suit: 'heart' },
  { label: '10 FS', suit: 'spade' }, { label: 'VIP+', suit: 'diamond' }, { label: '€500', suit: 'club' }, { label: '25 FS', suit: 'heart' },
];
const norm = (p) => (typeof p === 'string' ? { label: p } : p);

export function CrownWheel({ prizes = PRIZES, onWin, locked = false }) {
  const list0 = prizes.length, face = useRef(null), ptr = useRef(null), rot = useRef(-180 / list0), lastSeg = useRef(0);   // в покое стрелка — в середине сектора
  const [spinning, setSpinning] = useState(false), [win, setWin] = useState(null), [party, setParty] = useState(false);
  const list = useMemo(() => prizes.map(norm), [prizes]);
  const seg = 360 / list.length;
  const paint = (v) => {
    if (face.current) face.current.style.transform = `rotate(${v}deg)`;
    const s = Math.floor((v + seg / 2) / seg);                         // пересекли границу сектора под стрелкой → щелчок
    if (s !== lastSeg.current && ptr.current) {
      lastSeg.current = s; const el = ptr.current;
      el.style.transition = 'none'; el.style.transform = 'rotate(-24deg)';
      requestAnimationFrame(() => { el.style.transition = 'transform .22s cubic-bezier(.3,1.7,.5,1)'; el.style.transform = 'rotate(0deg)'; });
    }
  };
  async function spin() {
    if (spinning || locked) return;
    const pick = Math.floor(Math.random() * list.length);
    const base = rot.current - (rot.current % 360);
    const target = base + 360 * 6 + (360 - pick * seg - seg / 2);
    setSpinning(true); setWin(null); setParty(false);
    await animate(rot.current, rot.current - 14, { duration: 0.38, ease: [0.4, 0, 0.6, 1], onUpdate: paint });                 // замах
    await animate(rot.current - 14, target + 5, { duration: 5.2, ease: [0.16, 0.72, 0.12, 1], onUpdate: paint });              // разгон → торможение с перекатом
    await animate(target + 5, target, { type: 'spring', stiffness: 140, damping: 9, onUpdate: paint });                        // возврат
    rot.current = target; setSpinning(false); setWin(pick); setParty(true);
    setTimeout(() => setParty(false), 2400);
    onWin && onWin(list[pick].label);
  }
  const R = 100;
  const sectors = list.map((p, i) => {
    const a0 = (i * seg - 90) * Math.PI / 180, a1 = ((i + 1) * seg - 90) * Math.PI / 180, mid = (i + 0.5) * seg;
    const d = `M${C} ${C} L${C + R * Math.cos(a0)} ${C + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)} Z`;
    return html`<g key=${p.label + i}><path class=${i % 2 ? 'sb' : 'sa'} d=${d}/><path class=${'hl' + (win === i ? ' on' : '')} d=${d}/>
      <g transform=${`rotate(${mid} ${C} ${C})`}>
        ${p.suit && html`<path class="si" d=${SUITS[p.suit]} transform=${`translate(${C - 7} 29) scale(.14)`}/>`}
        <text x=${C} y=${p.suit ? 58 : 44} text-anchor="middle">${p.label}</text></g></g>`;
  });
  return html`<div class=${'wheel-wrap' + (spinning ? ' fast' : '') + (party ? ' won' : '')}>
    <div class="wheel-glow"></div>
    <div class="wheel">
      <div class="bezel"></div>
      <svg class="face" viewBox="0 0 240 240"><g ref=${face} style=${{ transformOrigin: '120px 120px', transform: `rotate(${-180 / list0}deg)` }}>
        ${sectors}<g class="ticks">${TICKS}</g><circle class="rim-in" cx=${C} cy=${C} r="97.6"/></g></svg>
      <svg class="lights" viewBox="0 0 240 240" aria-hidden="true"><defs><radialGradient id="wl" cx=".32" cy=".26" r=".75">
        <stop offset="0" style=${{ stopColor: '#fff', stopOpacity: 0.16 }}/><stop offset=".45" style=${{ stopColor: '#fff', stopOpacity: 0 }}/><stop offset="1" style=${{ stopColor: '#000', stopOpacity: 0.35 }}/></radialGradient></defs>
        <circle cx=${C} cy=${C} r="101.5" fill="url(#wl)"/>${BULBS}</svg>
      ${LAMPS}
      <button class="spin-btn" onClick=${spin} disabled=${spinning || locked} aria-label=${locked ? 'Next free spin is not ready yet' : 'Spin the wheel'}><span>${locked ? html`<${Icon} n="lock" w=${18}/>` : 'Spin'}</span></button>
      <div class="pointer" ref=${ptr}><svg viewBox="0 0 40 56" aria-hidden="true"><path class="pb" d="M20 55 L7 21 A15 15 0 1 1 33 21 Z"/><path class="pe" d="M20 49 L10 21 A11 11 0 1 1 30 21 Z"/><circle class="pg" cx="20" cy="16" r="5.5"/><circle class="ph" cx="18.2" cy="14.2" r="1.6"/></svg></div>
    </div>
    ${win != null && !spinning && html`<${motion.div} class="win" initial=${{ opacity: 0, y: 10, scale: 0.92 }} animate=${{ opacity: 1, y: 0, scale: 1 }} transition=${{ type: 'spring', stiffness: 260, damping: 18 }}>★ You won ${list[win].label}<//>`}
  </div>`;
}

/* ───────────────────────────── Спокойная прокрутка ───────────────────────────── */
// Пока страница едет — декоративные бесконечные анимации на паузе (html.is-scrolling), через 150 мс после остановки
// оживают. В Firefox анимации во время прокрутки заставляли перерисовывать тяжёлую страницу: прокрутка 5 fps → 35.
export function calmScroll({ idle = 150 } = {}) {
  const root = document.documentElement; let t = 0;
  addEventListener('scroll', () => { if (!t) root.classList.add('is-scrolling'); clearTimeout(t); t = setTimeout(() => { root.classList.remove('is-scrolling'); t = 0; }, idle); }, { passive: true });
}

/* ───────────────────────────── Качество графики ───────────────────────────── */
// Как «качество» в играх: после загрузки меряем ~1.5 с кадров; меньше 50 — включаем lite (без пыли, бликов, ореолов,
// фонового света; мягче тени и фактура). ?quality=lite|high|auto — вручную (запоминается). Решение auto — на сессию.
export function autoQuality({ delay = 1500, threshold = 50 } = {}) {
  const root = document.documentElement, K = 'regnum-quality';
  const ls = (v) => { try { return v === undefined ? localStorage.getItem(K) : localStorage.setItem(K, v); } catch { return null; } };
  const q = new URLSearchParams(location.search).get('quality'); if (q) ls(q);
  const pref = ls() || 'auto';
  if (pref === 'lite' || pref === 'high') { root.dataset.quality = pref; return; }
  try { const s = sessionStorage.getItem(K); if (s) { root.dataset.quality = s; return; } } catch { /* без памяти */ }
  setTimeout(() => { let n = 0, t0 = 0; const f = (t) => { if (!t0) t0 = t; if (++n < 90) return requestAnimationFrame(f);
    const fps = n * 1000 / (t - t0), v = fps < threshold ? 'lite' : 'high'; root.dataset.quality = v; try { sessionStorage.setItem(K, v); } catch { /* */ } };
    requestAnimationFrame(f); }, delay);
}
// Экран загрузки. В странице он — статичный HTML (рисуется до React); компонент — для лабы и других страниц.
export const Loader = ({ note = 'Preparing the court…', progress = 0.6, inline = false }) => html`<div class=${'rg-loader' + (inline ? ' inline' : '')} role="status" aria-live="polite">
  <div class="rl-in"><svg class="rl-crown" viewBox="0 0 256 256" aria-hidden="true"><path d=${PH.crown[0]}/><path d=${PH.crown[1]}/></svg>
    <div class="rl-word">Regnum</div><div class="rl-bar" style=${{ '--p': progress }}><i></i></div><div class="rl-note">${note}</div></div></div>`;

/* ───────────────────────────── Аккаунт ───────────────────────────── */
// Живой обратный отсчёт: «2d 14:03:22» / «23:59:41». Тикает раз в секунду, без перерисовки остального.
const fmt = (ms) => { const t = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  const p = (x) => String(x).padStart(2, '0'); return (d ? d + 'd ' : '') + p(h) + ':' + p(m) + ':' + p(s); };
export function Countdown({ to, prefix = '' }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return html`<span class="countdown">${prefix}<time>${fmt(to - now)}</time></span>`;
}
// Баланс в шапке: сумма + быстрый депозит
export const BalanceChip = ({ amount, label = 'Balance' }) => html`<div class="balance-chip"><span class="bc-k">${label}</span><span class="bc-v metal-text">${amount}</span>
  <a class="bc-add" href="#" aria-label="Deposit"><${Icon} n="plus" w=${14}/></a></div>`;
// Игрок в шапке: колокольчик с непрочитанными + мини-портрет
export const UserMenu = ({ avatar = 'morgane', name, unread = 0 }) => html`<div class="user-menu">
  <button class="um-bell" aria-label=${`Notifications${unread ? ', ' + unread + ' unread' : ''}`}><${Icon} n="bell" w=${18}/>${unread > 0 && html`<i>${unread}</i>`}</button>
  <a class="um-me" href="#" aria-label=${name}><span class="um-ava">${PORTRAITS[avatar] ? html`<svg viewBox="0 0 980 980" aria-hidden="true" dangerouslySetInnerHTML=${{ __html: PORTRAITS[avatar] }}></svg>` : null}</span><span class="um-name">${name}</span></a></div>`;

/* ───────────────────────────── Мелочи бренда ───────────────────────────── */
export const Suit = ({ s = 'spade', w = 16 }) => html`<svg class="suit" width=${w} height=${w} viewBox="0 0 100 100" aria-hidden="true"><path d=${SUITS[s]}/></svg>`;
// орнамент-разделитель: две линии и ромб
export const Flourish = ({ w = 70 }) => html`<div class="flourish"><svg width=${w} height="18" viewBox="0 0 70 18" aria-hidden="true"><path class="fl" d="M0 9 H26 M44 9 H70"/><path class="fd" d="M35 1 L41 9 L35 17 L29 9 Z"/></svg></div>`;
// платёжные методы: бренд-цвет гасится ручкой --art-c (как обложки игр)
export const PayRow = ({ items }) => html`<div class="pay">${items.map(([t, c]) => html`<i key=${t} style=${{ '--b': c }}>${t}</i>`)}</div>`;
// Бегущая строка — чистая CSS-анимация (композитор), две копии трека, сдвиг на -50%. Было: rAF-скрипт каждый кадр
// (VelocityMarquee) — в Firefox каждое изменение заставляло перерисовать всю страницу (простой 9 fps → 49).
export const WinsTicker = ({ wins, duration = 38 }) => { const row = wins.map(([who, amt, g], i) => html`<span key=${i} class="t"><${Diamond}/>${who} won <b>${amt}</b> in ${g}</span>`);
  return html`<div class="ticker" style=${{ '--dur': duration + 's' }}><div class="ticker-track"><div class="ticker-row">${row}</div><div class="ticker-row" aria-hidden="true">${row}</div></div></div>`; };

/* ───────────────────────────── Паттерны (собраны из компонентов) ───────────────────────────── */
// Баннер: текст слева, что угодно справа (колесо). Фон — гильош-гравировка.
// art — иллюстрация справа (растворяется в фоне к тексту), artMobile — версия для телефона (встаёт сверху)
export const HeroBanner = ({ eyebrow, title, text, pay, cta = 'Join now', secondary, endsAt, slides = 0, slide = 0, aside, art, artMobile, artAlt = '' }) => html`<${Orn} className=${'hero' + (art ? ' has-art' : '')} lit deco>
  ${art ? html`<picture class="hero-art">${artMobile && html`<source media="(max-width: 900px)" srcset=${artMobile}/>`}<img src=${art} alt=${artAlt} decoding="async" fetchpriority="high"/></picture>` : html`<${Guilloche}/>`}
  <div class="hero-copy"><div class="hero-top"><span class="eyebrow">${eyebrow}</span>${endsAt && html`<span class="hero-timer"><${Countdown} to=${endsAt} prefix="Ends in "/></span>`}</div>
    <h1>${title}</h1><p>${text}</p>${pay && html`<${PayRow} items=${pay}/>`}
    <div class="hero-actions"><${Gem} label=${cta} magnetic/>${secondary && html`<a class="hero-link" href="#">${secondary}</a>`}</div>
    ${slides > 1 && html`<div class="dots" aria-label=${`Promo ${slide + 1} of ${slides}`}>${Array.from({ length: slides }, (_, i) => html`<i key=${i} class=${i === slide ? 'on' : ''}></i>`)}</div>`}</div>
  ${aside && html`<div class="hero-aside">${aside}</div>`}<//>`;

// Секция колеса: колесо + описание и список призов (масть · приз)
// После спина колесо запирается до следующего дня: статус показывает обратный отсчёт (как в настоящих продуктах).
export function WheelPanel({ eyebrow = 'Daily ritual', title = 'Crown Wheel', text, prizes = PRIZES, cooldownMs = 24 * 3600e3 }) {
  const [nextAt, setNextAt] = useState(null), [won, setWon] = useState(null);
  return html`<${Orn} className="wheel-panel" lit deco><${Guilloche}/>
  <div class="wp-wheel"><${CrownWheel} prizes=${prizes} locked=${!!nextAt} onWin=${(p) => { setWon(p); setTimeout(() => setNextAt(Date.now() + cooldownMs), 2600); }}/></div>
  <div class="wp-copy"><div class="eyebrow">${eyebrow}</div><h2 class="t-display">${title}</h2>${text && html`<p>${text}</p>`}
    <div class=${'wp-status' + (nextAt ? ' wait' : '')}>${nextAt ? html`${won && html`<b>${won}</b> added to your account · `}Next free spin in <${Countdown} to=${nextAt}/>` : html`<i class="dot"></i>1 free spin ready`}</div>
    <ul class="wp-prizes">${prizes.map((p, i) => { const q = typeof p === 'string' ? { label: p } : p; return html`<li key=${q.label + i}>${q.suit && html`<${Suit} s=${q.suit} w=${13}/>`}<span>${q.label}</span></li>`; })}</ul></div><//>`;
}
// Карточка профиля: герб с портретом, статус, имя, ранг, табы
// Табличка титула: корона · ТИТУЛ капителью · ромбик · уровень
export const RankPlate = ({ title, level }) => html`<div class="rank"><${Crown} size=${15}/><span class="rt">${title}</span>${level && html`<i class="rs"></i><span class="rl">${level}</span>`}</div>`;

export function ProfileCard({ name, title, level, avatar = 'morgane', status = 'Online', facts, tabs }) {
  const [tab, setTab] = useState(tabs[0][0]);
  return html`<${Orn} className="profile" lit deco>
    <${Crest}><${Avatar} k=${avatar}/><${Presence} label=${status}/><//>
    <h3>${name}</h3><${RankPlate} title=${title} level=${level}/>
    ${facts && html`<${Flourish} w=${90}/><dl class="facts">${facts.map(([v, l]) => html`<div key=${l}><dt class="metal-text">${v}</dt><dd>${l}</dd></div>`)}</dl>`}
    <${Tabs} items=${tabs} value=${tab} onChange=${setTab}/><//>`;
}

/* ───────────────────────────── Атмосфера ───────────────────────────── */
export function Dust({ n = 12 }) {
  const dots = useMemo(() => Array.from({ length: n }, (_, i) => ({ left: (i * 37) % 100, d: 9 + (i * 7) % 11, delay: -((i * 13) % 20), s: 1 + (i % 3) })), [n]);
  return html`<div class="dust" aria-hidden="true">${dots.map((x, i) => html`<i key=${i} style=${{ left: x.left + '%', width: x.s * 2 + 'px', height: x.s * 2 + 'px', animationDuration: x.d + 's', animationDelay: x.delay + 's' }}></i>`)}</div>`;
}

// Гильош — гравировка как на банкнотах: розетка из повёрнутых эллипсов. Статичный SVG, тонкая линия металла.
export function Guilloche({ n = 48, className = 'guilloche' }) {
  const rings = useMemo(() => Array.from({ length: n }, (_, i) => html`<ellipse key=${i} cx="200" cy="200" rx="190" ry="64" transform=${`rotate(${(i * 180) / n} 200 200)`}/>`), [n]);
  const inner = useMemo(() => Array.from({ length: n }, (_, i) => html`<ellipse key=${i} cx="200" cy="200" rx="118" ry="30" transform=${`rotate(${(i * 180) / n + 90 / n} 200 200)`}/>`), [n]);
  return html`<svg class=${className} viewBox="0 0 400 400" aria-hidden="true"><g>${rings}</g><g>${inner}</g><circle cx="200" cy="200" r="196"/><circle cx="200" cy="200" r="150"/></svg>`;
}
