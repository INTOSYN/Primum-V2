/* Primum project page behaviour. No dependencies. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  root.classList.add("js");

  /* ---------------- theme ---------------- */
  const themeBtn = $(".theme-btn");
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => root.dataset.theme || (systemDark.matches ? "dark" : "light");
  const labelTheme = () => themeBtn && themeBtn.setAttribute("aria-label", currentTheme() === "dark" ? "Switch to light theme" : "Switch to dark theme");
  if (themeBtn) {
    labelTheme();
    themeBtn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("primum-theme", next); } catch (_) { /* storage unavailable */ }
      labelTheme();
    });
    systemDark.addEventListener?.("change", labelTheme);
  }

  /* ---------------- navigation ---------------- */
  const nav = $(".nav");
  const hero = $(".hero");
  const menuBtn = $(".menu-btn");
  let beyondHero = false;
  const setNav = () => {
    if (!nav || !hero) return;
    const bottom = hero.getBoundingClientRect().bottom;
    // A small dead band prevents alternating colours near the section boundary.
    if (bottom < 98) beyondHero = true;
    else if (bottom > 122) beyondHero = false;
    const state = beyondHero || nav.dataset.menu === "open" ? "solid" : (window.scrollY > 8 ? "float" : "top");
    if (nav.dataset.state !== state) nav.dataset.state = state;
  };
  let navTick = false;
  window.addEventListener("scroll", () => {
    if (navTick) return;
    navTick = true;
    requestAnimationFrame(() => { setNav(); navTick = false; });
  }, { passive: true });
  setNav();
  if (menuBtn && nav) {
    const close = () => { nav.dataset.menu = "closed"; menuBtn.setAttribute("aria-expanded", "false"); setNav(); };
    menuBtn.addEventListener("click", () => {
      const open = nav.dataset.menu !== "open";
      nav.dataset.menu = open ? "open" : "closed";
      menuBtn.setAttribute("aria-expanded", String(open));
      setNav();
    });
    $$(".nav__links a").forEach(a => a.addEventListener("click", close));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.dataset.menu === "open") { close(); menuBtn.focus(); } });
  }

  /* ---------------- author cards ---------------- */
  const authorItems = $$(".author");
  const placeCard = li => {
    const card = $(".author-card", li);
    if (!card) return;
    // measure without transforms: the card is centred on the name, then nudged inside the viewport
    const b = li.getBoundingClientRect(), w = card.offsetWidth, vw = document.documentElement.clientWidth, m = 12;
    const left = b.left + b.width / 2 - w / 2, right = left + w;
    const shift = left < m ? m - left : (right > vw - m ? vw - m - right : 0);
    card.style.setProperty("--shift", Math.ceil(shift) + "px");
  };
  const closeCards = except => authorItems.forEach(li => { if (li !== except) li.removeAttribute("data-open"); });
  authorItems.forEach(li => {
    const btn = $(".author__name", li);
    li.addEventListener("pointerenter", () => placeCard(li));
    btn.addEventListener("focus", () => placeCard(li));
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const open = li.dataset.open !== "true";
      closeCards(li);
      if (open) { placeCard(li); li.dataset.open = "true"; } else li.removeAttribute("data-open");
    });
  });
  document.addEventListener("click", () => closeCards(null));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeCards(null); });
  window.addEventListener("resize", () => authorItems.forEach(placeCard));
  authorItems.forEach(placeCard);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => authorItems.forEach(placeCard));

  /* ---------------- data ---------------- */
  let atlas = [];
  try { atlas = JSON.parse($("#atlas-data").textContent); } catch (_) { atlas = []; }
  const byId = Object.fromEntries(atlas.map(a => [a.id, a]));
  const fmt = v => (v > 0 ? "+" : v < 0 ? "−" : (Object.is(v, -0) ? "−" : "")) + Math.abs(v).toFixed(2) + "°";

  /* ---------------- hero specimen ---------------- */
  const specimen = $(".specimen");
  if (specimen) {
    const tabs = $$(".seg button", specimen);
    const frame = $(".frame", specimen);
    const view = $(".view", specimen);
    const loc = $(".locator", specimen);
    const arm = $(".arm", specimen);
    const res = $(".res", specimen);
    const delta = $(".delta", specimen);
    const ref = $(".ref", specimen);
    const dir = $(".dir", specimen);
    const select = (btn, focus) => {
      const a = byId[btn.dataset.id];
      if (!a) return;
      tabs.forEach(t => { const on = t === btn; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
      const f = a.files;
      view.src = "static/atlas/" + f.view_small.file;
      view.srcset = `static/atlas/${f.view_small.file} 960w, static/atlas/${f.view.file} 2000w`;
      view.width = f.view_small.width; view.height = f.view_small.height;
      view.alt = `${a.arm} re-refinement of ${a.case} ${a.residue} with the starting and reference side chains and the deposited map`;
      loc.src = "static/atlas/" + f.locator.file;
      arm.style.setProperty("--c", btn.style.getPropertyValue("--c"));
      $("span", arm).textContent = a.arm;
      res.textContent = `${a.case} ${a.residue}`;
      delta.textContent = "Δχ₁ " + fmt(a.delta_chi1_deg);
      ref.textContent = `reference ${a.reference_pdb} · ${a.map}`;
      dir.textContent = a.delta_chi1_deg > 0 ? "further from the reference" : "closer to the reference";
      frame.dataset.src = "static/atlas/" + f.view.file;
      frame.dataset.w = f.view.width; frame.dataset.h = f.view.height;
      frame.dataset.title = `${a.arm} · ${a.case} ${a.residue} · Δχ₁ ${fmt(a.delta_chi1_deg)}`;
      frame.dataset.cap = "cap-" + a.id;
      if (focus) btn.focus();
    };
    tabs.forEach((btn, i) => {
      btn.addEventListener("click", () => select(btn));
      btn.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        select(tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length], true);
      });
    });
  }

  /* ---------------- hero density field: EMD-7041 sections ---------------- */
  const canvas = $(".hero__field");
  const D = window.PRIMUM_DENSITY;
  const readout = $("#readout");
  if (canvas && hero && D && "DecompressionStream" in window) {
    let bin;
    try { bin = Uint8Array.from(atob(D.z), c => c.charCodeAt(0)); } catch (_) { bin = null; }
    if (bin) {
      const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream("deflate"));
      new Response(stream).arrayBuffer().then(buf => runField(new Uint8Array(buf))).catch(() => {});
    }
  }
  function runField(q) {
    const { w, h, n } = D;
    if (q.length !== w * h * n) return;
    const z0 = +canvas.dataset.z0, z1 = +canvas.dataset.z1, nz = +canvas.dataset.nz;
    const sig = s => (s - D.offset_sigma) / D.step_sigma; /* sigma -> stored units */
    const levels = [
      { q: sig(1.0), stroke: "rgba(96, 176, 226, 0.17)", width: 1 },
      { q: sig(1.6), stroke: "rgba(124, 200, 242, 0.30)", width: 1.1 },
      { q: sig(2.6), stroke: "rgba(176, 228, 255, 0.58)", width: 1.35 },
    ];
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const field = new Float32Array(w * h);
    let W = 0, H = 0, dpr = 1, scale = 1, ox = 0, oy = 0;
    const resize = () => {
      const nextDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const nextW = canvas.clientWidth, nextH = canvas.clientHeight;
      if (!nextW || !nextH || (nextW === W && nextH === H && nextDpr === dpr)) return false;
      dpr = nextDpr; W = nextW; H = nextH;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      scale = Math.max(W / (w - 1), H / (h - 1)) * 1.06;
      ox = (W - (w - 1) * scale) / 2 + W * 0.06;
      oy = (H - (h - 1) * scale) / 2;
      return true;
    };
    const sample = s => {
      const i = Math.min(n - 2, Math.max(0, Math.floor(s)));
      const a = Math.min(1, Math.max(0, s - i));
      const A = i * w * h, B = (i + 1) * w * h;
      for (let k = 0; k < w * h; k++) field[k] = q[A + k] * (1 - a) + q[B + k] * a;
    };
    const lerp = (va, vb, L) => (L - va) / (vb - va);
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      for (const lv of levels) {
        const L = lv.q;
        ctx.beginPath();
        for (let y = 0; y < h - 1; y++) {
          const r0 = y * w, r1 = r0 + w;
          for (let x = 0; x < w - 1; x++) {
            const tl = field[r0 + x], tr = field[r0 + x + 1], br = field[r1 + x + 1], bl = field[r1 + x];
            const c = (tl >= L ? 8 : 0) | (tr >= L ? 4 : 0) | (br >= L ? 2 : 0) | (bl >= L ? 1 : 0);
            if (c === 0 || c === 15) continue;
            const px = ox + x * scale, py = oy + y * scale;
            const top = () => [px + lerp(tl, tr, L) * scale, py];
            const right = () => [px + scale, py + lerp(tr, br, L) * scale];
            const bottom = () => [px + lerp(bl, br, L) * scale, py + scale];
            const left = () => [px, py + lerp(tl, bl, L) * scale];
            const seg = (p, r) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(r[0], r[1]); };
            switch (c) {
              case 1: case 14: seg(left(), bottom()); break;
              case 2: case 13: seg(bottom(), right()); break;
              case 3: case 12: seg(left(), right()); break;
              case 4: case 11: seg(top(), right()); break;
              case 6: case 9: seg(top(), bottom()); break;
              case 7: case 8: seg(left(), top()); break;
              case 5: { const m = (tl + tr + br + bl) / 4 >= L; if (m) { seg(left(), top()); seg(bottom(), right()); } else { seg(left(), bottom()); seg(top(), right()); } break; }
              case 10: { const m = (tl + tr + br + bl) / 4 >= L; if (m) { seg(left(), bottom()); seg(top(), right()); } else { seg(left(), top()); seg(bottom(), right()); } break; }
            }
          }
        }
        ctx.strokeStyle = lv.stroke; ctx.lineWidth = lv.width; ctx.stroke();
      }
    };
    let pos = (n - 1) / 2, running = false, visible = true, raf = 0, last = 0, phase = 0.25, lastText = 0;
    let scrolling = false, scrollTimer = 0, needsResize = false, resizeFrame = 0;
    const PERIOD = 70000;
    const setReadout = s => {
      if (!readout) return;
      const z = Math.round(z0 + (s / (n - 1)) * (z1 - z0));
      readout.textContent = `EMD-7041 · deposited map of 6B3Q · section ${z} of ${nz} · contours 1.0, 1.6, 2.6 σ`;
    };
    const frame = now => {
      raf = 0;
      if (!running) return;
      if (now - last >= 66) {
        // Advance only during active rendering; pausing never jumps to another slice.
        phase = (phase + Math.min(now - last, 100) / PERIOD) % 1;
        last = now;
        pos = (n - 1) * (0.5 - 0.5 * Math.cos(2 * Math.PI * phase));
        sample(pos); draw();
        if (now - lastText > 400) { setReadout(pos); lastText = now; }
      }
      raf = requestAnimationFrame(frame);
    };
    const startStop = () => {
      const want = visible && !document.hidden && !reduceMotion.matches && !scrolling;
      if (want && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    };
    const redrawSize = () => {
      resizeFrame = 0;
      if (!needsResize || scrolling || !visible || document.hidden) return;
      needsResize = false;
      if (resize()) { sample(pos); draw(); }
    };
    const pauseForScroll = () => {
      scrolling = true;
      startStop();
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrolling = false;
        redrawSize();
        startStop();
      }, 200);
    };
    window.addEventListener("scroll", pauseForScroll, { passive: true });
    window.addEventListener("wheel", pauseForScroll, { passive: true });
    window.addEventListener("touchmove", pauseForScroll, { passive: true });
    resize(); sample(pos); draw(); setReadout(pos);
    hero.classList.add("has-field");
    new ResizeObserver(() => {
      needsResize = true;
      if (!resizeFrame) resizeFrame = requestAnimationFrame(redrawSize);
    }).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; redrawSize(); startStop(); }, { threshold: 0 }).observe(hero);
    document.addEventListener("visibilitychange", () => { redrawSize(); startStop(); });
    reduceMotion.addEventListener?.("change", startStop);
    startStop();
  }

  /* ---------------- charts ---------------- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const TOKEN = "CC_mask";
  const plain = str => str.split(TOKEN).join("CC mask");
  const richSvg = (node, str) => {
    str.split(TOKEN).forEach((part, i) => {
      if (i) { node.appendChild(document.createTextNode("CC")); const sub = el("tspan", { "baseline-shift": "sub", "font-size": "72%" }, node); sub.textContent = "mask"; el("tspan", {}, node).textContent = "\u200a"; }
      if (part) node.appendChild(document.createTextNode(part));
    });
  };
  const richHtml = (node, str) => {
    str.split(TOKEN).forEach((part, i) => {
      if (i) { node.appendChild(document.createTextNode("CC")); const sub = document.createElement("sub"); sub.textContent = "mask"; node.appendChild(sub); }
      if (part) node.appendChild(document.createTextNode(part));
    });
  };
  const text = (parent, x, y, str, cls, anchor = "start") => {
    const t = el("text", { x, y, class: cls, "text-anchor": anchor }, parent);
    richSvg(t, str);
    return t;
  };
  const mark = (g, shape, cls, x, y) => {
    if (shape === "square") el("rect", { x: x - 5, y: y - 5, width: 10, height: 10, rx: 1.5, class: cls, "stroke-width": 2 }, g);
    else { el("circle", { cx: x, cy: y, r: 7, class: "mk-ring", fill: "none" }, g); el("circle", { cx: x, cy: y, r: 5, class: cls, "stroke-width": 0 }, g); }
  };
  const tipFor = chartEl => {
    let tip = $(".tip", chartEl);
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status"); chartEl.appendChild(tip); }
    return tip;
  };
  const showTip = (chartEl, d, x, y) => {
    const tip = tipFor(chartEl);
    tip.replaceChildren();
    const v = document.createElement("div"); v.className = "t-val";
    const k = document.createElement("span"); k.className = "k"; k.style.setProperty("--k", d.color);
    const vt = document.createElement("span"); vt.textContent = d.value;
    v.append(k, vt);
    const nm = document.createElement("div"); nm.className = "t-name"; richHtml(nm, d.name);
    const mt = document.createElement("div"); mt.className = "t-meta"; mt.textContent = d.meta;
    tip.append(v, nm, mt);
    const cw = chartEl.clientWidth;
    tip.style.left = Math.min(Math.max(0, x + 14), Math.max(0, cw - 250)) + "px";
    tip.style.top = Math.max(0, y - 70) + "px";
    tip.classList.add("on");
  };
  const hideTip = chartEl => { const t = $(".tip", chartEl); if (t) t.classList.remove("on"); };
  const deg = v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(2) + "°";
  const ci = (a, b) => `95% interval ${deg(a)} to ${deg(b)}`;

  function forest(chartEl, cfg) {
    const W = Math.max(280, chartEl.clientWidth);
    const narrow = W < 400;
    const labelW = narrow ? 0 : Math.min(cfg.labelW || 200, W * 0.36);
    const rowH = narrow ? (cfg.rowHNarrow || 70) : (cfg.rowH || 58);
    const topPad = 30, bottomPad = 42, rightPad = narrow ? 14 : 60;
    const H = topPad + cfg.rows.length * rowH + bottomPad;
    const [d0, d1] = cfg.domain;
    const x0 = labelW + (narrow ? 4 : 14), x1 = W - rightPad;
    const X = v => x0 + ((v - d0) / (d1 - d0)) * (x1 - x0);
    chartEl.querySelector("svg")?.remove();
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "group", "aria-label": cfg.aria });
    chartEl.prepend(svg);
    const grid = el("g", { class: "grid" }, svg);
    for (const t of cfg.ticks) {
      if (t !== 0) el("line", { x1: X(t), x2: X(t), y1: topPad - 6, y2: H - bottomPad + 4 }, grid);
      text(svg, X(t), H - bottomPad + 22, (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(t) + "°", "tick", "middle");
    }
    el("line", { x1: X(0), x2: X(0), y1: topPad - 10, y2: H - bottomPad + 4, class: "zero" }, svg);
    text(svg, X(0) + 6, topPad - 14, "No operation", "zero-label halo-text");
    text(svg, x1, H - 4, cfg.axisTitle, "axis-title", "end");
    cfg.rows.forEach((row, i) => {
      const yTop = topPad + i * rowH;
      const series = cfg.series.filter(s => row[s.key]);
      const spread = series.length > 1 ? 9 : 0;
      const yMid = yTop + rowH / 2 + (narrow ? 9 : 0);
      if (narrow) {
        const t = text(svg, x0, yTop + 14, row.name, "row-name halo-text");
        const tn = el("tspan", { class: "row-n", dx: 8, "font-weight": 400 }, t); tn.textContent = row.n;
      } else {
        text(svg, 0, yMid - 6, row.name, "row-name halo-text");
        text(svg, 0, yMid + 15, row.n, "row-n halo-text");
      }
      series.forEach((s, j) => {
        const [v, lo, hi] = row[s.key];
        const y = yMid + (j - (series.length - 1) / 2) * 2 * spread;
        const cls = row.emph === false ? "s-neutral" : (typeof s.cls === "function" ? s.cls(row) : s.cls);
        const g = el("g", { class: "mk" }, svg);
        el("rect", { x: X(lo) - 12, y: y - 12, width: X(hi) - X(lo) + 24, height: 24, rx: 6, class: "halo" }, g);
        el("line", { x1: X(lo), x2: X(hi), y1: y, y2: y, class: "ci " + cls }, g);
        mark(g, s.shape, cls, X(v), y);
        if (s.label && !narrow) text(svg, W - 2, y + 4, deg(v), "val halo-text", "end");
        const hit = el("rect", { x: X(lo) - 14, y: y - 13, width: X(hi) - X(lo) + 28, height: 26, class: "hit", tabindex: 0, role: "img",
          "aria-label": plain(`${row.name}, ${s.name}: ${deg(v)}, ${ci(lo, hi)}, ${row[s.key + "N"] || row.n}`) }, svg);
        const color = getComputedStyle(g.querySelector(".ci")).stroke;
        const datum = { value: `${deg(v)}  [${deg(lo)}, ${deg(hi)}]`, name: `${row.name} · ${s.name}`, meta: row[s.key + "N"] || row.n, color };
        const on = e => {
          g.classList.add("is-hover");
          const r = chartEl.getBoundingClientRect();
          const px = e && e.clientX != null ? e.clientX - r.left : X(hi) * (chartEl.clientWidth / W);
          const py = e && e.clientY != null ? e.clientY - r.top : y;
          showTip(chartEl, datum, px, py);
        };
        const off = () => { g.classList.remove("is-hover"); hideTip(chartEl); };
        hit.addEventListener("pointermove", on);
        hit.addEventListener("pointerleave", off);
        hit.addEventListener("focus", () => on(null));
        hit.addEventListener("blur", off);
      });
    });
  }

  const charts = [
    {
      el: $("#chart-cohorts"),
      cfg: {
        aria: "Selection loss of the highest-correlation rule in four cohorts, full map and evaluation half",
        axisTitle: "Selection loss, χ₁ disagreement relative to no operation",
        domain: [-0.6, 4.6], ticks: [0, 1, 2, 3, 4], labelW: 205, rowH: 62, rowHNarrow: 78,
        series: [
          { key: "full", name: "highest full-map CC_mask", shape: "circle", cls: "s-full", label: true },
          { key: "half", name: "highest evaluation-half CC_mask", shape: "square", cls: "s-half" },
        ],
        rows: [
          { name: "MEDIC", n: "26 cases · 20 clusters", full: [2.83, 1.85, 3.74] },
          { name: "Earlier replication", n: "156 entries · 130 groups", full: [3.16, 2.68, 3.68], half: [1.83, 1.27, 2.44], halfN: "69 entries · 63 groups" },
          { name: "3.0–3.6 Å cohort", n: "167 entries · 131 groups", full: [2.41, 2.12, 2.71], half: [2.29, 1.70, 2.97], halfN: "99 entries · 82 groups" },
          { name: "Within-study pairs", n: "53 pairs", full: [3.43, 2.85, 4.02], half: [2.35, 1.60, 3.21], halfN: "44 pairs" },
        ],
      },
    },
    {
      el: $("#chart-strategies"),
      cfg: {
        aria: "Overall loss of four reference strategies on the 3.0 to 3.6 angstrom cohort",
        axisTitle: "Overall loss relative to no operation",
        domain: [-1.3, 3.1], ticks: [-1, 0, 1, 2, 3], labelW: 172, rowH: 62, rowHNarrow: 70,
        series: [{ key: "v", name: "overall loss", shape: "circle", cls: "s-full", label: true }],
        rows: [
          { name: "Highest CC_mask", n: "96.2% coverage", v: [2.41, 2.12, 2.71], vN: "167 entries · 131 groups · 96.2% coverage" },
          { name: "Always CryoNet.Refine", n: "100% coverage", v: [-0.09, -0.31, 0.13], emph: false, vN: "167 entries · 100% coverage" },
          { name: "Calibrated EMRinger", n: "65.3% coverage", v: [-0.06, -0.23, 0.11], emph: false, vN: "threshold fixed on MEDIC and the earlier replication" },
          { name: "Per-case oracle", n: "64.5% coverage", v: [-0.77, -0.91, -0.63], emph: false, vN: "best available action in each case, chosen with the reference outcomes" },
        ],
      },
    },
  ].filter(c => c.el);
  const drawCharts = () => charts.forEach(c => forest(c.el, c.cfg));
  drawCharts();
  if (charts.length) {
    let rt = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(rt); rt = requestAnimationFrame(drawCharts); });
    charts.forEach(c => ro.observe(c.el));
    const mo = new MutationObserver(drawCharts);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    systemDark.addEventListener?.("change", drawCharts);
  }

  /* ---------------- atlas ---------------- */
  const atlasTabs = $$(".atlas-tabs button");
  atlasTabs.forEach((btn, i) => {
    const activate = focus => {
      atlasTabs.forEach(b => {
        const on = b === btn;
        b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(b.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      $(".filters").hidden = btn.dataset.filters === "off";
      if (focus) btn.focus();
    };
    btn.addEventListener("click", () => activate(false));
    btn.addEventListener("keydown", e => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      atlasTabs[(i + (e.key === "ArrowRight" ? 1 : atlasTabs.length - 1)) % atlasTabs.length].click();
      atlasTabs[(i + (e.key === "ArrowRight" ? 1 : atlasTabs.length - 1)) % atlasTabs.length].focus();
    });
  });
  const filterBtns = $$(".filters button");
  filterBtns.forEach(btn => btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    const arm = btn.dataset.arm;
    $$("#panel-local .render-card").forEach(card => { card.hidden = arm !== "all" && card.dataset.arm !== arm; });
    $$("#panel-local .role-group").forEach(g => { g.hidden = !$$(".render-card", g).some(c => !c.hidden); });
  }));
  $$(".compare").forEach(cmp => {
    const input = $("input", cmp);
    const set = () => cmp.style.setProperty("--pos", input.value + "%");
    input.addEventListener("input", set);
    set();
  });

  /* ---------------- viewer ---------------- */
  const viewer = $("#viewer");
  if (viewer && typeof viewer.showModal === "function") {
    const stage = $(".v-stage", viewer);
    const box = $(".v-canvas", viewer);
    const img = $("img", box);
    const titleEl = $(".v-title", viewer);
    const capEl = $(".v-cap", viewer);
    const pdfEl = $(".v-pdf", viewer);
    const zoomEl = $(".v-zoom", viewer);
    let list = [], idx = 0, opener = null, natW = 1, natH = 1, fit = 1, s = 1, tx = 0, ty = 0, smax = 6;
    const apply = () => {
      const w = natW * fit, h = natH * fit;
      box.style.width = w + "px"; box.style.height = h + "px";
      box.style.transform = `translate(${tx - (w * s) / 2}px, ${ty - (h * s) / 2}px) scale(${s})`;
      zoomEl.textContent = Math.round(s * fit * 100) + "%";
    };
    const clampPan = () => {
      const r = stage.getBoundingClientRect();
      const mx = Math.max(0, (natW * fit * s - r.width) / 2 + 40), my = Math.max(0, (natH * fit * s - r.height) / 2 + 40);
      tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    };
    const layout = () => {
      const r = stage.getBoundingClientRect();
      fit = Math.min((r.width - 40) / natW, (r.height - 40) / natH);
      smax = Math.max(4, 2.5 / fit);
      clampPan(); apply();
    };
    const zoomAt = (factor, px, py) => {
      const ns = Math.max(1, Math.min(smax, s * factor));
      const w = natW * fit, h = natH * fit;
      const X0 = tx - (w * s) / 2, Y0 = ty - (h * s) / 2;
      const u = (px - X0) / s, v = (py - Y0) / s;
      tx = px - u * ns + (w * ns) / 2; ty = py - v * ns + (h * ns) / 2;
      s = ns;
      if (s === 1) { tx = 0; ty = 0; }
      clampPan(); apply();
    };
    const centerPt = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
    const show = i => {
      idx = (i + list.length) % list.length;
      const it = list[idx];
      natW = +it.dataset.w || 1600; natH = +it.dataset.h || 1200;
      s = 1; tx = 0; ty = 0;
      titleEl.textContent = it.dataset.title || "";
      const cap = it.dataset.cap && document.getElementById(it.dataset.cap);
      capEl.innerHTML = cap ? cap.innerHTML : "";
      if (it.dataset.pdf) { pdfEl.href = it.dataset.pdf; pdfEl.hidden = false; } else pdfEl.hidden = true;
      const thumb = it.querySelector("img");
      img.alt = thumb ? thumb.alt : "";
      img.src = thumb ? (thumb.currentSrc || thumb.src) : it.dataset.src;
      stage.classList.add("loading");
      const full = new Image();
      full.onload = () => { if (list[idx] === it) { img.src = full.src; stage.classList.remove("loading"); } };
      full.onerror = () => stage.classList.remove("loading");
      full.src = it.dataset.src;
      $$(".v-nav", viewer).forEach(b => { b.hidden = list.length < 2; });
      layout();
    };
    document.addEventListener("click", e => {
      const it = e.target.closest("[data-view]");
      if (!it) return;
      e.preventDefault();
      opener = it;
      list = $$(`[data-view][data-group="${it.dataset.group}"]`).filter(x => !x.closest("[hidden]"));
      if (!list.includes(it)) list = [it];
      viewer.showModal();
      show(list.indexOf(it));
    });
    viewer.addEventListener("close", () => { img.removeAttribute("src"); if (opener) opener.focus(); });
    $(".v-close", viewer).addEventListener("click", () => viewer.close());
    $(".v-in", viewer).addEventListener("click", () => zoomAt(1.5, 0, 0));
    $(".v-out", viewer).addEventListener("click", () => zoomAt(1 / 1.5, 0, 0));
    $(".v-fit", viewer).addEventListener("click", () => { s = 1; tx = 0; ty = 0; apply(); });
    $(".v-capbtn", viewer).addEventListener("click", e => {
      const hidden = viewer.dataset.cap === "hidden";
      viewer.dataset.cap = hidden ? "shown" : "hidden";
      e.currentTarget.setAttribute("aria-pressed", String(!hidden));
      requestAnimationFrame(layout);
    });
    $(".v-prev", viewer).addEventListener("click", () => show(idx - 1));
    $(".v-next", viewer).addEventListener("click", () => show(idx + 1));
    viewer.addEventListener("keydown", e => {
      if (e.target.closest("a, button") && (e.key === "Enter" || e.key === " ")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
      else if (e.key === "+" || e.key === "=") zoomAt(1.5, 0, 0);
      else if (e.key === "-") zoomAt(1 / 1.5, 0, 0);
      else if (e.key === "0") { s = 1; tx = 0; ty = 0; apply(); }
    });
    stage.addEventListener("wheel", e => {
      e.preventDefault();
      const [px, py] = centerPt(e);
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), px, py);
    }, { passive: false });
    stage.addEventListener("dblclick", e => { const [px, py] = centerPt(e); if (s < 1.6) zoomAt(2.6, px, py); else { s = 1; tx = 0; ty = 0; apply(); } });
    const pts = new Map();
    let lastDist = 0, lastMid = null;
    stage.addEventListener("pointerdown", e => {
      if (e.target.closest(".v-nav")) return;
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, centerPt(e));
      stage.classList.add("dragging");
    });
    stage.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId), cur = centerPt(e);
      pts.set(e.pointerId, cur);
      if (pts.size === 1) {
        if (s > 1) { tx += cur[0] - prev[0]; ty += cur[1] - prev[1]; clampPan(); apply(); }
      } else if (pts.size === 2) {
        const [a, b] = Array.from(pts.values());
        const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        if (lastDist) zoomAt(dist / lastDist, mid[0], mid[1]);
        if (lastMid && s > 1) { tx += mid[0] - lastMid[0]; ty += mid[1] - lastMid[1]; clampPan(); apply(); }
        lastDist = dist; lastMid = mid;
      }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) { lastDist = 0; lastMid = null; } if (!pts.size) stage.classList.remove("dragging"); };
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    window.addEventListener("resize", () => { if (viewer.open) layout(); });
  }

  /* ---------------- citation ---------------- */
  const copyBtn = $(".copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const code = $("#bibtex").textContent;
      let ok = false;
      try { await navigator.clipboard.writeText(code); ok = true; } catch (_) {
        const r = document.createRange(); r.selectNodeContents($("#bibtex"));
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        try { ok = document.execCommand("copy"); } catch (__) { ok = false; }
        sel.removeAllRanges();
      }
      copyBtn.textContent = ok ? "Copied" : "Select and copy";
      setTimeout(() => { copyBtn.textContent = "Copy BibTeX"; }, 1800);
    });
  }
})();
