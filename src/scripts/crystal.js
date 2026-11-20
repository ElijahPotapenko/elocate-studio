/* Гранёный кристалл на WebGL (#bg-sphere), сменил вайрфрейм-сферу (sphere.js, 2026-11-19).
   Стекло/преломление (MeshPhysicalMaterial transmission) + внутренний источник света (emissive-ядро) +
   bloom (UnrealBloomPass — «сильный блюр» свечения, как просили). Вращение ПО ВРЕМЕНИ, не за курсором —
   см. урок sphere.js: лаг от lerp за мышью читался как тормоза страницы, хотя FPS был в норме.
   Пауза вне экрана (IntersectionObserver) — та же оптимизация, что у sphere.js, здесь даже важнее:
   WebGL+bloom дороже 2D canvas. */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function initCrystal() {
  const canvas = document.getElementById('bg-sphere');
  if (!canvas) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; } // WebGL недоступен — просто нет кристалла, страница не ломается
  // кап ниже, чем у прежней 2D-сферы (1.5): bloom+transmission кратно дороже на пиксель — живой замер
  // показал просадку 60→33fps при 1.5, см. git history этого файла
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.transmissionResolutionScale = 0.25; // меньше внутренний render-target под transmission-стекло
  // Firefox шлёт безобидный warning «generateMipmap: lazy initialization» на первом кадре —
  // источник найден (изолировано: исчезает только при transmission:0), это диагностика ВНУТРЕННЕГО
  // render-target'а, который THREE.WebGLRenderer сам заводит под стеклянный материал, не наш код
  // и не наша текстура — убрать можно только отказом от transmission (т.е. от самого «стекла»).

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 5.6); // камера БЕЗ вертикального сдвига — сдвигаем саму группу ниже (см. ниже)

  // ── процедурный envmap: тёмный фон → мятный акцент, для преломления в фасетах ──
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 256; envCanvas.height = 128;
  const ectx = envCanvas.getContext('2d');
  const eg = ectx.createLinearGradient(0, 0, 0, 128);
  eg.addColorStop(0, '#0d1812');
  eg.addColorStop(0.45, '#163524');
  eg.addColorStop(0.75, '#2b9f4c');
  eg.addColorStop(1, '#bdf5cf');
  ectx.fillStyle = eg; ectx.fillRect(0, 0, 256, 128);
  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  // без mipmaps на самой canvas-текстуре — PMREMGenerator строит СВОЮ mip-цепочку из неё;
  // без этого WebGL ругался «generateMipmap: lazy initialization» на обычной 2D-текстуре снизу
  envTex.generateMipmaps = false;
  envTex.minFilter = THREE.LinearFilter;
  envTex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();   // прогреть шейдер ДО первого fromEquirectangular — без этого
                                           // Firefox жаловался «generateMipmap: lazy initialization»
  const envMap = pmrem.fromEquirectangular(envTex).texture;
  envTex.dispose();
  pmrem.dispose();
  scene.environment = envMap;

  // ── процедурный normal map: дешёвая «искристость/трещины» без настоящей трассировки лучей ──
  // (Blender/офлайн-рендер дал бы настоящие внутренние каустики — для лёгкого WebGL-hero это
  // overkill; шум-нормали дают похожий ПРИЗНАК «неровного стекла изнутри» почти бесплатно)
  function makeSparkleNormalMap(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    const img = cx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      // случайный наклон нормали в касательной плоскости (dx,dy малые, z доминирует — почти плоско,
      // но достаточно шумно, чтобы блики ложились неровно, как грани внутренней трещины)
      const dx = (Math.random() - 0.5) * 0.7;
      const dy = (Math.random() - 0.5) * 0.7;
      const len = Math.hypot(dx, dy, 1);
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 9); // мелкий повтор — «зерно», не растянутое пятно на всю грань
    return tex;
  }
  const sparkleNormal = makeSparkleNormalMap(128);

  // ── дешёвая карта высот («бомж-рельеф»): серый шум + несколько ломаных царапин-трещин ──
  // Не настоящий displacement (та же экономия, что и у normal map выше) — просто bumpMap поверх
  // стекла, чтобы блик на грани не был идеально гладким пятном, а ловил мелкие изломы, как на фото.
  function makeHeightMap(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    cx.fillStyle = '#808080';
    cx.fillRect(0, 0, size, size);
    const img = cx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 60;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    // несколько случайных ломаных линий-трещин — светлая/тёмная пара рядом даёт иллюзию грани скола
    cx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      cx.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)';
      cx.beginPath();
      let x = Math.random() * size, y = Math.random() * size;
      cx.moveTo(x, y);
      const segs = 3 + Math.floor(Math.random() * 3);
      for (let s = 0; s < segs; s++) {
        x += (Math.random() - 0.5) * size * 0.5;
        y += (Math.random() - 0.5) * size * 0.5;
        cx.lineTo(x, y);
      }
      cx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 9);
    return tex;
  }
  const heightMap = makeHeightMap(128);

  // цвет ядра/bloom — из токена темы (--crystal-glow), обновляем по themechange без чтения в кадре
  const glowColor = new THREE.Color(0x3fc568);
  const readGlow = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--crystal-glow').trim();
    if (v) glowColor.set(v);
  };
  readGlow();

  // v2 (2026-11-19) — по центру hero, крупно, ЗА текстом (не в углу): позиция экрана теперь делает
  // CSS (большой центрированный квадрат в Hero.astro), группа внутри своего канваса — по центру
  const crystalGroup = new THREE.Group();
  crystalGroup.rotation.z = -0.22; // лёгкий наклон — «парящий осколок», не ровно по стойке
  // объект асимметричен по высоте (остриё только сверху) — опускаем группу на половину этой разницы,
  // чтобы кадр был отцентрован честно (камеру не трогаем — она смотрит вдоль -Z без наклона)
  crystalGroup.position.y = -0.6;
  scene.add(crystalGroup);

  // Настоящая форма кварца, не абстрактный гем: шестигранная призма (тело) + шестигранная
  // пирамида (остриё) на одном конце — силуэт натурального кристалла кварца, не икосаэдр-болванка.
  // Материал почти ПРОЗРАЧНЫЙ (по референсу Элайджи — чистое стекло со свечением на РЁБРАХ,
  // не тонированный шар): цвет ближе к белому, ниже roughness/intensity, упор на грань-highlight
  // от rim-света (см. ниже), не на внутреннюю заливку.
  // physically-point-correct `transmission` в связке с EffectComposer оказался хрупким: вместо
  // чистого стекла давал ровную серую заливку на весь силуэт (измерено readPixels — цвет менялся
  // от lighting, но оставался плоским без «просвета» фона сквозь грани). Дешёвый обходной путь —
  // обычный alpha-blend (transparent+opacity) вместо transmission: предсказуемо, без сюрпризов
  // composer'а, и даёт именно ту полупрозрачность, что на референсе — фон ЧЕСТНО виден сквозь тело.
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0xcdf0da,
    metalness: 0, roughness: 0.05,
    transmission: 0,
    transparent: true, opacity: 0.4,
    depthWrite: false,                                    // полупрозрачные грани не должны перекрывать друг друга по глубине
    side: THREE.DoubleSide,                                // сквозь переднюю грань видно заднюю (толщина тела), не пустоту
    clearcoat: 0.35, clearcoatRoughness: 0.08,              // тонкая глянцевая плёнка — блик на ребре, не заливка
    envMap, envMapIntensity: 0.4,
    flatShading: true,                                   // чёткие грани призмы/пирамиды, не сглаженные
    normalMap: sparkleNormal, normalScale: new THREE.Vector2(0.4, 0.4),   // искристость без каустик
    bumpMap: heightMap, bumpScale: 0.012,                                 // «бомж»-рельеф поверх — не идеально гладкое стекло
  });

  // ОДНА модель, не два отдельных меша: призма+остриё сливаются в единую геометрию
  // (BufferGeometryUtils.mergeGeometries) — честный цельный кристалл, без шва на стыке, одна draw call.
  const RADIUS = 0.72, PRISM_H = 2.45, TIP_H = 1.2, SIDES = 6;
  const prismGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.94, PRISM_H, SIDES, 1, false);
  const tipGeo = new THREE.ConeGeometry(RADIUS, TIP_H, SIDES);
  tipGeo.translate(0, PRISM_H / 2 + TIP_H / 2, 0);
  const crystalGeo = mergeGeometries([prismGeo, tipGeo]);
  prismGeo.dispose();
  tipGeo.dispose();
  const crystalMesh = new THREE.Mesh(crystalGeo, gemMat);
  crystalGroup.add(crystalMesh);

  // нижний конец чуть сужен и закрыт плоской гранью (openEnded:false у цилиндра) — natural quartz
  // «обломан» у основания, не отполирован в точку с обеих сторон сразу

  // ── внутренний источник света: яркое emissive-ядро (ГЛАДКАЯ сфера — гранёная давала крапинки
  // при преломлении сквозь внешние грани, смотрелось как пятна, а не мягкий свет) + PointLight ──
  const coreGeo = new THREE.SphereGeometry(0.09, 16, 16);
  // цвет ядра «передержан» (×2.4, выше 1.0) — bloom видит яркость ДО тонмаппинга, нужно реально
  // перешагнуть новый высокий threshold (0.82), иначе при обычной насыщенности ядро bloom не ловит
  const coreMat = new THREE.MeshBasicMaterial({ color: glowColor.clone().multiplyScalar(2.4) });
  const core = new THREE.Mesh(coreGeo, coreMat);
  crystalGroup.add(core);
  // light слабее, чем раньше (3.2→1.1) — PointLight стоит ВНУТРИ толщи стекла, в упор освещая
  // стенки изнутри; на полной яркости вся призма заливалась ровным молочным светом, из-за чего
  // стекло читалось как матовая пластиковая болванка, а не прозрачный кристалл. bloom по-прежнему
  // ловит ядро по собственной (передержанной) яркости — независимо от того, как светит PointLight.
  const coreLight = new THREE.PointLight(glowColor, 1.1, 4.5, 2);
  coreLight.position.set(0, 0, 0);
  crystalGroup.add(coreLight);
  addEventListener('themechange', () => { readGlow(); coreMat.color.copy(glowColor).multiplyScalar(2.4); coreLight.color.copy(glowColor); });

  // key — лепит грани; rim — яркий контровой СЗАДИ объекта (по референсу: свечение на силуэте,
  // не в заливке) — именно rim даёт тот «горящий край» эффект на фото, не внутренний шарик
  // key тоже приглушен (1.3→0.6) — на полной яркости белый directional заливал всю лицевую грань
  const key = new THREE.DirectionalLight(0xffffff, 0.6); key.position.set(3, 2.5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(glowColor, 2.6); rim.position.set(-2.2, 1.2, -3.5); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(glowColor, 1.6); rim2.position.set(2.4, -1.5, -3); scene.add(rim2);
  scene.add(new THREE.AmbientLight(0x0e1a13, 0.3));

  // ── bloom: «сильный блюр» свечения на гранях/рёбрах ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // threshold высокий (0.25 давал bloom на ВСЮ белую поверхность стекла, не только на ядро —
  // отсюда «засвеченный шар» вместо чёткой огранки). radius выше (0.8) — мягче, шире ореол на рёбрах
  // radius ниже (0.8→0.4) — раньше bloom размывал весь силуэт в мутное облако, как виньетка в CSS
  // (обе убраны по одной жалобе); теперь свечение держится у рёбер, не глушит форму кристалла
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.4, 0.8);
  composer.addPass(bloom);

  // ── дисперсия на краях: трендовый «сочный» эффект стекла (как liquid-glass UI) — канал R/G/B
  // расходятся радиально от центра кадра, сильнее к углам. Настоящая физическая дисперсия в three.js
  // (dispersion на MeshPhysicalMaterial) завязана на transmission, который здесь не работает (см.
  // комментарий у gemMat) — этот шейдер даёт тот же ВИЗУАЛЬНЫЙ признак (цветная окантовка на силуэте)
  // одним дешёвым fullscreen-пассом, без зависимости от хрупкого transmission.
  const dispersion = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, amount: { value: 0.045 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      varying vec2 vUv;
      void main() {
        vec2 d = vUv - 0.5;
        vec2 offset = d * dot(d, d) * amount; // растёт как quadratic от расстояния до центра — у центра почти 0
        float r = texture2D(tDiffuse, vUv - offset).r;
        vec4 mid = texture2D(tDiffuse, vUv);
        float b = texture2D(tDiffuse, vUv + offset).b;
        gl_FragColor = vec4(r, mid.g, b, mid.a);
      }
    `,
  });
  composer.addPass(dispersion);

  function resize() {
    // канвас — свой компактный квадрат (CSS в Hero.astro), не весь hero: читаем ЕГО размер,
    // не секции (меньше пикселей = меньше работы renderer/composer, см. комментарий у setPixelRatio)
    const w = Math.max(1, canvas.clientWidth || innerWidth);
    const h = Math.max(1, canvas.clientHeight || innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
  }

  let running = false, rafId = 0;
  function animate(ts) {
    if (!running) return;
    const t = ts * 0.001;
    if (!reduced) {
      crystalGroup.rotation.y = t * 0.22;         // вращаем ВСЮ группу — призма+остриё как единое тело,
      crystalGroup.rotation.x = Math.sin(t * 0.4) * 0.12; // не только призму (иначе остриё «отрывалось»)
      const pulse = 1 + Math.sin(t * 1.6) * 0.06;         // ядро «дышит» — живой источник света, не статика
      core.scale.setScalar(pulse);
      coreLight.intensity = 1.1 + Math.sin(t * 1.6) * 0.3;
    }
    composer.render();
    rafId = requestAnimationFrame(animate);
  }
  function start() { if (!running) { running = true; rafId = requestAnimationFrame(animate); } }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  addEventListener('resize', resize, { passive: true });
  resize();

  if (reduced) { composer.render(); return; } // один неподвижный кадр, без цикла и без наблюдателя

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 }).observe(canvas);
  } else {
    start();
  }
}
