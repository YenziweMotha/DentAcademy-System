"""Send a test email to verify SMTP configuration.

Usage:
    python scripts/test_email.py [recipient@example.com]

Exits non-zero if delivery fails. Prints a hint for the common Gmail
"535 Username and Password not accepted" error (use an app password).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
from services.email_service import send_email

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))


def main() -> int:
    recipient = sys.argv[1] if len(sys.argv) > 1 else "O16sylvester@gmail.com"
    ok = send_email(
        recipient,
        "DentAcademy — SMTP test",
        "<p>This is a test email from the DentAcademy backend. SMTP is working.</p>",
        text_body="This is a test email from the DentAcademy backend. SMTP is working.",
    )
    if ok:
        print(f"OK: test email sent to {recipient}")
        return 0

    print(f"FAILED: could not send to {recipient}")
    print("Check your SMTP_* values in .env (dentacademy-backend/.env).")
    print(
        "For Gmail: the normal account password is rejected (error 535). "
        "Enable 2-Step Verification and create an App Password at "
        "https://myaccount.google.com/apppasswords, then set SMTP_PASSWORD to it."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
