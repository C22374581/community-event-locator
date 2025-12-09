# Generated migration to create all missing tables

import django.contrib.gis.db.models.fields
import django.contrib.postgres.indexes
import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('places', '0006_complete_schema'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        # Create Country model
        migrations.CreateModel(
            name='Country',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Country name', max_length=100, unique=True)),
                ('code', models.CharField(help_text='ISO 3166-1 alpha-2 country code', max_length=2, unique=True)),
                ('geometry', django.contrib.gis.db.models.fields.MultiPolygonField(blank=True, help_text='Country boundary', null=True, srid=4326)),
                ('flag_emoji', models.CharField(blank=True, help_text='Flag emoji for display', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True, blank=True, null=True)),
            ],
            options={
                'verbose_name_plural': 'countries',
                'ordering': ['name'],
            },
        ),
        migrations.AddIndex(
            model_name='country',
            index=django.contrib.postgres.indexes.GistIndex(fields=['geometry'], name='places_coun_geometr_dc69cb_gist'),
        ),
        # Create Region model
        migrations.CreateModel(
            name='Region',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Region/state name', max_length=120)),
                ('geometry', django.contrib.gis.db.models.fields.MultiPolygonField(blank=True, help_text='Region boundary', null=True, srid=4326)),
                ('created_at', models.DateTimeField(auto_now_add=True, blank=True, null=True)),
                ('country', models.ForeignKey(help_text='Country', on_delete=django.db.models.deletion.CASCADE, related_name='regions', to='places.country')),
            ],
            options={
                'unique_together': {('name', 'country')},
                'ordering': ['country', 'name'],
            },
        ),
        migrations.AddIndex(
            model_name='region',
            index=django.contrib.postgres.indexes.GistIndex(fields=['geometry'], name='places_regi_geometr_8e7c5b_gist'),
        ),
        # Create Organizer model
        migrations.CreateModel(
            name='Organizer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('website', models.URLField(blank=True)),
                ('description', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        # Add fields to Event
        migrations.AddField(
            model_name='event',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True, blank=True, help_text='When event was created'),
        ),
        migrations.AddField(
            model_name='event',
            name='country',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='places.country'),
        ),
        migrations.AddField(
            model_name='event',
            name='organizer',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='places.organizer'),
        ),
        migrations.AddField(
            model_name='event',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_events', to=settings.AUTH_USER_MODEL, help_text='User who created this event'),
        ),
        migrations.AddField(
            model_name='event',
            name='end_time',
            field=models.DateTimeField(blank=True, null=True, help_text='Event end time'),
        ),
        migrations.AddField(
            model_name='event',
            name='price',
            field=models.DecimalField(blank=True, decimal_places=2, default=0, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='event',
            name='capacity',
            field=models.IntegerField(blank=True, null=True, help_text='Maximum number of attendees'),
        ),
        migrations.AddField(
            model_name='event',
            name='recurring',
            field=models.BooleanField(default=False, help_text='Is this a recurring event?'),
        ),
        migrations.AddField(
            model_name='event',
            name='parent_event',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='recurring_instances', to='places.event'),
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['country'], name='places_even_country_722128_idx'),
        ),
        migrations.AddIndex(
            model_name='event',
            index=models.Index(fields=['organizer'], name='places_even_organiz_b4181e_idx'),
        ),
        # Add country to Route
        migrations.AddField(
            model_name='route',
            name='country',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='routes', to='places.country'),
        ),
        migrations.AddField(
            model_name='route',
            name='elevation_gain',
            field=models.IntegerField(blank=True, help_text='Elevation gain in meters', null=True),
        ),
        migrations.AddField(
            model_name='route',
            name='estimated_duration_hours',
            field=models.FloatField(blank=True, help_text='Estimated duration in hours', null=True, validators=[django.core.validators.MinValueValidator(0.1), django.core.validators.MaxValueValidator(1000)]),
        ),
        migrations.AddField(
            model_name='route',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, blank=True, null=True),
        ),
        migrations.AddField(
            model_name='route',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        # Add country and region to Neighborhood
        migrations.AddField(
            model_name='neighborhood',
            name='country',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='neighborhoods', to='places.country'),
        ),
        migrations.AddField(
            model_name='neighborhood',
            name='region',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='neighborhoods', to='places.region'),
        ),
        migrations.AddField(
            model_name='neighborhood',
            name='description',
            field=models.TextField(blank=True, help_text='Neighborhood description'),
        ),
        # Create RouteWaypoint
        migrations.CreateModel(
            name='RouteWaypoint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('location', django.contrib.gis.db.models.fields.PointField(help_text='Waypoint location', srid=4326)),
                ('order', models.IntegerField(help_text='Order along the route (1, 2, 3...)')),
                ('description', models.TextField(blank=True, help_text='Waypoint description')),
                ('elevation', models.IntegerField(blank=True, help_text='Elevation in meters', null=True)),
                ('route', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waypoints', to='places.route')),
            ],
            options={
                'unique_together': {('route', 'order')},
                'ordering': ['route', 'order'],
            },
        ),
        migrations.AddIndex(
            model_name='routewaypoint',
            index=django.contrib.postgres.indexes.GistIndex(fields=['location'], name='places_rout_locatio_7bb5cb_gist'),
        ),
        # Create EventMedia
        migrations.CreateModel(
            name='EventMedia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('media_type', models.CharField(choices=[('image', 'Image'), ('video', 'Video'), ('audio', 'Audio')], max_length=20)),
                ('url', models.URLField()),
                ('caption', models.CharField(blank=True, max_length=200)),
                ('order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='media', to='places.event')),
            ],
            options={
                'ordering': ['event', 'order'],
            },
        ),
        # Create EventAttendee
        migrations.CreateModel(
            name='EventAttendee',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('registered', 'Registered'), ('attending', 'Attending'), ('cancelled', 'Cancelled')], default='registered', max_length=20)),
                ('registered_at', models.DateTimeField(auto_now_add=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendees', to='places.event')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_attendances', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('event', 'user')},
            },
        ),
        migrations.AddIndex(
            model_name='eventattendee',
            index=models.Index(fields=['user', 'status'], name='places_even_user_id_720750_idx'),
        ),
        migrations.AddIndex(
            model_name='eventattendee',
            index=models.Index(fields=['event', 'status'], name='places_even_event_i_ff7fd1_idx'),
        ),
        # Create EventReview
        migrations.CreateModel(
            name='EventReview',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.IntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reviews', to='places.event')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_reviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('event', 'user')},
            },
        ),
        # Create UserProfile
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('location', django.contrib.gis.db.models.fields.PointField(blank=True, help_text='User home location', null=True, srid=4326)),
                ('favorite_categories', models.ManyToManyField(blank=True, related_name='favorited_by', to='places.eventcategory')),
                ('favorite_countries', models.ManyToManyField(blank=True, related_name='favorited_by', to='places.country')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddIndex(
            model_name='userprofile',
            index=django.contrib.postgres.indexes.GistIndex(fields=['location'], name='places_user_locatio_4d7448_gist'),
        ),
        # Create UserFavorite
        migrations.CreateModel(
            name='UserFavorite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('event', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='places.event')),
                ('neighborhood', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='places.neighborhood')),
                ('route', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='places.route')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorites', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='userfavorite',
            index=models.Index(fields=['user', 'created_at'], name='places_user_user_id_cc4f15_idx'),
        ),
        migrations.AddConstraint(
            model_name='userfavorite',
            constraint=models.CheckConstraint(check=models.Q(models.Q(('event__isnull', False), ('neighborhood__isnull', True), ('route__isnull', True)), models.Q(('event__isnull', True), ('neighborhood__isnull', False), ('route__isnull', True)), models.Q(('event__isnull', True), ('neighborhood__isnull', True), ('route__isnull', False)), _connector='OR'), name='one_content_type_only'),
        ),
        # Create TrailCompletion
        migrations.CreateModel(
            name='TrailCompletion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('completed_at', models.DateTimeField(auto_now_add=True)),
                ('notes', models.TextField(blank=True)),
                ('route', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='completions', to='places.route')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trail_completions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'route')},
            },
        ),
        # Create EventSeries
        migrations.CreateModel(
            name='EventSeries',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('frequency', models.CharField(choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly'), ('yearly', 'Yearly')], max_length=20)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('organizer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_series', to='places.organizer')),
            ],
        ),
        # Create SpatialQueryLog
        migrations.CreateModel(
            name='SpatialQueryLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('query_type', models.CharField(max_length=50)),
                ('parameters', models.JSONField(blank=True, null=True)),
                ('result_count', models.IntegerField(default=0)),
                ('execution_time_ms', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, null=True, blank=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='spatialquerylog',
            index=models.Index(fields=['query_type', 'created_at'], name='places_spat_query_t_f0becc_idx'),
        ),
        migrations.AddIndex(
            model_name='spatialquerylog',
            index=models.Index(fields=['user', 'created_at'], name='places_spat_user_id_213699_idx'),
        ),
    ]

