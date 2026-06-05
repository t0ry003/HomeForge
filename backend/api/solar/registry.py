"""
Provider registry: resolve a SolarSystem.provider key to an adapter instance.

Register new vendor adapters here; the rest of the system stays unchanged.
"""
from __future__ import annotations

from typing import Dict, Type

from .providers.base import BaseSolarProvider
from .providers.fronius import FroniusProvider

_PROVIDERS: Dict[str, Type[BaseSolarProvider]] = {
    FroniusProvider.key: FroniusProvider,
}


def get_provider(provider_key: str, base_url: str) -> BaseSolarProvider:
    """
    Return a provider adapter bound to ``base_url``.

    Raises:
        ValueError: if ``provider_key`` is not registered.
    """
    try:
        provider_cls = _PROVIDERS[provider_key]
    except KeyError as exc:
        raise ValueError(f"Unsupported solar provider: {provider_key!r}") from exc
    return provider_cls(base_url)


def supported_providers() -> list[str]:
    return list(_PROVIDERS.keys())
