"""
Background poller that keeps each enabled Solar system's liveness fresh.

The topology view derives a solar node's online/offline state from a recent
``last_seen`` timestamp (or a cached realtime overview). Those are only refreshed
while a client is actively polling the Solar tab's overview endpoint. When the
user switches to the Topology tab, nothing polls the vendor, so after the
liveness window elapses the solar node incorrectly flips to "offline".

This command runs as a lightweight background worker (alongside the MQTT
listener) and periodically probes each enabled system, stamping ``last_seen`` on
success so the topology reflects reality no matter which tab is open. It does NOT
write the short-lived realtime overview cache, so the Solar tab's live feed
behavior is unchanged.
"""
import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.models import SolarSystem
from api.solar.client import SolarError
from api.solar.registry import get_provider


class Command(BaseCommand):
    help = "Periodically probes enabled solar systems to keep their liveness fresh for the topology view."

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Seconds between poll cycles (default: 30). Keep below the topology liveness window (90s).',
        )

    def handle(self, *args, **options):
        interval = options['interval']
        self.stdout.write(self.style.SUCCESS(
            f'Solar poller running. Probing enabled systems every {interval}s...'
        ))

        try:
            while True:
                self.poll_once()
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.SUCCESS('Stopped solar poller'))

    def poll_once(self):
        systems = SolarSystem.objects.filter(enabled=True).only(
            'id', 'name', 'base_url', 'provider'
        )
        for system in systems:
            try:
                provider = get_provider(system.provider, system.base_url)
                provider.get_overview()
            except SolarError:
                # Unreachable/disabled/transient: leave last_seen stale so the
                # topology correctly ages the node to offline.
                continue
            except Exception as exc:  # noqa: BLE001 - keep the worker alive
                self.stdout.write(self.style.WARNING(
                    f'Solar poll error for "{system.name}": {exc}'
                ))
                continue

            SolarSystem.objects.filter(pk=system.pk).update(last_seen=timezone.now())
