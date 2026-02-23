# 🧠 MindMap Tool

A beautiful, AI-powered mind mapping desktop app for macOS — built with Electron, React, and ReactFlow.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Electron](https://img.shields.io/badge/Electron-30-blue)
![React](https://img.shields.io/badge/React-18-blue)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Interactive Mind Map** | Drag, pan, zoom — create unlimited branches with ReactFlow canvas |
| 📋 **List / Outline View** | Toggle between mind map and hierarchical list view |
| 🤖 **AI Suggestions** | Generate branch ideas with **Gemini**, **ChatGPT**, or **Claude** — click ✨ on any node |
| 📝 **Node Notes** | Add detailed notes to any node with expandable textarea |
| 📎 **File Attachments** | Attach images and documents to nodes |
| 🎨 **7 Color Themes** | Color-code branches for visual organization |
| 🌗 **Dark & Light Mode** | Premium glassmorphism design with smooth transitions |
| 💾 **Auto-Save** | Maps auto-save every 2 seconds |
| ↩️ **Undo/Redo** | 50-step history with ⌘Z / ⌘⇧Z |
| 📤 **Multi-Format Export** | PNG, JPEG, PDF, JSON, and Apple Notes |
| ⌨️ **Keyboard Shortcuts** | Tab (add child), Delete, ⌘Z/⌘⇧Z |

---

## 📸 Screenshots

> Coming soon — run the app to see the beautiful dark-themed UI with glassmorphism effects.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- macOS 12 or later (for Electron desktop mode)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/mindmap-tool.git
cd mindmap-tool

# Install dependencies
npm install

# Run in browser (dev mode)
npm run dev

# Run as desktop app
npm run electron:dev
```

Open **http://localhost:5173** in your browser, or the Electron window will launch automatically.

---

## 🎯 How to Use

### Getting Started
1. **Create a map** — A default "My First Mind Map" is created on launch
2. **Add nodes** — Click the **+** button on any node, or press **Tab**
3. **Edit labels** — Double-click any node to rename it
4. **Organize** — Drag nodes to rearrange, use color picker to categorize

### AI Suggestions
1. Open the **sidebar** (☰ button)
2. Select your AI provider: **Gemini**, **ChatGPT**, or **Claude**
3. Enter your API key
4. Click **✨** on any node to generate 5 creative branch ideas
5. Click a suggestion to add it as a child branch

### Notes
- Click the **📄** icon on any node to expand the notes section
- Notes are saved with your map and included in exports

### Views
- **🗺️ Mind Map** — Visual canvas with drag-and-drop (default)
- **📋 List View** — Hierarchical outline with expand/collapse

### Export Options
Click **📤** in the toolbar to choose:
- **PNG** / **JPEG** — High-resolution image (2× retina)
- **PDF** — Formatted printable document
- **JSON** — Full data backup for import
- **🍎 Apple Notes** — Send directly to Apple Notes

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [Electron](https://electronjs.org/) | Desktop shell with macOS-native styling |
| [React 18](https://react.dev/) | UI framework |
| [ReactFlow](https://reactflow.dev/) | Interactive canvas for mind map |
| [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight state management |
| [Vite](https://vitejs.dev/) | Fast development & build |
| Google Gemini / OpenAI / Claude | AI-powered branch suggestions |

---

## 📁 Project Structure

```
mindmap-tool/
├── electron/
│   ├── main.js              # Electron main process
│   └── preload.js           # Secure IPC bridge
├── src/
│   ├── App.jsx              # Root component
│   ├── index.css            # Design system (1500+ lines)
│   ├── main.jsx             # React entry point
│   ├── components/
│   │   ├── MindMap/
│   │   │   ├── MindMapCanvas.jsx   # ReactFlow canvas
│   │   │   └── MindMapNode.jsx     # Custom node component
│   │   ├── ListView/
│   │   │   └── ListView.jsx        # Hierarchical list view
│   │   ├── Sidebar/
│   │   │   └── Sidebar.jsx         # Map manager + AI panel
│   │   └── Toolbar/
│   │       └── Toolbar.jsx         # Actions + export menu
│   ├── store/
│   │   ├── mindMapStore.js         # Mind map state (Zustand)
│   │   └── appStore.js             # App settings (Zustand)
│   └── services/
│       └── aiService.js            # Multi-provider AI API
├── index.html
├── package.json
└── vite.config.js
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Tab` | Add child to selected node |
| `Delete` / `Backspace` | Delete selected node |
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |
| Double-click node | Edit label |

---

## 🔑 AI API Keys

Get your free API keys:
- **Gemini**: [aistudio.google.com](https://aistudio.google.com)
- **ChatGPT**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Claude**: [console.anthropic.com](https://console.anthropic.com/)

Keys are stored locally in your browser's localStorage — never sent to any server except the respective AI provider.

---

## 📦 Build & Package

```bash
# Production build
npm run build

# Package as .dmg (macOS)
npm run electron:build
```

---

## 📄 License

MIT License — free for personal and commercial use.

---

**Made with ❤️ for thinkers, researchers, and idea explorers.**
