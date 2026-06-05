"""
Low-level HTTP client and typed errors for fetching raw JSON from external
solar/energy APIs (e.g. Fronius). Used by provider adapters in this package.

The client is deliberately thin: it performs a single GET, enforces a short
timeout, parses JSON, and surfaces transport problems as typed exceptions so
that views/adapters can map them to clean API responses.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from urllib.parse import urljoin

import requests

logger = logging.getLogger(__name__)

# Fronius realtime calls should not be hammered; keep timeouts short so an
# unreachable inverter fails fast instead of blocking a worker.
DEFAULT_TIMEOUT = 4.0


class SolarError(Exception):
    """Base class for all solar-fetch errors."""


class SolarUnreachable(SolarError):
    """The host could not be reached (DNS, connection refused, timeout)."""


class SolarApiError(SolarError):
    """The host responded but with an error status or invalid payload."""

    def __init__(self, message: str, *, status_code: Optional[int] = None,
                 vendor_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code
        self.vendor_code = vendor_code


class SolarDisabled(SolarApiError):
    """The vendor API is present but disabled by the customer (e.g. GEN24 404)."""


def fetch_json(base_url: str, path: str = '', *,
               params: Optional[Dict[str, Any]] = None,
               timeout: float = DEFAULT_TIMEOUT) -> Dict[str, Any]:
    """
    Fetch and parse a JSON document from ``base_url`` joined with ``path``.

    Raises:
        SolarUnreachable: on connection/timeout errors.
        SolarDisabled: on HTTP 404 (Fronius returns 404 when the API is off).
        SolarApiError: on other non-2xx responses or invalid JSON.
    """
    # Ensure the base behaves like a directory so relative paths join cleanly.
    base = base_url if base_url.endswith('/') else base_url + '/'
    url = urljoin(base, path.lstrip('/')) if path else base_url

    try:
        response = requests.get(url, params=params, timeout=timeout)
    except requests.exceptions.Timeout as exc:
        raise SolarUnreachable(f"Timed out contacting {url}") from exc
    except requests.exceptions.ConnectionError as exc:
        raise SolarUnreachable(f"Could not connect to {url}") from exc
    except requests.exceptions.RequestException as exc:
        raise SolarUnreachable(f"Request to {url} failed: {exc}") from exc

    if response.status_code == 404:
        raise SolarDisabled(
            "Endpoint not found (Solar API may be disabled by customer config).",
            status_code=404,
        )

    if response.status_code >= 400:
        raise SolarApiError(
            f"Unexpected HTTP {response.status_code} from {url}",
            status_code=response.status_code,
        )

    try:
        return response.json()
    except ValueError as exc:
        raise SolarApiError(f"Invalid JSON received from {url}") from exc
