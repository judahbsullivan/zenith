# Discord Webhooks Setup

This project uses three Discord webhooks for different types of notifications:

## Webhooks

1. **Issues Webhook** (`DISCORD_WEBHOOK_URL`)
   - Notifies when issues are created, edited, closed, etc.
   - Workflow: `.github/workflows/discord-notify.yml`

2. **Changelog Webhook** (`DISCORD_CHANGELOG_WEBHOOK_URL`)
   - Notifies when code is pushed to main or PRs are merged
   - Workflow: `.github/workflows/discord-changelog.yml`

3. **Release Webhook** (`DISCORD_VERSION_WEBHOOK_URL`)
   - Notifies when GitHub releases are published, edited, or changed
   - Detects major/minor/patch releases based on tag
   - Shows release notes and tag information
   - Workflow: `.github/workflows/discord-version.yml`

## Setup

### 1. Get Discord Webhook URLs

For each webhook you want to use:
1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it (e.g., "Issues", "Changelog", "Version")
5. Copy the webhook URL

### 2. Add to .env File

Create or update your `.env` file with:

```bash
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ISSUES_WEBHOOK"
DISCORD_CHANGELOG_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_CHANGELOG_WEBHOOK"
DISCORD_VERSION_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_VERSION_WEBHOOK"
```

### 3. Set GitHub Secrets

Run the setup script:

```bash
./scripts/setupAllDiscordWebhooks.sh
```

Or manually set each secret:

```bash
gh secret set DISCORD_WEBHOOK_URL --body "YOUR_ISSUES_WEBHOOK_URL"
gh secret set DISCORD_CHANGELOG_WEBHOOK_URL --body "YOUR_CHANGELOG_WEBHOOK_URL"
gh secret set DISCORD_VERSION_WEBHOOK_URL --body "YOUR_VERSION_WEBHOOK_URL"
```

## What Gets Notified

### Issues Webhook
- ✅ New issues created
- ✅ Issues edited
- ✅ Issues closed/reopened
- ✅ Labels added/removed
- ✅ Issues assigned/unassigned

### Changelog Webhook
- ✅ Pushes to `main` branch
- ✅ Pull requests merged to `main`
- Shows commit messages and PR details

### Release Webhook
- ✅ GitHub releases published
- ✅ Releases edited
- ✅ Pre-releases published
- ✅ Detects major/minor/patch releases from tag (e.g., v1.0.0, v2.1.3)
- Shows release name, tag, notes, and author

## Testing

Test each webhook locally:

```bash
# Test issues webhook
./scripts/testDiscordWorkflow.sh

# Test changelog (simulate a push)
# Just push to main or merge a PR

# Test release (create a GitHub release)
# Go to: https://github.com/YOUR_REPO/releases/new
# Create a new release with a tag (e.g., v1.0.0)
```

## Troubleshooting

**Webhook not working?**
- Check that the secret is set: `gh secret list`
- Verify the webhook URL is correct
- Check workflow runs: https://github.com/YOUR_REPO/actions

**No notifications?**
- Make sure the workflow files are committed and pushed
- Check that the events are triggering (push, PR merge, etc.)
- Verify the webhook URLs are valid

