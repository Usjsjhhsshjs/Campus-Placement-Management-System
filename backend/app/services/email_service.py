"""Optional email sending through Resend. Never claims success unless the provider confirms."""
import logging

import httpx

from app.core.config import get_settings

logger = logging.getLogger("campusconnect.email")


def send_email(to: str, subject: str, html: str) -> bool:
    """Returns True only if the provider accepted the message. Never raises."""
    settings = get_settings()
    if not settings.RESEND_API_KEY or not settings.EMAIL_FROM:
        logger.info("Email NOT sent (no email provider configured). subject=%r", subject)
        return False
    try:
        response = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html},
            timeout=10,
        )
    except httpx.HTTPError:
        logger.exception("Email NOT sent: could not reach the email provider")
        return False
    if response.status_code in (200, 201):
        return True
    logger.warning("Email NOT sent: provider answered HTTP %s", response.status_code)
    return False
