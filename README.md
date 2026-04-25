# OpenRouter Free Model Watchdog Plugin

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Hermes Plugin](https://img.shields.io/badge/Hermes-Plugin-green.svg)
![OpenRouter](https://img.shields.io/badge/OpenRouter-API-orange.svg)

A powerful monitoring plugin for Hermes Dashboard that tracks OpenRouter free model availability, detects changes, and alerts you to model deprecations or additions.

## 🐕 Features

- **Real-time Monitoring**: Check current free model availability on OpenRouter
- **Change Detection**: Automatically detects when models are added or removed
- **Baseline Comparison**: Set a baseline and track changes over time
- **Change History**: Keep a log of all model changes (last 100 entries)
- **Model Details**: View context length and model IDs for all free models
- **Statistics Dashboard**: Quick overview of free model counts and status
- **Local Storage**: All data stored locally - no external tracking

## 🚀 Installation

### Prerequisites

- Hermes Agent with dashboard feature enabled
- Python 3.7+ with requests library
- OpenRouter API key (optional, works without but may have rate limits)

### Quick Install

1. Clone this repository:
   ```bash
   git clone https://github.com/[your-username]/hermes-openrouter-watchdog.git
   cd hermes-openrouter-watchdog
   ```

2. Copy the plugin to your Hermes plugins directory:
   ```bash
   mkdir -p ~/.hermes/plugins/
   cp -r . ~/.hermes/plugins/openrouter-model-watchdog/
   ```

3. (Optional) Set your OpenRouter API key:
   ```bash
   # Option 1: Environment variable
   export OPENROUTER_API_KEY="your-key-here"
   
   # Option 2: macOS Keychain (recommended)
   security add-generic-password -s openrouter -a api -w "your-key-here"
   ```

4. Restart your Hermes dashboard:
   ```bash
   hermes dashboard
   ```

5. The "Model Watchdog" tab should appear automatically!

## 📖 Usage

### First-Time Setup

1. Click on the "Model Watchdog" tab
2. Click "Refresh 🔄" to load current free models
3. Click "Set Baseline 📍" to establish your starting point

### Daily Monitoring

- **Refresh**: Click "Refresh 🔄" to check current model status
- **Check for Changes**: The plugin automatically compares against your baseline
- **View History**: Scroll down to see change history

### Understanding the Dashboard

#### Status Badge
- ✅ **All models stable**: No changes detected
- ⚠️ **No baseline set**: Set a baseline to start tracking
- 🔔 **Changes detected!**: Models have been added or removed

#### Statistics
- **Free Models**: Current count of free models
- **Added**: Models available now but not in baseline
- **Removed**: Models in baseline but no longer available
- **Stable**: Models present in both baseline and current state

#### Change History
Shows the last 10 change events with timestamps and details.

## 📸 Screenshots

### Main Dashboard
![Main Dashboard Screenshot](screenshots/main.png)

### Change Detection Alert
![Changes Screenshot](screenshots/changes.png)

*Add your screenshots to the `screenshots/` folder!*

## 🔧 Technical Details

### Plugin Structure

```
openrouter-model-watchdog/
├── manifest.json       # Plugin metadata
├── backend.py          # Flask API routes & OpenRouter API client
├── frontend.js         # UI logic
├── styles.css          # Plugin styling
├── data/              # Local data storage (auto-created)
│   ├── baseline.json  # Your baseline model list
│   ├── current.json   # Current model state
│   └── history.json   # Change history
└── README.md
```

### API Endpoints

- `GET /api/plugins/openrouter-watchdog/models` - Get current free models and changes
- `POST /api/plugins/openrouter-watchdog/baseline` - Set current state as baseline
- `GET /api/plugins/openrouter-watchdog/baseline` - Get current baseline
- `GET /api/plugins/openrouter-watchdog/history` - Get change history
- `POST /api/plugins/openrouter-watchdog/check` - Check for changes and log to history

### OpenRouter API Integration

The plugin queries the OpenRouter `/api/v1/models` endpoint and filters for models with:
- `pricing.prompt = 0`
- `pricing.completion = 0`

### Data Storage

All data is stored locally in `~/.hermes/plugins/openrouter-model-watchdog/data/`. No data is sent to external servers.

## 🤝 Contributing

Contributions welcome! Ideas for improvement:
- Email/Telegram notifications on changes
- More detailed model metadata display
- Export/import baseline data
- Configurable change alerts

## 🏆 Hackathon

This plugin was created for the Hermes Dashboard Hackathon - Plugin Track.

**Prize**: $600 in OpenRouter credits for the best plugin!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ to help you never miss a free model change on OpenRouter.

**Pro Tip**: Set this up with a cron job to automatically check daily and get notified of changes!
