/* ============================================================
   HERO — objeto de cristal líquido (isotipo T de Tecnolab) en WebGL1 propio, sin librerías.
   - La imagen de fallback (assets/img/hero-cristal.webp) ocupa el lugar desde el primer pintado;
     el canvas la reemplaza con un fundido de 400 ms cuando el shader está listo.
   - Solo imagen si: no hay WebGL, prefers-reduced-motion, o (pointer: coarse) con ancho < 700px.
   - Arranca después de window load (requestIdleCallback). Pausa fuera de pantalla (IntersectionObserver)
     y con document.hidden. DPR máximo 2 (1.5 en pantallas grandes). Maneja webglcontextlost/restored.
   - pointermove en TODO el hero: posición suavizada (lerp, tau 120 ms). Sin cursor: deriva senoidal a 30 fps.
   - La imagen de fallback se genera con ?hero=still (renderiza el estado de reposo y expone los data URLs
     en window.__heroStill; ver scripts del proyecto / README).
   ============================================================ */
(function () {
  "use strict";
  const HG = {
    tau: 120,            // ms: suavizado del cursor
    amplitud: 0.55,      // alcance del cursor/deriva (0..1): chico para que el objeto siempre se lea
    fpsDeriva: 30,
    idleCursorMs: 2500,  // sin mover el mouse este tiempo → vuelve la deriva
    fundidoMs: 400,
    mascara: 512,        // px de la textura de máscara
    blurPx: 12,          // desenfoque del campo de altura
    fuente: "assets/img/logo-tecnolab-isotipo.png"
  };

  const hero = document.getElementById("hero");
  const wrap = hero && hero.querySelector(".hero-glass");
  if (!wrap) return;
  const canvas = wrap.querySelector("canvas");
  const img = wrap.querySelector("img");
  const still = /[?&]hero=still\b/.test(location.search);
  const mq = (q) => window.matchMedia(q).matches;
  if (!canvas || (!still && (mq("(prefers-reduced-motion: reduce)") || (mq("(pointer: coarse)") && window.innerWidth < 700)))) return;

  const VERT = "attribute vec2 p;varying vec2 vUv;void main(){vUv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}";
  const FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform sampler2D uTex;uniform vec2 uM;uniform float uT;uniform vec2 uTexel;varying vec2 vUv;",
    "float H(vec2 uv){return texture2D(uTex,uv).a;}",
    // fondo refractado procedural: luz radial + rayos suaves + una banda diagonal para que el cristal tenga qué deformar
    "vec3 bg(vec2 uv){",
    "  vec2 q=uv-vec2(.5,.47)-uM*.05;float r=length(q);",
    "  float glow=exp(-r*r*6.5);",
    "  float a=atan(q.y,q.x);",
    "  float rays=pow(.5+.5*sin(a*8.+uM.x*1.6),3.)*smoothstep(.02,.45,r)*exp(-r*2.4);",
    "  float band=smoothstep(.07,.0,abs(q.x*.74+q.y*.67-.06+uM.x*.05))*.55;",
    "  vec3 c=vec3(.03,.025,.10)+vec3(.62,.70,1.)*glow*.8+vec3(.30,.48,1.)*rays*.55+vec3(.45,.6,1.)*band*exp(-r*1.6);",
    "  return c;}",
    "void main(){",
    "  vec2 uv=vUv;float h=H(uv);",
    "  float m=smoothstep(.40,.60,h);",
    "  if(m<.002){gl_FragColor=vec4(0.);return;}",
    "  float dx=H(uv+vec2(uTexel.x*2.,0.))-H(uv-vec2(uTexel.x*2.,0.));",
    "  float dy=H(uv+vec2(0.,uTexel.y*2.))-H(uv-vec2(0.,uTexel.y*2.));",
    "  vec3 n=normalize(vec3(-dx*10.,dy*10.,1.));",
    "  float thick=smoothstep(.35,.95,h);float edge=1.-thick;",
    "  vec2 refr=-n.xy*(.07+.12*thick);",
    // aberración cromática sutil que crece hacia el borde
    "  float ca=.010+.060*edge*edge;",
    "  vec3 col=vec3(bg(uv+refr).r,bg(uv+refr*(1.+ca*6.)).g,bg(uv+refr*(1.+ca*12.)).b);",
    "  col=col*.88+vec3(.10,.13,.20)*thick+vec3(.02,.05,.10);",       // interior algo más claro
    "  vec3 L=normalize(vec3(uM.x*.9-.25,uM.y*.9+.55,.75));",          // la luz sigue al cursor
    "  float fres=pow(1.-n.z,2.4);",
    "  col+=fres*vec3(.75,.88,1.)*1.15;",
    "  float spec=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),52.);",
    "  col+=spec*vec3(1.,1.,1.)*1.0;",
    "  col+=pow(max(dot(n,L),0.),3.)*vec3(.55,.65,1.)*.22;",           // luz de estudio ancha
    "  col=clamp(col,0.,1.);",
    "  gl_FragColor=vec4(col*m,m);}"
  ].join("\n");

  let gl = null, prog = null, tex = null, loc = null, buf = null;
  let ready = false, visible = true, raf = 0, lastDraw = 0, t0 = 0, lastFrame = 0;
  let cur = { x: 0, y: 0 }, tgt = { x: 0, y: 0 }, ptr = null, lastMove = -1e9;
  let size = 0, dpr = 1, maskCanvas = null;

  // ---- máscara: isotipo → campo de altura suave (alpha desenfocado) ----
  function boxBlurAlpha(d, w, h, r) { // respaldo sin ctx.filter (Safari): 3 pasadas de caja separables
    const tmp = new Uint8ClampedArray(w * h);
    const pass = (src, dst, hor) => {
      const n = hor ? w : h, m = hor ? h : w, st = hor ? 4 : w * 4, os = hor ? w * 4 : 4;
      for (let j = 0; j < m; j++) {
        let acc = 0;
        for (let i = -r; i <= r; i++) acc += src[(Math.min(Math.max(i, 0), n - 1)) * st + j * os + 3];
        for (let i = 0; i < n; i++) {
          dst[hor ? j * w + i : i * w + j] = acc / (2 * r + 1);
          acc += src[Math.min(i + r + 1, n - 1) * st + j * os + 3] - src[Math.max(i - r, 0) * st + j * os + 3];
        }
      }
    };
    for (let k = 0; k < 3; k++) {
      pass(d, tmp, true);
      for (let i = 0; i < w * h; i++) d[i * 4 + 3] = tmp[i];
      pass(d, tmp, false);
      for (let i = 0; i < w * h; i++) d[i * 4 + 3] = tmp[i];
    }
  }
  function crearMascara(image) {
    const S = HG.mascara;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const x = c.getContext("2d");
    const ancho = S * 0.72, alto = ancho * (image.naturalHeight / image.naturalWidth);
    const dx = (S - ancho) / 2, dy = (S - alto) / 2 + S * 0.01;
    if ("filter" in x) {
      x.filter = "blur(" + HG.blurPx + "px)";
      x.drawImage(image, dx, dy, ancho, alto);
      x.filter = "none";
    } else {
      x.drawImage(image, dx, dy, ancho, alto);
      const id = x.getImageData(0, 0, S, S);
      boxBlurAlpha(id.data, S, S, Math.round(HG.blurPx * 0.6));
      x.putImageData(id, 0, 0);
    }
    return c;
  }

  // ---- WebGL ----
  function compilar(tipo, src) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src);
    gl.compileShader(s);
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
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    loc = {
      m: gl.getUniformLocation(prog, "uM"),
      t: gl.getUniformLocation(prog, "uT"),
      texel: gl.getUniformLocation(prog, "uTexel"),
      tex: gl.getUniformLocation(prog, "uTex")
    };
    gl.uniform1i(loc.tex, 0);
    gl.uniform2f(loc.texel, 1 / HG.mascara, 1 / HG.mascara);
    gl.clearColor(0, 0, 0, 0);
  }
  function ajustarTamano(forzarDpr) {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    const tope = window.innerWidth > 1600 ? 1.5 : 2;
    dpr = forzarDpr || Math.min(window.devicePixelRatio || 1, tope);
    size = Math.round(r.width * dpr);
    if (canvas.width !== size) { canvas.width = size; canvas.height = size; }
    if (gl) gl.viewport(0, 0, size, size);
  }
  function dibujar(mx, my, t) {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(loc.m, mx * HG.amplitud, my * HG.amplitud);
    gl.uniform1f(loc.t, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  const deriva = (t) => ({ x: Math.sin(t * 0.35) * 0.9, y: Math.sin(t * 0.27) * 0.6 }); // 0 en t=0 = estado de reposo

  // ---- bucle ----
  function frame(now) {
    raf = 0;
    if (!ready || !visible || document.hidden) return;
    const reciente = now - lastMove < HG.idleCursorMs;
    const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16;
    if (!reciente && now - lastDraw < 1000 / HG.fpsDeriva - 2) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now; lastDraw = now;
    const t = (now - t0) / 1000;
    if (reciente && ptr) tgt = ptr; else tgt = deriva(t);
    const k = 1 - Math.exp(-dt / HG.tau);
    cur.x += (tgt.x - cur.x) * k;
    cur.y += (tgt.y - cur.y) * k;
    dibujar(cur.x, cur.y, t);
    raf = requestAnimationFrame(frame);
  }
  const pedir = () => { if (!raf && ready && visible && !document.hidden) { lastFrame = 0; raf = requestAnimationFrame(frame); } };

  function alMover(e) {
    if (e.pointerType !== "mouse") return;
    const r = hero.getBoundingClientRect();
    ptr = { x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), y: Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1))) };
    lastMove = performance.now();
    pedir();
  }

  function mostrar() {
    wrap.classList.add("is-live");
    if (img) setTimeout(() => { img.style.visibility = "hidden"; }, HG.fundidoMs + 50);
  }

  function arrancar(image) {
    try {
      gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
      if (!gl) return;
      maskCanvas = crearMascara(image);
      montarGL();
      ajustarTamano();
    } catch (err) { gl = null; return; }

    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); ready = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } wrap.classList.remove("is-live"); if (img) img.style.visibility = ""; });
    canvas.addEventListener("webglcontextrestored", () => { try { montarGL(); ajustarTamano(); ready = true; t0 = performance.now(); dibujar(0, 0, 0); mostrar(); pedir(); } catch (err) { /* queda la imagen */ } });

    if (still) { // estado de reposo para generar el fallback
      const out = {};
      for (const d of [1, 2]) { ajustarTamano(d); dibujar(0, 0, 0); out["x" + d] = canvas.toDataURL("image/webp", 0.92); }
      window.__heroStill = out;
      return;
    }

    ready = true;
    t0 = performance.now();
    dibujar(0, 0, 0);
    requestAnimationFrame(() => requestAnimationFrame(mostrar)); // el primer cuadro ya está pintado antes del fundido

    hero.addEventListener("pointermove", alMover, { passive: true });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = 0; } } else pedir(); });
    new IntersectionObserver((en) => {
      visible = en[en.length - 1].isIntersecting;
      if (visible) pedir(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0 }).observe(hero);
    if ("ResizeObserver" in window) new ResizeObserver(() => { ajustarTamano(); if (ready) dibujar(cur.x, cur.y, (performance.now() - t0) / 1000); }).observe(wrap);
    pedir();
  }

  function cargar() {
    const image = new Image();
    image.onload = () => arrancar(image);
    image.src = HG.fuente;
  }
  const iniciar = () => { if ("requestIdleCallback" in window) requestIdleCallback(cargar, { timeout: 1500 }); else setTimeout(cargar, 200); };
  if (document.readyState === "complete") iniciar(); else window.addEventListener("load", iniciar, { once: true });
})();
