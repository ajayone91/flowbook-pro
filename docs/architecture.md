# Architecture

## Overview

FlowBook Pro is a client-side SPA with no backend. State persists in `localStorage`.

## Modules

| Area | Files |
|------|-------|
| Styles | `src/styles/**` — design tokens, layout, page-specific CSS |
| App logic | `src/scripts/app/engine.js` |
| Static data | `src/scripts/data/*.js` |
| UI templates | `src/templates/partials/*.html` |

## Data Keys

- `fbp_v1` — main app state
- `fbp_session` — logged-in user session
- `fbp_users` — local user accounts (SHA-256 passwords)
- `fbp_apikey` — optional Claude API key

## External APIs

- Anthropic Messages API (optional, user-provided key)
- Google Fonts, CDN libs (Chart.js, PDF.js, DOMPurify)
