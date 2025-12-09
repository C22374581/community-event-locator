# places/migrations/0002_spatial_indexes.py
from django.db import migrations
from django.contrib.postgres.operations import CreateExtension
from django.contrib.postgres.indexes import GistIndex


class Migration(migrations.Migration):

    dependencies = [
        ("places", "0001_initial"),
    ]

    operations = [
        # Make sure the PostGIS extension exists (no-op if already present)
        CreateExtension("postgis"),

        # Add GiST indexes for spatial fields
        migrations.AddIndex(
            model_name="event",
            index=GistIndex(fields=["location"], name="event_location_gist"),
        ),
        migrations.AddIndex(
            model_name="route",
            index=GistIndex(fields=["path"], name="route_path_gist"),
        ),
        migrations.AddIndex(
            model_name="neighborhood",
            index=GistIndex(fields=["area"], name="neighborhood_area_gist"),
        ),
    ]
