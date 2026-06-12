"""
Fronius Solar API V1 adapter.

Maps the Fronius realtime JSON (notably ``GetPowerFlowRealtimeData.fcgi``) onto
the normalized schema defined in :mod:`api.solar.providers.base`.

Fronius responses share a common envelope::

    {
        "Head": {"Status": {"Code": 0, "Reason": "", "UserMessage": ""},
                 "Timestamp": "..."},
        "Body": {"Data": {...}}
    }

``Status.Code == 0`` means success; any other value is an error. Datapoints that
are unavailable are returned as ``null`` (e.g. energy counters on GEN24).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from ..client import SolarApiError, fetch_json
from .base import BaseSolarProvider

# Fronius default API base path (confirmed via GetAPIVersion.cgi.BaseURL).
_API_BASE = 'solar_api/v1/'
_POWER_FLOW = 'GetPowerFlowRealtimeData.fcgi'
_API_VERSION = 'solar_api/GetAPIVersion.cgi'

def _to_float(value: Any) -> Optional[float]:
    """Coerce a vendor number to float, preserving null for missing data."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

class FroniusProvider(BaseSolarProvider):
    key = 'fronius'

    # envelope helpers

    @staticmethod
    def _unwrap(payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the Fronius Head/Body envelope and return Body.Data."""
        head = payload.get('Head', {}) or {}
        status = head.get('Status', {}) or {}
        code = status.get('Code')
        if code not in (0, None):
            message = status.get('UserMessage') or status.get('Reason') or 'Fronius API error'
            raise SolarApiError(message, vendor_code=code)
        return (payload.get('Body', {}) or {}).get('Data', {}) or {}

    # public API

    def discover(self) -> Dict[str, Any]:
        payload = fetch_json(self.base_url, _API_VERSION)
        api_version = str(payload.get('APIVersion', '')) if isinstance(payload, dict) else ''

        # Probe the power-flow feed to learn capabilities (battery/meter).
        overview = self.get_overview()
        return {
            'api_version': api_version,
            'capabilities': overview.get('capabilities', {}),
        }

    def get_overview(self) -> Dict[str, Any]:
        payload = fetch_json(self.base_url, _API_BASE + _POWER_FLOW)

        head = payload.get('Head', {}) or {}
        status = (head.get('Status', {}) or {})
        timestamp = head.get('Timestamp')

        data = self._unwrap(payload)
        site = data.get('Site', {}) or {}
        inverters = data.get('Inverters', {}) or {}

        p_pv = _to_float(site.get('P_PV')) or 0.0
        p_grid = _to_float(site.get('P_Grid'))
        p_load = _to_float(site.get('P_Load'))
        p_akku = _to_float(site.get('P_Akku'))

        # Battery presence: P_Akku present or any inverter reports SOC.
        has_battery = p_akku is not None or any(
            (inv or {}).get('SOC') is not None for inv in inverters.values()
        )
        has_meter = p_grid is not None

        soc = None
        battery_mode = None
        for inv in inverters.values():
            inv = inv or {}
            if inv.get('SOC') is not None:
                soc = _to_float(inv.get('SOC'))
                battery_mode = inv.get('Battery_Mode')
                break

        mode = self._normalize_mode(site.get('Mode'), has_battery, has_meter)

        # Fronius P_Load is reported negative for consumption; normalize to
        # positive-consumption so the frontend invariant is simple.
        load_w = abs(p_load) if p_load is not None else None

        return {
            'provider': self.key,
            'online': True,
            'mode': mode,
            'timestamp': timestamp,
            'power': {
                'solarW': p_pv,
                'gridW': p_grid,
                'loadW': load_w,
                'batteryW': p_akku,
            },
            'battery': {
                'present': has_battery,
                'socPct': soc,
                'mode': battery_mode,
                'standby': site.get('BatteryStandby'),
            },
            'energy': {
                'todayWh': _to_float(site.get('E_Day')),
                'yearWh': _to_float(site.get('E_Year')),
                'totalWh': _to_float(site.get('E_Total')),
            },
            'ratios': {
                'selfConsumptionPct': _to_float(site.get('rel_SelfConsumption')),
                'autonomyPct': _to_float(site.get('rel_Autonomy')),
            },
            'capabilities': {
                'battery': has_battery,
                'meter': has_meter,
            },
            'status': {
                'code': status.get('Code', 0),
                'message': status.get('Reason') or 'OK',
            },
        }

    def get_inverters(self) -> List[Dict[str, Any]]:
        payload = fetch_json(
            self.base_url,
            _API_BASE + 'GetInverterRealtimeData.cgi',
            params={'Scope': 'System'},
        )
        data = self._unwrap(payload)
        # Body.Data is keyed by channel (PAC, DAY_ENERGY, ...), each a map of
        # DeviceId -> {Value, Unit}. Pivot into a per-inverter list.
        result: Dict[str, Dict[str, Any]] = {}
        for channel, block in data.items():
            values = (block or {}).get('Values', {}) or {}
            unit = (block or {}).get('Unit')
            for device_id, value in values.items():
                entry = result.setdefault(str(device_id), {'deviceId': str(device_id)})
                entry[channel] = {'value': _to_float(value), 'unit': unit}
        return list(result.values())

    # helpers

    def _normalize_mode(self, raw_mode: Any, has_battery: bool, has_meter: bool) -> str:
        if not has_meter:
            return self.MODE_PRODUCE_ONLY
        if has_battery:
            return self.MODE_BIDIRECTIONAL
        if raw_mode:
            return self.MODE_METER
        return self.MODE_UNKNOWN
