"""Safe file uploads: size limit, real file-type check, random file names."""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

SIGNATURES = {
    ".pdf": [b"%PDF-"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".jpg": [b"\xff\xd8\xff"],
}


def upload_dir(sub: str) -> Path:
    path = Path(get_settings().UPLOAD_DIR).resolve() / sub
    path.mkdir(parents=True, exist_ok=True)
    return path


def _save(file: UploadFile, sub: str, allowed: dict[str, list[bytes]], max_bytes: int, label: str) -> str:
    data = file.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"{label} must be smaller than {max_bytes // (1024 * 1024)} MB.")
    for ext, sigs in allowed.items():
        if any(data.startswith(sig) for sig in sigs):
            name = f"{uuid.uuid4().hex}{ext}"
            (upload_dir(sub) / name).write_bytes(data)
            return name
    raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unsupported file type for {label.lower()}.")


def save_resume(file: UploadFile) -> str:
    return _save(file, "resumes", {".pdf": SIGNATURES[".pdf"]}, 2 * 1024 * 1024, "Resume (PDF only, max 2 MB)")


def save_logo(file: UploadFile) -> str:
    return _save(file, "logos", {".png": SIGNATURES[".png"], ".jpg": SIGNATURES[".jpg"]}, 1024 * 1024, "Logo (PNG or JPG, max 1 MB)")


def delete_file(sub: str, name: str | None) -> None:
    if name:
        try:
            (upload_dir(sub) / Path(name).name).unlink(missing_ok=True)
        except OSError:
            pass
