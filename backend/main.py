import os
import secrets
import hashlib
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────
DATABASE_URL = os.environ["DATABASE_URL"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
STORAGE_BUCKET = "listings"
SESSION_DAYS = 7

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


# ── DB ─────────────────────────────────────────────────────────────────────────
class _ChainableCursor(psycopg2.extras.RealDictCursor):
    """Makes .execute() return the cursor so `.execute(...).fetchone()` keeps working."""

    def execute(self, query, vars=None):
        super().execute(query, vars)
        return self


@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=_ChainableCursor)
    try:
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def create_tables():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                username TEXT DEFAULT '',
                role TEXT DEFAULT 'student',
                is_banned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS listings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT DEFAULT '',
                price REAL NOT NULL,
                category_id INTEGER,
                condition TEXT,
                image_path TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (listing_id) REFERENCES listings(id),
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL,
                reporter_id INTEGER NOT NULL,
                reason TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (listing_id) REFERENCES listings(id),
                FOREIGN KEY (reporter_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)


def migrate_db():
    """Add new columns to existing tables without breaking existing data."""
    with get_db() as conn:
        conn.execute("""
            ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT DEFAULT '';
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
        """)


# ── Helpers ────────────────────────────────────────────────────────────────────
def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _display(row) -> str:
    """Return username if set, else name."""
    username = row.get("username", "") if isinstance(row, dict) else (row["username"] if "username" in row.keys() else "")
    name = row.get("name", "") if isinstance(row, dict) else row["name"]
    return username if username else name


def _create_session(user_id: int) -> str:
    token = secrets.token_hex(32)
    expires_at = (datetime.utcnow() + timedelta(days=SESSION_DAYS)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
            (user_id, token, expires_at),
        )
    return token


