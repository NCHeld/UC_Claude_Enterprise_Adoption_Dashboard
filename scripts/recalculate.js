#!/usr/bin/env node
/**
 * recalculate.js — Deterministically rebuilds data/metrics.json from
 * data/projects.json and data/connectors.json.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function countBy(items, key) {
  const map = {};
  for (const item of items) { const k = item[key] || 'Unknown'; map[k] = (map[k] || 0) + 1; }
  return map;
}

function main() {
  const { projects }   = read('projects.json');
  const { connectors } = read('connectors.json');

  // Handle both field names: original data uses 'creator_code', collect.js uses 'creator'.
  const creatorField = projects[0]?.creator_code !== undefined ? 'creator_code' : 'creator';

  const projectsByCategory = countBy(projects, 'category');
  const projectsByCreator  = countBy(projects, creatorField);

  const adopted      = connectors.filter(c => c.user_count > 0);
  const zeroAdoption = connectors.filter(c => !c.user_count).map(c => c.connector_name);
  const sorted = [...adopted].sort((a, b) => b.user_count - a.user_count);
  const topN   = Math.min(10, sorted.length);
  const topConnectors = sorted.slice(0, topN).map((c, i) => ({ name: c.connector_name, user_count: c.user_count, rank: i + 1 }));
  const leastUsed    = sorted.length > topN ? sorted.slice(topN).map((c, i) => ({ name: c.connector_name, user_count: c.user_count, rank: topN + i + 1 })) : [];

  const existingMetrics = fs.existsSync(path.join(DATA_DIR, 'metrics.json')) ? read('metrics.json') : {};

  const metrics = {
    snapshot_date: new Date().toISOString().slice(0, 10),
    total_projects: projects.length,
    total_creators: new Set(projects.map(p => p[creatorField]).filter(Boolean)).size,
    projects_by_category: projectsByCategory,
    projects_by_creator:  projectsByCreator,
    total_connectors: connectors.length,
    connectors_with_adoption: adopted.length,
    top_connectors: topConnectors,
    least_used_connectors: leastUsed,
    zero_adoption_connectors: zeroAdoption,
    notes: existingMetrics.notes || {},
  };

  fs.writeFileSync(path.join(DATA_DIR, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n', 'utf8');
  console.log(`[recalculate] metrics.json written (${projects.length} projects, ${connectors.length} connectors, ${adopted.length} with adoption)`);
}

main();
