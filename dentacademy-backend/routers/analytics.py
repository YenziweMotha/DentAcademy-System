from datetime import date, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.attendance import Attendance
from models.prediction import AIPrediction

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def analytics_overview(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    # Attendance average (filtered by period range)
    att_query = db.query(Attendance.attendance_rate)
    if start_date:
        att_query = att_query.filter(Attendance.period_start >= start_date)
    if end_date:
        att_query = att_query.filter(Attendance.period_end <= end_date)
    attendance = att_query.all()
    rates = [float(a[0]) for a in attendance if a[0] is not None]
    avg_attendance = round(sum(rates) / len(rates), 2) if rates else 0

    # Dropout risk distribution (filtered by generated_at)
    pred_query = db.query(AIPrediction.dropout_risk)
    if start_date:
        pred_query = pred_query.filter(
            AIPrediction.generated_at >= datetime.combine(start_date, datetime.min.time())
        )
    if end_date:
        pred_query = pred_query.filter(
            AIPrediction.generated_at <= datetime.combine(end_date, datetime.max.time())
        )
    preds = pred_query.all()
    low = mid = high = 0
    for p in preds:
        val = float(p[0]) if p[0] else 0
        if val < 40:
            low += 1
        elif val < 70:
            mid += 1
        else:
            high += 1

    total = low + mid + high or 1

    # Attendance trend (last 6 records within the filtered range)
    trend_query = db.query(Attendance.attendance_rate)
    if start_date:
        trend_query = trend_query.filter(Attendance.period_start >= start_date)
    if end_date:
        trend_query = trend_query.filter(Attendance.period_end <= end_date)
    trend_rows = trend_query.order_by(Attendance.created_at.desc()).limit(6).all()
    trend = [float(r[0]) for r in reversed(trend_rows) if r[0] is not None]

    return {
        "avg_attendance": avg_attendance,
        "trend": trend,
        "risk_distribution": {
            "low": round(low / total * 100, 1),
            "medium": round(mid / total * 100, 1),
            "high": round(high / total * 100, 1),
        },
    }