def _auth(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization[7:]
    with get_db() as conn:
        row = conn.execute(
            """SELECT s.user_id, s.expires_at, u.email, u.name, u.username, u.role, u.is_banned
               FROM sessions s JOIN users u ON s.user_id = u.id
               WHERE s.token = %s""",
            (token,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    expires_at = row["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Session expired")
    if row["is_banned"]:
        raise HTTPException(status_code=403, detail="Your account has been banned")
    return dict(row)


def _admin(authorization: Optional[str]) -> dict:
    user = _auth(authorization)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def seed_data():
    with get_db() as conn:
        for cat in ["Books", "Electronics", "Notes", "Clothing", "Other"]:
            conn.execute("INSERT INTO categories (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (cat,))
        conn.execute(
            """INSERT INTO users (email, password_hash, name, username, role)
               VALUES (%s, %s, %s, %s, %s) ON CONFLICT (email) DO NOTHING""",
            ("admin@giki.edu.pk", _hash("admin123"), "Admin", "admin", "admin"),
        )


def _public_url(path: str) -> str:
    result = supabase.storage.from_(STORAGE_BUCKET).get_public_url(path)
    if isinstance(result, dict):
        return result.get("publicUrl") or result.get("publicURL")
    return result


def _upload_to_storage(file_bytes: bytes, path: str, content_type: Optional[str]) -> str:
    supabase.storage.from_(STORAGE_BUCKET).upload(
        path, file_bytes, {"content-type": content_type or "application/octet-stream"}
    )
    return _public_url(path)


# ── App ────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    migrate_db()
    seed_data()
    yield


app = FastAPI(title="GIKI Bazaar API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ───────────────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    email: str
    password: str
    name: str
    username: str = ""


class LoginBody(BaseModel):
    email: str
    password: str


def _user_response(user_row) -> dict:
    u = dict(user_row)
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "username": u.get("username") or u["name"],
        "role": u["role"],
    }


@app.post("/auth/register")
def register(body: RegisterBody):
    if not body.email.endswith("@giki.edu.pk"):
        raise HTTPException(
            status_code=400,
            detail="Only GIKI students can register. Use your GIKI email.",
        )
    username = body.username.strip() or body.email.split("@")[0]
    with get_db() as conn:
        if conn.execute("SELECT 1 FROM users WHERE email = %s", (body.email,)).fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        if conn.execute("SELECT 1 FROM users WHERE username = %s", (username,)).fetchone():
            raise HTTPException(status_code=400, detail="Username already taken")
        conn.execute(
            "INSERT INTO users (email, password_hash, name, username) VALUES (%s, %s, %s, %s)",
            (body.email, _hash(body.password), body.name, username),
        )
        user = conn.execute(
            "SELECT * FROM users WHERE email = %s", (body.email,)
        ).fetchone()
    token = _create_session(user["id"])
    return {"token": token, "user": _user_response(user)}


@app.post("/auth/login")
def login(body: LoginBody):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = %s", (body.email,)).fetchone()
    if not user or user["password_hash"] != _hash(body.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user["is_banned"]:
        raise HTTPException(status_code=403, detail="Your account has been banned")
    token = _create_session(user["id"])
    return {"token": token, "user": _user_response(user)}


@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        with get_db() as conn:
            conn.execute("DELETE FROM sessions WHERE token = %s", (token,))
    return {"message": "Logged out"}


# ── Categories ─────────────────────────────────────────────────────────────────
@app.get("/categories")
def get_categories():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    return [dict(r) for r in rows]


# ── My listings ────────────────────────────────────────────────────────────────
@app.get("/my-listings")
def my_listings(authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    with get_db() as conn:
        rows = conn.execute(
            """SELECT l.*, COALESCE(NULLIF(u.username,''), u.name) AS seller_username,
                      c.name AS category_name
               FROM listings l
               JOIN users u ON l.user_id = u.id
               LEFT JOIN categories c ON l.category_id = c.id
               WHERE l.user_id = %s
               ORDER BY l.created_at DESC""",
            (user["user_id"],),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Listings ───────────────────────────────────────────────────────────────────
@app.get("/listings")
def list_listings(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
):
    sql = """SELECT l.*, COALESCE(NULLIF(u.username,''), u.name) AS seller_username,
                    c.name AS category_name
             FROM listings l
             JOIN users u ON l.user_id = u.id
             LEFT JOIN categories c ON l.category_id = c.id
             WHERE l.status = 'approved'"""
    params: list = []
    if search:
        sql += " AND (l.title LIKE %s OR l.description LIKE %s)"
        params += [f"%{search}%", f"%{search}%"]
    if category:
        sql += " AND c.name = %s"
        params.append(category)
    if condition:
        sql += " AND l.condition = %s"
        params.append(condition)
    sql += " ORDER BY l.created_at DESC"
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


@app.get("/listings/{listing_id}")
def get_listing(listing_id: int):
    with get_db() as conn:
        row = conn.execute(
            """SELECT l.*, COALESCE(NULLIF(u.username,''), u.name) AS seller_username,
                      c.name AS category_name
               FROM listings l
               JOIN users u ON l.user_id = u.id
               LEFT JOIN categories c ON l.category_id = c.id
               WHERE l.id = %s""",
            (listing_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Listing not found")
    return dict(row)


@app.post("/listings")
async def create_listing(
    title: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    category_id: int = Form(...),
    condition: str = Form(...),
    image: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
):
    user = _auth(authorization)
    image_path = None
    if image and image.filename:
        ext = Path(image.filename).suffix.lower()
        filename = secrets.token_hex(8) + ext
        contents = await image.read()
        image_path = _upload_to_storage(contents, filename, image.content_type)
    with get_db() as conn:
        listing_id = conn.execute(
            """INSERT INTO listings (user_id, title, description, price, category_id, condition, image_path)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (user["user_id"], title, description, price, category_id, condition, image_path),
        ).fetchone()["id"]
    return {"id": listing_id, "message": "Listing submitted for approval"}


@app.delete("/listings/{listing_id}")
def delete_listing(listing_id: int, authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    with get_db() as conn:
        listing = conn.execute("SELECT user_id FROM listings WHERE id = %s", (listing_id,)).fetchone()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing["user_id"] != user["user_id"] and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        conn.execute("UPDATE listings SET status = 'deleted' WHERE id = %s", (listing_id,))
    return {"message": "Listing deleted"}


@app.put("/listings/{listing_id}/sold")
def mark_sold(listing_id: int, authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    with get_db() as conn:
        listing = conn.execute("SELECT user_id FROM listings WHERE id = %s", (listing_id,)).fetchone()
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        if listing["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        conn.execute("UPDATE listings SET status = 'sold' WHERE id = %s", (listing_id,))
    return {"message": "Listing marked as sold"}


class ReportBody(BaseModel):
    reason: str = ""


@app.post("/listings/{listing_id}/report")
def report_listing(listing_id: int, body: ReportBody, authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    with get_db() as conn:
        if not conn.execute("SELECT 1 FROM listings WHERE id = %s", (listing_id,)).fetchone():
            raise HTTPException(status_code=404, detail="Listing not found")
        conn.execute(
            "INSERT INTO reports (listing_id, reporter_id, reason) VALUES (%s, %s, %s)",
            (listing_id, user["user_id"], body.reason),
        )
    return {"message": "Report submitted"}


# ── Messages ───────────────────────────────────────────────────────────────────
@app.get("/messages")
def get_conversations(authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    uid = user["user_id"]
    with get_db() as conn:
        rows = conn.execute(
            """SELECT m.listing_id, m.content, m.created_at,
                      m.sender_id, m.receiver_id,
                      COALESCE(NULLIF(s.username,''), s.name) AS sender_display,
                      COALESCE(NULLIF(r.username,''), r.name) AS receiver_display,
                      l.title AS listing_title
               FROM messages m
               JOIN users s ON s.id = m.sender_id
               JOIN users r ON r.id = m.receiver_id
               JOIN listings l ON l.id = m.listing_id
               WHERE m.sender_id = %s OR m.receiver_id = %s
               ORDER BY m.created_at DESC""",
            (uid, uid),
        ).fetchall()

    # Group by listing_id, keeping most-recent message per listing
    seen: dict = {}
    for row in rows:
        r = dict(row)
        lid = r["listing_id"]
        if lid not in seen:
            is_sender = r["sender_id"] == uid
            other_id = r["receiver_id"] if is_sender else r["sender_id"]
            other_name = r["receiver_display"] if is_sender else r["sender_display"]
            seen[lid] = {
                "listing_id": lid,
                "listing_title": r["listing_title"],
                "last_message": r["content"],
                "last_message_at": r["created_at"],
                "other_user_id": other_id,
                "other_user_name": other_name,
            }
    return list(seen.values())


@app.get("/messages/{listing_id}")
def get_messages(listing_id: int, authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    uid = user["user_id"]
    with get_db() as conn:
        rows = conn.execute(
            """SELECT m.*,
                      COALESCE(NULLIF(s.username,''), s.name) AS sender_display,
                      COALESCE(NULLIF(r.username,''), r.name) AS receiver_display
               FROM messages m
               JOIN users s ON m.sender_id = s.id
               JOIN users r ON m.receiver_id = r.id
               WHERE m.listing_id = %s AND (m.sender_id = %s OR m.receiver_id = %s)
               ORDER BY m.created_at ASC""",
            (listing_id, uid, uid),
        ).fetchall()
    return [dict(r) for r in rows]


@app.post("/messages/upload")
async def upload_message_image(
    image: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    _auth(authorization)
    ext = Path(image.filename).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        raise HTTPException(status_code=400, detail="Unsupported image format")
    path = "messages/" + secrets.token_hex(10) + ext
    contents = await image.read()
    image_url = _upload_to_storage(contents, path, image.content_type)
    return {"image_url": image_url}


class MessageBody(BaseModel):
    listing_id: int
    receiver_id: int
    content: str = ""
    image_url: Optional[str] = None


@app.post("/messages")
def send_message(body: MessageBody, authorization: Optional[str] = Header(None)):
    user = _auth(authorization)
    if not body.content.strip() and not body.image_url:
        raise HTTPException(status_code=400, detail="Message must have text or an image")
    with get_db() as conn:
        conn.execute(
            "INSERT INTO messages (listing_id, sender_id, receiver_id, content, image_url) VALUES (%s, %s, %s, %s, %s)",
            (body.listing_id, user["user_id"], body.receiver_id, body.content, body.image_url),
        )
    return {"message": "Message sent"}


# ── Admin ──────────────────────────────────────────────────────────────────────
@app.get("/admin/stats")
def admin_stats(authorization: Optional[str] = Header(None)):
    _admin(authorization)
    with get_db() as conn:
        return {
            "users": conn.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"],
            "listings": conn.execute("SELECT COUNT(*) AS count FROM listings").fetchone()["count"],
            "reports": conn.execute("SELECT COUNT(*) AS count FROM reports").fetchone()["count"],
            "messages": conn.execute("SELECT COUNT(*) AS count FROM messages").fetchone()["count"],
        }


@app.get("/admin/listings")
def admin_listings(status: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    _admin(authorization)
    sql = """SELECT l.*, COALESCE(NULLIF(u.username,''), u.name) AS seller_username,
                    c.name AS category_name
             FROM listings l
             JOIN users u ON l.user_id = u.id
             LEFT JOIN categories c ON l.category_id = c.id"""
    params: list = []
    if status:
        sql += " WHERE l.status = %s"
        params.append(status)
    sql += " ORDER BY l.created_at DESC"
    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


class StatusBody(BaseModel):
    status: str


@app.put("/admin/listings/{listing_id}/status")
def admin_update_status(listing_id: int, body: StatusBody, authorization: Optional[str] = Header(None)):
    _admin(authorization)
    if body.status not in ("pending", "approved", "rejected", "deleted"):
        raise HTTPException(status_code=400, detail="Invalid status")
    with get_db() as conn:
        conn.execute("UPDATE listings SET status = %s WHERE id = %s", (body.status, listing_id))
    return {"message": f"Listing {body.status}"}


@app.get("/admin/users")
def admin_users(authorization: Optional[str] = Header(None)):
    _admin(authorization)
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, email, name, COALESCE(NULLIF(username,''), name) AS username,
                      role, is_banned, created_at
               FROM users ORDER BY created_at DESC"""
        ).fetchall()
    return [dict(r) for r in rows]


@app.put("/admin/users/{user_id}/ban")
def admin_toggle_ban(user_id: int, authorization: Optional[str] = Header(None)):
    _admin(authorization)
    with get_db() as conn:
        target = conn.execute("SELECT is_banned FROM users WHERE id = %s", (user_id,)).fetchone()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        new_ban = 0 if target["is_banned"] else 1
        conn.execute("UPDATE users SET is_banned = %s WHERE id = %s", (new_ban, user_id))
    return {"is_banned": bool(new_ban)}


@app.get("/admin/reports")
def admin_reports(authorization: Optional[str] = Header(None)):
    _admin(authorization)
    with get_db() as conn:
        rows = conn.execute(
            """SELECT
                r.id,
                r.reason,
                r.created_at AS reported_at,
                r.listing_id,
                COALESCE(NULLIF(u.username,''), u.name) AS reported_by_username,
                l.title  AS listing_title,
                l.price  AS listing_price,
                l.status AS listing_status
               FROM reports r
               JOIN users u ON r.reporter_id = u.id
               JOIN listings l ON r.listing_id = l.id
               ORDER BY r.created_at DESC"""
        ).fetchall()
    return [dict(r) for r in rows]


@app.delete("/admin/reports/{report_id}")
def admin_dismiss_report(report_id: int, authorization: Optional[str] = Header(None)):
    _admin(authorization)
    with get_db() as conn:
        conn.execute("DELETE FROM reports WHERE id = %s", (report_id,))
    return {"message": "Report dismissed"}


@app.get("/health")
def health():
    return {"status": "ok"}
