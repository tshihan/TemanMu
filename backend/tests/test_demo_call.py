"""Call confirmation boundaries without a database or telephone provider."""
from contextlib import asynccontextmanager
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.services import monitoring
from app.timeutil import utc_now


@pytest.mark.asyncio
@pytest.mark.parametrize('state,expired,controllable,started,accepted', [
    ('grace', False, True, True, True),
    ('grace', True, True, True, False),
    ('notified', False, True, True, False),
    ('acknowledged', False, True, True, False),
    ('closed', False, True, True, False),
    ('grace', False, False, True, False),
    ('grace', False, True, False, False),
])
async def test_demo_call_requires_current_grace_and_explicit_confirmation(monkeypatch, state, expired, controllable, started, accepted):
    at = utc_now()
    incident = SimpleNamespace(state=state, grace_ends_at=at + timedelta(seconds=-1 if expired else 30),
                               events=[SimpleNamespace(type='voice_call_started')] if started else [])
    unit = SimpleNamespace(unit_id=monitoring.settings.controllable_unit_id, controllable=controllable)

    @asynccontextmanager
    async def context():
        yield connection

    connection = SimpleNamespace(transaction=context)
    monkeypatch.setattr(monitoring, 'get_pool', lambda: SimpleNamespace(acquire=context))
    monkeypatch.setattr(monitoring, '_incident_unit_id', AsyncMock(return_value=unit.unit_id))
    monkeypatch.setattr(monitoring.db_incidents, 'get_incident_for_update', AsyncMock(return_value=incident))
    monkeypatch.setattr(monitoring.db_units, 'get_unit', AsyncMock(return_value=unit))
    update_incident = AsyncMock()
    update_unit = AsyncMock(return_value=unit)
    monkeypatch.setattr(monitoring.db_incidents, 'update_incident', update_incident)
    monkeypatch.setattr(monitoring.db_incidents, 'add_incident_event', AsyncMock(return_value=incident))
    monkeypatch.setattr(monitoring.db_units, 'update_unit_state', update_unit)
    monkeypatch.setattr(monitoring.realtime, 'broadcast', AsyncMock())
    cancel = Mock()
    monkeypatch.setattr(monitoring.timers, 'cancel_incident', cancel)
    monkeypatch.setattr(monitoring, '_arm_watch_locked', AsyncMock())
    if not accepted:
        with pytest.raises(monitoring.IncidentConflict):
            await monitoring.confirm_demo_call('demo-id')
        update_incident.assert_not_awaited()
        update_unit.assert_not_awaited()
        return
    await monitoring.confirm_demo_call('demo-id')
    assert update_incident.call_args.kwargs['state'] == 'closed'
    assert update_incident.call_args.kwargs['outcome'] == 'resident_ok'
    assert 'last_water_activity_at' not in update_unit.call_args.kwargs
    assert update_unit.call_args.kwargs['last_caregiver_confirmation_at'] is not None
    cancel.assert_called_once_with('demo-id')


def test_demo_call_body_requires_explicit_safe_confirmation():
    from pydantic import ValidationError
    from app.api.demo import CallConfirmation
    for body in ({}, {'confirmed_safe': False}):
        with pytest.raises(ValidationError):
            CallConfirmation(**body)
    assert CallConfirmation(confirmed_safe=True).confirmed_safe is True
