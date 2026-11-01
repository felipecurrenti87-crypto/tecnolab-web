/* ============================================================
   HERO — lente de cristal líquido sobre el logo blanco (WebGL1 propio, sin librerías).
   En reposo el logo es una <img> normal y no hay WebGL activo. Al acercar el mouse, un canvas idéntico
   (mismo tamaño y posición, mismo logo blanco) la reemplaza y una lente circular sigue al cursor:
     a) desplazamiento radial que estira el logo como un vidrio convexo,
     b) separación de canales R/G/B (aberración cromática sutil),
     c) desenfoque leve de 9 muestras,
     d) en la banda del borde de la lente el muestreo se invierte (imagen espejada, como en una lente real).
   Fuera de la lente el logo sigue blanco, nítido y sin cambios; no hay contornos, brillos ni halos.
   - Pasada inicial: 1,2 s después de cargar, la lente cruza el logo de izquierda a derecha una sola vez.
   - Solo con (hover: hover) y (pointer: fine), sin prefers-reduced-motion y con WebGL; si no, queda la <img>.
   - DPR máx. 2; rAF solo mientras la lente cambia; pausa fuera de pantalla y con document.hidden;
     maneja webglcontextlost/restored.
   ============================================================ */
(function () {
  "use strict";
  const LENTE = {
    radio: 0.22,        // radio de la lente, como fracción del ancho del logo
    tau: 100,           // ms: suavizado de la posición
    fundidoMs: 250,     // aparición / desaparición de la intensidad
    aumento: 0.5,       // 0..1: cuánto se estira el centro (0.5 = 2x)
    banda: -0.25,       // factor de muestreo en la banda del borde (negativo = imagen invertida)
    margen: 0.24,       // el canvas se extiende este margen (fracción del ancho) alrededor del logo para no cortar la lente
    aberracion: 0.04,   // separación de canales (proporcional a la intensidad)
    desenfoque: 0.0035, // radio del desenfoque (fracción del ancho)
    demoDelayMs: 1200,  // pasada inicial: espera tras cargar
    demoMs: 1800        // pasada inicial: duración
  };

  const hero = document.getElementById("hero");
  const wrap = hero && hero.querySelector(".hero-logo");
  if (!wrap) return;
  const img = wrap.querySelector("img");
  const canvas = wrap.querySelector("canvas");
  const mq = (q) => window.matchMedia(q).matches;
  if (!img || !canvas || mq("(prefers-reduced-motion: reduce)") || mq("(pointer: coarse)") || !mq("(hover: hover) and (pointer: fine)")) return;

  const VERT = "attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  const FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform sampler2D uTex;uniform vec2 uC;uniform float uI;uniform float uAsp;",
    "uniform float uRad,uMag,uBand,uCA,uBlur;",
    "varying vec2 vUv;",
    "vec4 S(vec2 p){if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return vec4(0.);return texture2D(uTex,p);}",
    "void main(){",
    "  vec2 uv=vUv;vec2 d=uv-uC;",
    "  float r=length(vec2(d.x,d.y/uAsp))/uRad;",
    "  if(r>=1.||uI<.001){gl_FragColor=S(uv);return;}",           // fuera de la lente: el logo tal cual
    "  float mag=1.-uMag*(1.-r*r);",                              // vidrio convexo: estira hacia el centro
    "  float w=smoothstep(.50,.78,r)*(1.-smoothstep(.78,1.,r));", // banda del borde: muestreo invertido
    "  float f=mix(1.,mix(mag,uBand,w),uI);",
    "  float ca=uCA*uI*(1.-smoothstep(.9,1.,r));",
    "  float anillo=smoothstep(.72,.9,r)*(1.-smoothstep(.9,1.,r));", // la zona comprimida del borde se difumina: sin línea dura
    "  float rad=uBlur*uI*(1.-smoothstep(.55,1.,r))*(1.+5.*w+9.*anillo);",  // 0 en el borde exterior (sin contorno)
    "  vec2 o=vec2(rad,rad*uAsp);",
    "  vec3 col=vec3(0.);float aR=0.,aG=0.,aB=0.;",
    "  for(int i=0;i<9;i++){",
    "    vec2 t=vec2(0.);",
    "    if(i==1)t=vec2(1.,0.);else if(i==2)t=vec2(-1.,0.);else if(i==3)t=vec2(0.,1.);else if(i==4)t=vec2(0.,-1.);",
    "    else if(i==5)t=vec2(.7,.7);else if(i==6)t=vec2(-.7,.7);else if(i==7)t=vec2(.7,-.7);else if(i==8)t=vec2(-.7,-.7);",
    "    vec2 off=t*o;",
    "    vec4 sr=S(uC+d*(f*(1.+ca))+off);",
    "    vec4 sg=S(uC+d*f+off);",
    "    vec4 sb=S(uC+d*(f*(1.-ca))+off);",
    "    col+=vec3(sr.r,sg.g,sb.b);aR+=sr.a;aG+=sg.a;aB+=sb.a;",
    "  }",
    "  col/=9.;float a=max(max(aR,aG),aB)/9.;",
    "  gl_FragColor=vec4(min(col,vec3(a)),a);}"
  ].join("\n");

  let gl = null, prog = null, tex = null, loc = null, buf = null;
  let ready = false, visible = true, raf = 0, last = 0, enLente = false, inicializando = false, fallo = false;
  let geo = { w: 1, h: 1, m: 0, cw: 1, ch: 1 }; // tamaños en px CSS: logo (w×h), margen m y canvas (cw×ch)
  let cur = { x: 0.5, y: 0.5 }, tgt = { x: 0.5, y: 0.5 }, I = 0, dentro = false, demo = null, cargado = false;

  function compilar(tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function montarGL() {
    prog = gl.createProgram();
    gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const u = (n) => gl.getUniformLocation(prog, n);
    loc = { c: u("uC"), i: u("uI"), asp: u("uAsp"), rad: u("uRad"), mag: u("uMag"), band: u("uBand"), ca: u("uCA"), blur: u("uBlur"), tex: u("uTex") };
    gl.uniform1i(loc.tex, 0);
    gl.uniform1f(loc.mag, LENTE.aumento);
    gl.uniform1f(loc.band, LENTE.banda);
    gl.uniform1f(loc.ca, LENTE.aberracion);
    gl.uniform1f(loc.blur, LENTE.desenfoque);
    gl.clearColor(0, 0, 0, 0);
    tex = gl.createTexture();
  }
  // El canvas se extiende LENTE.margen alrededor del logo (transparente) para que la lente no se corte en el borde de la
  // imagen. El logo queda alineado al píxel con la <img> (DPR ≤ 2): la textura es el logo remuestreado a ese tamaño
  // exacto y dibujado en el mismo lugar, así que en reposo se ve igual que la imagen.
  function ajustar() {
    const r = wrap.getBoundingClientRect();
    if (!r.width || !gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const m = Math.round(r.width * LENTE.margen);
    const cw = r.width + 2 * m, ch = r.height + 2 * m;
    geo = { w: r.width, h: r.height, m, cw, ch };
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    canvas.style.left = -m + "px"; canvas.style.top = -m + "px";
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    const o = document.createElement("canvas");
    o.width = W; o.height = H;
    const x = o.getContext("2d");
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.drawImage(img, Math.round(m * dpr), Math.round(m * dpr), Math.round(r.width * dpr), Math.round(r.height * dpr));
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, o);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1f(loc.asp, W / H);
    gl.uniform1f(loc.rad, LENTE.radio * r.width / cw); // el radio se mide sobre el ancho del logo, no del canvas
  }
  function dibujar() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.c, cur.x, cur.y);
    gl.uniform1f(loc.i, I);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // Canvas visible / imagen oculta (y al revés): se pinta primero el cuadro para que el cambio sea imperceptible
  function mostrarCanvas() { if (enLente) return; dibujar(); wrap.classList.add("is-lens"); enLente = true; }
  function mostrarImagen() { if (!enLente) return; I = 0; dibujar(); wrap.classList.remove("is-lens"); enLente = false; }

  const ease = (p) => p * p * (3 - 2 * p);
  function frame(now) {
    raf = 0;
    if (!ready || !visible || document.hidden) return;
    const dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    let objetivoI = dentro ? 1 : 0;
    if (demo) {
      const p = (now - demo.t0) / LENTE.demoMs;
      if (p >= 1) { demo = null; }
      else {
        const c = logoAUv(-0.04 + 1.08 * ease(p), 0.5 + Math.sin(p * Math.PI * 2) * 0.06); // recorre el logo de izquierda a derecha
        cur.x = tgt.x = c.x; cur.y = tgt.y = c.y;
        I = Math.min(1, p / 0.14, (1 - p) / 0.14);                 // entra y sale suave
        dibujar();
        raf = requestAnimationFrame(frame);
        return;
      }
    }
    const k = 1 - Math.exp(-dt / LENTE.tau);
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    const paso = dt / LENTE.fundidoMs;
    I += Math.max(-paso, Math.min(paso, objetivoI - I));
    dibujar();
    const quieto = Math.abs(tgt.x - cur.x) < 2e-4 && Math.abs(tgt.y - cur.y) < 2e-4 && Math.abs(objetivoI - I) < 1e-3;
    if (quieto && objetivoI === 0) { mostrarImagen(); return; } // lente apagada: vuelve la <img>
    if (quieto) return;                                         // lente encendida y quieta: sin rAF hasta que se mueva
    raf = requestAnimationFrame(frame);
  }
  function pedir() {
    if (!ready || !visible || document.hidden) return;
    mostrarCanvas();
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  function detener() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    demo = null; dentro = false; I = 0;
    if (ready) mostrarImagen();
  }

  function aUv(e) { // posición del cursor en uv del canvas
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  const logoAUv = (lx, ly) => ({ x: (geo.m + lx * geo.w) / geo.cw, y: (geo.m + ly * geo.h) / geo.ch }); // lx,ly: 0..1 sobre el logo
  function alMover(e) {
    if (e.pointerType !== "mouse") return;
    if (!ready) { iniciar(); }
    const p = aUv(e);
    const eraDemo = !!demo;
    tgt.x = p.x; tgt.y = p.y;
    if (!dentro) { cur.x = eraDemo ? cur.x : p.x; cur.y = eraDemo ? cur.y : p.y; }
    dentro = true; demo = null;
    pedir();
  }
  function alSalir() { dentro = false; if (ready) pedir(); }

  function iniciar() {
    if (ready || inicializando || !cargado || fallo) return;
    inicializando = true;
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
      if (!gl) { inicializando = false; fallo = true; return; }
      montarGL();
    } catch { gl = null; inicializando = false; fallo = true; return; }
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ready = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } wrap.classList.remove("is-lens"); enLente = false; });
    canvas.addEventListener("webglcontextrestored", () => { try { montarGL(); ajustar(); ready = true; if (dentro) pedir(); } catch { /* queda la imagen */ } });
    // la compilación del shader y la subida de la textura van en tareas separadas (sin long tasks)
    const siguiente = (fn) => { if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 300 }); else setTimeout(fn, 30); };
    siguiente(() => {
      try { ajustar(); } catch { gl = null; inicializando = false; fallo = true; return; }
      document.addEventListener("visibilitychange", () => { if (document.hidden) detener(); });
      new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (!visible) detener(); }, { threshold: 0 }).observe(hero);
      let primero = true; // el primer aviso del observer es el estado inicial: ya está ajustado
      if ("ResizeObserver" in window) new ResizeObserver(() => { if (primero) { primero = false; return; } if (ready) { ajustar(); if (enLente) dibujar(); } }).observe(wrap);
      ready = true;
      inicializando = false;
      if (dentro) pedir();
    });
  }

  function pasadaInicial() {
    if (!ready || dentro || !visible || document.hidden) return;
    const c = logoAUv(-0.04, 0.5);
    cur.x = tgt.x = c.x; cur.y = tgt.y = c.y;
    demo = { t0: performance.now() };
    pedir();
  }

  hero.addEventListener("pointermove", alMover, { passive: true });
  hero.addEventListener("pointerleave", alSalir);

  function alCargar() {
    const listo = () => {
      cargado = true;
      const arrancar = () => iniciar();
      if ("requestIdleCallback" in window) requestIdleCallback(arrancar, { timeout: 1500 }); else setTimeout(arrancar, 200);
      let intentos = 0; // espera a que el shader esté listo (hasta ~4 s) y hace la pasada una sola vez
      const esperar = () => { if (ready) pasadaInicial(); else if (++intentos < 40) setTimeout(esperar, 100); };
      setTimeout(esperar, LENTE.demoDelayMs);
    };
    if (img.complete && img.naturalWidth) listo(); else img.addEventListener("load", listo, { once: true });
  }
  if (document.readyState === "complete") alCargar(); else window.addEventListener("load", alCargar, { once: true });
})();
