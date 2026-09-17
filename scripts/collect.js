#!/usr/bin/env node
/**
 * collect.js — Playwright data-collection script for the UChicago Claude Enterprise dashboard.
 *
 * Connects to an already-running Chrome session via the Chrome DevTools Protocol (CDP)
 * so no credentials are stored anywhere; Chrome is assumed to be logged in already.
 *
 * Chrome must be started with:
 *   open -a "Google Chrome" --args --remote-debugging-port=9222
 * or via a launchd plist on the headless Mac (see docs/runner-setup.md).
 *
 * Environment variables (set in workflow or .env):
 *   CDP_URL               — Chrome DevTools endpoint, default http://localhost:9222
 *   CLAUDE_ENTERPRISE_URL — Base URL of your Claude Enterprise instance, default https://claude.ai
 *   SERVICENOW_BASE_URL   — ServiceNow portal base URL, default https://uchicago.service-now.com
 */

'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CDP_URL = process.env.CDP_URL || 'http://localhost:9222';
const CLAUDE_URL = (process.env.CLAUDE_ENTERPRISE_URL || 'https://claude.ai').replace(/\/$/, '');
const SN_BASE = (process.env.SERVICENOW_BASE_URL || 'https://uchicago.service-now.com').replace(/\/$/, '');
const DATA_DIR = path.join(__dirname, '..', 'data');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today() {
  // Use local timezone (runner sets TZ=America/Chicago)
  return new Date().toISOString().slice(0, 10);
}

/**
 * Converts relative timestamps like "2 days ago", "5 hours ago", "just now"
 * to YYYY-MM-DD. Falls back to today if the format is unrecognised.
 */
function parseRelative(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (t === 'just now' || t === 'today') return today();
  const m = t.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!m) return today();
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const d = new Date();
  if (unit === 'second' || unit === 'minute' || unit === 'hour') return today();
  if (unit === 'day')   d.setDate(d.getDate() - n);
  if (unit === 'week')  d.setDate(d.getDate() - n * 7);
  if (unit === 'month') d.setMonth(d.getMonth() - n);
  if (unit === 'year')  d.setFullYear(d.getFullYear() - n);
  return d.toISOString().slice(0, 10);
}

function writeJSON(filename, data) {
  const dest = path.join(DATA_DIR, filename);
  fs.writeFileSync(dest, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`  Wrote ${dest}`);
}

