#!/usr/bin/env node
/**
 * snapshot.js — Appends a new entry to data/history.json.
 * Never removes or overwrites prior snapshots.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function main() {
  const metrics   = read('metrics.json');
  const pageViews = read('page_views.json');
  const history   = read('history.json');
  const date = new Date().toISOString().slice(0, 10);

  if (history.snapshots.find(s => s.date === date)) {
    console.log(`[snapshot] Snapshot for ${date} already exists — skipping.`);
    return;
  }

  const connectorUsage = {};
  for (const c of [...(metrics.top_connectors || []), ...(metrics.least_used_connectors || [])]) {
    connectorUsage[c.name] = c.user_count;
  }

  const pvMap = {};
  for (const article of pageViews.articles || []) {
    const latest = (article.history || []).slice().sort((a, b) => a.date < b.date ? 1 : -1)[0];
    if (latest) pvMap[article.article_number] = latest.views;
  }

  history.snapshots.push({ date, project_count: metrics.total_projects, connector_count: metrics.total_connectors, connectors_with_adoption: metrics.connectors_with_adoption, projects_by_category: metrics.projects_by_category, connector_usage: connectorUsage, page_views: pvMap });

  fs.writeFileSync(path.join(DATA_DIR, 'history.json'), JSON.stringify(history, null, 2) + '\n', 'utf8');
  console.log(`[snapshot] Appended snapshot for ${date} (total snapshots: ${history.snapshots.length})`);
}

main();
