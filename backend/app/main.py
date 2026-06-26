from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.db import db
import os

load_dotenv()

app = FastAPI(title="Shrishailya Ops API", version="1.0.0")

origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "shrishailya-ops api is live"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.get("/ping-db")
async def ping_db():
    collections = await db.list_collection_names()
    return {"connected": True, "collections": collections}