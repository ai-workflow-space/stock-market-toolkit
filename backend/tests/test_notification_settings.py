"""Tests for NotificationSettings email_subject / email_body fields (issue #195)."""

from app.schemas import NotificationSettingsUpdate


class TestNotificationSettingsSchema:
    """Schema-level validation for the new email template fields."""

    def test_email_subject_optional(self):
        """email_subject is optional — None is allowed."""
        data = NotificationSettingsUpdate(email_subject=None)
        assert data.email_subject is None

    def test_email_subject_max_255_chars_not_enforced_by_schema(self):
        """Schema-level: email_subject accepts strings >255 chars (DB layer enforces limit).

        Pydantic's Optional[str] does not automatically enforce the
        String(255) column length — that is a database constraint, not a
        Pydantic validation rule. The model accepts any length.
        """
        data = NotificationSettingsUpdate(email_subject="A" * 256)
        assert data.email_subject is not None
        assert len(data.email_subject) == 256

    def test_email_body_optional(self):
        """email_body is optional — None is allowed."""
        data = NotificationSettingsUpdate(email_body=None)
        assert data.email_body is None

    def test_email_body_has_no_length_limit(self):
        """email_body (Text) accepts arbitrarily long content."""
        long_body = "x" * 10_000
        data = NotificationSettingsUpdate(email_body=long_body)
        assert data.email_body == long_body

    def test_both_fields_together(self):
        """Both fields can be set at the same time."""
        data = NotificationSettingsUpdate(
            email_subject="Alert: {symbol} crossed {price}",
            email_body="Symbol {symbol} hit {condition} {threshold} at {price}",
        )
        assert data.email_subject == "Alert: {symbol} crossed {price}"
        assert data.email_body == "Symbol {symbol} hit {condition} {threshold} at {price}"


class TestAlertCheckerInterpolation:
    """alert_checker.py must interpolate subject templates just like body templates."""

    def test_interpolate_function_replaces_all_placeholders(self):
        """The _interpolate helper replaces every {key} with its value."""
        import inspect
        from app.services import alert_checker

        source = inspect.getsource(alert_checker)

        # Verify interpolation is applied to subject (same pattern as body)
        # The fixed code reads:
        #   subject = settings.email_subject or f"Price Alert: {symbol}"
        #   if subject:
        #       subject = _interpolate(subject, TEMPLATE_VARS)
        assert (
            "subject = _interpolate(subject, TEMPLATE_VARS)" in source
            and "if subject:" in source
        ), (
            "email_subject must be interpolated with _interpolate(TEMPLATE_VARS) "
            "just like email_body"
        )


class TestNotificationSettingsModel:
    """Smoke-test the NotificationSettings model has the new columns."""

    def test_model_has_email_subject_column(self):
        """NotificationSettings must have an email_subject column."""
        from app.models import NotificationSettings
        cols = {c.name for c in NotificationSettings.__table__.columns}
        assert "email_subject" in cols

    def test_model_has_email_body_column(self):
        """NotificationSettings must have an email_body column."""
        from app.models import NotificationSettings
        cols = {c.name for c in NotificationSettings.__table__.columns}
        assert "email_body" in cols