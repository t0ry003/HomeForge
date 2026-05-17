"""
Data migration: Convert existing wiring_diagram_image files to base64 in wiring_diagram_base64.
"""
import base64
import mimetypes
import os

from django.db import migrations
from django.conf import settings


def convert_images_to_base64(apps, schema_editor):
    CustomDeviceType = apps.get_model('api', 'CustomDeviceType')
    for dt in CustomDeviceType.objects.exclude(wiring_diagram_image='').exclude(wiring_diagram_image__isnull=True):
        try:
            img_path = os.path.join(str(settings.MEDIA_ROOT), str(dt.wiring_diagram_image))
            if os.path.isfile(img_path):
                mime = mimetypes.guess_type(img_path)[0] or 'image/png'
                with open(img_path, 'rb') as f:
                    encoded = base64.b64encode(f.read()).decode('utf-8')
                dt.wiring_diagram_base64 = f"data:{mime};base64,{encoded}"
                dt.save(update_fields=['wiring_diagram_base64'])
        except Exception:
            pass


def reverse_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0026_add_wiring_diagram_base64'),
    ]

    operations = [
        migrations.RunPython(convert_images_to_base64, reverse_noop),
    ]
