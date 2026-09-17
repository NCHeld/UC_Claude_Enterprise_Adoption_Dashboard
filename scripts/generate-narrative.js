#!/usr/bin/env node
/**
 * generate-narrative.js — Calls the Anthropic API to produce a trend narrative
 * from the current dashboard data, writing output to data/narrative.md.
 *
 * Requires ANTHROPIC_API_KEY in the environment (set as a GitHub repo secret
 * and passed to the runner via the workflow env block).
 *
 * Skips silently if fewer than 2 history snapshots exist — there is nothing to
 * trend until a second data point is available.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const DATA_DIR = path.join(__dirname, '..', 'data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const history  = read('history.json');
  const metrics  = read('metrics.json');
  const pageViews = read('page_views.json');

  if (!history.snapshots || history.snapshots.length < 2) {
    console.log('[narrative] Fewer than 2 snapshots — skipping narrative generation until tomorrow.');
    process.exit(0);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are writing an adoption trend summary for the University of Chicago IT Services department.
This summary will be reviewed by a human before publication on the Claude Enterprise adoption dashboard.

Context:
- The dashboard tracks PUBLIC projects and plugin/connector usage across the UChicago Claude Enterprise organization.
  It does NOT capture total chat or private usage — public projects represent a visible subset.
- September 15, 2026 was when student access opened broadly. Before that, Claude Enterprise was available
  to faculty, staff, and select administrators only.
- The most meaningful demand signal may be the ServiceNow knowledge-base page views, which reflect
  how many people have sought out how to get access or download the tool.

Guidelines:
- Write 3–5 concise paragraphs. Start with a # heading that includes today's date (${today()}).
- Use cautious, non-causal language throughout: "coincided with", "followed", "was observed",
  "appears to reflect", "may suggest". Do not assert causation.
- Do not fabricate numbers or trends. Only describe what the data shows.
- Note clearly that project and connector counts reflect organizational/public visibility only.
- Highlight the page-view data prominently — it is the strongest indicator of demand.
- Keep the tone professional and factual, suitable for university leadership.
- Format as clean Markdown.

DATA:
${JSON.stringify({ history, metrics, page_views: pageViews }, null, 2)}`;

  console.log('[narrative] Calling Anthropic API…');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  const narrative = message.content[0].text;
  const dest = path.join(DATA_DIR, 'narrative.md');
  fs.writeFileSync(dest, narrative + '\n', 'utf8');
  console.log(`[narrative] Written to ${dest}`);
}

main().catch(err => {
  console.error('[narrative] Error:', err.message);
  process.exit(1);
});
