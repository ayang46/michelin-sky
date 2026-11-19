// Mapping the Michelin Sky: scrollytelling version
// Five charts from dataset/michelin_my_maps_cleaned.csv:
//   1 waffle  2 tree  3 constellation map  4 sankey  5 circle packing

const C = {
  paper: "#FAF8F4", ink: "#16181F", ink2: "#454A5A", muted: "#8A8F9E", rule: "#E4E0D8",
  night: "#0D1226", nink: "#F4F1EA", nink2: "#A9B0C6",
  s3: "#5C3A00", s2: "#B07A12", s1: "#E8BE4F", bib: "#2F7F8F", none: "#D3CEC4",
  gold: "#E8B44A", alert: "#C2412F"
};
const STAR_COLOR = { 3: C.s3, 2: C.s2, 1: C.s1, 0: C.bib };
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DUR = REDUCED ? 0 : 1;
const fmt = d3.format(",");
const pct = v => `${Math.round(v * 100)}%`;
const fill = (key, val) => document.querySelectorAll(`[data-fill="${key}"]`).forEach(el => (el.textContent = val));

// ---------- data cleaning ----------
const COUNTRY_FIX = { Dubai: "United Arab Emirates", "Abu Dhabi": "United Arab Emirates" };
const NAME = {
  "Chinese Mainland": "China", "Hong Kong SAR": "Hong Kong", "Taiwan Region": "Taiwan", "Macau SAR": "Macau",
  "United Kingdom": "UK", "Principality of Monaco": "Monaco", "United Arab Emirates": "UAE", "The Philippines": "Philippines"
};
const nameOf = c => NAME[c] || c;
const REGION_OF = {
  Asia: ["Japan", "Chinese Mainland", "Taiwan Region", "Thailand", "Hong Kong SAR", "Singapore", "South Korea", "Vietnam",
    "Malaysia", "Türkiye", "United Arab Emirates", "The Philippines", "Macau SAR", "Qatar", "Saudi Arabia"],
  "North America": ["USA", "Canada"],
  "Latin America": ["Mexico", "Brazil", "Argentina"],
  Oceania: ["New Zealand", "Australia"]
};
const regionOf = c => Object.keys(REGION_OF).find(r => REGION_OF[r].includes(c)) || "Europe";
const AWARD_STARS = { "3 Stars": 3, "2 Stars": 2, "1 Star": 1, "Bib Gourmand": 0 };
const FAMILY = {
  Japanese: /Japanese|Sushi|Tempura|Kaiseki|Yakitori|Teppanyaki|Soba|Unagi|Ramen|Tonkatsu|Sukiyaki|Izakaya|Udon|Shojin|Kushiage|Omakase/i,
  French: /French/i,
  Chinese: /Chinese|Cantonese|Sichuan|Taizhou|Shanghainese|Chao Zhou|Huaiyang|Zhejiang|Beijing|Fujian|Ningbo|Hunanese|Dim Sum|Hang Zhou|Shandong|Jiangzhe|Yunnanese|Peking|Hakka|Guizhou|Xinjiang/i,
  Italian: /Italian|Pizza|Piedmontese|Sicilian|Campanian|Tuscan|Ligurian|Venetian|Sardinian|Apulian|Roman|Emilian|Lombardian|Abruzzese|Calabrian/i
};
const HOME = { Japanese: "Japan", French: "France", Chinese: "Chinese Mainland", Italian: "Italy" };

function parseRow(d) {
  const parts = d.Location.split(",").map(s => s.trim());
  const raw = parts[parts.length - 1];
  const cuisine = (d.Cuisine || "").split(",")[0].trim();
  return {
    name: d.Name,
    city: parts[0],
    country: COUNTRY_FIX[raw] || raw,
    stars: AWARD_STARS[d.Award],
    price: (d.Price || "").length,
    priceLabel: d.Price,
    cuisine,
    family: Object.keys(FAMILY).find(f => FAMILY[f].test(cuisine)) || null,
    lon: +d.Longitude,
    lat: +d.Latitude
  };
}

// ---------- shared helpers ----------
const tip = d3.select("#tooltip");
function showTip(html, event) {
  tip.html(html).attr("hidden", null);
  const pad = 14, w = tip.node().offsetWidth, h = tip.node().offsetHeight;
  let x = event.clientX + pad, y = event.clientY + pad;
  if (x + w > innerWidth - 8) x = event.clientX - w - pad;
  if (y + h > innerHeight - 8) y = event.clientY - h - pad;
  tip.style("left", `${x}px`).style("top", `${y}px`);
}
const hideTip = () => tip.attr("hidden", true);
const starStr = n => (n ? "★".repeat(n) : "Bib");
function topList(rows, k = 3) {
  return rows.slice().sort((a, b) => b.stars - a.stars || b.price - a.price || d3.ascending(a.name, b.name)).slice(0, k)
    .map(r => `${r.name}, ${r.city} <span style="color:${C.s2}">${starStr(r.stars)}</span>`).join("<br>");
}

// Fire onStep when a .step crosses the middle of the screen
function scrolly(sectionId, onStep) {
  const steps = [...document.querySelectorAll(`#${sectionId} .step`)];
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      steps.forEach(s => s.classList.toggle("active", s === e.target));
      onStep(+e.target.dataset.step, e.target);
    });
  }, { rootMargin: "-48% 0px -48% 0px" });
  steps.forEach(s => io.observe(s));
}

