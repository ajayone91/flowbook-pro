# FlowBook Pro

Tasks aur reading ek hi jagah — local-first productivity app.

TaskFlow AI × BOOKORA X ka combined experience: task manager, habit tracker, Pomodoro focus timer, PDF library with 3D reader, notes, flashcards, aur Claude AI assistant.

## Features

- **Dashboard** — stats, recent tasks, currently reading, AI suggestions
- **Tasks** — CRUD, subtasks, drag-and-drop, filters, recurring
- **Habits** — weekly tracker with streaks
- **Focus Timer** — Pomodoro (25/45/60 min)
- **Skills & Roadmap** — progress tracking
- **Calendar** — tasks by due date
- **Library** — PDF upload, drag-and-drop, trending books
- **Reader** — 3D page flip, scroll view, TTS
- **Notes & Study** — flashcards, AI book summary
- **Analytics** — Chart.js charts
- **AI Assistant** — Claude API (optional key)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
flowbook-pro/
├── index.html              # App entry
├── src/
│   ├── styles/             # CSS modules (tokens, layout, pages)
│   ├── scripts/
│   │   ├── main.js         # Bootstrap
│   │   ├── app/engine.js   # App logic
│   │   └── data/           # Static data (books, flashcards)
│   └── templates/partials/ # HTML partials (modals, views)
├── docs/
└── public/
```

## Tech Stack

Vanilla JavaScript · Vite · Chart.js · PDF.js · DOMPurify · localStorage

## Data & Privacy

Saara data browser ke `localStorage` mein save hota hai. AI features ke liye Anthropic API key optional hai — key sirf locally store hoti hai.

## License

MIT
