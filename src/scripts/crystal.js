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
  // кап был 1 (жалоба «пикселизация, мыльная текстура» — на retina это рендерило в половину
  // физических пикселей экрана). transmission давно выключен (0), внутренний core+PointLight убраны —
  // то тяжёлое, что роняло fps до 33 при 1.5, больше не считается; подняли кап до 1.5.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.transmissionResolutionScale = 0.25; // меньше внутренний render-target под transmission-стекло
  // Firefox шлёт безобидный warning «generateMipmap: lazy initialization» на первом кадре —
  // источник найден (изолировано: исчезает только при transmission:0), это диагностика ВНУТРЕННЕГО
  // render-target'а, который THREE.WebGLRenderer сам заводит под стеклянный материал, не наш код
  // и не наша текстура — убрать можно только отказом от transmission (т.е. от самого «стекла»).

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 5.6); // камера БЕЗ вертикального сдвига — сдвигаем саму группу ниже (см. ниже)

  // ── процедурный envmap: тёмный фон → белый, для преломления в фасетах (белый свет, без цвета) ──
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 256; envCanvas.height = 128;
  const ectx = envCanvas.getContext('2d');
  const eg = ectx.createLinearGradient(0, 0, 0, 128);
  eg.addColorStop(0, '#0e0e0e');
  eg.addColorStop(0.45, '#2a2a2a');
  eg.addColorStop(0.75, '#9a9a9a');
  eg.addColorStop(1, '#cfcfcf'); // не чистый белый — иначе envMap-отражение «пересвечивает» грань в блик-пятно
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
  const sparkleNormal = makeSparkleNormalMap(256); // 128→256 — на retina+pixelRatio 1.5 128 читался блочным/пиксельным

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
  const heightMap = makeHeightMap(256); // та же причина, что у sparkleNormal выше

  // ── карта шероховатости: только МЕЛКОЕ зерно, без крупных пятен — убирает «рендерную» идеально
  // ровную гладь (жалоба «прямо как из рендера»). Первая версия добавляла крупные размытые блобы,
  // которые МЕСТАМИ делали поверхность глаже базы — случайно совпав с направлением back-света, такой
  // блоб давал ещё более яркий зеркальный хотспот (хуже, чем без карты). Эта версия только повышает
  // шероховатость зерном (никогда не делает площадь глаже базовой) — рассеивает блик в мелкую
  // неровную «соль», а не в один чистый овал, и не может случайно собраться в новый хотспот.
  function makeRoughnessMap(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    cx.fillStyle = '#b4b4b4'; // база — зерно только ДОБАВЛЯЕТ (вверх к 255), никогда не полирует ниже базы
    cx.fillRect(0, 0, size, size);
    const img = cx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.min(255, img.data[i] + Math.random() * 75); // только вверх от базы
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
    cx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 9);
    return tex;
  }
  const roughnessMap = makeRoughnessMap(256);

  // чисто белый свет/стекло, без зелёного токена темы (--crystal-glow) — по просьбе Элайджи:
  // кристалл без цвета, целиком на белом свете
  const glowColor = new THREE.Color(0xffffff);

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
    color: 0xffffff,
    metalness: 0, roughness: 0.4,                         // 0.05→0.22→0.4 — нижняя грань (почти в упор к камере)
                                                             // всё ещё выжигала сплошной белый купол даже на 0.22;
                                                             // рассеивает блик сильнее
    transmission: 0,
    transparent: true, opacity: 0.4,
    depthWrite: false,                                    // полупрозрачные грани не должны перекрывать друг друга по глубине
    side: THREE.DoubleSide,                                // сквозь переднюю грань видно заднюю (толщина тела), не пустоту
    clearcoat: 0,                                          // убран (0.35→0) — глянцевая плёнка давала СВОЙ отдельный блик
                                                             // на каждой грани поверх уже существующих от key/back — лишний
                                                             // источник бликов, которых и так жаловались «слишком много»
    envMap, envMapIntensity: 0.12,
    flatShading: true,                                   // чёткие грани призмы/пирамиды, не сглаженные
    normalMap: sparkleNormal, normalScale: new THREE.Vector2(0.6, 0.6),   // 0.4→0.6 — заметнее неровность
    bumpMap: heightMap, bumpScale: 0.02,                                  // 0.012→0.02 — рельеф читается сильнее
    roughnessMap,                                                        // гуляющая шероховатость — не идеально
                                                                           // ровный блик «как из рендера» (жалоба)
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

  // внутренний источник убран целиком (emissive-ядро + PointLight) — по просьбе Элайджи: никакого
  // свечения ИЗНУТРИ, весь свет только СЗАДИ (back, ниже). Кристалл читается чисто контровым/rim-светом.

  // ТОЛЬКО ДВА направленных источника (было 4: key+back+rim+rim2) — жалоба «слишком много бликов»:
  // каждый direct light даёт СВОЙ отдельный специк-блик на гранях, 4 источника = 4 пятна россыпью.
  // key — минимальный fill спереди, только чтобы грани не проваливались в черноту; back — основной,
  // на оси камеры позади объекта (кристалл между светом и наблюдателем).
  const key = new THREE.DirectionalLight(0xffffff, 0.22); key.position.set(3, 2.5, 4); scene.add(key);
  const back = new THREE.DirectionalLight(glowColor, 0.3); back.position.set(0.3, 0.4, -6); scene.add(back);
  scene.add(new THREE.AmbientLight(0x1a1a1a, 0.22));

  // ── Fresnel-оболочка: «весь свет только в рёбра» ──────────────────────────────────────────────
  // Не завязана на лампы вообще — чисто геометрический rim (1 − |N·V|)^p, ярче там, где грань стоит
  // РЕБРОМ к камере (силуэт), и почти невидима в центре фасета. Именно это даёт референсный эффект
  // «мощное разложение по кромке» (как на 3D-типографике text.design): дисперсия (post-процесс выше)
  // сильнее всего ложится именно там, где этот шелл ярче всего — т.е. ровно на рёбрах, а не вразброс.
  const fresnelMat = new THREE.ShaderMaterial({
    // power выше (1.8→2.4, уже резче падает к центру грани) + intensity-потолок (0.55) — у основания
    // призмы кромка стоит почти РЕБРОМ к камере почти по всей окружности разом (не только на 1-2
    // гранях, как на остальном теле), rim там легко упирался в 1.0 и заливал низ сплошной белой
    // полосой («блики внизу слишком сильные»); clamp держит его видимым, но не выжигает в сплошняк.
    uniforms: { power: { value: 2.4 }, intensity: { value: 0.55 }, glowCol: { value: new THREE.Color(0xffffff) } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float power; uniform float intensity; uniform vec3 glowCol;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float rim = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), power) * intensity;
        gl_FragColor = vec4(glowCol, rim);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fresnelShell = new THREE.Mesh(crystalGeo, fresnelMat);
  fresnelShell.scale.setScalar(1.015); // чуть крупнее тела — оболочка СНАРУЖИ, не z-fighting с гранями
  crystalGroup.add(fresnelShell);

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
    uniforms: { tDiffuse: { value: null }, amount: { value: 0.07 } },
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
