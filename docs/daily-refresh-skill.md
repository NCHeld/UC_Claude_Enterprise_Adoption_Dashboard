# Daily Dashboard Refresh — Skill

This is the repeatable procedure for refreshing the UChicago Claude Enterprise Adoption dashboard by hand. It replaces the previous automated GitHub Actions pipeline (self-hosted runner + scripts), which has been removed. The refresh is now performed manually, on demand, by an assistant operating a browser in an authenticated Claude Enterprise session.

## How to run it

From any device, including your phone, open this project in Claude and say: "Run the daily dashboard refresh." Claude then works through the steps below in your logged-in browser session and commits the results to the main branch via the GitHub web UI. Because everything runs in your own authenticated session, no API key, self-hosted runner, or stored credentials are involved.

## Privacy rule (always applies)

Per-project and per-creator detail (project titles, descriptions, and creators) is kept private (UChicago-only) and must never be written to this public repo. Only aggregate project figures are published: the total number of public projects and a projects-by-category breakdown. Any project-level working notes stay in the chat or a private location, never in a committed file.

## Step 1 — Collect public project figures

In Claude Enterprise, go to Projects, then the Organization tab. Count the total number of projects and categorize each one so the per-category totals can be computed. Record only the aggregate result: the total count and the count per category. Do not record or commit individual project titles, descriptions, or creators.

## Step 2 — Collect connector / plugin usage

Go to Settings, then Plugins, then the Discover tab, and set Sort to "Most used". For each plugin capture the name, provider, description, category tags, and the displayed user count shown as "N users in your organization in the last 30 days". Plugins with no displayed count are recorded with a user count of 0.

## Step 3 — Collect ServiceNow page views

Open each of the three IT Services knowledge articles and record its view count: KB06004829 (Request Access to Claude Enterprise), KB06004835 (Download Claude Enterprise at UChicago), and KB06004851 (Access a Personal Claude Account Connected to a UChicago.edu Email Address).

## Step 4 — Update data/metrics.json

Regenerate metrics.json with aggregate figures only: total_projects, projects_by_category, the connector top/least-used and zero-adoption breakdowns, and the ServiceNow page views. Keep the existing "privacy" note. Never add total_creators or a projects_by_creator object.

## Step 5 — Append a history snapshot

Add one new object to the "snapshots" array in data/history.json with the current date and: project_count, connector_count, connectors_with_adoption, projects_by_category, connector_usage, and page_views. Only append — never edit or delete prior snapshots. Match the field shape of the most recent snapshot exactly.

## Step 6 — Optional trend narrative

Once at least two snapshots exist, Claude may write a short, cautious, non-causal narrative summarizing what changed since the previous snapshot (for example, movement in total projects or connector adoption). This is written by Claude directly at run time in the chat, and, if you approve, saved to data/narrative.md and committed. No external API or model call is used. Keep it factual and hedged: describe observed changes, avoid claiming causes, and note that day-to-day figures fluctuate.

## Step 7 — Commit

Commit each updated file directly to the main branch via the GitHub web UI with a clear message such as "Refresh datasets and append snapshot YYYY-MM-DD". GitHub Pages rebuilds automatically, so refreshing the published dashboard shows the new data and the history-based trend chart grows as snapshots accumulate.

## Data quality checklist

Categorize every public project so aggregate counts are accurate, keeping per-project and per-creator detail out of the repo. Deduplicate projects and connectors. Validate connector user counts against the Discover view. Confirm no per-project or per-creator detail is committed. Record unknown values as null and never fabricate data. Note any inaccessible projects or plugins in the chat.
