"""
Provider abstraction for solar/energy data sources.

A provider adapter maps a vendor's raw JSON into the normalized, provider-
agnostic schema documented below. Adding a new vendor means adding a new
subclass and registering it in ``api/solar/registry.py`` -- no model, view, or
frontend changes required.

Normalized "overview" schema (the frontend contract)::

    {
        "provider": "fronius",
        "online": true,
        "mode": "bidirectional",          # see MODE_* constants
        "timestamp": "2026-06-04T12:00:00Z" | null,
        "power": {                          # instantaneous power in Watts (W)
            "solarW": 0.0,                  # PV production, >= 0
            "gridW": 0.0,                   # + = importing, - = exporting
            "loadW": 0.0,                   # + = consuming (house load)
            "batteryW": 0.0                 # + = charging, - = discharging
        },
        "battery": {
            "present": true,
            "socPct": 87.0 | null,          # state of charge, 0-100
            "mode": "normal" | null,
            "standby": false | null
        },
        "energy": {                         # cumulative energy in Wh (nullable)
            "todayWh": 12345.0 | null,
            "yearWh": 1234567.0 | null,
            "totalWh": 12345678.0 | null
        },
        "ratios": {
            "selfConsumptionPct": 100.0 | null,
            "autonomyPct": 100.0 | null
        },
        "capabilities": {"history": false, "battery": true, "meter": true},
        "status": {"code": 0, "message": "OK"}
    }

Sign conventions are normalized so this invariant holds (approximately)::

    solarW + max(gridW, 0) + max(-batteryW, 0)
        ~= loadW + max(-gridW, 0) + max(batteryW, 0)
"""
from __future__ import annotations

from typing import Any, Dict, List


class BaseSolarProvider:
    """Interface every vendor adapter must implement."""

    # Normalized system modes.
    MODE_BIDIRECTIONAL = 'bidirectional'   # meter + battery
    MODE_METER = 'meter'                    # meter, no battery
    MODE_PRODUCE_ONLY = 'produce-only'      # PV only, no meter
    MODE_AC_COUPLED = 'ac-coupled'
    MODE_UNKNOWN = 'unknown'

    #: Provider key matching SolarSystem.provider; set by subclasses.
    key: str = ''

    def __init__(self, base_url: str):
        self.base_url = base_url

    def discover(self) -> Dict[str, Any]:
        """
        Validate connectivity and return discovery metadata::

            {"api_version": "1", "capabilities": {...}}

        Raises a SolarError subclass if the system is unreachable/invalid.
        """
        raise NotImplementedError

    def get_overview(self) -> Dict[str, Any]:
        """Return the normalized overview dict documented in this module."""
        raise NotImplementedError

    def get_inverters(self) -> List[Dict[str, Any]]:
        """Return a list of per-inverter detail dicts (Phase 2)."""
        raise NotImplementedError

    def get_history(self, start: str, end: str) -> Dict[str, Any]:
        """Return normalized historical/archive data (Phase 2)."""
        raise NotImplementedError
