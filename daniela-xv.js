/* ═══════════════════════════════════════════
   THREE.JS — Star Field + Nebula + Particles
═══════════════════════════════════════════ */
(function initThree() {
  const canvas = document.getElementById('star-canvas');
  const W = window.innerWidth, H = window.innerHeight;

  // Equipos de menor potencia (móviles/tablets): aligeramos la escena 3D
  // para que el scroll sea fluido (menos estrellas/partículas y menor
  // resolución de render, que es lo que más cuesta en GPUs móviles).
  const isLowPower = window.matchMedia('(max-width: 820px)').matches
                  || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                  || (navigator.maxTouchPoints || 0) > 0;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1 : 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const cam    = new THREE.PerspectiveCamera(70, W/H, 0.1, 1000);
  cam.position.z = 6;

  /* ── Stars ── */
  const N_STARS = isLowPower ? 850 : 1800;
  const sp  = new Float32Array(N_STARS * 3);
  const sc  = new Float32Array(N_STARS * 3);
  const ss  = new Float32Array(N_STARS);

  for (let i = 0; i < N_STARS; i++) {
    sp[i*3]   = (Math.random()-0.5)*120;
    sp[i*3+1] = (Math.random()-0.5)*120;
    sp[i*3+2] = (Math.random()-0.5)*60;
    ss[i]     = Math.random()*2.2 + 0.4;
    const t   = Math.random();
    if      (t < 0.35) { sc[i*3]=1;    sc[i*3+1]=0.82; sc[i*3+2]=0.41; } // firefly gold #FFD166
    else if (t < 0.62) { sc[i*3]=0.72; sc[i*3+1]=1;    sc[i*3+2]=0.74; } // bioluminescent green-white
    else               { sc[i*3]=1;    sc[i*3+1]=1;    sc[i*3+2]=1;    } // white
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp,3));
  sg.setAttribute('aColor',   new THREE.BufferAttribute(sc,3));
  sg.setAttribute('aSize',    new THREE.BufferAttribute(ss,1));

  const sm = new THREE.ShaderMaterial({
    uniforms: { uTime:{ value:0 }, uDpr:{ value:renderer.getPixelRatio() } },
    vertexShader:`
      attribute float aSize;
      attribute vec3  aColor;
      varying   vec3  vColor;
      uniform   float uTime, uDpr;
      void main(){
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        float t = sin(uTime*1.8 + position.x*8.0 + position.y*6.0)*0.28 + 0.72;
        gl_PointSize = aSize * uDpr * t * (280.0 / -mv.z);
        gl_Position  = projectionMatrix * mv;
      }`,
    fragmentShader:`
      varying vec3 vColor;
      void main(){
        float d = distance(gl_PointCoord, vec2(0.5));
        if(d > 0.5) discard;
        float a = pow(1.0 - smoothstep(0.0,0.5,d), 1.8);
        gl_FragColor = vec4(vColor, a);
      }`,
    transparent:true, vertexColors:false,
    depthWrite:false, blending:THREE.AdditiveBlending
  });
  const starMesh = new THREE.Points(sg, sm);
  scene.add(starMesh);

  /* ── Nebula cloud ── */
  const N_NEB = isLowPower ? 90 : 180;
  const np = new Float32Array(N_NEB*3);
  const nc = new Float32Array(N_NEB*3);
  const ns = new Float32Array(N_NEB);
  for (let i=0;i<N_NEB;i++){
    np[i*3]   = (Math.random()-0.5)*90;
    np[i*3+1] = (Math.random()-0.5)*70;
    np[i*3+2] = (Math.random()-0.5)*35 - 12;
    ns[i]     = Math.random()*10 + 4;
    const c   = Math.random();
    if      (c<0.38){ nc[i*3]=0.18;nc[i*3+1]=0.42;nc[i*3+2]=0.31; } // verde pantano #2D6A4F
    else if (c<0.68){ nc[i*3]=0.32;nc[i*3+1]=0.66;nc[i*3+2]=0.49; } // verde musgo #52796F
    else            { nc[i*3]=0.91;nc[i*3+1]=0.77;nc[i*3+2]=0.42; } // dorado brillante
  }
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.BufferAttribute(np,3));
  ng.setAttribute('aColor',   new THREE.BufferAttribute(nc,3));
  ng.setAttribute('aSize',    new THREE.BufferAttribute(ns,1));

  const nm = new THREE.ShaderMaterial({
    uniforms:{ uTime:{value:0}, uDpr:{value:renderer.getPixelRatio()} },
    vertexShader:`
      attribute float aSize; attribute vec3 aColor;
      varying   vec3  vColor;
      uniform   float uTime, uDpr;
      void main(){
        vColor=aColor;
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        float p=sin(uTime*0.4+position.x*4.0)*0.18+0.82;
        gl_PointSize=aSize*uDpr*p*(180.0/-mv.z);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader:`
      varying vec3 vColor;
      void main(){
        float d=distance(gl_PointCoord,vec2(0.5));
        if(d>0.5) discard;
        float a=pow(1.0-smoothstep(0.0,0.5,d),3.2)*0.28;
        gl_FragColor=vec4(vColor,a);
      }`,
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(ng, nm));

  /* ── Gold float particles ── */
  const N_FP = isLowPower ? 38 : 80;
  const fp   = new Float32Array(N_FP*3);
  const fspd = new Float32Array(N_FP);
  const fdx  = new Float32Array(N_FP);
  for (let i=0;i<N_FP;i++){
    fp[i*3]   = (Math.random()-0.5)*35;
    fp[i*3+1] = (Math.random()-0.5)*25;
    fp[i*3+2] = (Math.random()-0.5)*12;
    fspd[i]   = Math.random()*0.4+0.15;
    fdx[i]    = (Math.random()-0.5)*0.008;
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute('position', new THREE.BufferAttribute(fp,3));
  const fmat = new THREE.PointsMaterial({
    color:0xd4a853, size:0.06, transparent:true, opacity:0.55,
    blending:THREE.AdditiveBlending, depthWrite:false
  });
  const floatMesh = new THREE.Points(fgeo, fmat);
  scene.add(floatMesh);

  /* ── Camera target ── */
  let camZTarget = 6, camYTarget = 0;

  /* ── Animate ── */
  /* ── Single master rAF — drives Three.js + particles + cursor ── */
  let t = 0, rafId;
  function masterLoop(){
    rafId = requestAnimationFrame(masterLoop);
    t += 0.01;
    sm.uniforms.uTime.value = t;
    nm.uniforms.uTime.value = t;

    starMesh.rotation.y = t * 0.008;
    starMesh.rotation.x = t * 0.003;

    const fpa = fgeo.attributes.position.array;
    for(let i=0;i<N_FP;i++){
      fpa[i*3+1] += fspd[i]*0.004;
      fpa[i*3]   += fdx[i];
      if(fpa[i*3+1]>12){ fpa[i*3+1]=-12; fpa[i*3]=(Math.random()-0.5)*35; }
    }
    fgeo.attributes.position.needsUpdate = true;

    cam.position.z += (camZTarget - cam.position.z)*0.06;
    cam.position.y += (camYTarget - cam.position.y)*0.06;
    renderer.render(scene, cam);

    // Particle canvas tick (merged — no extra rAF)
    if(window._tickParticles) window._tickParticles();
    // Cursor tick (merged)
    if(window._tickCursor) window._tickCursor();
    // Luciérnaga / location scene tick (merged)
    if(window._tickRay) window._tickRay();
    // Visibilidad de escenas (cada frame: nunca se congela ni depende de
    // que ScrollTrigger dispare onUpdate — robusto al 100%)
    if(window._enforceScenes) window._enforceScenes();
  }
  masterLoop();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafId);
    else masterLoop();
  });

  window.addEventListener('resize',()=>{
    renderer.setSize(window.innerWidth, window.innerHeight);
    cam.aspect = window.innerWidth/window.innerHeight;
    cam.updateProjectionMatrix();
  });

  /* expose for scroll update */
  window._three = { cam, camZTarget:()=>camZTarget, camYTarget:()=>camYTarget,
    setZ:v=>camZTarget=v, setY:v=>camYTarget=v };
})();


/* ═══════════════════════════════════════════
   GSAP — Scroll-Driven Cinematics
═══════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);

// Ignorar los micro-resizes que provoca la barra de direcciones en móviles
// (causaban saltos y que las escenas se desincronizaran al hacer scroll).
ScrollTrigger.config({ ignoreMobileResize: true });

// Distancia de scroll por sección. 0.9 = 90vh por sección (antes 1.2/120vh):
// ~25% menos scroll → cambiar de sección se siente un poco más ágil.
// IMPORTANTE: si cambias este valor, ajusta también la altura de
// #scroll-container en el CSS (debe ser ≈ SCENE_mult * 9 vh).
const VH    = window.innerHeight;
const SCENE = VH * 0.9; // 90vh por sección

// Suavizado del scroll-scrub: más bajo = responde más rápido al dedo/rueda
// (1.2 se sentía con retardo/"lento"; 0.9 es más ágil sin perder fluidez).
const SCRUB = 0.9;

// La ampliación del castillo a 9× creaba una capa enorme (el contenedor mide
// 220% del ancho) que el navegador re-rasterizaba en cada frame → trababa
// MUCHÍSIMO al volver a la 1ª sección, tanto en móvil como en PC. Reducimos la
// ampliación: la capa pasa a componerse barato y el zoom sigue viéndose bien.
const IS_MOBILE_GSAP = window.matchMedia('(max-width: 820px)').matches
                    || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                    || (navigator.maxTouchPoints || 0) > 0;
const CASTLE_SCALE = IS_MOBILE_GSAP ? 4 : 5;

/* Progress bar */
ScrollTrigger.create({
  trigger:'#scroll-container', start:'top top', end:'bottom bottom',
  onUpdate(self){
    gsap.set('#progress',{ width: self.progress*100+'%' });
    if(window._three){
      window._three.setZ(6 - self.progress*4);
      window._three.setY(self.progress*2.5);
    }
  }
});

/* ── S1→S2: Castle zoom + Name Reveal ── */
const tl1 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:'top top',
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl1
  .to('#castle-world',    { scale:CASTLE_SCALE, y:'25%', transformOrigin:'50% 100%', ease:'power2.inOut' }, 0)
  .to('#mtn-far',         { y:'-90px', ease:'none' }, 0)
  .to('#mtn-near',        { y:'-50px', ease:'none' }, 0)
  .to('#opening-copy',    { opacity:0, y:-25, ease:'power2.in' }, 0)
  /* (opacidad de escenas controlada por enforceSceneVisibility) */
  .fromTo('#xv-name',     { scale:0.5, opacity:0 },
                          { scale:1, opacity:1, ease:'back.out(1.8)' }, 0.58)
  .fromTo('#crown-glyph', { y:-50, opacity:0 },
                          { y:0, opacity:1, ease:'back.out(2)' }, 0.6)
  .fromTo('#xv-years',    { y:25, opacity:0 }, { y:0, opacity:1, ease:'power2.out' }, 0.65)
  .fromTo('#name-tagline',{ y:18, opacity:0 }, { y:0, opacity:1, ease:'power2.out' }, 0.7)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo I — El Nombre', 0.5);

/* ── S2→S3: Garden ── */
const tl2 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl2
  /* Entrada suave de los controles de la galería (la foto la maneja el
     carrusel; la opacidad de la escena la maneja enforceSceneVisibility) */
  .fromTo('#gal-brand',   { y:-12, opacity:0 }, { y:0, opacity:1, ease:'power2.out' }, 0.35)
  .fromTo('#gal-sidenav', { x:-25, opacity:0 }, { x:0, opacity:1, ease:'power2.out' }, 0.4)
  .fromTo('#garden-quote',{ y:30, opacity:0 },  { y:0, opacity:1, ease:'power2.out' }, 0.5)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo II — El Jardín', 0.3);

/* ── S3→S4: Event Details ── */
const tl3 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE*2}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl3
  .fromTo('#event-container', { y:70, opacity:0, scale:0.92 },
                              { y:0, opacity:1, scale:1, ease:'back.out(1.3)' }, 0.35)
  .fromTo('#countdown',  { y:35, opacity:0 }, { y:0, opacity:1, ease:'power2.out' }, 0.5)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo III — La Celebración', 0.3);

/* ── S4→S5: Cómo Llegar ── */
const tl4 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE*3}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl4
  .fromTo('#location-content',
    { x:-80, opacity:0 },
    { x:0,   opacity:1, ease:'power2.out' }, 0.38)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo IV — La Ruta', 0.3);

/* ── S5→S6: Dress Code ── */
const tl5 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE*4}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl5
  .fromTo('#dress-content', { x:-40, opacity:0 }, { x:0, opacity:1, ease:'power2.out' }, 0.35)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo V — El Código', 0.3);

/* ── S6→S7: Mesa de Regalos ── */
const tl6 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE*5}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl6
  .fromTo('#gifts-content', { x:40, opacity:0 }, { x:0, opacity:1, ease:'power2.out' }, 0.35)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo VI — Los Regalos', 0.3);

/* ── S7→S8: RSVP ── */
const tl7 = gsap.timeline({
  scrollTrigger:{
    trigger:'#scroll-container', start:`top+=${SCENE*6}`,
    end:`+=${SCENE}`, scrub:SCRUB
  }
});
tl7
  .fromTo('#rsvp-body',{ y:60, opacity:0, scale:0.96 },
                       { y:0, opacity:1, scale:1, ease:'back.out(1.4)' }, 0.35)
  .add(()=> document.getElementById('chapter-label').textContent='Capítulo VII — Tu Confirmación', 0.3);


/* ═══════════════════════════════════════════
   RED DE SEGURIDAD — Visibilidad de escenas
   ───────────────────────────────────────────
   Cada escena la encienden/apagan DOS timelines distintas (una la mete,
   la siguiente la saca). Al hacer scroll rápido o cuando el navegador
   móvil mueve la barra de direcciones, esas dos se desincronizan y una
   escena se queda "pegada" visible bajo otra (el bug reportado).

   Esta función es la ÚNICA fuente de verdad: según la posición de scroll
   calcula qué escena está activa y obliga a OCULTAR cualquier escena que
   no sea la actual ni su vecina en transición. Así nunca se solapan dos
   escenas lejanas, pase lo que pase con el scrub.
═══════════════════════════════════════════ */
const orderedScenes = [
  '#scene-cosmos', '#scene-reveal', '#scene-garden', '#scene-event',
  '#scene-location', '#scene-dress', '#scene-gifts', '#scene-rsvp'
].map(sel => document.querySelector(sel));
const LAST_SCENE = orderedScenes.length - 1; // 7

// Suavizado tipo "smoothstep" (interpolación con arranque/freno suaves)
function smoothstep(edge0, edge1, x){
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Opacidad de la escena i según la distancia (en unidades de escena) a su centro.
// - Meseta totalmente visible cerca del centro (|d| ≤ 0.20)
// - Fundido rápido entre 0.20 y 0.50
// - Invisible más allá de 0.50
// Como una escena llega a 0 justo cuando la vecina empieza a aparecer,
// NUNCA hay dos escenas visibles a la vez (fundido secuencial determinista).
function sceneOpacity(d){
  const ad = Math.abs(d);
  if(ad >= 0.5) return 0;
  if(ad <= 0.2) return 1;
  return 1 - smoothstep(0.2, 0.5, ad);
}

// ─── Lazy-load de fondos pesados de secciones ───
// Los fondos con [data-bg] se descargan solo al acercarse a su sección
// (con margen de anticipación para que nunca se vean a medio cargar).
let _lazyBgEls = null;
function lazyLoadBackgrounds(p){
  if(_lazyBgEls === null) _lazyBgEls = Array.from(document.querySelectorAll('[data-bg]'));
  if(!_lazyBgEls.length) return;
  const PRELOAD = 1.6; // secciones de anticipación
  for(let i = _lazyBgEls.length - 1; i >= 0; i--){
    const el  = _lazyBgEls[i];
    const idx = parseFloat(el.getAttribute('data-scene')) || 0;
    if(p >= idx - PRELOAD){
      el.style.backgroundImage = "url('" + el.getAttribute('data-bg') + "')";
      el.removeAttribute('data-bg');
      _lazyBgEls.splice(i, 1);
    }
  }
}

let _lastVis = new Array(orderedScenes.length).fill(null);
function enforceSceneVisibility(){
  const p = window.scrollY / SCENE; // posición en "unidades de escena" (0..LAST_SCENE)
  lazyLoadBackgrounds(p);
  for(let i = 0; i < orderedScenes.length; i++){
    const el = orderedScenes[i];
    if(!el) continue;
    // Clamp para que la primera y la última escena no se desvanezcan en los extremos
    let d = p - i;
    if(i === 0 && d < 0) d = 0;
    if(i === LAST_SCENE && d > 0) d = 0;

    const op = sceneOpacity(d);

    if(op <= 0.001){
      if(_lastVis[i] !== false){
        el.style.opacity = '0';
        el.style.visibility = 'hidden';   // fuera del hit-testing: no captura clics
        _lastVis[i] = false;
      }
    } else {
      if(_lastVis[i] !== true){
        el.style.visibility = '';
        _lastVis[i] = true;
      }
      el.style.opacity = op.toFixed(3);
    }
  }
}

// Exponer para que el bucle principal (rAF) la ejecute cada frame.
// Así NO dependemos de que ScrollTrigger dispare onUpdate (que puede no
// ocurrir si se inicializó con el scroll bloqueado).
window._enforceScenes = enforceSceneVisibility;

ScrollTrigger.create({
  trigger:'#scroll-container', start:'top top', end:'bottom bottom',
  onUpdate:  enforceSceneVisibility,
  onRefresh: enforceSceneVisibility
});
// Estado inicial correcto desde el arranque
enforceSceneVisibility();


/* ═══════════════════════════════════════════
   CURSOR
═══════════════════════════════════════════ */
// Detectar dispositivo táctil: en móviles/tablets NO usamos cursor personalizado
// (no aporta nada sin mouse y consumía cálculo por frame → lo hacía más lento).
const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches
                   || ('ontouchstart' in window)
                   || navigator.maxTouchPoints > 0;

const cursor = document.getElementById('cursor');
const dot    = document.getElementById('cursor-dot');
let cx=0, cy=0, mx=0, my=0;

if (isTouchDevice) {
  // Ocultar y desactivar el cursor personalizado en móvil
  if (cursor) cursor.style.display = 'none';
  if (dot)    dot.style.display = 'none';
  // window._tickCursor queda undefined → el master loop lo salta (sin coste)
} else {
  document.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; }, { passive:true });

  // Cursor updates merged into master rAF — no separate loop
  window._tickCursor = function(){
    cx+=(mx-cx)*0.14; cy+=(my-cy)*0.14;
    cursor.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    dot.style.transform    = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
  };

  document.querySelectorAll('button,input,select,a,.photo-frame').forEach(el=>{
    el.addEventListener('mouseenter',()=>{
      gsap.to(cursor,{ width:40,height:40,borderColor:'var(--rose-light)',duration:0.35 });
    });
    el.addEventListener('mouseleave',()=>{
      gsap.to(cursor,{ width:22,height:22,borderColor:'var(--gold)',duration:0.35 });
    });
  });
}


/* ═══════════════════════════════════════════
   MOUSE PARALLAX (scene 1 only)
═══════════════════════════════════════════ */
document.addEventListener('mousemove', e=>{
  const sp = ScrollTrigger.getAll()[0];
  if(!sp || sp.progress > 0.12) return;
  const xp = (e.clientX/window.innerWidth  - 0.5)*18;
  const yp = (e.clientY/window.innerHeight - 0.5)*10;
  gsap.to('#castle-world',{ x:xp, y:yp, duration:2.2, ease:'power2.out', overwrite:'auto' });
});


/* ═══════════════════════════════════════════
   COUNTDOWN TIMER
═══════════════════════════════════════════ */
function tick(){
  const target = window._countdownDate || new Date('2026-09-19T19:30:00').getTime();
  const ev   = new Date(target);
  const now  = new Date();
  const diff = ev - now;
  if(diff>0){
    document.getElementById('cd-d').textContent = String(Math.floor(diff/864e5)).padStart(2,'0');
    document.getElementById('cd-h').textContent = String(Math.floor((diff%864e5)/36e5)).padStart(2,'0');
    document.getElementById('cd-m').textContent = String(Math.floor((diff%36e5)/6e4)).padStart(2,'0');
    document.getElementById('cd-s').textContent = String(Math.floor((diff%6e4)/1e3)).padStart(2,'0');
  }
}
tick(); setInterval(tick,1000);


/* ═══════════════════════════════════════════
   GALERÍA DE FOTOS — Carrusel (Scene 3)
   Auto-avanza cada ~3.5s + flechas + puntos.
═══════════════════════════════════════════ */
(function initGallery(){
  const gallery = document.getElementById('gallery');
  if(!gallery) return;
  const slides = Array.from(gallery.querySelectorAll('.gal-slide'));
  if(!slides.length) return;

  const dotsWrap = document.getElementById('gal-dots');
  const prevBtn  = document.getElementById('gal-prev');
  const nextBtn  = document.getElementById('gal-next');
  const sceneEl  = document.getElementById('scene-garden');
  const INTERVAL = 3500; // ms entre cambios automáticos
  let idx = 0, timer = null;

  // Construir los puntos indicadores (uno por foto)
  const dots = [];
  if(dotsWrap){
    slides.forEach((_, i) => {
      const d = document.createElement('button');
      d.className = 'gal-dot' + (i === 0 ? ' is-active' : '');
      d.setAttribute('aria-label', 'Ir a la foto ' + (i + 1));
      d.addEventListener('click', () => go(i, true));
      dotsWrap.appendChild(d);
      dots.push(d);
    });
  }
  slides[0].classList.add('is-active');

  function go(n, manual){
    slides[idx].classList.remove('is-active');
    if(dots[idx]) dots[idx].classList.remove('is-active');
    idx = (n + slides.length) % slides.length;
    slides[idx].classList.add('is-active');
    if(dots[idx]) dots[idx].classList.add('is-active');
    if(manual) restart(); // si el usuario interactúa, reinicia el temporizador
  }
  const next = () => go(idx + 1);
  const prev = () => go(idx - 1);

  function start(){ if(slides.length > 1 && !timer) timer = setInterval(next, INTERVAL); }
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  function restart(){ stop(); start(); }

  if(nextBtn) nextBtn.addEventListener('click', () => go(idx + 1, true));
  if(prevBtn) prevBtn.addEventListener('click', () => go(idx - 1, true));

  // Pausar el auto-avance cuando la sección no está a la vista (ahorra trabajo
  // y hace que al volver el cambio se vea desde un punto natural).
  if(sceneEl){
    setInterval(() => {
      const visible = getComputedStyle(sceneEl).visibility !== 'hidden'
                   && parseFloat(sceneEl.style.opacity || '0') > 0.35;
      if(visible) start(); else stop();
    }, 700);
  }

  start();
})();


/* ═══════════════════════════════════════════
   CANVAS PARTICLES — zero DOM mutations, merged into master rAF
═══════════════════════════════════════════ */
(function initParticleCanvas(){
  const pc = document.createElement('canvas');
  pc.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;';
  document.body.appendChild(pc);

  let W = window.innerWidth, H = window.innerHeight;
  pc.width = W; pc.height = H;
  const ctx = pc.getContext('2d');

  window.addEventListener('resize', ()=>{
    W = pc.width  = window.innerWidth;
    H = pc.height = window.innerHeight;
  }, { passive:true });

  /* Simple particle — no radial gradients, no shadowBlur */
  function mkWisp(scatter){
    return {
      x: Math.random()*W,
      y: scatter ? Math.random()*H : H+10,
      r: Math.random()*2+0.8,
      vy: -(Math.random()*0.5+0.18),
      vx: (Math.random()-0.5)*0.25,
      gold: Math.random()>0.42,
      a: scatter ? Math.random()*0.6 : 0,
      maxA: Math.random()*0.6+0.2
    };
  }
  function mkPetal(scatter){
    return {
      x: Math.random()*W, y: scatter ? Math.random()*H : -15,
      rot: Math.random()*6.28, vr: (Math.random()-0.5)*0.035,
      vy: Math.random()*0.55+0.25, vx: (Math.random()-0.5)*0.4,
      w: Math.random()*5+3, h: Math.random()*3+2,
      a: scatter ? Math.random()*0.5 : 0, maxA: Math.random()*0.5+0.15,
      rose: Math.random()>0.5
    };
  }

  // Menos partículas en móviles/tablets para no recargar el dibujo por frame
  const lowPower = window.matchMedia('(max-width: 820px)').matches
                || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                || (navigator.maxTouchPoints || 0) > 0;
  const wisps  = Array.from({length: lowPower ? 18 : 35}, ()=>mkWisp(true));
  const petals = Array.from({length: lowPower ? 12 : 25}, ()=>mkPetal(true));

  /* Batch draw — group by fill color to minimise state changes */
  let _pframe = 0;
  window._tickParticles = function(){
    // En móvil: dibujar a ~30fps (saltar 1 de cada 2 frames) para aligerar
    if(lowPower && (_pframe++ & 1)) return;
    ctx.clearRect(0,0,W,H);

    // Update wisps
    for(let i=0;i<wisps.length;i++){
      const p=wisps[i];
      p.y+=p.vy; p.x+=p.vx;
      p.a += (p.y/H < 0.1) ? -0.015 : (p.a < p.maxA ? 0.01 : 0);
      if(p.y < -15 || p.a <= 0) wisps[i]=mkWisp(false);
    }
    // Draw gold wisps
    ctx.fillStyle='rgba(255,209,102,1)';  // #FFD166 luciérnaga
    for(let i=0;i<wisps.length;i++){
      const p=wisps[i]; if(!p.gold||p.a<=0) continue;
      ctx.globalAlpha=p.a;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill();
    }
    // Draw rose wisps
    ctx.fillStyle='rgba(132,169,140,1)';  // #84A98C verde niebla
    for(let i=0;i<wisps.length;i++){
      const p=wisps[i]; if(p.gold||p.a<=0) continue;
      ctx.globalAlpha=p.a;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill();
    }

    // Update + draw petals
    for(let i=0;i<petals.length;i++){
      const p=petals[i];
      p.y+=p.vy; p.x+=p.vx; p.rot+=p.vr;
      if(p.y < H*0.08) { if(p.a<p.maxA) p.a+=0.008; }
      else if(p.y > H*0.88) p.a-=0.012;
      if(p.y > H+15 || p.a<=0){ petals[i]=mkPetal(false); continue; }
      if(p.a<=0) continue;
      ctx.globalAlpha=p.a;
      ctx.save();
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.rose?'#84A98C':'#F4E1A1';  // verde niebla / champagne
      ctx.beginPath(); ctx.ellipse(0,0,p.w,p.h,0,0,6.28); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha=1;
  };

  window._particleBurst = function(){
    wisps.forEach(p=>{ p.y=H*0.5+Math.random()*120; p.vy=-(Math.random()*2+0.8); p.a=p.maxA; });
  };
})();

function spawnWisp(){}


/* ═══════════════════════════════════════════
   RSVP
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   ENTRY PORTAL & BACKGROUND MUSIC & LOADER FLOW
═══════════════════════════════════════════ */
(function(){
  const entryPortal = document.getElementById('entry-portal');
  const entryBtn = document.getElementById('entry-btn');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const audio = document.getElementById('bg-audio');
  const musicBtn = document.getElementById('music-btn');
  const decoration = document.getElementById('entry-decoration');

  if(!entryPortal || !entryBtn || !audio || !loader) return;

  // Ensure entry portal is visible, loader and invitation are hidden initially
  entryPortal.style.opacity = '1';
  entryPortal.style.display = 'flex';
  loader.style.opacity = '0';
  loader.style.pointerEvents = 'none';
  loader.style.display = 'none';

  // Generate decorative stars in entry portal
  function generateStars(){
    const colors = ['#FFD166','#E9C46A','#84A98C','#CDB4DB','#ffffff'];
    for(let i = 0; i < 38; i++){
      const star = document.createElement('div');
      star.className = 'entry-star';
      const size = Math.random() < 0.15 ? (Math.random()*4+3) : (Math.random()*2+1);
      star.style.left = Math.random() * 100 + '%';
      star.style.top  = Math.random() * 100 + '%';
      star.style.width  = size + 'px';
      star.style.height = size + 'px';
      star.style.background = colors[Math.floor(Math.random()*colors.length)];
      star.style.animationDelay    = (Math.random() * 4) + 's';
      star.style.animationDuration = (Math.random() * 2 + 2.5) + 's';
      if(size > 3){
        star.style.boxShadow = `0 0 ${size*2}px ${star.style.background}`;
      }
      decoration.appendChild(star);
    }
  }
  generateStars();

  // Music fade-in function
  function fadeInMusic(){
    audio.volume = 0;
    let v = 0;
    const step = setInterval(()=>{
      v = Math.min(0.42, v + 0.012);
      audio.volume = v;
      if(v >= 0.42) clearInterval(step);
    }, 80);
  }

  // Handle entry button click
  entryBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Start music on user interaction (bypasses autoplay restrictions)
    try {
      audio.play().then(()=>{
        if(musicBtn) musicBtn.classList.add('playing');
        fadeInMusic();
      }).catch(err => console.log('Audio play failed:', err));
    } catch(err) {
      console.log('Audio error:', err);
    }

    // Hide entry portal with smooth fade-out
    gsap.to('#entry-portal', {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
      onComplete(){
        entryPortal.style.display = 'none';
        entryPortal.style.pointerEvents = 'none';
      }
    });

    // Show loader immediately after portal starts fading
    setTimeout(()=>{
      loader.style.display = 'flex';
      loader.style.opacity = '1';
      loader.style.pointerEvents = 'auto';

      // Animate the loader fill bar + percentage counter
      const pct = document.getElementById('loader-pct');
      const obj = { p: 0 };
      gsap.to(obj, {
        p: 100,
        duration: 2.8,
        ease: 'power1.inOut',
        onUpdate(){
          const v = Math.round(obj.p);
          if(pct) pct.textContent = v + '%';
          const fill = document.getElementById('loader-fill');
          if(fill) fill.style.width = v + '%';
        },
        onComplete(){
          if(pct) pct.textContent = '100%';
          // Wait 500ms after bar completes, then hide loader
          setTimeout(()=>{
            gsap.to('#loader', {
              opacity: 0,
              duration: 0.9,
              ease: 'power2.inOut',
              onComplete(){
                loader.style.display = 'none';
                loader.style.pointerEvents = 'none';

                const sceneCosmos = document.getElementById('scene-cosmos');
                if(sceneCosmos){
                  // Dejar que el navegador pinte todos los elementos
                  // del SVG del castillo antes de revelar la escena
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                      // Fade-in suave: fondo y castillo aparecen juntos
                      gsap.to(sceneCosmos, {
                        opacity: 1,
                        duration: 1.1,
                        ease: 'power2.inOut',
                        onStart(){
                          sceneCosmos.style.pointerEvents = 'auto';
                          // Habilitar el scroll DE INMEDIATO, apenas aparece la
                          // invitación (antes esperaba a que terminara el fundido
                          // de 1.1s → por eso tardaba 1-2s en poder hacer scroll).
                          document.documentElement.style.overflowY = 'auto';
                          document.body.style.overflowY = 'auto';
                          // ScrollTrigger se inicializó con el scroll BLOQUEADO;
                          // al desbloquearlo hay que recalcular para que rastree
                          // bien el desplazamiento.
                          if(window.ScrollTrigger){
                            ScrollTrigger.refresh();
                            if(window._enforceScenes) window._enforceScenes();
                          }
                        }
                      });
                    });
                  });
                }
              }
            });
          }, 500);
        }
      });
    }, 100);
  });

  // Manual music toggle via music button
  if(musicBtn){
    musicBtn.addEventListener('click', e => {
      e.stopPropagation();
      if(audio.paused){
        audio.play().then(()=>{
          musicBtn.classList.add('playing');
          if(audio.volume < 0.1) fadeInMusic();
        }).catch(()=>{});
      } else {
        audio.pause();
        musicBtn.classList.remove('playing');
      }
    });
  }
})();


/* ═══════════════════════════════════════════
   DATA SYNC — READ FROM LOCALSTORAGE
═══════════════════════════════════════════ */
(function syncDataFromStorage(){
  // Default data
  const defaultData = {
    nombre: 'Daniela',
    tagline: 'Una princesa que convirtió su sueño en realidad',
    quote: 'Han pasado quince años desde que llegué a este mundo a llenarlo de magia.\nHoy quiero compartir este sueño contigo.',
    fechaEvento: '2026-09-19',
    horaFiesta: '19:30',
    horaMisa: '16:00',
    lugarMisa: 'Catedral de Nuestra Señora del Rosario',
    lugarFiesta: 'Salón Palacio Real',
    direccionFiesta: 'Av. de los Sueños 1500',
    foto1Label: 'Mis inicios',
    foto2Label: 'Mis sueños',
    foto3Label: 'Mi historia',
    fechaLimiteRsvp: '5 de Septiembre',
    nombreFamilia: 'la familia García'
  };

  // Load data from localStorage or use defaults
  function loadData() {
    const stored = localStorage.getItem('quinceañera-data');
    return stored ? JSON.parse(stored) : defaultData;
  }

  // Update all text elements on page
  function updatePageData(data) {
    // Entry portal — logo: sin tilde para que el destello sea el acento (igual a la imagen)
    const entryName = document.getElementById('entry-name');
    if(entryName) entryName.textContent = data.nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();

    // Name reveal scene
    const xvName = document.getElementById('xv-name');
    if(xvName) xvName.textContent = data.nombre;

    // Tagline
    const nameTagline = document.getElementById('name-tagline');
    if(nameTagline) nameTagline.textContent = data.tagline;

    // Quote
    const gardenQuote = document.querySelector('#garden-quote blockquote');
    const quoteSig = document.querySelector('.quote-sig');
    if(gardenQuote) gardenQuote.textContent = data.quote;
    if(quoteSig) quoteSig.textContent = '— ' + data.nombre + ' —';

    // Event details
    const detailTexts = document.querySelectorAll('.detail-text');
    if(detailTexts[0]) {
      detailTexts[0].innerHTML = `Misa de Acción de Gracias — ${data.horaMisa}\n<span class="detail-sub">${data.lugarMisa}</span>`;
    }
    if(detailTexts[1]) {
      detailTexts[1].innerHTML = `Gran Fiesta de Quinceañera — ${data.horaFiesta}\n<span class="detail-sub">${data.lugarFiesta} &nbsp;·&nbsp; ${data.direccionFiesta}</span>`;
    }

    // Fecha del evento — día / mes / año por separado (cuenta regresiva).
    // Se parsea manualmente (sin new Date) para evitar el desfase de zona
    // horaria que podía mostrar el día anterior (p. ej. 18 en vez de 19).
    {
      const parts = (data.fechaEvento || '2026-09-19').split('-'); // [YYYY, MM, DD]
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const dayEl   = document.getElementById('cd-day');
      const monthEl = document.getElementById('cd-month');
      const yearEl  = document.getElementById('cd-year');
      if(dayEl)   dayEl.textContent   = String(parseInt(parts[2], 10));
      if(monthEl) monthEl.textContent = meses[parseInt(parts[1], 10) - 1] || '';
      if(yearEl)  yearEl.textContent  = parts[0];
    }

    // Photo labels + images
    const pf1Label = document.querySelector('#pf1 .frame-label');
    const pf2Label = document.querySelector('#pf2 .frame-label');
    const pf3Label = document.querySelector('#pf3 .frame-label');
    if(pf1Label) pf1Label.textContent = data.foto1Label;
    if(pf2Label) pf2Label.textContent = data.foto2Label;
    if(pf3Label) pf3Label.textContent = data.foto3Label;

    // Photo images from relative paths
    [1,2,3].forEach(n => {
      const area = document.querySelector(`#pf${n} .frame-photo-area`);
      if(!area) return;
      const ruta = data[`foto${n}Ruta`];
      if(ruta && ruta.trim() !== '') {
        area.style.backgroundImage = `url(${ruta})`;
        area.style.backgroundSize = 'cover';
        area.style.backgroundPosition = 'center';
        area.style.color = 'transparent';
        area.textContent = '';
      } else {
        area.style.backgroundImage = '';
        area.style.color = '';
        area.textContent = n === 3 ? '♛' : '✦';
      }
    });

    // RSVP section
    const rsvpSub = document.querySelector('.rsvp-sub');
    const rsvpFoot = document.querySelector('.rsvp-foot span');
    if(rsvpSub) rsvpSub.textContent = 'Confirma tu asistencia antes del ' + data.fechaLimiteRsvp;
    if(rsvpFoot) rsvpFoot.textContent = 'Con amor, ' + data.nombreFamilia;

    // Sincronizar nuevos elementos de RSVP
    const rsvpDeadline = document.querySelector('.rsvp-deadline');
    const rsvpPoemName = document.querySelector('#rsvp-poem em');
    const rsvpSigFamily = document.querySelector('.rsvp-sig-text em');
    if(rsvpDeadline) {
      const yr = (data.fechaEvento && data.fechaEvento.split('-')[0]) || '2026';
      rsvpDeadline.textContent = 'Confirma antes del ' + data.fechaLimiteRsvp + ' · ' + yr;
    }
    if(rsvpPoemName) rsvpPoemName.textContent = data.nombre;
    if(rsvpSigFamily) rsvpSigFamily.textContent = data.nombreFamilia;

    // Cómo Llegar — venue name, address, Google Maps URL
    const locName = document.getElementById('loc-venue-name');
    const locAddr = document.getElementById('loc-venue-addr');
    if(locName) locName.textContent = data.lugarFiesta   || 'Lugar del Evento';
    if(locAddr) locAddr.textContent = data.direccionFiesta || 'La dirección exacta te espera en el mapa';
    // Enlace de Google Maps del lugar de la fiesta.
    // Lo usan el botón "Cómo llegar" Y la luciérnaga. (Cambia este enlace
    // cuando tengas la ubicación definitiva del salón.)
    window._gmapsUrl = 'https://maps.app.goo.gl/KUujauNwB3ikRurs5';

    // WhatsApp — botón "Confirmar Asistencia": número + mensaje predefinido.
    const waNumero  = '573013246362'; // 57 = código de Colombia
    const waMensaje =
      '✨🏰 Hola, quiero confirmar mi asistencia a los XV años de ' + (data.nombre || 'Daniela') + '.\n' +
      'Mi nombre es [Nombre del invitado] y estoy muy emocionado(a) de acompañarte en esta noche tan especial, llena de magia y sueños. 💖👑\n' +
      '¡Gracias por la invitación! ✨';
    const waBtn = document.getElementById('rsvp-wa-btn');
    if(waBtn) waBtn.setAttribute('href', 'https://wa.me/' + waNumero + '?text=' + encodeURIComponent(waMensaje));

    // Update countdown target date
    window._countdownDate = new Date(data.fechaEvento + 'T' + data.horaFiesta + ':00').getTime();
  }

  // Initialize on page load
  const currentData = loadData();
  updatePageData(currentData);

  // Listen for changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if(e.key === 'quinceañera-data' && e.newValue) {
      const newData = JSON.parse(e.newValue);
      updatePageData(newData);
    }
  });
})();


