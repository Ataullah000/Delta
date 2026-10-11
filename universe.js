/* Digital Universe — premium 3D + ambience layer
   Loaded automatically by main.js. Content is never touched.
   Three.js (cdnjs) renders a glass-like liquid orb, a wire lattice,
   gold rings and a drifting star field. Falls back silently if offline. */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function onReady(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* ------------------------------------------------------------------
     1. Ambience: aurora, grain, scroll bar, cursor spotlight
  ------------------------------------------------------------------ */
  function ambience() {
    if (!$(".aurora")) {
      var a = document.createElement("div");
      a.className = "aurora";
      a.setAttribute("aria-hidden", "true");
      a.innerHTML = "<i></i><i></i><i></i>";
      document.body.insertBefore(a, document.body.firstChild);
    }
    if (!$(".grain")) {
      var g = document.createElement("div");
      g.className = "grain";
      g.setAttribute("aria-hidden", "true");
      document.body.appendChild(g);
    }
    if (!$(".cinema-vignette")) {
      var v = document.createElement("div");
      v.className = "cinema-vignette";
      v.setAttribute("aria-hidden", "true");
      document.body.appendChild(v);
    }
    var bar = document.createElement("div");
    bar.className = "scroll-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var header = $(".site-header");
    var heroContent = $(".hero-content");
    var ticking = false;
    function upd() {
      var y = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, Math.max(0, y / h)) : 0;
      bar.style.transform = "scaleX(" + p + ")";
      if (header) header.classList.toggle("is-scrolled", y > 40);
      /* light parallax only — never fade hero text */
      if (heroContent && !reduce) {
        var py = Math.min(y * 0.12, 60);
        heroContent.style.transform = "translate3d(0," + py + "px,0)";
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(upd); }
    }, { passive: true });
    upd();

    if (fine && !reduce) {
      var s = document.createElement("div");
      s.className = "spotlight";
      s.setAttribute("aria-hidden", "true");
      document.body.insertBefore(s, document.body.firstChild);
      var tx = window.innerWidth / 2, ty = window.innerHeight * 0.3, cx = tx, cy = ty;
      window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
      (function loop() {
        cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
        s.style.setProperty("--sx", cx + "px");
        s.style.setProperty("--sy", cy + "px");
        requestAnimationFrame(loop);
      })();
    }
  }

  /* ------------------------------------------------------------------
     2. Gentle 3D tilt for cards that main.js does not already tilt
  ------------------------------------------------------------------ */
  function tilt() {
    if (!fine || reduce) return;
    $$(".vision-cell, .yt-card").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 6) + "deg) rotateY(" + ((x - 0.5) * 6) + "deg) translateY(-4px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ------------------------------------------------------------------
     3. Three.js hero scene
  ------------------------------------------------------------------ */
  function loadThree(cb) {
    if (window.THREE) return cb();
    var s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    s.async = true;
    s.onload = cb;
    s.onerror = function () { /* offline: site still looks great without it */ };
    document.head.appendChild(s);
  }

  var VERT = [
    "uniform float uTime; uniform float uAmp;",
    "varying vec3 vN; varying vec3 vP; varying float vD;",
    "void main(){",
    "  vec3 p = position;",
    "  float d = sin(p.x*2.2+uTime*0.7)*sin(p.y*2.4+uTime*0.55)*sin(p.z*2.0+uTime*0.65);",
    "  d += 0.5*sin(p.y*5.0+uTime*1.1)*sin(p.x*4.0-uTime*0.8);",
    "  d *= uAmp;",
    "  p += normal*d; vD = d; vP = p;",
    "  vN = normalize(normalMatrix*normal);",
    "  gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0);",
    "}"
  ].join("\n");

  var FRAG = [
    "uniform float uTime; uniform float uLight; uniform vec3 uA; uniform vec3 uB;",
    "varying vec3 vN; varying vec3 vP; varying float vD;",
    "void main(){",
    "  float f = pow(1.0 - max(dot(normalize(vN), vec3(0.0,0.0,1.0)), 0.0), 2.4);",
    "  float band = 0.5 + 0.5*sin(vP.y*5.0 + uTime*0.9 + vD*7.0);",
    "  vec3 base = mix(vec3(0.025,0.05,0.04), vec3(0.90,0.86,0.78), uLight);",
    "  vec3 col = base + uA*f*1.35 + uB*f*f*0.9 + uA*band*0.10*(1.0-f);",
    "  float a = clamp(0.58 + f*0.55, 0.0, 1.0);",
    "  gl_FragColor = vec4(col, a);",
    "}"
  ].join("\n");

  function scene3d() {
    var host = $(".hero") || $(".page-hero");
    if (!host) return;
    var isHome = !!$(".hero");

    loadThree(function () {
      var THREE = window.THREE;
      var canvas = document.createElement("canvas");
      canvas.className = "scene3d";
      canvas.setAttribute("aria-hidden", "true");
      host.insertBefore(canvas, host.firstChild);

      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
      } catch (e) { canvas.remove(); return; }
      renderer.setClearColor(0x000000, 0);

      var small = window.innerWidth < 700;
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.z = 6;

      var ACC = new THREE.Color(0xff4d2e), GOLD = new THREE.Color(0xd9b66f), WARM = new THREE.Color(0xff8a4c);
      var root = new THREE.Group();
      scene.add(root);

      /* liquid glass orb */
      var uniforms = {
        uTime: { value: 0 }, uAmp: { value: 0.2 }, uLight: { value: 0 },
        uA: { value: new THREE.Vector3(ACC.r, ACC.g, ACC.b).multiplyScalar(0.9) },
        uB: { value: new THREE.Vector3(GOLD.r, GOLD.g, GOLD.b).multiplyScalar(0.8) }
      };
      var orbMat = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true });
      var orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, small ? 20 : 32), orbMat);
      root.add(orb);

      /* wire lattice shell */
      var latticeMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.28 });
      var lattice = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 1)), latticeMat);
      root.add(lattice);

      /* thin gold + orange rings */
      function ring(r, color, op, rx, ry) {
        var m = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.006, 8, 220),
          new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op })
        );
        m.rotation.x = rx; m.rotation.y = ry;
        root.add(m);
        return m;
      }
      var r1 = ring(2.15, GOLD, 0.55, 1.15, 0.2);
      var r2 = ring(2.55, ACC, 0.40, 0.55, 0.9);
      var r3 = ring(1.9, WARM, 0.28, 1.9, -0.4);

      /* small satellites riding the rings */
      var sats = [];
      [[r1, 2.15, GOLD, 0.8], [r2, 2.55, ACC, -0.55], [r3, 1.9, WARM, 1.1]].forEach(function (c, i) {
        var s = new THREE.Mesh(
          new THREE.SphereGeometry(0.045 + i * 0.008, 16, 16),
          new THREE.MeshBasicMaterial({ color: c[2] })
        );
        c[0].add(s);
        sats.push({ m: s, r: c[1], sp: c[3], ph: i * 2.1 });
      });

      /* star field */
      var N = small ? 420 : 980;
      var pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
      var tmp = new THREE.Color();
      for (var i = 0; i < N; i++) {
        var rad = 2.6 + Math.random() * 3.4;
        var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
        pos[i * 3 + 1] = rad * Math.sin(ph) * Math.sin(th) * 0.8;
        pos[i * 3 + 2] = rad * Math.cos(ph);
        var k = Math.random();
        if (k < 0.45) tmp.copy(ACC); else if (k < 0.75) tmp.copy(GOLD); else tmp.setRGB(0.95, 0.93, 0.88);
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      var pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
      var pm = new THREE.PointsMaterial({
        size: small ? 0.032 : 0.028, vertexColors: true, transparent: true, opacity: 0.85,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      var stars = new THREE.Points(pg, pm);
      root.add(stars);

      /* sizing + placement */
      var W = 0, H = 0;
      function layout() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        W = w; H = h;
        var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        var halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
        var halfW = halfH * camera.aspect;
        var wide = camera.aspect > 1.05;
        if (isHome) {
          if (wide) { root.userData.bx = halfW * 0.5; root.userData.by = 0.1; root.userData.s = 1; }
          else { root.userData.bx = 0; root.userData.by = halfH * 0.28; root.userData.s = Math.min(0.95, camera.aspect * 1.25); }
        } else {
          if (wide) { root.userData.bx = halfW * 0.62; root.userData.by = 0; root.userData.s = 0.62; }
          else { root.userData.bx = halfW * 0.55; root.userData.by = 0; root.userData.s = 0.42; }
        }
      }
      layout();
      window.addEventListener("resize", layout, { passive: true });

      /* input */
      var mx = 0, my = 0, tx = 0, ty = 0;
      window.addEventListener("pointermove", function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2;
        ty = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      /* theme sync */
      var lastLight = null;
      function syncTheme() {
        var light = document.documentElement.dataset.theme === "light";
        if (light === lastLight) return;
        lastLight = light;
        uniforms.uLight.value = light ? 1 : 0;
        pm.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        pm.opacity = light ? 0.7 : 0.85;
        pm.needsUpdate = true;
        latticeMat.color.set(light ? 0x8b6a2d : 0xd9b66f);
        latticeMat.opacity = light ? 0.35 : 0.22;
      }

      /* loop */
      var visible = true, running = false, last = performance.now(), t = 0;
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) kick();
      }, { threshold: 0 }).observe(host);
      document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

      function frame(now) {
        running = false;
        if (!visible || document.hidden) return;
        var dt = Math.min((now - last) / 1000, 0.05); last = now;
        t += dt;
        syncTheme();

        mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
        var sc = Math.min(window.scrollY / Math.max(H, 1), 1.5);

        uniforms.uTime.value = t;
        orb.rotation.y = t * 0.12;
        orb.rotation.x = t * 0.05;
        lattice.rotation.y = -t * 0.09;
        lattice.rotation.z = t * 0.04;
        r1.rotation.z = t * 0.18; r2.rotation.z = -t * 0.12; r3.rotation.z = t * 0.22;
        sats.forEach(function (s) {
          var a = t * s.sp + s.ph;
          s.m.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r, 0);
        });
        stars.rotation.y = t * 0.02 + mx * 0.15;
        stars.rotation.x = my * 0.08;

        var u = root.userData, b = 1 + Math.sin(t * 0.8) * 0.015;
        root.position.set(u.bx + mx * 0.18, u.by - my * 0.12 + sc * 0.5, 0);
        root.rotation.y = mx * 0.35 + sc * 0.5;
        root.rotation.x = my * 0.22 + sc * 0.2;
        root.scale.setScalar(u.s * b * (1 - sc * 0.12));

        renderer.render(scene, camera);
        kick();
      }
      function kick() {
        if (running || reduce && t > 0) return;
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
      kick();
      requestAnimationFrame(function () { canvas.classList.add("is-ready"); });
    });
  }

  onReady(function () {
    ambience();
    tilt();
    if (!reduce) scene3d();
  });
})();