// Fade-up for text blocks
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealIO.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach(el => revealIO.observe(el));

// Reading progress bar
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.getElementById("progress").style.width = `${(scrollY / max) * 100}%`;
}, { passive: true });

// ---------- hero starfield ----------
(function starfield() {
  const cv = document.getElementById("starfield"), ctx = cv.getContext("2d");
  let stars = [];
  function resize() {
    const dpr = devicePixelRatio || 1;
    cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = d3.range(Math.round((cv.offsetWidth * cv.offsetHeight) / 5000)).map(() => ({
      x: Math.random() * cv.offsetWidth, y: Math.random() * cv.offsetHeight,
      r: Math.random() * 1.3 + 0.2, p: Math.random() * Math.PI * 2, s: 0.5 + Math.random() * 1.5
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, cv.offsetWidth, cv.offsetHeight);
    for (const s of stars) {
      ctx.globalAlpha = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.p + (t / 1000) * s.s));
      ctx.fillStyle = s.r > 1.2 ? C.gold : "#FFF1C9";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    if (!REDUCED) requestAnimationFrame(draw);
  }
  resize(); addEventListener("resize", resize);
  requestAnimationFrame(draw);
})();

// ---------- load ----------
Promise.all([
  d3.csv("dataset/michelin_my_maps_cleaned.csv", parseRow),
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
]).then(([rows, world]) => {
  const d = rows.filter(r => r.stars !== undefined);
  const s = d.filter(r => r.stars > 0);
  const N = d.length, NS = s.length, TOT = d3.sum(s, r => r.stars);
  const countries = new Set(d.map(r => r.country));

  // Hero numbers count up
  const heroVals = { N, TOT, NC: countries.size };
  d3.selectAll("[data-count]").each(function () {
    const el = d3.select(this), v = heroVals[this.dataset.count];
    el.transition().delay(400).duration(1600 * DUR).ease(d3.easeCubicOut)
      .tween("text", () => t => el.text(fmt(Math.round(v * t))));
  });
  fill("N", fmt(N));
  fill("pctStar", pct(NS / N));

  drawWaffle(d, N);
  drawTree(d, s, N, NS);
  drawConstellations(s, world);
  drawSankey(d, N);
  drawPack(s, TOT);
  setupPoll();

  document.getElementById("foot").textContent =
    `Data: Michelin Guide restaurants, Kaggle (ngshiheng, "michelin-my-maps"), ${fmt(N)} rows · Natural Earth via world-atlas (map shapes). ` +
    `Cleaning: country and city parsed from Location; Dubai and Abu Dhabi grouped as UAE; countries grouped into UN regions; ` +
    `€ ¥ ฿ symbols mapped to price groups 1–4; Bib Gourmand counted as "recommended, no star". Built with D3 v7.`;
}).catch(err => {
  console.error(err);
  document.querySelector("#s1 .intro").insertAdjacentHTML("beforeend",
    `<p class="note">Couldn't load the data. Serve this folder with a local server (python3 -m http.server) instead of opening the file directly.</p>`);
});

// =====================================================================
// 1  WAFFLE: 1,000 squares, lit one star level at a time
// =====================================================================
function drawWaffle(d, N) {
  const cats = [
    { k: 3, label: "3★", color: C.s3 }, { k: 2, label: "2★", color: C.s2 },
    { k: 1, label: "1★", color: C.s1 }, { k: 0, label: "Bib Gourmand, no star", color: C.bib }
  ];
  const counts = d3.rollup(d, v => v.length, r => r.stars);
  cats.forEach(c => { c.n = counts.get(c.k) || 0; c.raw = (c.n / N) * 1000; c.cells = Math.floor(c.raw); });
  // largest remainder so the squares add up to exactly 1,000
  let left = 1000 - d3.sum(cats, c => c.cells);
  cats.slice().sort((a, b) => (b.raw - b.cells) - (a.raw - a.cells)).slice(0, left).forEach(c => c.cells++);

  const p3 = cats[0].n / N, h1n = Math.max(1, Math.round(p3 * 100));
  d3.select("#h1").html(`Only ${h1n} in every 100 restaurants<br>in the Guide ${h1n === 1 ? "has" : "have"} three stars`);
  fill("per", Math.round(N / 1000));
  cats.forEach(c => fill(`c${c.k}`, fmt(c.cells)));
  d3.select("#n1").text(`Source: Michelin Guide restaurants dataset (Kaggle), ${fmt(N)} restaurants. 1 square ≈ ${Math.round(N / 1000)} restaurants. Star meanings: guide.michelin.com.`);

  const COLS = 50, CELL = 20, GAP = 3;
  const cells = cats.flatMap((c, ci) => d3.range(c.cells).map(j => ({ ci, j })));
  cells.forEach((c, i) => { c.x = (i % COLS) * CELL; c.y = Math.floor(i / COLS) * CELL; });
  const svg = d3.select("#waffle").attr("viewBox", `0 0 ${COLS * CELL} ${(1000 / COLS) * CELL}`);
  const rects = svg.selectAll("rect").data(cells).join("rect")
    .attr("x", c => c.x).attr("y", c => c.y)
    .attr("width", CELL - GAP).attr("height", CELL - GAP).attr("rx", 2)
    .attr("fill", "#ECE8E0")
    .attr("opacity", 0);

  const legend = d3.select("#waffle-legend").selectAll("div").data(cats).join("div")
    .html(c => `<b><i style="background:${c.color}"></i>${c.label}</b>${fmt(c.n)} restaurants · ${(c.n / N * 100).toFixed(1)}%`);

  let shown = false;
  scrolly("s1", step => {
    if (!shown) {
      shown = true;
      rects.transition().duration(500 * DUR).delay((_, i) => (i % COLS) * 12 * DUR + Math.floor(i / COLS) * 18 * DUR).attr("opacity", 1);
    }
    rects.transition("color").duration(600 * DUR)
      .delay(c => (c.ci === step - 1 ? c.j * 0.8 * DUR : 0))
      .attr("fill", c => (c.ci < step ? cats[c.ci].color : "#ECE8E0"));
    legend.classed("on", (_, i) => i < step);
  });
}

// =====================================================================
// 2  TREE: Guide → starred / not → star level → top 3 countries
// =====================================================================
function drawTree(d, s, N, NS) {
  const noStar = N - NS;
  d3.select("#h2").html(`Secret inspectors decide, and ${Math.round((noStar / N) * 100)} of every 100<br>restaurants in the Guide never get a star`);

  const W = 1000, X = { root: 95, a: 275, b: 485, c: 790 };
  const LW = n => Math.max(1.5, (38 * n) / N);
  const levels = [
    { k: 3, label: "★★★  Three stars", mean: '"worth a special journey"' },
    { k: 2, label: "★★  Two stars", mean: '"worth a detour"' },
    { k: 1, label: "★  One star", mean: '"worth a stop"' }
  ];
  // vertical layout in abstract units
  let y = 0;
  levels.forEach(l => {
    const rs = s.filter(r => r.stars === l.k);
    l.n = rs.length;
    l.kids = d3.rollups(rs, v => v.length, r => r.country).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([country, n]) => ({ country, n, y: (y += 1) - 1 }));
    l.y = d3.mean(l.kids, k => k.y);
    y += 0.7;
  });
  const yStar = d3.mean(levels, l => l.y), yNo = y + 0.4, yRoot = (yStar + yNo) / 2;
  const sy = d3.scaleLinear().domain([-0.8, yNo + 0.8]).range([30, 600]);

  const svg = d3.select("#tree").attr("viewBox", `0 0 ${W} 620`);
  const gl = svg.append("g"), gn = svg.append("g");
  const link = (x0, y0, x1, y1) => { const xm = (x0 + x1) / 2; return `M${x0},${sy(y0)}C${xm},${sy(y0)} ${xm},${sy(y1)} ${x1},${sy(y1)}`; };

  const links = [], nodes = [];
  nodes.push({ depth: 0, x: X.root, y: yRoot, r: 9, fill: C.ink, title: "The Guide", sub: fmt(N), anchor: "end" });
  links.push({ depth: 1, d: link(X.root, yRoot, X.a, yStar), w: LW(NS), c: "#D9C79A" });
  links.push({ depth: 1, d: link(X.root, yRoot, X.a, yNo), w: LW(noStar), c: "#CFCBC2" });
  nodes.push({ depth: 1, x: X.a, y: yStar, r: 8, fill: C.ink, title: "Starred", sub: `${fmt(NS)}  (${pct(NS / N)})`, anchor: "end" });
  nodes.push({ depth: 1, x: X.a, y: yNo, r: 8, fill: C.ink, title: "No star", sub: `${fmt(noStar)}  (${pct(noStar / N)})`, anchor: "end" });
  nodes.push({ depth: 2, x: X.b, y: yNo, r: 7, fill: C.bib, title: "Bib Gourmand", sub: `${fmt(noStar)} restaurants · "good food at a fair price"` });
  links.push({ depth: 2, d: link(X.a, yNo, X.b, yNo), w: LW(noStar), c: "#CFCBC2" });
  levels.forEach(l => {
    links.push({ depth: 2, d: link(X.a, yStar, X.b, l.y), w: LW(l.n), c: "#D9C79A" });
    nodes.push({ depth: 2, x: X.b, y: l.y, r: 7, fill: STAR_COLOR[l.k], title: l.label, sub: `${fmt(l.n)} restaurants · ${l.mean}`, level: l.k });
    l.kids.forEach(k => {
      links.push({ depth: 3, d: link(X.b, l.y, X.c, k.y), w: LW(k.n), c: "#E6DCC1", level: l.k });
      nodes.push({ depth: 3, x: X.c, y: k.y, r: 4.5, fill: STAR_COLOR[l.k], title: nameOf(k.country), count: fmt(k.n), level: l.k, leaf: true });
    });
  });

  const lsel = gl.selectAll("path").data(links).join("path").attr("class", "tree-link")
    .attr("d", l => l.d).attr("stroke", l => l.c).attr("stroke-width", l => l.w)
    .each(function (l) { l.len = this.getTotalLength(); })
    .attr("stroke-dasharray", l => `${l.len} ${l.len}`).attr("stroke-dashoffset", l => l.len);

  const nsel = gn.selectAll("g").data(nodes).join("g")
    .attr("class", n => `tree-node${n.depth === 2 && n.level ? " clickable" : ""}`)
    .attr("transform", n => `translate(${n.x},${sy(n.y)})`).attr("opacity", 0);
  nsel.append("circle").attr("r", n => n.r).attr("fill", n => n.fill).attr("stroke", "#fff").attr("stroke-width", 1.5);
  nsel.filter(n => !n.leaf).append("text").attr("x", n => (n.anchor === "end" ? -14 : 14)).attr("y", -5)
    .attr("text-anchor", n => n.anchor || "start").attr("font-weight", 700).attr("font-size", 16).attr("fill", C.ink).text(n => n.title);
  nsel.filter(n => !n.leaf).append("text").attr("x", n => (n.anchor === "end" ? -14 : 14)).attr("y", 15)
    .attr("text-anchor", n => n.anchor || "start").attr("font-size", 13).attr("fill", C.ink2).text(n => n.sub);
  nsel.filter(n => n.leaf).append("text").attr("x", 12).attr("dy", "0.35em").attr("font-size", 14).attr("fill", C.ink).text(n => n.title);
  nsel.filter(n => n.leaf).append("text").attr("x", W - X.c - 5).attr("dy", "0.35em").attr("text-anchor", "end")
    .attr("font-size", 14).attr("fill", C.ink2).text(n => n.count);
  const head = svg.append("text").attr("x", X.c).attr("y", 16).attr("font-size", 11).attr("font-weight", 700)
    .attr("letter-spacing", "0.08em").attr("fill", C.muted).attr("opacity", 0).text("TOP 3 COUNTRIES (restaurants)");

  let step = -1;
  const collapsed = new Set();
  const visible = e => e.depth <= step && !(e.depth === 3 && collapsed.has(e.level));
  function update() {
    lsel.each(function (l) {
      const on = visible(l);
      if (on === !!l.on) return;
      l.on = on;
      d3.select(this).transition().duration((on ? 900 : 400) * DUR).delay(on ? 250 * DUR : 0)
        .attr("stroke-dashoffset", on ? 0 : l.len);
    });
    nsel.transition().duration(500 * DUR).delay(n => (visible(n) ? (n.depth ? 800 : 0) * DUR : 0))
      .attr("opacity", n => (visible(n) ? 1 : 0));
    nsel.filter(n => n.level && n.depth === 2).select("circle")
      .attr("stroke", n => (collapsed.has(n.level) ? n.fill : "#fff")).attr("stroke-width", n => (collapsed.has(n.level) ? 4 : 1.5));
    head.transition().duration(500 * DUR).attr("opacity", step >= 3 ? 1 : 0);
  }
  nsel.filter(n => n.level && n.depth === 2).on("click", (_, n) => {
    if (step < 3) return;
    collapsed.has(n.level) ? collapsed.delete(n.level) : collapsed.add(n.level);
    update();
  });
  scrolly("s2", i => { step = i; update(); });
}

