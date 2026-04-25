"""
OpenRouter Free Model Watchdog Plugin Backend
FastAPI router for monitoring free model availability and changes.
"""

import requests
import json
import os
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()

# Plugin data directory
DATA_DIR = Path.home() / ".hermes" / "plugins" / "hermes-openrouter-watchdog" / "dashboard" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

BASELINE_FILE = DATA_DIR / "baseline.json"
CURRENT_FILE = DATA_DIR / "current.json"
HISTORY_FILE = DATA_DIR / "history.json"

OPENROUTER_API = "https://openrouter.ai/api/v1/models"


def get_api_key():
    """Retrieve OpenRouter API key from environment."""
    import os
    return os.environ.get("OPENROUTER_API_KEY", "")


@router.get("/models")
async def get_models():
    """Get current free models and detect changes."""
    headers = {}
    api_key = get_api_key()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    try:
        response = requests.get(OPENROUTER_API, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        models = data.get("data", [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Filter free models
    free_models = []
    for model in models:
        pricing = model.get("pricing", {})
        try:
            prompt_price = float(pricing.get("prompt", -1))
            completion_price = float(pricing.get("completion", -1))
        except (ValueError, TypeError):
            continue
        
        if prompt_price == 0 and completion_price == 0:
            free_models.append({
                "id": model["id"],
                "name": model.get("name", model["id"]),
                "context_length": model.get("context_length", 0),
                "pricing": pricing,
                "created": model.get("created", 0),
                "last_checked": datetime.now().isoformat()
            })
    
    # Save current state
    save_current(free_models)
    
    # Load baseline and detect changes
    baseline_data = load_baseline()
    changes = detect_changes(baseline_data.get("models", []), free_models)
    
    return {
        "success": True,
        "models": free_models,
        "count": len(free_models),
        "baseline_timestamp": baseline_data.get("timestamp"),
        "current_timestamp": datetime.now().isoformat(),
        "changes": changes,
        "has_baseline": len(baseline_data.get("models", [])) > 0
    }


@router.post("/baseline")
async def set_baseline():
    """Set current state as baseline."""
    try:
        models = await get_models()
        if not models["success"]:
            raise HTTPException(status_code=500, detail="Failed to fetch models")
        
        baseline = {
            "models": models["models"],
            "timestamp": datetime.now().isoformat()
        }
        with open(BASELINE_FILE, 'w') as f:
            json.dump(baseline, f, indent=2)
        
        return {
            "success": True,
            "message": f"Baseline set with {len(models['models'])} models",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/baseline")
async def get_baseline():
    """Get current baseline."""
    data = load_baseline()
    return {"success": True, "baseline": data}


@router.get("/history")
async def get_history():
    """Get change history."""
    history = load_history()
    return {"success": True, "history": history[-30:]}


@router.post("/check")
async def check_changes():
    """Check for changes and log to history."""
    models = await get_models()
    
    baseline_data = load_baseline()
    changes = detect_changes(baseline_data.get("models", []), models["models"])
    
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


def load_baseline():
    """Load baseline model list."""
    if BASELINE_FILE.exists():
        with open(BASELINE_FILE, 'r') as f:
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


def load_current():
    """Load current model list."""
    if CURRENT_FILE.exists():
        with open(CURRENT_FILE, 'r') as f:
            return json.load(f)
    return {"models": [], "timestamp": None}


def load_history():
    """Load change history."""
    if HISTORY_FILE.exists():
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    return []


def save_history(history):
    """Save change history (keep last 100 entries)."""
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
