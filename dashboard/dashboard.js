// UChicago Claude Enterprise Adoption Dashboard
// Loads collected datasets and renders visualizations with Chart.js.

const DATA_BASE = "../data/";

async function loadJSON(name) {
    const res = await fetch(DATA_BASE + name, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load " + name + ": " + res.status);
    return res.json();
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
}

function kpi(label, value) {
    const box = el("div", "kpi");
    box.appendChild(el("div", "kpi-value", String(value)));
    box.appendChild(el("div", "kpi-label", label));
    return box;
}

const PALETTE = [
  "#800000", "#A4343A", "#DE7C00", "#EAAA00",
      "#789D4A", "#275D38", "#3EB1C8", "#59315F",
      "#5B6770", "#767676", "#D6636B", "#B05A7A"
  ];

function colors(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(PALETTE[i % PALETTE.length]);
    return out;
}

function buildLayout() {
    const app = document.getElementById("app");

  const header = el("header", "site-header");
    header.appendChild(el("h1", null, "UChicago Claude Enterprise Adoption Dashboard"));
    header.appendChild(el("p", "subtitle", "Public projects and plugin/connector adoption across the University of Chicago Claude Enterprise organization."));
    const snap = el("p", "snapshot", "Snapshot date: ");
    const snapSpan = el("span"); snapSpan.id = "snapshot-date"; snapSpan.textContent = "-";
    snap.appendChild(snapSpan);
    header.appendChild(snap);
    app.appendChild(header);

  const kpis = el("section", "kpis"); kpis.id = "kpis";
    app.appendChild(kpis);

  const grid = el("main", "grid");
    const cards = [
          ["Projects by Category", "chart-projects-category", "card"],
          ["Projects by Creator", "chart-projects-creator", "card"],
          ["Projects Updated Over Time", "chart-projects-time", "card wide"],
          ["Top Connectors (users, last 30 days)", "chart-top-connectors", "card"],
          ["Connector Distribution by Category", "chart-connector-distribution", "card"],
          ["Least Used Connectors (with adoption)", "chart-least-connectors", "card"],
          ["Zero Adoption Connectors", "zero-adoption", "card"]
        ];
    cards.forEach(function (c) {
          const card = el("section", c[2]);
          card.appendChild(el("h2", null, c[0]));
          if (c[1] === "zero-adoption") {
                  const div = el("div", "tag-list"); div.id = "zero-adoption";
                  card.appendChild(div);
          } else {
                  const canvas = document.createElement("canvas");
                  canvas.id = c[1];
                  card.appendChild(canvas);
          }
          grid.appendChild(card);
    });
    app.appendChild(grid);

  const footer = el("footer", "site-footer");
    footer.appendChild(el("p", null, "Data collected from the Claude Enterprise web interface (Projects and Plugins). Values are recorded as observed; unknown fields are null. See the repository README for methodology and limitations."));
    app.appendChild(footer);
}

function renderKPIs(metrics) {
    document.getElementById("snapshot-date").textContent = metrics.snapshot_date || "-";
    const kpis = document.getElementById("kpis");
    kpis.appendChild(kpi("Public Projects", metrics.total_projects));
    kpis.appendChild(kpi("Project Creators", metrics.total_creators));
    kpis.appendChild(kpi("Connectors Tracked", metrics.total_connectors));
    kpis.appendChild(kpi("Connectors With Adoption", metrics.connectors_with_adoption));
}

function barChart(id, labels, data, label, horizontal) {
    new Chart(document.getElementById(id), {
          type: "bar",
          data: {
                  labels: labels,
                  datasets: [{ label: label, data: data, backgroundColor: colors(labels.length) }]
          },
          options: {
                  indexAxis: horizontal ? "y" : "x",
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { x: { ticks: { autoSkip: false } }, y: { beginAtZero: true } }
          }
    });
}

function doughnutChart(id, labels, data) {
    new Chart(document.getElementById(id), {
          type: "doughnut",
          data: {
                  labels: labels,
                  datasets: [{ data: data, backgroundColor: colors(labels.length) }]
          },
          options: { responsive: true, plugins: { legend: { position: "right" } } }
    });
}

function lineChart(id, labels, data, label) {
    new Chart(document.getElementById(id), {
          type: "line",
          data: {
                  labels: labels,
                  datasets: [{ label: label, data: data, borderColor: "#800000", backgroundColor: "rgba(128,0,0,0.15)", fill: true, tension: 0.25 }]
          },
          options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
}

function countBy(items, key) {
    const map = {};
    items.forEach(function (it) {
          const k = it[key] || "Unknown";
          map[k] = (map[k] || 0) + 1;
    });
    return map;
}

function sortedEntries(map) {
    return Object.keys(map).map(function (k) { return [k, map[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; });
}

async function main() {
    buildLayout();
    try {
          const [metrics, projects, connectors] = await Promise.all([
                  loadJSON("metrics.json"),
                  loadJSON("projects.json"),
                  loadJSON("connectors.json")
                ]);

      renderKPIs(metrics);

      // Projects by category
      const catEntries = sortedEntries(metrics.projects_by_category);
          barChart("chart-projects-category", catEntries.map(function (e) { return e[0]; }), catEntries.map(function (e) { return e[1]; }), "Projects", true);

      // Projects by creator
      const creatorEntries = sortedEntries(metrics.projects_by_creator);
          barChart("chart-projects-creator", creatorEntries.map(function (e) { return e[0]; }), creatorEntries.map(function (e) { return e[1]; }), "Projects", true);

      // Projects updated over time (by date)
      const timeMap = countBy(projects.projects, "updated_date");
          const timeLabels = Object.keys(timeMap).filter(function (d) { return d && d !== "Unknown"; }).sort();
          const timeData = timeLabels.map(function (d) { return timeMap[d]; });
          lineChart("chart-projects-time", timeLabels, timeData, "Projects updated");

      // Top connectors
      const top = metrics.top_connectors || [];
          barChart("chart-top-connectors", top.map(function (c) { return c.name; }), top.map(function (c) { return c.user_count; }), "Users", true);

      // Connector distribution by category (adopted connectors only)
      const adopted = connectors.connectors.filter(function (c) { return c.user_count > 0; });
          const connCat = {};
          adopted.forEach(function (c) { connCat[c.category] = (connCat[c.category] || 0) + c.user_count; });
          const connCatEntries = sortedEntries(connCat);
          doughnutChart("chart-connector-distribution", connCatEntries.map(function (e) { return e[0]; }), connCatEntries.map(function (e) { return e[1]; }));

      // Least used connectors with adoption (bottom of adopted list)
      const least = (metrics.least_used_connectors || []).concat(top.slice().reverse().slice(0, 4));
          const leastMap = {};
          adopted.forEach(function (c) { leastMap[c.connector_name] = c.user_count; });
          const leastSorted = sortedEntries(leastMap).slice().reverse().slice(0, 5);
          barChart("chart-least-connectors", leastSorted.map(function (e) { return e[0]; }), leastSorted.map(function (e) { return e[1]; }), "Users", true);

      // Zero adoption connectors
      const zero = metrics.zero_adoption_connectors || [];
          const zeroBox = document.getElementById("zero-adoption");
          zero.forEach(function (name) { zeroBox.appendChild(el("span", "tag", name)); });
    } catch (err) {
          const app = document.getElementById("app");
          app.appendChild(el("p", "error", "Error loading data: " + err.message));
          console.error(err);
    }
}

document.addEventListener("DOMContentLoaded", main);