// =====================================================================
// 3  CONSTELLATIONS: one cuisine at a time on one map
// =====================================================================
function drawConstellations(s, world) {
  const W = 960, H = 470;
  const land = topojson.feature(world, world.objects.countries);
  land.features = land.features.filter(f => f.id !== "010"); // drop Antarctica
  const proj = d3.geoEqualEarth().fitExtent([[6, 6], [W - 6, H - 6]], land);
  const path = d3.geoPath(proj);
  const svg = d3.select("#cons").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("path").attr("d", path(land)).attr("fill", "#18203F").attr("stroke", "#232B4E").attr("stroke-width", 0.5);
  const gLines = svg.append("g"), gPts = svg.append("g"), gLab = svg.append("g");

  s.forEach(r => { [r.x, r.y] = proj([r.lon, r.lat]) || [NaN, NaN]; });

  // Build one constellation per cuisine family
  const fams = {};
  Object.keys(HOME).forEach(fam => {
    const g = s.filter(r => r.family === fam && isFinite(r.x));
    const nodes = d3.rollups(g, v => ({ n: v.length, x: d3.mean(v, r => r.x), y: d3.mean(v, r => r.y), rows: v }), r => r.country)
      .map(([country, o]) => ({ country, ...o }));
    // Prim's minimum spanning tree on screen distance
    const edges = [], inTree = new Set([0]);
    while (nodes.length && inTree.size < nodes.length) {
      let best = null;
      inTree.forEach(i => nodes.forEach((b, j) => {
        if (inTree.has(j)) return;
        const dist = Math.hypot(nodes[i].x - b.x, nodes[i].y - b.y);
        if (!best || dist < best.dist) best = { i, j, dist };
      }));
      inTree.add(best.j); edges.push([nodes[best.i], nodes[best.j]]);
    }
    const abroad = g.filter(r => r.country !== HOME[fam]);
    const topAway = nodes.filter(n => n.country !== HOME[fam]).sort((a, b) => b.n - a.n)[0];
    fams[fam] = { g, nodes, edges, abroad: abroad.length };
    const home = nameOf(HOME[fam]);
    document.getElementById(`cs-${fam}`).innerHTML =
      `<b>${fmt(g.length)}</b> starred ${fam} restaurants in <b>${nodes.length}</b> countries. ` +
      `<b>${fmt(abroad.length)}</b> are outside ${home}` + (topAway ? `, led by ${nameOf(topAway.country)} (${topAway.n}).` : ".");
  });

  const size = n => Math.sqrt(10 + Math.min(n, 200) * 2.2) * 1.15;
  const chips = d3.select("#chips").selectAll("button").data(Object.keys(HOME)).join("button")
    .text(f => f).on("click", (_, f) => setCuisine(f));

  let current = null;
  function setCuisine(fam) {
    if (fam === current) return;
    current = fam;
    const F = fams[fam];
    chips.classed("on", f => f === fam);
    d3.select("#cons-title").text(fam);
    d3.select("#cons-sub").text(`${fmt(F.g.length)} starred restaurants in ${F.nodes.length} countries · ${fmt(F.abroad)} outside ${nameOf(HOME[fam])}`);
    const t = svg.transition().duration(700 * DUR);

    // constellation lines draw in after the points settle
    gLines.selectAll("line").data(F.edges, e => `${fam}${e[0].country}|${e[1].country}`).join(
      enter => enter.append("line").attr("stroke", C.gold).attr("stroke-width", 1.1).attr("stroke-opacity", 0.65)
        .attr("x1", e => e[0].x).attr("y1", e => e[0].y).attr("x2", e => e[0].x).attr("y2", e => e[0].y)
        .call(en => en.transition().delay((_, i) => (500 + i * 40) * DUR).duration(500 * DUR)
          .attr("x2", e => e[1].x).attr("y2", e => e[1].y)),
      update => update,
      exit => exit.transition().duration(300 * DUR).attr("stroke-opacity", 0).remove()
    );

    // points keyed by country so shared countries glide and resize
    gPts.selectAll("g.pt").data(F.nodes, n => n.country).join(
      enter => {
        const g = enter.append("g").attr("class", "pt").attr("transform", n => `translate(${n.x},${n.y})`).style("cursor", "pointer");
        g.append("circle").attr("class", "glow").attr("r", 0).attr("fill", "#FFF1C9").attr("opacity", 0.1);
        g.append("circle").attr("class", "core").attr("r", 0);
        return g;
      },
      update => update,
      exit => exit.call(ex => ex.selectAll("circle").transition().duration(400 * DUR).attr("r", 0)).transition().duration(400 * DUR).remove()
    ).call(g => {
      g.transition(t).attr("transform", n => `translate(${n.x},${n.y})`);
      g.select(".glow").transition(t).attr("r", n => size(n.n) * 2.3);
      g.select(".core").transition(t).attr("r", n => size(n.n)).attr("fill", n => (n.country === HOME[fam] ? "#FFF6D6" : C.gold));
    })
      .on("mousemove", (ev, n) => showTip(
        `<b>${nameOf(n.country)}</b> · ${n.n} ${fam} starred restaurant${n.n > 1 ? "s" : ""}<br><span class="tt-muted">Top:</span><br>${topList(n.rows)}`, ev))
      .on("mouseleave", hideTip);

    // label the 4 biggest points that don't crowd each other
    const placed = [];
    F.nodes.slice().sort((a, b) => b.n - a.n).forEach(n => {
      if (placed.length < 4 && placed.every(p => Math.hypot(p.x - n.x, p.y - n.y) > 70)) placed.push(n);
    });
    gLab.selectAll("text").data(placed, n => fam + n.country).join(
      enter => enter.append("text").attr("text-anchor", "middle").attr("font-size", 12.5).attr("fill", C.nink)
        .attr("paint-order", "stroke").attr("stroke", "#10162F").attr("stroke-width", 4).attr("opacity", 0)
        .attr("x", n => n.x).attr("y", n => n.y - size(n.n) - 6)
        .attr("font-weight", n => (n.country === HOME[fam] ? 700 : 400))
        .text(n => `${nameOf(n.country)} ${n.n}`)
        .call(en => en.transition().delay(700 * DUR).duration(400 * DUR).attr("opacity", 1)),
      update => update,
      exit => exit.transition().duration(200 * DUR).attr("opacity", 0).remove()
    );
  }

  setCuisine("Japanese");
  scrolly("s3", (_, el) => setCuisine(el.dataset.cuisine));
}

