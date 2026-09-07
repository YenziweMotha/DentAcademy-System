"""SMTP email delivery for DentAcademy (password reset, notifications)."""
import logging
import smtplib
import os
from email.message import EmailMessage

logger = logging.getLogger("dentacademy.email")

DEFAULT_FROM = "DentAcademy <no-reply@dentacademy.co.za>"


def _smtp_config() -> dict:
    return {
        "host": os.getenv("SMTP_HOST"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "username": os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER"),
        "password": os.getenv("SMTP_PASSWORD"),
        "from_addr": os.getenv("SMTP_FROM", DEFAULT_FROM),
    }


def smtp_enabled() -> bool:
    cfg = _smtp_config()
    return bool(cfg["host"] and cfg["username"] and cfg["password"])


def send_email(to_address: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """Send an HTML email via SMTP. Returns True on success.

    Never raises: failures are logged so request handling is unaffected.
    """
    cfg = _smtp_config()
    if not cfg["host"] or not cfg["username"] or not cfg["password"]:
        logger.warning("SMTP not configured; email to %s not sent", to_address)
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_address
    msg.set_content(text_body or "Please view this email in an HTML-capable client.")
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=15) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(cfg["username"], cfg["password"])
            server.send_message(msg)
        logger.info("Email sent to %s", to_address)
        return True
    except Exception as exc:  # noqa: BLE001 - never break the request on mail failure
        logger.error("SMTP send to %s failed: %s", to_address, exc)
        if "535" in str(exc):
            logger.error(
                "Gmail rejected the credentials (535). Use an App Password, not the "
                "normal account password: https://myaccount.google.com/apppasswords"
            )
        return False


def send_account_credentials_email(
    to_address: str, username: str, password: str, full_name: str
) -> bool:
    """Deliver a newly created account's username and one-time password."""
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    login_link = f"{base_url}/login"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #145224;">DentAcademy — Your account is ready</h2>
      <p>Hi {full_name},</p>
      <p>An account has been created for you on the DentAcademy apprenticeship portal.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Username</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">{username}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:bold;">Password</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">{password}</td>
        </tr>
      </table>
      <p>
        <a href="{login_link}"
           style="background:#145224;color:#fff;padding:10px 18px;text-decoration:none;
                  border-radius:6px;display:inline-block;">
          Sign in now
        </a>
      </p>
      <p>We strongly recommend you change your password after your first sign-in.</p>
      <p>If you did not expect this email, please ignore it.</p>
    </div>
    """
    return send_email(
        to_address,
        "DentAcademy — Your account credentials",
        html,
        text_body=(
            f"Hi {full_name},\n\nYour DentAcademy account has been created.\n"
            f"Username: {username}\nPassword: {password}\n\n"
            f"Sign in at {login_link}"
        ),
    )


def send_password_reset_email(to_address: str, reset_token: str) -> bool:
    """Deliver a single-use password reset token (30-minute expiry)."""
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{base_url}/reset-password?token={reset_token}&email={to_address}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1e3a8a;">DentAcademy — Password Reset</h2>
      <p>You requested a password reset for your DentAcademy account.</p>
      <p>
        <a href="{reset_link}"
           style="background:#1e3a8a;color:#fff;padding:10px 18px;text-decoration:none;
                  border-radius:6px;display:inline-block;">
          Reset my password
        </a>
      </p>
      <p>Or paste this link into your browser:<br/>{reset_link}</p>
      <p>This link expires in <strong>30 minutes</strong> and can be used only once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
    """
    return send_email(
        to_address,
        "DentAcademy Password Reset",
        html,
        text_body=f"Reset your DentAcademy password within 30 minutes: {reset_link}",
    )
