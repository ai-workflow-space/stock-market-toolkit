"""
Email notification body builder for alert triggers.
"""

from datetime import datetime

CONDITION_LABELS = {
    "above": "🔼 Above",
    "below": "🔽 Below",
    "pct_change_up": "📈 +% Up",
    "pct_change_down": "📉 -% Down",
}


def _build_email_body(
    symbol: str,
    alert,  # Alert model
    current_price: float,
    triggered_at: datetime,
) -> str:
    condition_label = CONDITION_LABELS.get(alert.condition_type, alert.condition_type)
    threshold_str = (
        f"${alert.threshold:.2f}"
        if alert.condition_type in ("above", "below")
        else f"{alert.threshold:.1f}%"
    )
    return f"""<h2>Price Alert Triggered</h2>
<p><b>Symbol:</b> {symbol}</p>
<p><b>Condition:</b> {condition_label}</p>
<p><b>Current Price:</b> ${current_price:.2f}</p>
<p><b>Threshold:</b> {threshold_str}</p>
<p><b>Triggered At:</b> {triggered_at.strftime("%Y-%m-%d %H:%M UTC")}</p>
<hr>
<p>View and manage your alerts at <a href="https://stock-toolkit.app/alerts">stock-toolkit.app</a>.</p>"""