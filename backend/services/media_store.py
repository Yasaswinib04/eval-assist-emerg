"""Durable media storage backed by MongoDB.

Render's default disk is ephemeral — every redeploy wipes /media/uploads
and the answer-sheet images the teacher uploaded are lost. To survive
redeploys we also stash each uploaded file's bytes in MongoDB, and fall
back to serving from Mongo when the on-disk copy is missing.

Files are small JPEGs (~200KB–1MB); well under Mongo's 16MB doc limit,
so a plain document per file is fine — no GridFS needed.
"""

import base64
import mimetypes
from datetime import datetime, timezone
from typing import Optional, Tuple

COLLECTION = "media_files"
# Hard cap so a runaway upload can't blow past the 16MB BSON limit.
MAX_BYTES = 12 * 1024 * 1024


def guess_content_type(path: str) -> str:
    ct, _ = mimetypes.guess_type(path)
    return ct or "application/octet-stream"


async def store_bytes(db, rel_path: str, data: bytes) -> bool:
    """Persist file bytes for `rel_path` in Mongo. Returns True on success.

    Best-effort — failures (oversize file, Mongo hiccup) are logged and
    swallowed so a durability-layer glitch never breaks an upload that
    succeeded on disk.
    """
    if not data or len(data) > MAX_BYTES:
        print(f"[media_store] skip {rel_path}: size={len(data)} exceeds cap")
        return False
    try:
        await db[COLLECTION].update_one(
            {"_id": rel_path},
            {"$set": {
                "_id": rel_path,
                "data": base64.b64encode(data).decode("ascii"),
                "size": len(data),
                "contentType": guess_content_type(rel_path),
                "storedAt": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        return True
    except Exception as e:
        print(f"[media_store] store failed for {rel_path}: {e}")
        return False


async def fetch_bytes(db, rel_path: str) -> Optional[Tuple[bytes, str]]:
    """Return (bytes, content_type) if `rel_path` is stored in Mongo, else None."""
    try:
        doc = await db[COLLECTION].find_one({"_id": rel_path})
    except Exception as e:
        print(f"[media_store] fetch failed for {rel_path}: {e}")
        return None
    if not doc or "data" not in doc:
        return None
    try:
        return base64.b64decode(doc["data"]), doc.get("contentType") or guess_content_type(rel_path)
    except Exception as e:
        print(f"[media_store] decode failed for {rel_path}: {e}")
        return None


async def restore_to_disk(db, rel_path: str, abs_path: str) -> bool:
    """Re-materialize a Mongo-stored file at `abs_path`. Returns True if the
    file now exists on disk (already present, or restored from Mongo)."""
    import os
    if os.path.exists(abs_path):
        return True
    fetched = await fetch_bytes(db, rel_path)
    if not fetched:
        return False
    data, _ = fetched
    try:
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"[media_store] restore failed for {rel_path}: {e}")
        return False