function writeCSV(filename, rows, columns) {
  const header = columns.join(',');
  const lines = rows.map(r => columns.map(c => {
    const v = r[c] == null ? '' : String(r[c]);
    return v.includes(',') || v.includes('"') || v.includes('\n')
      ? '"' + v.replace(/"/g, '""') + '"'
      : v;
  }).join(','));
  const dest = path.join(DATA_DIR, filename);
  fs.writeFileSync(dest, [header, ...lines].join('\n') + '\n', 'utf8');
  console.log(`  Wrote ${dest}`);
}

// ---------------------------------------------------------------------------
// Projects collection  (Claude Enterprise → Projects → Organization tab)
// ---------------------------------------------------------------------------

async function collectProjects(context) {
  console.log('\n[projects] Navigating to Claude Enterprise org projects…');
  const page = await context.newPage();

  try {
    await page.goto(CLAUDE_URL + '/projects', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Click the "Organization" tab — adjust text if Anthropic renames it
    const orgTab = page.getByRole('tab', { name: /organization/i })
      .or(page.getByRole('button', { name: /organization/i }))
      .or(page.locator('button, a').filter({ hasText: /organization/i }));
    await orgTab.first().click({ timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Scroll to load all cards (the list may be virtualised)
    let prevCount = 0;
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(800);
      const count = await page.locator('[data-testid="project-card"], article[class*="project"], li[class*="project"]').count();
      if (count === prevCount && i > 2) break;
      prevCount = count;
    }

    // Collect visible project cards
    // NOTE: Selectors below are best-effort guesses. If they fail, open DevTools on
    // the org-projects page and update these to match the actual DOM.
    const cardLocator = page.locator(
      '[data-testid="project-card"], article[class*="project"], li[class*="project"]'
    );
    const cards = await cardLocator.all();
    console.log(`  Found ${cards.length} project card(s)`);

    const projects = [];
    for (const card of cards) {
      const title  = await card.locator('h1, h2, h3, [class*="title"], [class*="name"]').first().textContent({ timeout: 3000 }).catch(() => null);
      const desc   = await card.locator('p, [class*="desc"], [class*="summary"]').first().textContent({ timeout: 3000 }).catch(() => null);
      const creator = await card.locator('[class*="creator"], [class*="author"], [class*="owner"]').first().textContent({ timeout: 3000 }).catch(() => null);
      const updated = await card.locator('time, [class*="updated"], [class*="date"]').first().textContent({ timeout: 3000 }).catch(() => null);

      if (!title?.trim()) continue;

      // Anonymise creator: first-last of first name + first-last of last name
      const creatorCode = anonymise(creator?.trim());

      projects.push({
        title: title.trim(),
        description: desc?.trim() || null,
        creator: creatorCode,
        updated_date: parseRelative(updated?.trim()),
        // category and keywords are set by the AI narrative step; left null here
        category: null,
        keywords: null,
        summary: null,
      });
    }

    return projects;
  } finally {
    await page.close();
  }
}

/** Anonymise "First Last" → "FILT" (first+last of first name, first+last of last name). */
function anonymise(name) {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0]?.slice(0, 4).toUpperCase() || null;
  const fn = parts[0];
  const ln = parts[parts.length - 1];
  return (fn[0] + fn[fn.length - 1] + ln[0] + ln[ln.length - 1]).toUpperCase();
}

// ---------------------------------------------------------------------------
// Connectors collection  (Claude Enterprise → Settings → Plugins → Discover)
// ---------------------------------------------------------------------------

async function collectConnectors(context) {
  console.log('\n[connectors] Navigating to Claude Enterprise plugins…');
  const page = await context.newPage();

  try {
    await page.goto(CLAUDE_URL + '/settings/plugins', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Click Discover tab
    const discoverTab = page.getByRole('tab', { name: /discover/i })
      .or(page.getByRole('button', { name: /discover/i }));
    await discoverTab.first().click({ timeout: 10000 }).catch(async () => {
      // Fallback: navigate directly if settings URL differs
      await page.goto(CLAUDE_URL + '/settings/plugins/discover', { waitUntil: 'domcontentloaded' });
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Sort by Most used
    // Try a dropdown or sort button — exact selector depends on Anthropic's UI version
    const sortBtn = page.getByRole('button', { name: /sort|most used/i })
      .or(page.locator('select[name*="sort"], [class*="sort"]'));
    if (await sortBtn.count() > 0) {
      await sortBtn.first().click({ timeout: 5000 });
      const mostUsed = page.getByRole('option', { name: /most used/i })
        .or(page.getByText(/most used/i));
      if (await mostUsed.count() > 0) {
        await mostUsed.first().click({ timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      }
    }

    // Scroll to load all plugins
    let prevCount = 0;
    for (let i = 0; i < 30; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(700);
      const count = await page.locator('[data-testid*="plugin"], [class*="plugin-item"], [class*="connector"]').count();
      if (count === prevCount && i > 4) break;
      prevCount = count;
    }

    const items = await page.locator('[data-testid*="plugin"], [class*="plugin-item"], [class*="connector"]').all();
    console.log(`  Found ${items.length} connector/plugin item(s)`);

    const connectors = [];
    for (const item of items) {
      const name     = await item.locator('[class*="name"], [class*="title"], h2, h3').first().textContent({ timeout: 3000 }).catch(() => null);
      const provider = await item.locator('[class*="provider"], [class*="author"]').first().textContent({ timeout: 3000 }).catch(() => null);
      const desc     = await item.locator('p, [class*="desc"]').first().textContent({ timeout: 3000 }).catch(() => null);

      // User count appears as "N users in your organization in the last 30 days"
      const usageText = await item.locator('[class*="usage"], [class*="user"], [class*="count"]')
        .first().textContent({ timeout: 3000 }).catch(() => null);
      const countMatch = usageText?.match(/(\d+)\s+user/i);
      const userCount  = countMatch ? parseInt(countMatch[1], 10) : 0;

      const categoryText = await item.locator('[class*="categ"], [class*="tag"], [class*="badge"]')
        .first().textContent({ timeout: 3000 }).catch(() => null);

      if (!name?.trim()) continue;
      connectors.push({
        connector_name: name.trim(),
        provider: provider?.trim() || null,
        description: desc?.trim() || null,
        category: categoryText?.trim() || null,
        user_count: userCount,
        snapshot_date: today(),
      });
    }

    return connectors;
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// ServiceNow page-view collection
// ---------------------------------------------------------------------------

async function collectPageViews(context) {
  console.log('\n[page_views] Collecting ServiceNow KB article view counts…');
  const existing = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'page_views.json'), 'utf8'));
  const date = today();

  for (const article of existing.articles) {
    const page = await context.newPage();
    try {
      console.log(`  Fetching ${article.article_number}…`);
      await page.goto(article.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // ServiceNow shows "N Views" in the article header area
      // Selector is best-effort; inspect the article page and update if needed
      const viewText = await page.locator(
        '[class*="view-count"], [class*="article-view"], span:has-text("Views"), .kb-article-views'
      ).first().textContent({ timeout: 8000 }).catch(() => null);

      const viewMatch = viewText?.replace(/,/g, '').match(/(\d+)/);
      const views = viewMatch ? parseInt(viewMatch[1], 10) : null;

      if (views !== null) {
        // Only append if this date not already recorded
        const alreadyRecorded = (article.history || []).some(h => h.date === date);
        if (!alreadyRecorded) {
          article.history = article.history || [];
          article.history.push({ date, views });
          console.log(`    ${article.article_number}: ${views.toLocaleString()} views`);
        } else {
          console.log(`    ${article.article_number}: already recorded for ${date}`);
        }
      } else {
        console.warn(`    ${article.article_number}: could not read view count — check selector`);
      }
    } finally {
      await page.close();
    }
  }

  return existing;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Connecting to Chrome at ${CDP_URL}…`);
  const browser = await chromium.connectOverCDP(CDP_URL);
  const contexts = browser.contexts();

  if (contexts.length === 0) {
    throw new Error('No browser context found. Make sure Chrome is running with --remote-debugging-port=9222 and you are logged into Claude Enterprise.');
  }

  // Use the first (usually only) browsing context — this preserves your login session
  const context = contexts[0];

  try {
    // 1. Projects
    const projects = await collectProjects(context);
    writeJSON('projects.json', { projects });
    writeCSV('projects.csv', projects, ['title', 'description', 'creator', 'updated_date', 'category', 'keywords', 'summary']);

    // 2. Connectors
    const connectors = await collectConnectors(context);
    writeJSON('connectors.json', { connectors });
    writeCSV('connectors.csv', connectors, ['connector_name', 'provider', 'description', 'category', 'user_count', 'snapshot_date']);

    // 3. Page views
    const pageViews = await collectPageViews(context);
    writeJSON('page_views.json', pageViews);

    console.log('\n[collect] Done.');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[collect] Fatal error:', err.message);
  process.exit(1);
});
