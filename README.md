# UChicago Claude Enterprise Adoption Dashboard

A GitHub-backed dashboard tracking adoption of Claude Enterprise across the University of Chicago: publicly shared organization projects (as aggregate figures), plugin/connector adoption, and historical growth trends. Designed to be hosted via GitHub Pages and embedded in a Google Site.

Per-project and per-creator detail (project titles, descriptions, and creators) is kept private (UChicago-only) and is not published in this public repo. Only aggregate project figures — the total number of public projects and a projects-by-category breakdown — are shared publicly.

## Repository structure

The data/ directory holds published datasets: connector/plugin data, computed aggregate metrics, and historical snapshots. The dashboard/ directory holds the static Chart.js dashboard (index.html, dashboard.js, styles.css). The docs/ directory holds documentation, including the daily refresh workflow.

## Data sources

Data is collected from the Claude Enterprise web interface: organization projects (Projects -> Organization) and plugin/connector adoption (Settings -> Plugins -> Discover, sorted by "Most used"). Project data is used to compute aggregate figures only; per-project and per-creator detail is retained privately (UChicago-only) and is not committed to this public repo.

## Hosting

Enable GitHub Pages (Settings -> Pages) on the main branch. The dashboard entry point is dashboard/index.html. Embed the published URL in a Google Site using an Embed / iframe block.

## Data notes and limitations

Plugin "user count" reflects "users in your organization in the last 30 days" as shown in the Plugins Discover view. Only plugins with a displayed count are treated as adopted; all others are recorded as zero adoption for the snapshot. For projects, only aggregate figures (total public projects and a projects-by-category breakdown) are published; per-project and per-creator detail is kept private. No fields are fabricated, and unknown values are recorded as null.

## Refresh

See docs/refresh-workflow.md for the repeatable daily refresh process.
