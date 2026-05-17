"""
Data migration: Remove duplicate rooms (keep oldest), then add unique_together constraint.
"""
from django.db import migrations


def deduplicate_rooms(apps, schema_editor):
    Room = apps.get_model('api', 'Room')
    from django.db.models import Count, Min

    dupes = (
        Room.objects.values('name', 'user_id')
        .annotate(count=Count('id'), min_id=Min('id'))
        .filter(count__gt=1)
    )
    for d in dupes:
        Room.objects.filter(
            name=d['name'], user_id=d['user_id']
        ).exclude(id=d['min_id']).delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('api', '0031_add_room_icon'),
    ]

    operations = [
        migrations.RunPython(deduplicate_rooms, noop),
        migrations.AlterUniqueTogether(
            name='room',
            unique_together={('name', 'user')},
        ),
    ]
