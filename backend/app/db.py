import importlib
from pymongo import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "").strip()

try:
    motor_module = importlib.import_module("motor.motor_asyncio")
    AsyncIOMotorClient = getattr(motor_module, "AsyncIOMotorClient")
    client = AsyncIOMotorClient(MONGO_URI, server_api=ServerApi("1"))
except ImportError:
    client = MongoClient(MONGO_URI, server_api=ServerApi("1"))

db = client["shrishailya_ops"]

# collections
tasks_col = db["tasks"]
portfolio_col = db["portfolio_items"]
users_col = db["users"]
audit_col = db["audit_logs"]