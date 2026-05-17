"""
Replaced: Default device types are now loaded via the management command
`load_default_types` (from api/fixtures/default_device_types.json).

This migration is kept as an empty stub so existing databases don't break.
"""
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0024_add_device_collection_fields'),
    ]

    operations = []
