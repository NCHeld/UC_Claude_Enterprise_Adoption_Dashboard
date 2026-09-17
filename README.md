# UChicago Claude Enterprise Adoption Dashboard

A GitHub-backed dashboard tracking adoption of Claude Enterprise across the University of Chicago: publicly shared organization projects, plugin/connector adoption, and historical growth trends. Designed to be hosted via GitHub Pages and embedded in a Google Site.

## Repository structure

- `data/` collected datasets (projects, connectors/plugins), computed metrics, and historical snapshots
- - `dashboard/` static Chart.js dashboard (index.html, dashboard.js, styles.css)
  - - `docs/` documentation, including the daily refresh workflow
   
    - ## Data sources
   
    - Data is collected from the Claude Enterprise web interface:
   
    - - Organization projects: Projects -> Organization
      - - Plugin/connector adoption: Settings -> Plugins -> Discover (sorted by "Most used")
       
        - ## Hosting
       
        - Enable GitHub Pages (Settings -> Pages) on the `main` branch. The dashboard entry point is `dashboard/index.html`. Embed the published URL in a Google Site using an Embed / iframe block.
       
        - ## Data notes and limitations
       
        - - Plugin "user count" reflects "users in your organization in the last 30 days" as shown in the Plugins Discover view. Only plugins with a displayed count are treated as adopted; all others are recorded as zero adoption for the snapshot.
          - - Project "created date" is not exposed by the interface; only a relative "updated" timestamp is available and is captured as `updated_date`.
            - - No fields are fabricated. Unknown values are recorded as null.
             
              - ## Refresh
             
              - See `docs/refresh-workflow.md` for the repeatable daily refresh process.
              - 
