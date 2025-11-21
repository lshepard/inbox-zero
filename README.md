# Confabulous Inbox

**Private email management system - Not available for public use**

This is a private fork of [Inbox Zero](https://github.com/elie222/inbox-zero) for personal use only.

## About This Fork

This repository contains custom modifications to the upstream Inbox Zero project. **This is not an open source project and is not available for public use.** Access is restricted to invited users only.

For questions about Inbox Zero itself, please refer to:
- **Upstream Repository:** [https://github.com/elie222/inbox-zero](https://github.com/elie222/inbox-zero)
- **Official Website:** [https://www.getinboxzero.com](https://www.getinboxzero.com)
- **Documentation:** [https://docs.getinboxzero.com](https://docs.getinboxzero.com)

## Custom Changes (production branch vs main)

This fork includes the following modifications:

### AI Assistant Enhancements
- **AI Triage Tools:** Enhanced email analysis and task management capabilities
- **Historical Email Search:** Added `searchHistoricalEmails` tool for AI Assistant to analyze email patterns and history
- **Improved Chat Interface:** Fixed JSON Schema errors and improved AI chat functionality

### Email Management Features
- **Needs Action Tab:** New categorization for emails requiring action
- **Email Watching Toggle:** Added manual control for email watching in Settings
- **Reauthentication:** New reauthentication button and improved OAuth token refresh handling

### Infrastructure
- **Railway Deployment:** Added Railway configuration for production deployment (`railway.toml`)
- **Port Configuration:** Changed dev server from port 3000 to 4500
- **Updated LLM Models:** Expanded list of available language models

### Bug Fixes & Improvements
- Fixed Better Auth login with refresh token expiration field
- Fixed redirect loop in assistant page onboarding flow
- Fixed accessibility error by adding DialogTitle to AddRuleDialog
- Various TypeScript error fixes

## Running Locally

For development setup instructions, refer to the [upstream repository documentation](https://github.com/elie222/inbox-zero#getting-started-for-developers).

### Quick Start

```bash
# Install dependencies
pnpm install

# Run migrations
pnpm prisma migrate dev

# Start dev server (custom port 4500)
pnpm run dev
```

Open [http://localhost:4500](http://localhost:4500) to view the app in your browser.

**Note:** This fork uses port 4500 instead of the default port 3000.

---

For detailed setup instructions including OAuth configuration, database setup, and deployment options, please refer to the [upstream Inbox Zero repository](https://github.com/elie222/inbox-zero).
