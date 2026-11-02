// ---------- Home page: the Michelin star as a constellation ----------

const sky = d3.select("#constellation");

// Points around the center (250, 250): 6 petal tips, 6 valleys between them, 6 inner points
function point(i, offset, radius) {
  const angle = -Math.PI / 2 + offset + (i * Math.PI) / 3;
  return [250 + radius * Math.cos(angle), 250 + radius * Math.sin(angle)];
}

const tips = d3.range(6).map(i => point(i, 0, 200));
const valleys = d3.range(6).map(i => point(i, Math.PI / 6, 112));
const inner = d3.range(6).map(i => point(i, 0, 40));

const lines = [];
for (let i = 0; i < 6; i++) {
  const next = (i + 1) % 6;
  lines.push([tips[i], valleys[i]], [valleys[i], tips[next]], [inner[i], inner[next]], [valleys[i], inner[next]]);
}

sky.selectAll("line")
  .data(lines)
  .join("line")
  .attr("x1", d => d[0][0]).attr("y1", d => d[0][1])
  .attr("x2", d => d[1][0]).attr("y2", d => d[1][1])
  .attr("stroke", "#f3e3b5")
  .attr("stroke-opacity", 0.5);

sky.selectAll("circle")
  .data([...tips, ...valleys, ...inner])
  .join("circle")
  .attr("cx", d => d[0])
  .attr("cy", d => d[1])
  .attr("r", (_, i) => (i < 6 ? 5 : 3))
  .attr("fill", "#f3e3b5");

// ---------- Chapter 1: world map ----------

const map = d3.select("#map");
const popup = d3.select("#popup");
const projection = d3.geoNaturalEarth1().fitSize([960, 500], { type: "Sphere" });
const path = d3.geoPath(projection);
const colors = { 1: "#f3e3b5", 2: "#f6c560", 3: "#ff8a4c" };

// The three Kaggle files, one per star rating
const files = {
  1: "dataset/one-star-michelin-restaurants.csv",
  2: "dataset/two-stars-michelin-restaurants.csv",
  3: "dataset/three-stars-michelin-restaurants.csv"
};

Promise.all([
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
  ...[1, 2, 3].map(stars => d3.csv(files[stars], d => ({ ...d3.autoType(d), stars })))
]).then(([world, ...byStars]) => {
  const restaurants = byStars.flat();
  d3.select("#total").text(restaurants.length);

  map.append("path")
    .attr("d", path({ type: "Sphere" }))
    .attr("fill", "#0b1128");

  map.append("path")
    .attr("d", path(topojson.feature(world, world.objects.countries)))
    .attr("fill", "#1b2550")
    .attr("stroke", "#2f3b70");

  // Draw 3-star restaurants last so they sit on top
  restaurants.sort((a, b) => a.stars - b.stars);
  restaurants.forEach(d => ([d.x, d.y] = projection([d.longitude, d.latitude])));

  map.selectAll("circle")
    .data(restaurants)
    .join("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => d.stars + 1)
    .attr("fill", d => colors[d.stars]);

  // Clicking near a dot shows the closest restaurant
  const delaunay = d3.Delaunay.from(restaurants, d => d.x, d => d.y);

  map.on("click", event => {
    const [x, y] = d3.pointer(event);
    const d = restaurants[delaunay.find(x, y)];
    if (Math.hypot(d.x - x, d.y - y) > 15) {
      popup.attr("hidden", true);
      return;
    }

    popup.html(`
      <p class="gold">${"★".repeat(d.stars)}</p>
      <h3>${d.name}</h3>
      <p>${d.city}, ${d.region}</p>
      <p>Cuisine: ${d.cuisine}</p>
      <p>Price: ${d.price}</p>
      <p><a href="${d.url}" target="_blank">Michelin Guide page</a></p>
    `);

    // Place the popup next to the click, flipping left near the right edge
    const left = event.offsetX > map.node().clientWidth - 290 ? event.offsetX - 280 : event.offsetX + 12;
    popup.style("left", left + "px").style("top", event.offsetY + "px").attr("hidden", null);
  });
});
