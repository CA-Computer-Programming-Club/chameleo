from typing import Union, List
from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form,
    Body,
    Depends,
    Header,
)
from jose import JWTError, jwt
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid
import sqlite3
import os
from pathlib import Path
from datetime import datetime, timezone
from auth import router as auth_router
from config import SECRET_KEY, ALGORITHM

app = FastAPI()
app.include_router(auth_router)

DATABASE_URL = "database.db"

MAX_TITLE_LEN = 500
MAX_LOCATION_LEN = 500
MAX_DESCRIPTION_LEN = 3000


class CurrentUser(BaseModel):
    id: str
    email: str | None = None
    name: str | None = None


async def get_current_user(authorization: str = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth header")
    token = authorization.split(" ", 1)[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return CurrentUser(
            id=user_id,
            email=payload.get("email"),
            name=payload.get("name"),
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db_connection():
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT CHECK (type IN ('lost', 'found')) NOT NULL,
            title TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT,
            image_filename TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            user_id TEXT,
            user_name TEXT,
            user_email TEXT,
            is_resolved INTEGER DEFAULT 0
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_type ON items(type)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_location ON items(location)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON items(created_at)")
    conn.commit()
    conn.close()


# Initialize database on startup
init_db()

origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8080",
    "https://cacpc.dev",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

UPLOAD_DIR = "uploads"
Path(UPLOAD_DIR).mkdir(exist_ok=True)

# Mount uploaded images so frontend can fetch them via URL
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


class ItemCreate(BaseModel):
    type: str
    title: str
    location: str
    description: str
    image_filename: str = None


class ItemResponse(BaseModel):
    id: int
    type: str
    title: str
    location: str
    description: str
    image_filename: str | None = None
    created_at: str
    updated_at: str
    user_id: str | None = None
    user_name: str | None = None


def validate_text_field(name: str, value: str, max_len: int):
    if not value or not value.strip():
        raise HTTPException(status_code=400, detail=f"{name} is required")
    if len(value) > max_len:
        raise HTTPException(status_code=400, detail=f"{name} too long")
    return value


def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file and return the filename"""
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        content = file.file.read()
        # if len(content) > MAX_FILE_SIZE:
        # raise HTTPException(status_code=400, detail="File too large")
        buffer.write(content)

    return filename


@app.post("/add_lost_item")
async def add_lost_item(
    title: str = Form(...),
    location: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(None),
    current_user: CurrentUser = Depends(get_current_user),
):
    return await add_item_to_db(
        "lost",
        title,
        location,
        description,
        current_user.id,
        current_user.name or "",
        current_user.email or "",
        image,
    )


@app.post("/add_found_item")
async def add_found_item(
    title: str = Form(...),
    location: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(None),
    current_user: CurrentUser = Depends(get_current_user),
):
    return await add_item_to_db(
        "found",
        title,
        location,
        description,
        current_user.id,
        current_user.name or "",
        current_user.email or "",
        image,
    )


# TODO UPDATE ITEMS
# updated_at = utc_now_iso()

# cursor.execute(
#     """
#     UPDATE items
#     SET title = ?, description = ?, updated_at = ?
#     WHERE id = ?
#     """,
#     (title, description, updated_at, item_id),
# )


async def add_item_to_db(
    item_type: str,
    title: str,
    location: str,
    description: str,
    user_id: str,
    user_name: str,
    user_email: str,
    image: UploadFile = None,
):
    conn = get_db_connection()
    cursor = conn.cursor()

    title = validate_text_field("Title", title, MAX_TITLE_LEN)
    location = validate_text_field("Location", location, MAX_LOCATION_LEN)
    description = validate_text_field("Description", description, MAX_DESCRIPTION_LEN)

    try:
        image_filename = None
        if image and image.filename:
            image_filename = save_uploaded_file(image)

        created_at = utc_now_iso()
        updated_at = created_at

        cursor.execute(
            """
            INSERT INTO items (
                type, title, location, description,
                image_filename, created_at, updated_at, user_id, user_name, user_email
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_type,
                title,
                location,
                description,
                image_filename,
                created_at,
                updated_at,
                user_id,
                user_name,
                user_email,
            ),
        )

        item_id = cursor.lastrowid
        conn.commit()

        created_item = cursor.execute(
            "SELECT * FROM items WHERE id = ?", (item_id,)
        ).fetchone()

        conn.close()

        return dict(created_item)
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error adding item: {str(e)}")


@app.get("/get_lost_items")
def get_lost_items():
    return get_items_by_type("lost")


@app.get("/get_found_items")
def get_found_items():
    return get_items_by_type("found")


def get_items_by_type(item_type: str):
    conn = get_db_connection()
    try:
        items = conn.execute(
            "SELECT * FROM items WHERE type = ? ORDER BY created_at DESC", (item_type,)
        ).fetchall()
        conn.close()
        return [dict(item) for item in items]
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error fetching items: {str(e)}")


@app.get("/get_all_items")
def get_all_items():
    conn = get_db_connection()
    try:
        items = conn.execute("SELECT * FROM items ORDER BY created_at DESC").fetchall()
        conn.close()
        return [dict(item) for item in items]
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error fetching items: {str(e)}")


@app.get("/get_item/{item_id}")
def get_item(item_id: int):
    conn = get_db_connection()
    try:
        item = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        conn.close()
        if item:
            return dict(item)
        else:
            raise HTTPException(status_code=404, detail="Item not found")
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error fetching item: {str(e)}")


@app.post("/mark_resolved/{item_id}")
def mark_resolved(
    item_id: int,
    current_user: CurrentUser = Depends(get_current_user),
):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        item = cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()

        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        if item["user_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not allowed")

        cursor.execute(
            """
            UPDATE items
            SET is_resolved = 1,
                updated_at = ?
            WHERE id = ?
            """,
            (utc_now_iso(), item_id),
        )
        conn.commit()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking resolved: {str(e)}")
    finally:
        conn.close()


@app.get("/me")
def read_me(current_user: CurrentUser = Depends(get_current_user)):
    return current_user
