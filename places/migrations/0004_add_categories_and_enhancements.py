# Generated migration for adding categories and enhancements
# Run: python manage.py migrate

import django.contrib.gis.db.models.fields
import django.contrib.postgres.indexes
import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('places', '0003_remove_event_event_location_gist_and_more'),
    ]

    operations = [
        # Create EventCategory model
        migrations.CreateModel(
            name='EventCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Category name', max_length=50, unique=True)),
                ('icon', models.CharField(default='pin', help_text='Icon identifier for map markers', max_length=20)),
                ('color', models.CharField(default='#20c997', help_text='Hex color code for category styling', max_length=7)),
                ('description', models.TextField(blank=True, help_text='Category description')),
            ],
            options={
                'verbose_name_plural': 'event categories',
                'ordering': ['name'],
            },
        ),
        
        # Add fields to Route
        migrations.AddField(
            model_name='route',
            name='description',
            field=models.TextField(blank=True, help_text='Description of the route'),
        ),
        migrations.AddField(
            model_name='route',
            name='difficulty',
            field=models.IntegerField(blank=True, choices=[(1, 'Easy'), (2, 'Moderate'), (3, 'Challenging'), (4, 'Hard'), (5, 'Extreme')], help_text='Difficulty rating from 1 (Easy) to 5 (Extreme)', null=True),
        ),
        migrations.AlterModelOptions(
            name='route',
            options={'ordering': ['name']},
        ),
        
        # Add fields to Event
        migrations.AddField(
            model_name='event',
            name='category',
            field=models.ForeignKey(blank=True, help_text='Event category', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='places.eventcategory'),
        ),
        migrations.AddField(
            model_name='event',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, help_text='When event was created', null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='image_url',
            field=models.URLField(blank=True, help_text='URL to event image'),
        ),
        migrations.AddField(
            model_name='event',
            name='status',
            field=models.CharField(choices=[('active', 'Active'), ('cancelled', 'Cancelled'), ('postponed', 'Postponed'), ('completed', 'Completed')], default='active', help_text='Current status of the event', max_length=20),
        ),
        migrations.AddField(
            model_name='event',
            name='tags',
            field=models.CharField(blank=True, help_text="Comma-separated tags (e.g., 'music,outdoor,family-friendly')", max_length=200),
        ),
        migrations.AddField(
            model_name='event',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, help_text='When event was last updated', null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='website_url',
            field=models.URLField(blank=True, help_text='URL to event website'),
        ),
        migrations.AlterField(
            model_name='event',
            name='neighborhood',
            field=models.ForeignKey(blank=True, help_text='Neighborhood containing this event', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='places.neighborhood'),
        ),
        migrations.AlterField(
            model_name='event',
            name='title',
            field=models.CharField(help_text='Event title (3-140 characters)', max_length=140, validators=[django.core.validators.MinLengthValidator(3)]),
        ),
        migrations.AlterModelOptions(
            name='event',
            options={'get_latest_by': 'when', 'ordering': ['-when']},
        ),
        migrations.AlterModelOptions(
            name='neighborhood',
            options={'ordering': ['name'], 'verbose_name_plural': 'neighborhoods'},
        ),
        
        # Add indexes
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['when'], name='places_even_when_idx'),
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['status'], name='places_even_status_idx'),
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['category'], name='places_even_categor_idx'),
        ),
    ]