// =====================================================================
// 4  SANKEY: price group → award
// =====================================================================
function drawSankey(d, N) {
  const W = 1000, H = 560, top = 30, bot = 520, GAP = 18;
  const PR = [4, 3, 2, 1], AW = [3, 2, 1, 0];
  const PLAB = { 4: "$$$$", 3: "$$$", 2: "$$", 1: "$" };
  const ALAB = { 3: "★★★  3 stars", 2: "★★  2 stars", 1: "★  1 star", 0: "No star (Bib)" };
  const rows = d.filter(r => r.price >= 1 && r.price <= 4);
  const NT = rows.length;
  const ct = new Map(PR.map(p => [p, new Map(AW.map(a => [a, 0]))]));
  rows.forEach(r => ct.get(r.price).set(r.stars, ct.get(r.price).get(r.stars) + 1));
  const pTot = p => d3.sum(AW, a => ct.get(p).get(a)), aTot = a => d3.sum(PR, p => ct.get(p).get(a));
  const k = (bot - top - GAP * 3) / NT;
  const stack = (keys, tot) => { let y = top; return new Map(keys.map(key => { const h = tot(key) * k, o = { y0: y, y1: y + h }; y += h + GAP; return [key, o]; })); };
  const L = stack(PR, pTot), R = stack(AW, aTot);
  const XL0 = 150, XL1 = 172, XR0 = 778, XR1 = 800, XM = (XL1 + XR0) / 2;

  const lcur = new Map(PR.map(p => [p, L.get(p).y0])), rcur = new Map(AW.map(a => [a, R.get(a).y0]));
  const bands = [];
  PR.forEach(p => AW.forEach(a => {
    const v = ct.get(p).get(a); if (!v) return;
    const h = v * k, ya = lcur.get(p), yb = rcur.get(a);
    lcur.set(p, ya + h); rcur.set(a, yb + h);
    bands.push({ p, a, v, d: `M${XL1},${ya}C${XM},${ya} ${XM},${yb} ${XR0},${yb}L${XR0},${yb + h}C${XM},${yb + h} ${XM},${ya + h} ${XL1},${ya + h}Z` });
  }));

  const svg = d3.select("#sankey").attr("viewBox", `0 0 ${W} ${H}`);
  const defs = svg.append("defs");
  const clips = new Map(AW.map(a => [a, defs.append("clipPath").attr("id", `clip-aw${a}`).append("rect")
    .attr("x", XL1).attr("y", 0).attr("width", 0).attr("height", H)]));
  const bsel = svg.append("g").selectAll("path").data(bands).join("path").attr("class", "band")
    .attr("d", b => b.d).attr("fill", b => STAR_COLOR[b.a]).attr("clip-path", b => `url(#clip-aw${b.a})`).attr("opacity", 0.55)
    .on("mousemove", (ev, b) => showTip(
      `<b>${PLAB[b.p]} → ${ALAB[b.a].replace(/\s+/g, " ")}</b><br>${fmt(b.v)} restaurants<br><span class="tt-muted">${pct(b.v / pTot(b.p))} of ${PLAB[b.p]} restaurants · ${pct(b.v / aTot(b.a))} of ${ALAB[b.a].replace(/^[★\s]+/, "")}</span>`, ev))
    .on("mouseleave", hideTip);

  const g = svg.append("g");
  PR.forEach(p => {
    const n = L.get(p), yc = (n.y0 + n.y1) / 2;
    g.append("rect").attr("x", XL0).attr("y", n.y0).attr("width", XL1 - XL0).attr("height", n.y1 - n.y0).attr("fill", C.ink);
    g.append("text").attr("x", XL0 - 12).attr("y", yc - 2).attr("text-anchor", "end").attr("font-size", 20).attr("font-weight", 700).attr("fill", C.ink).text(PLAB[p]);
    g.append("text").attr("x", XL0 - 12).attr("y", yc + 17).attr("text-anchor", "end").attr("font-size", 13).attr("fill", C.ink2).text(fmt(pTot(p)));
  });
  // right labels pushed apart so the thin 3-star node doesn't collide
  let prev = -Infinity;
  const rlab = new Map();
  AW.forEach(a => { const n = R.get(a); const yc = Math.max((n.y0 + n.y1) / 2, prev + 44); rlab.set(a, yc); prev = yc; });
  const rg = g.selectAll("g.rn").data(AW).join("g").attr("class", "rn");
  rg.append("rect").attr("x", XR0).attr("y", a => R.get(a).y0).attr("width", XR1 - XR0)
    .attr("height", a => Math.max(2, R.get(a).y1 - R.get(a).y0)).attr("fill", a => (a ? STAR_COLOR[a] : C.muted));
  rg.append("path").attr("fill", "none").attr("stroke", C.muted)
    .attr("d", a => { const n = R.get(a), yc = (n.y0 + n.y1) / 2; return `M${XR1 + 2},${yc}L${XR1 + 14},${rlab.get(a)}`; })
    .attr("opacity", a => (Math.abs(rlab.get(a) - (R.get(a).y0 + R.get(a).y1) / 2) > 2 ? 1 : 0));
  rg.append("text").attr("x", XR1 + 18).attr("y", a => rlab.get(a) - 3).attr("font-size", 16).attr("font-weight", 700).attr("fill", C.ink).text(a => ALAB[a]);
  rg.append("text").attr("x", XR1 + 18).attr("y", a => rlab.get(a) + 15).attr("font-size", 13).attr("fill", C.ink2).text(a => `${fmt(aTot(a))} restaurants`);
  g.append("text").attr("x", XL0).attr("y", 14).attr("font-size", 11).attr("font-weight", 700).attr("letter-spacing", "0.08em").attr("fill", C.muted).text("PRICE");
  g.append("text").attr("x", XR0).attr("y", 14).attr("font-size", 11).attr("font-weight", 700).attr("letter-spacing", "0.08em").attr("fill", C.muted).text("AWARD");

  // step copy from the numbers
  const v = (p, a) => ct.get(p).get(a);
  const cheap = pTot(1) + pTot(2), cheapStar = d3.sum([1, 2], p => d3.sum([1, 2, 3], a => v(p, a)));
  const exp1 = v(3, 1) + v(4, 1);
  document.getElementById("sk3").innerHTML = `<b>${v(4, 3)}</b> of the <b>${aTot(3)}</b> three-star restaurants come from the $$$$ band. ${v(1, 3) + v(2, 3) === 0 ? "Not one is $ or $$." : ""}`;
  document.getElementById("sk2").innerHTML = `<b>${pct(v(4, 2) / aTot(2))}</b> of two-star restaurants are $$$$. Only <b>${v(1, 2) + v(2, 2)}</b> are $ or $$.`;
  document.getElementById("sk1").innerHTML = `Even at one star, <b>${pct(exp1 / aTot(1))}</b> of restaurants are $$$ or $$$$.`;
  document.getElementById("sk0").innerHTML = `Of <b>${fmt(cheap)}</b> cheap ($ or $$) restaurants, only <b>${cheapStar}</b> have any star. The cheap ones get a Bib Gourmand instead.`;

  scrolly("s4", step => {
    AW.forEach((a, i) => {
      const on = i < step;
      clips.get(a).transition().duration((on ? 1100 : 400) * DUR).ease(d3.easeCubicInOut).attr("width", on ? XR0 - XL1 : 0);
    });
    bsel.transition().duration(500 * DUR).attr("opacity", b => (AW.indexOf(b.a) === step - 1 ? 0.85 : 0.3));
    rg.transition().duration(500 * DUR).attr("opacity", (a, i) => (step === 0 || i < step ? 1 : 0.35));
  });
}

