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
  camera.position.set(0, 0, 6.3); // камера БЕЗ вертикального сдвига — сдвигаем саму группу ниже (см. ниже)

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

  // цвет ядра/bloom — из токена темы (--crystal-glow), обновляем по themechange без чтения в кадре
  const glowColor = new THREE.Color(0x3fc568);
  const readGlow = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--crystal-glow').trim();
    if (v) glowColor.set(v);
  };
  readGlow();

  // позиционирование теперь делает CSS (canvas — компактный квадрат в углу hero, не весь hero) —
  // группа в своём канвасе просто по центру, сдвиг в 3D больше не нужен
  const crystalGroup = new THREE.Group();
  crystalGroup.rotation.z = -0.22; // лёгкий наклон — «парящий осколок», не ровно по стойке
  // объект асимметричен по высоте (остриё только сверху) — визуальный центр призма+остриё сдвинут
  // на +0.41 от локального нуля; опускаем группу на столько же, чтобы кадр был отцентрован честно,
  // а не камерой (камеру трогать не стали — она просто смотрит вдоль -Z без наклона)
  crystalGroup.position.y = -0.62;
  scene.add(crystalGroup);

  // Настоящая форма кварца, не абстрактный гем: шестигранная призма (тело) + шестигранная
  // пирамида (остриё) на одном конце — силуэт натурального кристалла кварца, не икосаэдр-болванка.
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0x9fd6b4,   // приглушённый мятно-стеклянный тон, не слепящий белый — иначе весь объём уходил в bloom
    metalness: 0, roughness: 0.22,
    transmission: 1, thickness: 0.8, ior: 1.54,          // ior кварца в жизни ≈1.54-1.55 — взял настоящее значение
    clearcoat: 0.6, clearcoatRoughness: 0.12,
    envMap, envMapIntensity: 0.7,
    flatShading: true,                                   // чёткие грани призмы/пирамиды, не сглаженные
  });

  const RADIUS = 0.46, PRISM_H = 1.65, TIP_H = 0.82, SIDES = 6;
  const prismGeo = new THREE.CylinderGeometry(RADIUS, RADIUS * 0.94, PRISM_H, SIDES, 1, false);
  const prism = new THREE.Mesh(prismGeo, gemMat);
  crystalGroup.add(prism);

  const tipGeo = new THREE.ConeGeometry(RADIUS, TIP_H, SIDES);
  const tip = new THREE.Mesh(tipGeo, gemMat);
  tip.position.y = PRISM_H / 2 + TIP_H / 2;
  crystalGroup.add(tip);

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
  const coreLight = new THREE.PointLight(glowColor, 4.5, 6, 2);
  coreLight.position.set(0, 0, 0);
  crystalGroup.add(coreLight);
  addEventListener('themechange', () => { readGlow(); coreMat.color.copy(glowColor).multiplyScalar(2.4); coreLight.color.copy(glowColor); });

  // два резких направленных света с разных сторон — грани должны спорить друг с другом яркостью,
  // иначе плоское освещение смазывает огранку в один ровный блик (что и было: читалось как шар, не гем)
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(3, 2.5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fe8c0, 0.9); rim.position.set(-3, -1.5, 2); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x0e1a13, 0.35));

  // ── bloom: «сильный блюр» свечения ядра сквозь грани ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // threshold высокий (0.25 давал bloom на ВСЮ белую поверхность стекла, не только на ядро —
  // отсюда «засвеченный шар» вместо чёткой огранки с одной светящейся точкой внутри)
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.55, 0.82);
  composer.addPass(bloom);

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
      coreLight.intensity = 5.4 + Math.sin(t * 1.6) * 1.2;
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
