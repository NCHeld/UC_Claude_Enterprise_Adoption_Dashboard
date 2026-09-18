/ UChicago Claude Enterprise Adoption Dashboard
// Loads collected datasets and renders visualizations with Chart.js.

const DATA_BASE = "../data/";

// Date when Claude Enterprise access opened to students at large.
const STUDENT_ACCESS_DATE = "2026-09-15";
// Earliest date shown on the projects timeline (initial faculty/admin offering).
const TIMELINE_START = "2026-06-01";

async function loadJSON(name) {
          const res = await fetch(DATA_BASE + name, { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to load " + name + ": " + res.status);
          return res.json();
}

async function loadJSONOptional(name) {
          try { return await loadJSON(name); } catch (e) { return null; }
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

// Draws a dashed vertical marker at a given category label on the x-axis.
function verticalMarkerPlugin(labelValue, text) {
          return {
                    id: "verticalMarker",
                    afterDraw: function (chart) {
                              const labels = chart.data.labels || [];
                              const idx = labels.indexOf(labelValue);
                              if (idx < 0) return;
                              const x = chart.scales.x.getPixelForValue(idx);
                              const top = chart.chartArea.top;
                              const bottom = chart.chartArea.bottom;
                              const ctx = chart.ctx;
                              ctx.save();
                              ctx.beginPath();
                              ctx.setLineDash([6, 4]);
                              ctx.lineWidth = 2;
                              ctx.strokeStyle = "#767676";
                              ctx.moveTo(x, top);
                              ctx.lineTo(x, bottom);
                              ctx.stroke();
                              ctx.setLineDash([]);
                              ctx.fillStyle = "#5c0000";
                              ctx.font = "11px -apple-system, Segoe UI, Roboto, sans-serif";
                              ctx.textAlign = x > chart.width / 2 ? "right" : "left";
                              const tx = x > chart.width / 2 ? x - 6 : x + 6;
                              ctx.fillText(text, tx, top + 12);
                              ctx.restore();
                    }
          };
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
                              scales: {
                                        x: { ticks: { autoSkip: false, precision: 0 }, beginAtZero: true },
                                        y: { beginAtZero: true, ticks: { precision: 0 } }
                              }
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

function lineChart(id, labels, data, label, plugins) {
          new Chart(document.getElementById(id), {
                    type: "line",
                    data: {
                              labels: labels,
                              datasets: [{ label: label, data: data, borderColor: "#800000", backgroundColor: "rgba(128,0,0,0.15)", fill: true, tension: 0.25, pointRadius: 2 }]
                    },
                    options: {
                              responsive: true,
                              plugins: { legend: { display: false } },
                              scales: {
                                        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
                                        y: { beginAtZero: true, ticks: { precision: 0 } }
                              }
                    },
                    plugins: plugins || []
          });
}

// Multi-series line chart: one line per series over a shared date axis.
function multiLineChart(id, labels, datasets) {
          new Chart(document.getElementById(id), {
                    type: "line",
                    data: { labels: labels, datasets: datasets },
                    options: {
                              responsive: true,
                              interaction: { mode: "index", intersect: false },
                              plugins: { legend: { position: "bottom" } },
                              scales: {
                                        x: { ticks: { autoSkip: true, maxTicksLimit: 12 } },
                                        y: { beginAtZero: true, ticks: { precision: 0 } }
                              }
                    }
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

function isoDate(d) {
          return d.toISOString().slice(0, 10);
}

// Builds a continuous list of daily dates from start to end (inclusive).
function dateRange(start, end) {
          const out = [];
          const d = new Date(start + "T00:00:00Z");
          const last = new Date(end + "T00:00:00Z");
          while (d <= last) { out.push(isoDate(d)); d.setUTCDate(d.getUTCDate() + 1); }
          return out;
}

async function main() {
          buildLayout();
          try {
                    const [metrics, connectors, pageViews, history] = await Promise.all([
                              loadJSON("metrics.json"),
                              loadJSON("connectors.json"),
                              loadJSONOptional("page_views.json"),
                              loadJSONOptional("history.json")
                              ]);

          renderKPIs(metrics);

          const catEntries = sortedEntries(metrics.projects_by_category);
                    barChart("chart-projects-category", catEntries.map(function (e) { return e[0]; }), catEntries.map(function (e) { return e[1]; }), "Projects", true);

          const timeSnaps = (history && history.snapshots ? history.snapshots.slice() : []).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
                    const timeLabels = timeSnaps.map(function (s) { return s.date; });
                    const timeData = timeSnaps.map(function (s) { return s.project_count != null ? s.project_count : null; });
                    lineChart("chart-projects-time", timeLabels, timeData, "Public projects", [verticalMarkerPlugin(STUDENT_ACCESS_DATE, "Students at large (Sep 15)")]);

          const top = metrics.top_connectors;
                    barChart("chart-top-connectors", top.map(function (c) { return c.name; }), top.map(function (c) { return c.user_count; }), "Users", true);

          const adopted = connectors.connectors.filter(function (c) { return c.user_count; });
                    const connCat = {};
                    adopted.forEach(function (c) { connCat[c.category] = (connCat[c.category] || 0) + c.user_count; });
                    const connCatEntries = sortedEntries(connCat);
                    doughnutChart("chart-connector-distribution", connCatEntries.map(function (e) { return e[0]; }), connCatEntries.map(function (e) { return e[1]; }));

          const leastMap = {};
                    adopted.forEach(function (c) { leastMap[c.connector_name] = c.user_count; });
                    const leastSorted = sortedEntries(leastMap).slice().reverse().slice(0, 6);
                    barChart("chart-least-connectors", leastSorted.map(function (e) { return e[0]; }), leastSorted.map(function (e) { return e[1]; }), "Users", true);

          const zero = metrics.zero_adoption_connectors;
                    const zeroBox = document.getElementById("zero-adoption");
                    zero.forEach(function (name) { zeroBox.appendChild(el("span", "tag", name)); });

          renderConnectorTrend(history);
                    renderPageViews(pageViews);
          } catch (err) {
                    const app = document.getElementById("app");
                    app.appendChild(el("p", "error", "Error loading data: " + err.message));
                    console.error(err);
          }
}

// Time-series of the total connectors tracked and connectors with adoption,
// read from the append-only history.json snapshots.
function renderConnectorTrend(history) {
          const card = document.getElementById("connector-trend-card");
          if (!history || !history.snapshots || !history.snapshots.length) { if (card) card.style.display = "none"; return; }
          const snaps = history.snapshots.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
          const labels = snaps.map(function (s) { return s.date; });
          const totalData = snaps.map(function (s) { return s.connector_count != null ? s.connector_count : null; });
          const adoptedData = snaps.map(function (s) { return s.connectors_with_adoption != null ? s.connectors_with_adoption : null; });
          const datasets = [
                    { label: "Connectors tracked", data: totalData, borderColor: PALETTE[0], backgroundColor: PALETTE[0], fill: false, tension: 0.25, pointRadius: 3, spanGaps: true },
                    { label: "Connectors with adoption", data: adoptedData, borderColor: PALETTE[4], backgroundColor: PALETTE[4], fill: false, tension: 0.25, pointRadius: 3, spanGaps: true }
                    ];
          multiLineChart("chart-connector-trend", labels, datasets);
}

function renderPageViews(pageViews) {
          const card = document.getElementById("page-views-card");
          if (!pageViews || !pageViews.articles || !pageViews.articles.length) { if (card) card.style.display = "none"; return; }
          const articles = pageViews.articles;

const dateSet = {};
          articles.forEach(function (a) {
                    (a.history || []).forEach(function (h) { dateSet[h.date] = true; });
          });
          const labels = Object.keys(dateSet).sort();

const palette = colors(articles.length);
          const datasets = articles.map(function (a, i) {
                    const byDate = {};
                    (a.history || []).forEach(function (h) { byDate[h.date] = h.views; });
                    const data = labels.map(function (d) { return d in byDate ? byDate[d] : null; });
                    return {
                              label: a.article_number,
                              data: data,
                              borderColor: palette[i],
                              backgroundColor: palette[i],
                              fill: false,
                              tension: 0.25,
                              pointRadius: 3,
                              spanGaps: true
                    };
          });

multiLineChart("chart-page-views", labels, datasets);

const list = document.getElementById("page-views-legend");
          articles.forEach(function (a) {
                    const h = a.history || [];
                    const v = h.length ? h[h.length - 1].views : 0;
                    list.appendChild(el("li", null, a.article_number + " \u2014 " + a.title + ": " + v.toLocaleString() + " views (latest)"));
          });
}

function renderKPIs(metrics) {
          document.getElementById("snapshot-date").textContent = metrics.snapshot_date || "-";
          const kpis = document.getElementById("kpis");
          kpis.appendChild(kpi("Public Projects", metrics.total_projects));
          kpis.appendChild(kpi("Connectors Tracked", metrics.total_connectors));
          kpis.appendChild(kpi("Connectors With Adoption", metrics.connectors_with_adoption));
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
                    ["Public Projects Over Time", "chart-projects-time", "card wide"],
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

const ct = el("section", "card wide"); ct.id = "connector-trend-card";
          ct.appendChild(el("h2", null, "Connectors Tracked Over Time"));
          ct.appendChild(el("p", "card-note", "Total connectors/plugins tracked and the number showing measurable adoption, per snapshot date. Grows as new snapshots are appended."));
          const ctCanvas = document.createElement("canvas"); ctCanvas.id = "chart-connector-trend";
          ct.appendChild(ctCanvas);
          grid.appendChild(ct);

const pv = el("section", "card wide"); pv.id = "page-views-card";
          pv.appendChild(el("h2", null, "ServiceNow KB Page Views Over Time"));
          pv.appendChild(el("p", "card-note", "Cumulative lifetime views per knowledge-base article, tracked from each snapshot date. Growth is the difference between points."));
          const pvCanvas = document.createElement("canvas"); pvCanvas.id = "chart-page-views";
          pv.appendChild(pvCanvas);
          const pvList = el("ul", "pv-legend"); pvList.id = "page-views-legend";
          pv.appendChild(pvList);
          grid.appendChild(pv);

app.appendChild(grid);

const footer = el("footer", "site-footer");
          footer.appendChild(el("p", null, "Data collected from the Claude Enterprise web interface (Projects and Plugins) and the UChicago ServiceNow knowledge base (page views). Per-project and per-creator detail is kept private (UChicago-only); only aggregate project figures are published. Values are recorded as observed; unknown fields are null."));
          app.appendChild(footer);
}

document.addEventListener("DOMContentLoaded", main);
