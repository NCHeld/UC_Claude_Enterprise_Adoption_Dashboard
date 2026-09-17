# Daily Refresh Workflow

This document describes the repeatable process to refresh the dashboard datasets and publish updates. It is designed to be run once per day (or on demand).

## Overview

Each run collects the current state of organization projects and plugin/connector adoption from the Claude Enterprise web interface, updates the datasets, appends a historical snapshot, and pushes the changes so the GitHub Pages dashboard reflects the latest data.

## Step-by-step

1. Collect latest public projects.
2.    - In Claude Enterprise, go to Projects, then the Organization tab.
      -    - For every project, capture the title, full description (open the project if the card is truncated), creator name, and the relative updated timestamp.
           -    - Categorize each project, extract 3-5 keywords, and write a one-sentence summary.
            
                - 2. Collect latest connector/plugin usage.
                  3.    - Go to Settings, then Plugins, then the Discover tab.
                        -    - Set Sort to "Most used".
                             -    - For every plugin, capture the name, provider, description, category tags, and the displayed user count ("N users in your organization in the last 30 days"). Plugins with no displayed count are recorded with user_count 0.
                              
                                  - 3. Update datasets.
                                    4.    - Overwrite data/projects.json and data/projects.csv with the current projects.
                                          -    - Overwrite data/connectors.json and data/connectors.csv with the current plugins.
                                               -    - Regenerate data/metrics.json (totals, category and creator breakdowns, top/least-used, zero-adoption).
                                                
                                                    - 4. Append a historical snapshot.
                                                      5.    - Add a new object to the "snapshots" array in data/history.json with the current date, project_count, connector_count, projects_by_category, and connector_usage.
                                                            -    - Never overwrite or remove prior snapshots; only append.
                                                             
                                                                 - 5. Commit changes.
                                                                   6.    - Commit each updated file with a clear message, for example: "Refresh datasets and append snapshot YYYY-MM-DD".
                                                                     
                                                                         - 6. Push changes.
                                                                           7.    - Push to the main branch (committing via the GitHub web UI pushes directly to main).
                                                                             
                                                                                 - 7. Refresh dashboard content.
                                                                                   8.    - GitHub Pages rebuilds automatically after the push.
                                                                                         -    - The dashboard fetches the JSON files at load time, so a browser refresh of the published page shows the new data. History-based trend charts will grow as snapshots accumulate.
                                                                                          
                                                                                              - ## Data quality checklist
                                                                                          
                                                                                              - - Visit every public project and capture complete descriptions.
                                                                                                - - Deduplicate projects and connectors.
                                                                                                  - - Validate creator names and initials (first + last initial).
                                                                                                    - - Validate connector user counts against the Discover view.
                                                                                                      - - Record unknown values as null; never fabricate data.
                                                                                                        - - Log any inaccessible projects or plugins in the run notes.
                                                                                                         
                                                                                                          - ## Hosting and embedding
                                                                                                         
                                                                                                          - - Enable GitHub Pages under Settings, then Pages, serving from the main branch (root).
                                                                                                            - - The dashboard entry point is dashboard/index.html.
                                                                                                              - - Embed the published dashboard URL in a Google Site using an Embed block (iframe) pointing at the Pages URL.
                                                                                                                - 
