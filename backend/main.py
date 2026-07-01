from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import csv
import os
from datetime import datetime
from pathlib import Path

app = FastAPI(title="NN Sandbox API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SUBMISSIONS_DIR = Path(__file__).parent / "submissions"
SUBMISSIONS_DIR.mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def frontend():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/submit")
def submit(payload: dict):
    module     = payload.get("module", "unknown")
    student_id = payload.get("student_id", "").strip()
    data       = payload.get("data", {})

    if not student_id:
        return {"status": "error", "message": "Student ID is required"}

    row = {"timestamp": datetime.now().isoformat(), "student_id": student_id, **data}
    csv_path = SUBMISSIONS_DIR / f"{module}_submissions.csv"
    file_exists = csv_path.exists()

    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)

    return {"status": "ok", "timestamp": row["timestamp"]}
