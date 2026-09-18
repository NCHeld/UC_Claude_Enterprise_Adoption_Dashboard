# Daily Refresh Workflow

This document describes the repeatable process to refresh the dashboard datasets and publish updates. It is designed to be run once per day (or on demand).

## Overview

Each run collects the current state of organization projects and plugin/connector adoption from the Claude Enterprise web interface, updates the datasets, appends a historical snapshot, and pushes the changes so the GitHub Pages dashboard reflects the latest data.

Per-project and per-creator detail (project titles, descriptions, and creators) is kept private (UChicago-only) and is never published to this public repo. Only aggregate project figures — the total number of public projects and a projects-by-category breakdown — are shared publicly.

## Step-by-step

Collect the latest public projects as a private working step. In Claude Enterprise, go to Projects, then the Organization tab. For every project, capture the details needed to categorize it, and keep any per-project and per-creator detail in your private working copy (outside this public repo, e.g. under a gitignored private/ path) rather than committing it. Categorize each project so the aggregate category counts can be computed.

Collect the latest connector/plugin usage. Go to Settings, then Plugins, then the Discover tab, and set Sort to "Most used". For every plugin, capture the name, provider, description, category tags, and the displayed user count ("N users in your organization in the last 30 days"). Plugins with no displayed count are recorded with user_count 0.

Update the datasets. Do NOT publish per-project files (data/projects.json / data/projects.csv) to this public repo; keep any project-level working data private. Overwrite data/connectors.json and data/connectors.csv with the current plugins. Regenerate data/metrics.json with aggregate figures only (total public projects, projects-by-category, connector top/least-used, and zero-adoption). Do not include per-creator breakdowns or creator counts.

Append a historical snapshot. Add a new object to the "snapshots" array in data/history.json with the current date, project_count, connector_count, projects_by_category, and connector_usage. Never overwrite or remove prior snapshots; only append.

Commit the changes. Commit each updated file with a clear message, for example: "Refresh datasets and append snapshot YYYY-MM-DD".

Push the changes to the main branch (committing via the GitHub web UI pushes directly to main).

Refresh the dashboard content. GitHub Pages rebuilds automatically after the push. The dashboard fetches the JSON files at load time, so a browser refresh of the published page shows the new data. History-based trend charts will grow as snapshots accumulate.

## Data quality checklist

Categorize every public project so the aggregate counts are accurate, keeping per-project and per-creator detail in your private working copy only. Deduplicate projects and connectors. Validate connector user counts against the Discover view. Confirm no per-project or per-creator detail (titles, descriptions, creators) is committed to this public repo. Record unknown values as null and never fabricate data. Log any inaccessible projects or plugins in the run notes.

## Hosting and embedding

Enable GitHub Pages under Settings, then Pages, serving from the main branch (root). The dashboard entry point is dashboard/index.html. Embed the published dashboard URL in a Google Site using an Embed block (iframe) pointing at the Pages URL.
