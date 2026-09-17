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
4. Start the runner. For headless/always-on operation, install it as a service:
   ```bash
   cd ~/actions-runner
   ./svc.sh install
   ./svc.sh start
   ```

---

## 2. Start Chrome with the DevTools port open

The data-collection script connects to Chrome via CDP — no credentials stored anywhere.

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

```bash
launchctl load ~/Library/LaunchAgents/com.chrome.debug.plist
```

After Chrome starts: log into Claude Enterprise (`https://claude.ai`) and leave the browser open.

---

## 3. Add required repository secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | A Developer Platform API key — **not** a Claude Enterprise seat. Create at console.anthropic.com → API Keys. Billed separately from Claude Enterprise. |

### Optional repository variables

| Variable | Default |
|---|---|
| `CDP_URL` | `http://localhost:9222` |
| `CLAUDE_ENTERPRISE_URL` | `https://claude.ai` |
| `SERVICENOW_BASE_URL` | `https://uchicago.service-now.com` |

---

## 4. Trigger a test run from your phone

**GitHub mobile app:** Actions tab → Daily Dashboard Refresh → Run workflow → enable "Skip timezone guard".

**Claude on your phone:** Say "Trigger the daily-refresh workflow on ncheld/uc_claude_enterprise_adoption_dashboard with skip_time_guard set to true."

---

## 5. Adjusting Playwright selectors

If data collection fails after a Claude Enterprise UI update, open DevTools on the relevant page, find the actual container class names, and update the selector strings in `scripts/collect.js`.

---

## 6. Keeping Chrome logged in (headless Mac)

- Use Chrome Remote Desktop (`remotedesktop.google.com`) to re-authenticate from your phone if a session expires.
- If the UChicago SSO token expires, re-authenticate before the 06:30 run.

---

## 7. Note on enterprise-managed GitHub organizations

If the narrative PR step fails with 403:
- Settings → Actions → General → Workflow permissions → enable "Allow GitHub Actions to create and approve pull requests".
- Or replace `GITHUB_TOKEN` with a PAT stored as a secret.
