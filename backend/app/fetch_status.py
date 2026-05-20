"""
Shared in-memory fetch progress state.
Updated by fetchers, polled by the status endpoint.
"""
from datetime import datetime
from typing import Literal

StepStatus = Literal["pending", "running", "done", "error"]

_STEP_NAMES = ["NVD", "RSS", "Web scraper", "Palo Alto", "Relevance", "Notifikace"]

_state: dict = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "steps": [],
    "total_saved": 0,
    "error": None,
}


def _reset():
    _state["running"] = True
    _state["started_at"] = datetime.utcnow().isoformat()
    _state["finished_at"] = None
    _state["error"] = None
    _state["total_saved"] = 0
    _state["steps"] = [
        {"name": n, "status": "pending", "saved": 0} for n in _STEP_NAMES
    ]


def start_fetch():
    _reset()


def step_start(name: str):
    for s in _state["steps"]:
        if s["name"] == name:
            s["status"] = "running"
            s["saved"] = 0
            return


def step_done(name: str, saved: int = 0, error: str | None = None):
    for s in _state["steps"]:
        if s["name"] == name:
            s["status"] = "error" if error else "done"
            s["saved"] = saved
            if error:
                s["error"] = error
            return
    _state["total_saved"] += saved


def finish_fetch(error: str | None = None):
    _state["running"] = False
    _state["finished_at"] = datetime.utcnow().isoformat()
    _state["error"] = error
    # Recompute total_saved from steps
    _state["total_saved"] = sum(s.get("saved", 0) for s in _state["steps"])
    # Mark any still-pending steps as done
    for s in _state["steps"]:
        if s["status"] in ("pending", "running"):
            s["status"] = "done"


def get_status() -> dict:
    return dict(_state)
