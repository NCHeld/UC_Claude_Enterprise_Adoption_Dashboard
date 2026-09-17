#!/usr/bin/env node
/**
 * generate-narrative.js — Calls the Anthropic API to produce a trend narrative.
 * Skips silently if fewer than 2 history snapshots exist.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Anthropic } = require('@anthropic-ai/sdk');

const DATA_DIR = path.join(__dirname, '..', 'data');

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
}

async function main() {
  const history   = read('history.json');
  const metrics   = read('metrics.json');
  const pageViews = read('page_views.json');
  const today = new Date().toISOString().slice(0, 10);

  if (!history.snapshots || history.snapshots.length < 2) {
    console.log('[narrative] Fewer than 2 snapshots — skipping until tomorrow.');
    process.exit(0);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are writing an adoption trend summary for the University of Chicago IT Services department.
This summary will be reviewed by a human before publication on the Claude Enterprise adoption dashboard.

Context:
- The dashboard tracks PUBLIC projects and plugin/connector usage only — not total chat or private usage.
- September 15, 2026 was when student access opened broadly. Before: faculty/staff/admin only.
- The most meaningful demand signal is the ServiceNow KB page views.

Guidelines:
- Write 3-5 concise paragraphs. Start with a # heading including today's date (${today}).
- Use cautious non-causal language: "coincided with", "followed", "was observed", "may suggest".
- Do not fabricate numbers. Only describe what the data shows.
- Highlight page-view trends prominently.
- Professional tone suitable for university leadership. Format as clean Markdown.

DATA:
${JSON.stringify({ history, metrics, page_views: pageViews }, null, 2)}`;

  console.log('[narrative] Calling Anthropic API…');
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  });

  fs.writeFileSync(path.join(DATA_DIR, 'narrative.md'), message.content[0].text + '\n', 'utf8');
  console.log('[narrative] Written to data/narrative.md');
}

main().catch(err => { console.error('[narrative] Error:', err.message); process.exit(1); });
