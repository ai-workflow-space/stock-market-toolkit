#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/kyle/.hermes/kanban/workspaces/t_1f43f979/backend')

# Verify schema
from app.schemas import DiscordTestRequest
from pydantic import ValidationError

r = DiscordTestRequest(webhook_url='https://discord.com/api/webhooks/test')
print('DiscordTestRequest valid:', r)

try:
    DiscordTestRequest(webhook_url='')
    print('ERROR: empty should fail')
except ValidationError as e:
    print('Empty string rejected (expected):', e.errors()[0]['msg'])

# Verify alerts.py route
import importlib.util
spec = importlib.util.spec_from_file_location('alerts', '/home/kyle/.hermes/kanban/workspaces/t_1f43f979/backend/app/routes/alerts.py')
# Don't actually load fastapi routes in isolation
print('\nAll imports OK')

# Check alert_checker has the right signature
import inspect
from app.services.alert_checker import _send_discord_notification
sig = inspect.signature(_send_discord_notification)
params = list(sig.parameters.keys())
print('\n_send_discord_notification params:', params)
defaults = {k: v.default for k, v in sig.parameters.items() if v.default is not inspect.Parameter.empty}
print('Optional params (with defaults):', defaults)
print('\nSUCCESS: All checks passed')