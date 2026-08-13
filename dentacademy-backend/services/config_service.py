"""Centralised, configurable system settings (SRS: configurable thresholds/periods).

Stored in the `settings` table with documented defaults so the system
remains fully functional before an administrator edits them.
"""
from sqlalchemy.orm import Session
from models.settings import SystemSetting

DEFAULT_SETTINGS = {
    "evaluation_alert_days": ("30", "Days without an evaluation before an alert is raised"),
    "dropout_risk_threshold": ("60", "Dropout-risk percentage above which an apprentice is flagged at risk"),
    "account_lockout_minutes": ("30", "Minutes an account stays locked after failed login attempts"),
    "password_reset_expire_minutes": ("30", "Minutes a password reset token remains valid"),
}

_KEY_TYPES = {
    "evaluation_alert_days": int,
    "dropout_risk_threshold": int,
    "account_lockout_minutes": int,
    "password_reset_expire_minutes": int,
}

_KEY_RANGES = {
    "dropout_risk_threshold": (1, 100),
    "evaluation_alert_days": (1, 365),
    "account_lockout_minutes": (1, 1440),
    "password_reset_expire_minutes": (1, 1440),
}


def ensure_default_settings(db: Session) -> None:
    for key, (default, description) in DEFAULT_SETTINGS.items():
        if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
            db.add(SystemSetting(key=key, value=default, description=description))
    db.commit()


def get_setting(db: Session, key: str) -> str:
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row is not None:
        return row.value
    default = DEFAULT_SETTINGS.get(key)
    return default[0] if default else None


def get_int_setting(db: Session, key: str) -> int:
    value = get_setting(db, key)
    try:
        return int(value)
    except (TypeError, ValueError):
        return int(DEFAULT_SETTINGS[key][0])


def update_setting(db: Session, key: str, value: str) -> SystemSetting:
    if key not in DEFAULT_SETTINGS:
        raise ValueError(f"Unknown setting key: {key}")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ValueError(f"Setting '{key}' must be an integer")
    if key in _KEY_RANGES:
        low, high = _KEY_RANGES[key]
        if not (low <= parsed <= high):
            raise ValueError(f"Setting '{key}' must be between {low} and {high}")
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row is None:
        row = SystemSetting(
            key=key, value=value, description=DEFAULT_SETTINGS[key][1]
        )
        db.add(row)
    else:
        row.value = value
    db.commit()
    db.refresh(row)
    return row
