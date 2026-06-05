"""
Views for the Solar feature.

Solar systems store ONLY the link to an external vendor API. The backend acts as
a proxy + normalizer: it fetches the raw JSON server-side (avoiding browser CORS
and private-IP issues) and returns a provider-agnostic schema that a reusable
power-flow UI can consume across vendors.

Registering/editing a system requires admin; viewing systems and their live data
is allowed for any authenticated user.
"""
from __future__ import annotations

import logging

from django.core.cache import cache
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SolarSystem
from .permissions import IsAdmin
from .serializers import SolarSystemSerializer
from .solar.client import SolarDisabled, SolarError, SolarUnreachable
from .solar.registry import get_provider

logger = logging.getLogger(__name__)

# Realtime feed cache window. Fronius asks for >= 4s between realtime calls, so
# an ~8s cache comfortably throttles concurrent dashboard pollers.
OVERVIEW_CACHE_TTL = 8


def _overview_cache_key(system_id: int) -> str:
    return f"solar_overview_{system_id}"


class SolarSystemListCreateView(generics.ListCreateAPIView):
    """
    GET  /solar/systems/  -> list systems (any authenticated user).
    POST /solar/systems/  -> register a system (admin only). The link is
                             validated by attempting discovery before saving.
    """
    serializer_class = SolarSystemSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return SolarSystem.objects.all()

    def perform_create(self, serializer):
        provider_key = serializer.validated_data.get('provider', SolarSystem.PROVIDER_FRONIUS)
        base_url = serializer.validated_data['base_url']

        # Validate connectivity + capture discovery metadata before persisting.
        try:
            provider = get_provider(provider_key, base_url)
            discovery = provider.discover()
        except SolarError as exc:
            raise _as_validation_error(exc)

        serializer.save(
            user=self.request.user,
            api_version=discovery.get('api_version', ''),
            capabilities=discovery.get('capabilities', {}),
            last_seen=timezone.now(),
        )


class SolarSystemDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /solar/systems/{id}/  -> retrieve (any authenticated user).
    PUT/PATCH/DELETE             -> manage (admin only).
    """
    serializer_class = SolarSystemSerializer
    queryset = SolarSystem.objects.all()

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        instance = serializer.save()
        # The link/provider may have changed; drop any cached feed.
        cache.delete(_overview_cache_key(instance.id))

    def perform_destroy(self, instance):
        cache.delete(_overview_cache_key(instance.id))
        instance.delete()


class SolarOverviewView(APIView):
    """
    GET /solar/systems/{id}/overview/

    Returns the normalized, provider-agnostic power-flow snapshot. Cached briefly
    to respect vendor rate limits. On failure, returns an ``online: false``
    payload with a human-readable status message (HTTP 200 so the UI can render
    an offline state without treating it as a hard error), except for genuine
    server faults.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            system = SolarSystem.objects.get(pk=pk)
        except SolarSystem.DoesNotExist:
            return Response({'detail': 'Solar system not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not system.enabled:
            return Response(_offline_payload(system, 'System is disabled.'))

        cache_key = _overview_cache_key(system.id)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            provider = get_provider(system.provider, system.base_url)
            overview = provider.get_overview()
        except SolarDisabled:
            return Response(_offline_payload(system, 'Solar API is disabled on the device.'))
        except SolarUnreachable:
            return Response(_offline_payload(system, 'System is unreachable.'))
        except SolarError as exc:
            return Response(_offline_payload(system, str(exc)))
        except ValueError as exc:
            # Unsupported provider configured.
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        cache.set(cache_key, overview, timeout=OVERVIEW_CACHE_TTL)

        # Best-effort liveness stamp (avoid write on every poll via cache guard).
        SolarSystem.objects.filter(pk=system.pk).update(last_seen=timezone.now())

        return Response(overview)


def _offline_payload(system: SolarSystem, message: str) -> dict:
    """Build a normalized 'offline' overview so the UI can render a dead state."""
    return {
        'provider': system.provider,
        'online': False,
        'mode': 'unknown',
        'timestamp': None,
        'power': {'solarW': None, 'gridW': None, 'loadW': None, 'batteryW': None},
        'battery': {'present': False, 'socPct': None, 'mode': None, 'standby': None},
        'energy': {'todayWh': None, 'yearWh': None, 'totalWh': None},
        'ratios': {'selfConsumptionPct': None, 'autonomyPct': None},
        'capabilities': system.capabilities or {},
        'status': {'code': None, 'message': message},
    }


def _as_validation_error(exc: SolarError):
    """Translate a transport error into a DRF validation error on base_url."""
    from rest_framework.exceptions import ValidationError

    if isinstance(exc, SolarDisabled):
        message = 'Solar API is disabled on the device or the path is wrong.'
    elif isinstance(exc, SolarUnreachable):
        message = 'Could not reach the system at the provided link.'
    else:
        message = str(exc)
    return ValidationError({'base_url': message})
