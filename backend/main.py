from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DATA_FILE = Path(__file__).resolve().parent / "data" / "store.json"
DATA_FILE.parent.mkdir(exist_ok=True)
PRIVATE_ACCESS_CODE = os.getenv("PRIVATE_ACCESS_CODE", "shrishailya-ops-2026")

app = FastAPI(title="Shrishailya Ops API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AccessRequest(BaseModel):
    code: str = Field(..., min_length=1)


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = ""
    category: str = ""
    status: str = ""
    completed: bool = False
    published: bool = False


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    status: str | None = None
    completed: bool | None = None
    published: bool | None = None


class MetadataItemRequest(BaseModel):
    name: str = Field(..., min_length=1)


def _empty_store() -> dict[str, Any]:
    return {"categories": [], "statuses": [], "tasks": []}


def _load_store() -> dict[str, Any]:
    if DATA_FILE.exists():
        try:
            with DATA_FILE.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
                if isinstance(data, dict):
                    return {
                        "categories": data.get("categories", []),
                        "statuses": data.get("statuses", []),
                        "tasks": data.get("tasks", []),
                    }
        except json.JSONDecodeError:
            pass
    return _empty_store()


def _save_store(store: dict[str, Any]) -> None:
    DATA_FILE.write_text(json.dumps(store, indent=2), encoding="utf-8")


def _verify_access(code: str | None) -> None:
    if code != PRIVATE_ACCESS_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid access code")


def _normalize(value: str | None) -> str:
    return (value or "").strip()


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "service": "shrishailya-ops-api",
        "status": "running",
        "routes": [
            "/health",
            "/portfolio",
            "/access/verify",
            "/tasks",
            "/metadata",
        ],
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/access/verify")
def verify_access(payload: AccessRequest) -> dict[str, bool]:
    if payload.code != PRIVATE_ACCESS_CODE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid access code")
    return {"ok": True}


@app.get("/portfolio")
def get_portfolio() -> dict[str, list[dict[str, Any]]]:
    store = _load_store()
    published_tasks = [task for task in store.get("tasks", []) if task.get("published")]
    return {"tasks": published_tasks}


@app.get("/metadata")
def get_metadata(code: str | None = Header(default=None)) -> dict[str, list[str]]:
    _verify_access(code)
    store = _load_store()
    return {"categories": store.get("categories", []), "statuses": store.get("statuses", [])}


@app.post("/metadata/categories")
def add_category(payload: MetadataItemRequest, code: str | None = Header(default=None)) -> dict[str, list[str]]:
    _verify_access(code)
    store = _load_store()
    name = _normalize(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")
    if name not in store.setdefault("categories", []):
        store["categories"].append(name)
        _save_store(store)
    return {"categories": store.get("categories", []), "statuses": store.get("statuses", [])}


@app.delete("/metadata/categories/{name}")
def remove_category(name: str, code: str | None = Header(default=None)) -> dict[str, list[str]]:
    _verify_access(code)
    store = _load_store()
    cleaned_name = _normalize(name)
    if cleaned_name in store.get("categories", []):
        store["categories"].remove(cleaned_name)
        _save_store(store)
    return {"categories": store.get("categories", []), "statuses": store.get("statuses", [])}


@app.post("/metadata/statuses")
def add_status(payload: MetadataItemRequest, code: str | None = Header(default=None)) -> dict[str, list[str]]:
    _verify_access(code)
    store = _load_store()
    name = _normalize(payload.name)
    if not name:
        raise HTTPException(status_code=400, detail="Status name is required")
    if name not in store.setdefault("statuses", []):
        store["statuses"].append(name)
        _save_store(store)
    return {"categories": store.get("categories", []), "statuses": store.get("statuses", [])}


@app.delete("/metadata/statuses/{name}")
def remove_status(name: str, code: str | None = Header(default=None)) -> dict[str, list[str]]:
    _verify_access(code)
    store = _load_store()
    cleaned_name = _normalize(name)
    if cleaned_name in store.get("statuses", []):
        store["statuses"].remove(cleaned_name)
        _save_store(store)
    return {"categories": store.get("categories", []), "statuses": store.get("statuses", [])}


@app.get("/tasks")
def list_tasks(code: str | None = Header(default=None)) -> dict[str, list[dict[str, Any]]]:
    _verify_access(code)
    store = _load_store()
    return {"tasks": store.get("tasks", [])}


@app.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, code: str | None = Header(default=None)) -> dict[str, Any]:
    _verify_access(code)
    store = _load_store()
    task = {
        "id": str(uuid.uuid4()),
        "title": _normalize(payload.title),
        "description": _normalize(payload.description),
        "category": _normalize(payload.category),
        "status": _normalize(payload.status),
        "completed": payload.completed,
        "published": payload.published,
    }
    store.setdefault("tasks", []).append(task)
    _save_store(store)
    return task


@app.put("/tasks/{task_id}")
def update_task(task_id: str, payload: TaskUpdate, code: str | None = Header(default=None)) -> dict[str, Any]:
    _verify_access(code)
    store = _load_store()
    tasks = store.setdefault("tasks", [])
    task = next((item for item in tasks if item.get("id") == task_id), None)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task["title"] = _normalize(payload.title)
    if payload.description is not None:
        task["description"] = _normalize(payload.description)
    if payload.category is not None:
        task["category"] = _normalize(payload.category)
    if payload.status is not None:
        task["status"] = _normalize(payload.status)
    if payload.completed is not None:
        task["completed"] = payload.completed
    if payload.published is not None:
        task["published"] = payload.published

    _save_store(store)
    return task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, code: str | None = Header(default=None)) -> dict[str, bool]:
    _verify_access(code)
    store = _load_store()
    tasks = store.setdefault("tasks", [])
    filtered = [task for task in tasks if task.get("id") != task_id]
    if len(filtered) == len(tasks):
        raise HTTPException(status_code=404, detail="Task not found")
    store["tasks"] = filtered
    _save_store(store)
    return {"deleted": True}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
