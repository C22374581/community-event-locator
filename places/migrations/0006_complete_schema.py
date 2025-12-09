# Generated migration to complete schema

import django.contrib.gis.db.models.fields
import django.contrib.postgres.indexes
import django.core.validators
import django.db.models.deletion
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('places', '0005_add_complex_fields'),
    ]

    operations = [
        # Add created_at to Neighborhood with default
        migrations.AddField(
            model_name='neighborhood',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]

