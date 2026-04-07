# Reminders

A local-first desktop reminders app for tracking who owes what to whom. Built with Tauri 2 and vanilla HTML/CSS/JS.

## Features
- Quick natural-language capture ("Remind Rahul about the invoice tomorrow").
- Auto-parses person, direction (they owe me / I owe them), and deadline.
- Today's Deadlines and Agendas buckets, grouped by person.
- Drag-and-drop between buckets and people.
- Month calendar with task indicators.
- Offline-first — data lives in `localStorage` on your machine.

## Tech Stack
- **Frontend**: HTML, CSS, vanilla JavaScript (ES modules)
- **Shell**: [Tauri 2](https://tauri.app/) (Rust)
- **Storage**: `localStorage`

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Rust toolchain](https://www.rust-lang.org/tools/install)
- Tauri system dependencies for your OS — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/).

### Install
```bash
npm install
```

### Run in development
```bash
npm run tauri dev
```

### Build a release bundle
```bash
npm run tauri build
```

## Usage
1. Type a task into the input box, e.g. `Rahul asked me to send the deck tomorrow`.
2. Press Enter. The app extracts the person, direction, and deadline.
3. Drag tasks between **Today's Deadlines** and **Agendas**, or onto another person's block to reassign.
4. Click the 📥 / 📤 badge to flip the direction of a task.
5. Tick the checkbox to complete a task.

## Project Structure
```
Reminder/
├── src/              # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── src-tauri/        # Tauri / Rust shell
│   ├── src/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── README.md
└── REQUIREMENTS.md
```

## Roadmap
- Local voice capture via whisper.cpp.
- Deadline notifications.
- Edit / delete tasks.
- Urgent panel prioritization.

## License
Private / unlicensed.
