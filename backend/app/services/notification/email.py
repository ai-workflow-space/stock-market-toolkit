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


def _threshold_str(alert) -> str:
    """Human-readable threshold; tolerates a null threshold (multi-condition alerts)."""
    if alert.threshold is None:
        return "n/a"
    if alert.condition_type in ("above", "below"):
        return f"${alert.threshold:.2f}"
    return f"{alert.threshold:.1f}%"


def _interpolate(template: str, variables: dict) -> str:
    """Replace each literal {key} placeholder with its value (one pass per key)."""
    result = template
    for key, value in variables.items():
        result = result.replace(key, str(value))
    return result


def render_alert_email(
    settings,  # NotificationSettings
    symbol: str,
    alert,  # Alert model
    current_price: float,
    triggered_at: datetime,
) -> tuple[str, str]:
    """Build (subject, html_body) for a triggered alert.

    Honors the user's custom email_subject/email_body templates when set
    (placeholders: {symbol} {price} {condition} {threshold} {triggered_at}),
    falling back to the default subject/body otherwise. An empty string counts
    as "unset" so a blank field still gets the default. CR/LF are stripped from
    the subject to prevent SMTP header injection.
    """
    variables = {
        "{symbol}": symbol,
        "{price}": f"{current_price:.2f}",
        "{condition}": CONDITION_LABELS.get(alert.condition_type, alert.condition_type),
        "{threshold}": _threshold_str(alert),
        "{triggered_at}": triggered_at.strftime("%Y-%m-%d %H:%M UTC"),
    }

    subject = settings.email_subject or f"Price Alert: {symbol}"
    subject = _interpolate(subject, variables).replace("\r", " ").replace("\n", " ")

    if settings.email_body:
        body = _interpolate(settings.email_body, variables)
    else:
        body = _build_email_body(symbol, alert, current_price, triggered_at)

    return subject, body


def _build_email_body(
    symbol: str,
    alert,  # Alert model
    current_price: float,
    triggered_at: datetime,
) -> str:
    condition_label = CONDITION_LABELS.get(alert.condition_type, alert.condition_type)
    threshold_str = _threshold_str(alert)
    return f"""<h2>Price Alert Triggered</h2>
<p><b>Symbol:</b> {symbol}</p>
<p><b>Condition:</b> {condition_label}</p>
<p><b>Current Price:</b> ${current_price:.2f}</p>
<p><b>Threshold:</b> {threshold_str}</p>
<p><b>Triggered At:</b> {triggered_at.strftime("%Y-%m-%d %H:%M UTC")}</p>
<hr>
<p>View and manage your alerts at <a href="https://stock-toolkit.app/alerts">stock-toolkit.app</a>.</p>"""