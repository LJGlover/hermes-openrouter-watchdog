"""
OpenRouter Free Model Watchdog Plugin Backend
Monitors free model availability and changes on OpenRouter.
"""

import requests
import json
import os
from datetime import datetime
from pathlib import Path

# Plugin data directory
DATA_DIR = Path.home() / ".hermes" / "plugins" / "openrouter-model-watchdog" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

BASELINE_FILE = DATA_DIR / "baseline.json"
CURRENT_FILE = DATA_DIR / "current.json"
HISTORY_FILE = DATA_DIR / "history.json"

OPEROUTER_API = "https://openrouter.ai/api/v1/models"


def get_api_key():
    """Retrieve OpenRouter API key from Hermes config or environment."""
    # Try environment first
    import os
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if api_key:
        return api_key
    
    # Try Keychain (macOS)
    try:
        import subprocess
        result = subprocess.run(
            ["security", "find-generic-password", "-s", "openrouter", "-a", "api", "-w"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    
    return None


def fetch_models():
    """Fetch available models from OpenRouter API."""
    headers = {}
    api_key = get_api_key()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        response = requests.get(OPEROUTER_API, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get("data", [])
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []


def get_free_models():
    """Get list of free models."""
    models = fetch_models()
    free_models = []
    
    for model in models:
        # Check if model is free (pricing = 0 for both prompt and completion)
        pricing = model.get("pricing", {})
        prompt_price = float(pricing.get("prompt", -1))
        completion_price = float(pricing.get("completion", -1))
        
        if prompt_price == 0 and completion_price == 0:
            free_models.append({
                "id": model["id"],
                "name": model.get("name", model["id"]),
                "context_length": model.get("context_length", 0),
                "pricing": pricing,
                "created": model.get("created", 0),
                "last_checked": datetime.now().isoformat()
            })
    
    return free_models


def load_baseline():
    """Load baseline model list."""
    if BASELINE_FILE.exists():
        with open(BASELINE_FILE, 'r') as f:
            return json.load(f)
    return {"models": [], "timestamp": None}


def save_baseline(models):
    """Save current state as baseline."""
    data = {
        "models": models,
        "timestamp": datetime.now().isoformat()
    }
    with open(BASELINE_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def load_current():
    """Load current model list."""
    if CURRENT_FILE.exists():
        with open(CURRENT_FILE, 'r') as f:
            return json.load(f)
    return {"models": [], "timestamp": None}


def save_current(models):
    """Save current model state."""
    data = {
        "models": models,
        "timestamp": datetime.now().isoformat()
    }
    with open(CURRENT_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def load_history():
    """Load change history."""
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    return []


def save_history(history):
    """Save change history (keep last 100 entries)."""
    # Keep only last 100 entries
    history = history[-100:]
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)


def detect_changes(baseline_models, current_models):
    """Detect changes between baseline and current state."""
    baseline_ids = {m["id"] for m in baseline_models}
    current_ids = {m["id"] for m in current_models}
    
    added = [m for m in current_models if m["id"] not in baseline_ids]
    removed = [m for m in baseline_models if m["id"] not in current_ids]
    
    return {
        "added": added,
        "removed": removed,
        "stable": [m for m in current_models if m["id"] in baseline_ids]
    }


def register_routes(app):
    """Register plugin routes with the Flask app."""
    
    @app.route('/api/plugins/openrouter-watchdog/models', methods=['GET'])
    def get_models():
        """Get current free models."""
        try:
            models = get_free_models()
            save_current(models)
            
            baseline_data = load_baseline()
            changes = detect_changes(baseline_data["models"], models)
            
            return {
                "success": True,
                "models": models,
                "count": len(models),
                "baseline_timestamp": baseline_data.get("timestamp"),
                "current_timestamp": datetime.now().isoformat(),
                "changes": changes,
                "has_baseline": len(baseline_data["models"]) > 0
            }
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/api/plugins/openrouter-watchdog/baseline', methods=['POST'])
    def set_baseline():
        """Set current state as baseline."""
        try:
            models = get_free_models()
            save_baseline(models)
            return {
                "success": True,
                "message": f"Baseline set with {len(models)} models",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/api/plugins/openrouter-watchdog/baseline', methods=['GET'])
    def get_baseline():
        """Get current baseline."""
        try:
            baseline_data = load_baseline()
            return {
                "success": True,
                "baseline": baseline_data
            }
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/api/plugins/openrouter-watchdog/history', methods=['GET'])
    def get_history():
        """Get change history."""
        try:
            history = load_history()
            return {
                "success": True,
                "history": history[-30:]  # Last 30 entries
            }
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/api/plugins/openrouter-watchdog/check', methods=['POST'])
    def check_changes():
        """Check for changes and log to history."""
        try:
            models = get_free_models()
            save_current(models)
            
            baseline_data = load_baseline()
            changes = detect_changes(baseline_data["models"], models)
            
            # Log to history if there are changes
            if changes["added"] or changes["removed"]:
                history = load_history()
                history.append({
                    "timestamp": datetime.now().isoformat(),
                    "changes": changes
                })
                save_history(history)
            
            return {
                "success": True,
                "changes": changes,
                "has_changes": bool(changes["added"] or changes["removed"])
            }
        except Exception as e:
            return {"success": False, "error": str(e)}, 500


def register_plugin(app):
    """Main entry point for plugin registration."""
    register_routes(app)
    return {
        "name": "openrouter-model-watchdog",
        "label": "Model Watchdog",
        "ready": True
    }