// =====================================================================
// 5  CIRCLE PACKING: regions → countries, area = stars
// =====================================================================
function drawPack(s, TOT) {
  const W = 1000, H = 640, D = 620;
  const byC = d3.rollups(s, v => ({ stars: d3.sum(v, r => r.stars), rows: v }), r => regionOf(r.country), r => r.country);
  const root = d3.hierarchy({ children: byC.map(([region, cs]) => ({ region, children: cs.map(([country, o]) => ({ country, region, ...o })) })) })
    .sum(n => n.stars || 0).sort((a, b) => b.value - a.value);
  d3.pack().size([D, D]).padding(n => (n.depth === 0 ? 14 : 2.5))(root);

  const regions = root.children, leaves = root.leaves();
  const reg = Object.fromEntries(regions.map(r => [r.data.region, r.value]));
  const eu = reg.Europe || 0, share = eu / TOT;
  if (Math.abs(share - 2 / 3) > 0.04) d3.select("#h5").html(`Europe holds ${pct(share)} of all Michelin stars.<br>Africa holds none.`);
  d3.select("#d5").text(`Each big circle is a part of the world, and each circle inside it is one country. Circle area shows how many of the ${fmt(TOT)} stars it holds.`);
  const euCountries = regions.find(r => r.data.region === "Europe").children.length;
  document.getElementById("pk0").innerHTML = `Europe's <b>${euCountries}</b> countries in the Guide hold <b>${fmt(eu)}</b> of the ${fmt(TOT)} stars (${pct(share)}).`;
  const others = ["Asia", "North America", "Latin America", "Oceania"].filter(r => reg[r]);
  document.getElementById("pk1").innerHTML = others.map(r => `${r} <b>${fmt(reg[r])}</b> (${reg[r] / TOT < 0.01 ? "<1%" : pct(reg[r] / TOT)})`).join(", ") + ".";
  const fr = leaves.find(l => l.data.country === "France").value;
  const nw = (reg["North America"] || 0) + (reg["Latin America"] || 0) + (reg.Oceania || 0);
  document.getElementById("pk2").innerHTML = `France alone (<b>${fmt(fr)}</b> stars) has ${fr > nw ? "more stars than" : "almost as many stars as"} all of North America, Latin America and Oceania together (<b>${fmt(nw)}</b>).`;

  const vmax = d3.max(leaves, l => l.value);
  const tcol = v => Math.sqrt(v / vmax);
  const col = v => d3.interpolateRgb("#F6E3A6", C.s3)(tcol(v));
  const ox = 20, oy = (H - D) / 2;
  const svg = d3.select("#pack").attr("viewBox", `0 0 ${W} ${H}`);
  const g = svg.append("g").attr("transform", `translate(${ox},${oy})`);

  const rsel = g.selectAll("circle.reg").data(regions).join("circle").attr("class", "reg")
    .attr("cx", n => n.x).attr("cy", n => n.y).attr("r", 0).attr("fill", "#F1ECE2").attr("stroke", "#D8D1C3").attr("stroke-width", 1.2);
  const csel = g.selectAll("g.cty").data(leaves).join("g").attr("class", "cty").attr("transform", n => `translate(${n.x},${n.y})`);
  csel.append("circle").attr("r", 0).attr("fill", n => col(n.value)).attr("stroke", "#fff").attr("stroke-width", 0.8);
  const lab = csel.filter(n => n.r > 22).append("g").attr("opacity", 0).attr("pointer-events", "none");
  lab.append("text").attr("text-anchor", "middle").attr("y", n => -n.r * 0.05).attr("font-weight", 700)
    .attr("font-size", n => Math.min(15, 6 + n.r * 0.22)).attr("fill", n => (tcol(n.value) > 0.45 ? "#fff" : C.ink)).text(n => nameOf(n.data.country));
  lab.append("text").attr("text-anchor", "middle").attr("y", n => n.r * 0.32)
    .attr("font-size", n => Math.min(13, 5.5 + n.r * 0.18)).attr("fill", n => (tcol(n.value) > 0.45 ? "#fff" : C.ink2)).text(n => fmt(n.value));
  csel.on("mousemove", (ev, n) => showTip(`<b>${nameOf(n.data.country)}</b> · ${fmt(n.value)} stars<br><span class="tt-muted">${n.data.region}</span><br>${topList(n.data.rows)}`, ev))
    .on("mouseleave", hideTip);

  // region labels: Europe under its circle, the others pushed out radially from the centre
  const rl = g.selectAll("g.rl").data(regions).join("g").attr("class", "rl").attr("opacity", 0).attr("pointer-events", "none");
  rl.each(function (n) {
    const el = d3.select(this), txt = `${n.data.region.toUpperCase()}`, sub = `${fmt(n.value)} stars (${n.value / TOT < 0.01 ? "<1%" : pct(n.value / TOT)})`;
    let x, y, anchor = "middle";
    if (n.data.region === "Europe") { x = n.x; y = n.y + n.r + 20; }
    else {
      const a = Math.atan2(n.y - D / 2, n.x - D / 2), ex = n.x + Math.cos(a) * n.r, ey = n.y + Math.sin(a) * n.r;
      x = n.x + Math.cos(a) * (n.r + 34); y = n.y + Math.sin(a) * (n.r + 34);
      anchor = Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
      el.append("line").attr("x1", ex).attr("y1", ey).attr("x2", x).attr("y2", y).attr("stroke", C.muted);
      x += anchor === "start" ? 4 : anchor === "end" ? -4 : 0;
    }
    el.append("text").attr("x", x).attr("y", y).attr("text-anchor", anchor).attr("font-size", 13).attr("font-weight", 700).attr("fill", C.ink).text(txt);
    el.append("text").attr("x", x).attr("y", y + 16).attr("text-anchor", anchor).attr("font-size", 12).attr("fill", C.ink2).text(sub);
  });

  // Africa: a ghost circle on the right
  const ax = 820, ay = 200;
  const ghost = svg.append("g").attr("opacity", 0);
  ghost.append("text").attr("x", ax).attr("y", ay - 108).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 700)
    .attr("letter-spacing", "0.08em").attr("fill", C.alert).text("AND AFRICA?");
  const ring = ghost.append("circle").attr("cx", ax).attr("cy", ay).attr("r", 80).attr("fill", "none").attr("stroke", C.alert)
    .attr("stroke-width", 2).attr("stroke-dasharray", "7 5");
  ghost.append("text").attr("x", ax).attr("y", ay + 4).attr("text-anchor", "middle").attr("font-family", "Crimson Text, serif")
    .attr("font-size", 38).attr("font-weight", 700).attr("fill", C.alert).text("0 stars");
  ghost.append("text").attr("x", ax).attr("y", ay + 30).attr("text-anchor", "middle").attr("font-size", 12.5).attr("fill", C.ink2).text("no African country is in the Guide");
  const key = svg.append("text").attr("x", 700).attr("y", 420).attr("font-size", 12.5).attr("fill", C.ink2).attr("opacity", 0);
  ["Darker circle = more stars.", "Small unlabelled circles are", "countries with few stars."].forEach((t, i) => key.append("tspan").attr("x", 700).attr("dy", i ? 18 : 0).text(t));

  scrolly("s5", step => {
    const showReg = n => step >= 1 || n.data.region === "Europe";
    rsel.transition().duration(800 * DUR).ease(d3.easeCubicOut).attr("r", n => (showReg(n) ? n.r : 0));
    csel.select("circle").transition().duration(700 * DUR).delay((n, i) => (showReg(n) ? 200 + i * 8 : 0) * DUR)
      .attr("r", n => (showReg(n) ? n.r * 0.97 : 0));
    csel.transition().duration(500 * DUR).attr("opacity", n => (step === 2 && n.data.country !== "France" ? 0.25 : 1));
    lab.transition().delay(600 * DUR).duration(400 * DUR).attr("opacity", n => (showReg(n) ? 1 : 0));
    rl.transition().delay(700 * DUR).duration(400 * DUR).attr("opacity", n => (showReg(n) ? (step === 2 ? 0.3 : 1) : 0));
    ghost.transition().duration(600 * DUR).attr("opacity", step >= 3 ? 1 : 0);
    ring.transition().duration(1200 * DUR).attr("r", step >= 3 ? 80 : 20);
    key.transition().duration(600 * DUR).attr("opacity", step >= 1 ? 1 : 0);
  });
}

// =====================================================================
// ENDING: reader vote (kept in this browser only)
// =====================================================================
function setupPoll() {
  const replies = {
    best: "Many people read it that way. But the Guide only covers some of the world, so a star means \"best of what was looked at\".",
    looked: "That's what the data shows: stars rank the cooking inside the Guide, and the Guide skips most of the world.",
    price: "The flow chart agrees: nearly every star goes to a $$$ or $$$$ table."
  };
  const btns = d3.selectAll(".poll button");
  const pick = v => { btns.classed("on", function () { return this.dataset.vote === v; }); d3.select("#poll-result").text(replies[v] || ""); };
  btns.on("click", function () { pick(this.dataset.vote); try { localStorage.setItem("michelin-vote", this.dataset.vote); } catch (e) {} });
  try { const v = localStorage.getItem("michelin-vote"); if (v) pick(v); } catch (e) {}
}
