# MacBook Self-Hosted Runner Setup Guide

This guide walks through turning your MacBook Pro into a self-hosted GitHub Actions runner that can collect data from Claude Enterprise and ServiceNow, then push updates to the dashboard automatically.

---

## Prerequisites

- macOS (any recent version)
- Google Chrome installed
- Node.js 20+ (`brew install node`)
- Git configured with push access to this repository
- The `gh` CLI (`brew install gh` then `gh auth login`)

---

## 1. Register the MacBook as a GitHub Actions runner

1. Go to **Settings → Actions → Runners → New self-hosted runner** on this repository.
2. Select **macOS** as the OS.
3. Follow the on-screen commands to download and configure the runner agent.
   When prompted for labels, enter: **`self-hosted,macos-home`**
   (the workflow targets exactly these labels).
4. Start the runner. For headless/always-on operation, install it as a service:
   ```bash
   cd ~/actions-runner
   ./svc.sh install
   ./svc.sh start
   ```
   The runner will now start automatically at login and after reboots.

---

## 2. Start Chrome with the DevTools port open

The data-collection script connects to Chrome via the Chrome DevTools Protocol (CDP) rather than storing credentials — Chrome is already logged into Claude Enterprise in your session.

### Interactive (temporary)

```bash
open -a "Google Chrome" --args \
  --remote-debugging-port=9222 \
  --no-first-run \
  --no-default-browser-check
```

### Permanent (launchd, runs at login)

Create `~/Library/LaunchAgents/com.chrome.debug.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>              <string>com.chrome.debug</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Applications/Google Chrome.app/Contents/MacOS/Google Chrome</string>
    <string>--remote-debugging-port=9222</string>
    <string>--no-first-run</string>
    <string>--no-default-browser-check</string>
  </array>
  <key>RunAtLoad</key>          <true/>
  <key>KeepAlive</key>          <true/>
  <key>StandardErrorPath</key>  <string>/tmp/chrome-debug.log</string>
  <key>StandardOutPath</key>    <string>/tmp/chrome-debug.log</string>
</dict>
</plist>
```

Load it:

```bash
launchctl load ~/Library/LaunchAgents/com.chrome.debug.plist
```

After Chrome starts: **log into Claude Enterprise** (`https://claude.ai`) and leave the browser open.

---

## 3. Add required repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name        | Value |
|--------------------|-------|
| `ANTHROPIC_API_KEY` | A Developer Platform API key — **not** a Claude Enterprise seat. Create one at console.anthropic.com under API Keys. This is billed separately from Claude Enterprise. |

### Optional repository variables (Settings → Variables → Actions)

Override these only if your setup differs from the defaults:

| Variable name           | Default                             |
|-------------------------|-------------------------------------|
| `CDP_URL`               | `http://localhost:9222`             |
| `CLAUDE_ENTERPRISE_URL` | `https://claude.ai`                 |
| `SERVICENOW_BASE_URL`   | `https://uchicago.service-now.com`  |

---

## 4. Trigger a test run from your phone

### GitHub mobile app
1. Open the repository on the GitHub app.
2. Tap **Actions** → **Daily Dashboard Refresh**.
3. Tap **Run workflow** and enable **"Skip timezone guard"** for the test.

### Claude on your phone
In a Claude conversation with GitHub access, say:
> "Trigger the daily-refresh workflow on ncheld/uc_claude_enterprise_adoption_dashboard with skip_time_guard set to true."

Claude will use the GitHub MCP tools to dispatch the workflow.

---

## 5. Adjusting Playwright selectors (if data collection fails)

The collect script (`scripts/collect.js`) uses best-effort CSS selectors to read Claude Enterprise and ServiceNow pages. If the UI is updated and the script fails:

1. Open Chrome with the debugging port active.
2. Navigate to the relevant page (Org Projects or Plugins Discover).
3. Open DevTools → Elements and find the actual container class names.
4. Update the `SELECTORS` object at the top of `scripts/collect.js`.

The selectors most likely to need adjustment are the project card locator and the plugin item locator, since these are set by Anthropic's design system and can change with UI updates.

---

## 6. Keeping Chrome logged in (headless Mac)

If the MacBook is running without a display:
- Use **Chrome Remote Desktop** (`remotedesktop.google.com`) to connect from your phone or iPad and re-authenticate if a session expires.
- Chrome's session cookies are stored in your profile and persist across restarts, so re-login should be infrequent.
- If a UChicago SSO token expires (typically every 8 hours), you'll need to re-authenticate once per work day before the 06:30 run.

---

## 7. Note on enterprise-managed GitHub organizations

Some enterprise-managed GitHub orgs restrict Actions from creating pull requests without a GitHub App token or admin toggle. If the narrative PR step fails with a 403:
- Go to **Settings → Actions → General → Workflow permissions** and enable "Allow GitHub Actions to create and approve pull requests."
- Or replace `GITHUB_TOKEN` with a personal access token (PAT) stored as a secret.
