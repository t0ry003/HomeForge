import json
import os

from django.conf import settings
from django.core.management.base import BaseCommand

from api.models import CustomDeviceType, DeviceCardTemplate, DeviceControl


class Command(BaseCommand):
    help = 'Load default device types from the fixture file. Idempotent — skips types that already exist by name.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Delete and recreate existing default types (by name match).',
        )

    def handle(self, *args, **options):
        fixture_path = os.path.join(settings.BASE_DIR, 'api', 'fixtures', 'default_device_types.json')

        if not os.path.exists(fixture_path):
            self.stderr.write(self.style.ERROR(f'Fixture file not found: {fixture_path}'))
            return

        with open(fixture_path, 'r') as f:
            device_types = json.load(f)

        created = 0
        skipped = 0

        for dt_data in device_types:
            name = dt_data['name']
            exists = CustomDeviceType.objects.filter(name=name).exists()

            if exists and not options['force']:
                self.stdout.write(f'  Skipped (exists): {name}')
                skipped += 1
                continue

            if exists and options['force']:
                CustomDeviceType.objects.filter(name=name).delete()

            # Read file contents
            firmware_code = self._read_file(dt_data.get('firmware_code_file', ''))
            wiring_text = self._read_file(dt_data.get('wiring_diagram_text_file', ''))
            documentation = self._read_file(dt_data.get('documentation_file', ''))

            device_type = CustomDeviceType.objects.create(
                name=name,
                definition=dt_data['definition'],
                approved=True,
                firmware_code=firmware_code,
                wiring_diagram_text=wiring_text,
                documentation=documentation,
            )

            card_data = dt_data.get('card_template')
            if card_data:
                template = DeviceCardTemplate.objects.create(
                    device_type=device_type,
                    layout_config=card_data.get('layout_config', {}),
                )
                for ctrl in card_data.get('controls', []):
                    DeviceControl.objects.create(
                        template=template,
                        widget_type=ctrl['widget_type'],
                        label=ctrl['label'],
                        variable_mapping=ctrl['variable_mapping'],
                        unit=ctrl.get('unit', ''),
                        min_value=ctrl.get('min_value'),
                        max_value=ctrl.get('max_value'),
                        step=ctrl.get('step'),
                        variant=ctrl.get('variant', ''),
                        size=ctrl.get('size', ''),
                    )

            self.stdout.write(self.style.SUCCESS(f'  Created: {name}'))
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'\nDone. Created: {created}, Skipped: {skipped}'
        ))

    def _read_file(self, relative_path):
        """Read a file relative to BASE_DIR, return empty string if missing."""
        if not relative_path:
            return ''
        full_path = os.path.join(settings.BASE_DIR, relative_path)
        if os.path.exists(full_path):
            with open(full_path, 'r') as f:
                return f.read()
        return ''