/* ═══════════════════════════════════════════════════════════════
   LUCIÉRNAGA INTERACTIVA — Escena "Cómo Llegar"
   Canvas: agua del pantano + luciernagas ambientales + atmósfera
   La imagen PNG (luciernaga.png) flota con JS y es clickeable.
   Merged al master rAF via window._tickRay — sin loop propio.
═══════════════════════════════════════════════════════════════ */
(function initRay(){
  const canvas = document.getElementById('ray-canvas');
  if(!canvas) return;
  const ctx    = canvas.getContext('2d');
  const flyImg = document.getElementById('firefly-img');

  /* ── estado ── */
  let W = 0, H = 0;
  let flyX = 0, flyY = 0;
  let mouseX, mouseY, mouseNear = false;
  let clickFlash = 0;
  let t = 0;
  let initialized = false;
  let flyBob = 0;

  /* ── partículas de trail ── */
  const trail = [];
  const MAX_TRAIL = 26;

  /* ── luciernagas ambientales de fondo ── */
  const aFlies = Array.from({length:10}, ()=>({
    rx: Math.random(),
    ry: 0.06 + Math.random() * 0.74,
    ph: Math.random() * Math.PI * 2,
    sp: 0.35 + Math.random() * 0.75,
    r:  0.7  + Math.random() * 1.6
  }));

  /* ── resize ── */
  function resize(){
    const dpr = Math.min(devicePixelRatio, 2);
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    if(W <= 0 || H <= 0) return;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(!initialized){
      flyX = W * 0.68;
      flyY = H * 0.42;
      initialized = true;
    }
  }

  /* ── helper glow ── */
  function radGlow(x, y, r, c0, c1){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  }

  /* ── agua del pantano ── */
  function drawWater(){
    const wTop = H * 0.60;
    const veil = ctx.createLinearGradient(0, wTop, 0, H);
    veil.addColorStop(0,   'rgba(4,14,8,0)');
    veil.addColorStop(0.35,'rgba(4,14,8,0.52)');
    veil.addColorStop(1,   'rgba(4,14,8,0.90)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, wTop, W, H - wTop);

    for(let i = 0; i < 15; i++){
      const prog = i / 15;
      const y    = wTop + (H - wTop) * (0.04 + prog * 0.93);
      const amp  = 1.2 + prog * 3.2;
      const freq = 0.011 - prog * 0.002;
      const spd  = t * (0.30 + prog * 0.18);
      ctx.beginPath();
      ctx.strokeStyle = `rgba(45,106,79,${0.022 + prog * 0.016})`;
      ctx.lineWidth = 0.55;
      for(let x = 0; x <= W; x += 3){
        const wy = y
          + Math.sin(x * freq + spd) * amp
          + Math.cos(x * freq * 0.62 - spd * 0.53) * amp * 0.44;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // reflejo dorado de la luciérnaga en el agua
    const visY = flyY + flyBob;
    const aboveWater = Math.max(0, wTop - visY);
    const rs = Math.min(aboveWater / (H * 0.25), 1) * 0.16;
    if(rs > 0.005){
      for(let row = 0; row < 8; row++){
        const ry = (wTop + 10) + row * 13;
        const rx = Math.sin(t * 2.8 + row * 0.7) * 5;
        ctx.fillStyle = `rgba(210,255,60,${rs * (1 - row/8) * 0.55})`;
        ctx.fillRect(flyX + rx - 2.5, ry, 5, 8);
      }
      radGlow(flyX, wTop + 35, 50, `rgba(190,245,50,${rs*0.6})`, 'transparent');
    }
  }

  /* ── luciernagas de fondo ── */
  function drawAmbientFlies(){
    for(let i = 0; i < aFlies.length; i++){
      const f = aFlies[i];
      f.ph += 0.011 * f.sp;
      const bright = Math.sin(f.ph * 2.7) * 0.5 + 0.5;
      if(bright < 0.04) continue;
      const x = f.rx * W + Math.sin(f.ph * 1.08) * 20;
      const y = f.ry * H + Math.cos(f.ph * 0.88) * 13;
      radGlow(x, y, f.r * 7, `rgba(233,196,106,${0.18 * bright})`, 'transparent');
      ctx.fillStyle = `rgba(255,250,205,${0.85 * bright})`;
      ctx.beginPath(); ctx.arc(x, y, f.r * 0.7, 0, 6.283); ctx.fill();
    }
  }

  /* ── trail de partículas doradas ── */
  function updateTrail(){
    if(trail.length >= MAX_TRAIL) trail.shift();
    trail.push({ x: flyX, y: flyY + flyBob, life: 1.0 });
    for(let i = trail.length - 1; i >= 0; i--){
      trail[i].life -= 0.038;
      if(trail[i].life <= 0){ trail.splice(i,1); continue; }
      const { x, y, life } = trail[i];
      radGlow(x, y, life * 9, `rgba(233,196,106,${life * 0.16})`, 'transparent');
      ctx.fillStyle = `rgba(255,248,170,${life * 0.30})`;
      ctx.beginPath(); ctx.arc(x, y, life * 2.2, 0, 6.283); ctx.fill();
    }
  }

  /* ── halos de atmósfera (canvas, detrás de la PNG) ── */
  function drawAtmosphere(bm){
    const x  = flyX;
    const cy = flyY + flyBob;
    const gp = 0.62 + Math.sin(t * 3.1) * 0.38;

    const atm1 = ctx.createRadialGradient(x, cy, 0, x, cy, 115 * bm);
    atm1.addColorStop(0,   `rgba(160,235,55,${0.08 * gp * bm})`);
    atm1.addColorStop(0.45,`rgba(40,115,55,${0.05 * bm})`);
    atm1.addColorStop(1,   'transparent');
    ctx.fillStyle = atm1;
    ctx.beginPath(); ctx.arc(x, cy, 115 * bm, 0, 6.283); ctx.fill();

    radGlow(x, cy, 55 * bm, `rgba(220,255,65,${0.14 * gp * bm})`, 'transparent');
    radGlow(x, cy, 90 * bm, `rgba(100,200,50,${0.06 * bm})`,      'transparent');

    // Burst de clic
    if(clickFlash > 0.01){
      const cf = clickFlash;
      const bg = ctx.createRadialGradient(x, cy, 0, x, cy, 150 * cf);
      bg.addColorStop(0, `rgba(220,255,60,${0.18 * cf})`);
      bg.addColorStop(1, 'transparent');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(x, cy, 150 * cf, 0, 6.283); ctx.fill();
      for(let s = 0; s < 12; s++){
        const ang  = (s/12)*6.283 + t*2.8;
        const dist = (1 - cf) * 85;
        const sx = x + Math.cos(ang)*dist, sy = cy + Math.sin(ang)*dist;
        radGlow(sx, sy, cf * 7.5, `rgba(230,255,80,${cf*0.85})`, 'transparent');
      }
    }
  }

  /* ── tick principal (llamado desde master rAF) ── */
  window._tickRay = function(){
    const sceneEl = document.getElementById('scene-location');
    if(!sceneEl) return;
    if(W === 0){ resize(); return; }
    const op = parseFloat(sceneEl.style.opacity || 0);
    if(op < 0.04) return;

    ctx.clearRect(0, 0, W, H);
    t += 0.016;
    flyBob = Math.sin(t * 2.1) * 4.5;

    // Trayectoria orgánica flotante (Lissajous)
    const bx = W * 0.67, by = H * 0.42;
    const nx = bx + Math.sin(t*0.72 + 0.6)*72 + Math.cos(t*0.29)*38;
    const ny = by + Math.cos(t*0.58)*48       + Math.sin(t*0.41)*26;

    // Brillo base + atracción al mouse
    let bm = 0.80 + Math.sin(t * 1.7) * 0.18;
    if(mouseNear && mouseX !== undefined){
      const dx = mouseX - flyX, dy = mouseY - flyY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < 230){
        flyX += dx * (1 - dist/230) * 0.048;
        flyY += dy * (1 - dist/230) * 0.048;
        bm = 1.0 + (1 - dist/230) * 0.55;
      } else {
        flyX += (nx - flyX) * 0.024;
        flyY += (ny - flyY) * 0.024;
      }
    } else {
      flyX += (nx - flyX) * 0.024;
      flyY += (ny - flyY) * 0.024;
    }

    if(clickFlash > 0){ clickFlash -= 0.022; bm += clickFlash * 0.95; }

    // Posicionar y brillar la imagen PNG
    if(flyImg && flyImg.offsetWidth > 0){
      const iw = flyImg.offsetWidth, ih = flyImg.offsetHeight;
      flyImg.style.left = (flyX - iw * 0.5)          + 'px';
      flyImg.style.top  = (flyY + flyBob - ih * 0.38) + 'px';
      const g1 = Math.round(10 + bm * 14);
      const g2 = Math.round(28 + bm * 42);
      const a1 = Math.min(0.98, 0.44 + bm * 0.44).toFixed(2);
      const a2 = Math.min(0.75, 0.20 + bm * 0.32).toFixed(2);
      flyImg.style.filter = `drop-shadow(0 0 ${g1}px rgba(215,255,60,${a1})) drop-shadow(0 0 ${g2}px rgba(165,235,25,${a2}))`;
      if(!flyImg.classList.contains('fly-visible')) flyImg.classList.add('fly-visible');
    }

    // Dibujar (fondo a frente)
    drawWater();
    updateTrail();
    drawAmbientFlies();
    drawAtmosphere(bm);
  };

  /* ── abrir Google Maps ── */
  function openMaps(){
    clickFlash = 1.0;
    for(let i = 0; i < 18; i++){
      setTimeout(()=>{
        if(trail.length >= MAX_TRAIL) trail.shift();
        trail.push({
          x: flyX + (Math.random()-0.5)*44,
          y: flyY + (Math.random()-0.5)*44,
          life: 0.7 + Math.random()*0.3
        });
      }, i * 28);
    }
    // Abrir AHORA, dentro del gesto de clic. Con setTimeout el navegador
    // bloqueaba la ventana emergente (no estaba en el gesto del usuario) →
    // por eso "no hacía nada". El efecto de estela sigue siendo visual aparte.
    const url = window._gmapsUrl || 'https://maps.google.com/';
    window.open(url, '_blank', 'noopener');
  }

  /* ── listeners ── */
  canvas.addEventListener('click', openMaps);
  if(flyImg) flyImg.addEventListener('click', openMaps);

  const ctaBtn = document.getElementById('location-cta');
  if(ctaBtn) ctaBtn.addEventListener('click', openMaps);

  // Seguimiento del mouse en toda la escena
  const sceneNode = document.getElementById('scene-location');
  if(sceneNode){
    sceneNode.addEventListener('mousemove', e=>{
      const r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
      mouseNear = true;
    }, { passive:true });
    sceneNode.addEventListener('mouseleave', ()=>{ mouseNear = false; });
    sceneNode.addEventListener('touchmove', e=>{
      const r = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - r.left;
      mouseY = e.touches[0].clientY - r.top;
      mouseNear = true;
    }, { passive:true });
    sceneNode.addEventListener('touchend', ()=>{ mouseNear = false; });
    sceneNode.addEventListener('touchstart', e=>{
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - r.left;
      mouseY = e.touches[0].clientY - r.top;
      openMaps();
    }, { passive:false });
  }

  // Ring del cursor personalizado
  const cursorEl = document.getElementById('cursor');
  if(flyImg && cursorEl){
    flyImg.addEventListener('mousemove', e=>{
      const r = canvas.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      mouseY = e.clientY - r.top;
      mouseNear = true;
    }, { passive:true });
    flyImg.addEventListener('mouseenter', ()=>{
      gsap.to(cursorEl,{ width:32, height:32,
        borderColor:'rgba(233,196,106,0.9)',
        boxShadow:'0 0 16px rgba(233,196,106,0.55)', duration:0.35 });
    });
    flyImg.addEventListener('mouseleave', ()=>{
      mouseNear = false;
      gsap.to(cursorEl,{ width:22, height:22,
        borderColor:'var(--gold)', boxShadow:'none', duration:0.35 });
    });
    flyImg.addEventListener('touchstart', e=>{
      e.preventDefault(); openMaps();
    }, { passive:false });
  }

  window.addEventListener('resize', resize, { passive:true });
  resize();
})();
