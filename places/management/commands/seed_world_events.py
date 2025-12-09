"""
Management command to seed famous walking events and trails from around the world.

This command creates sample data for:
- Famous walking events (marathons, festivals, cultural events)
- Famous trails (Camino de Santiago, Appalachian Trail, etc.)
- Global neighborhoods/regions
"""
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point, LineString
from django.utils import timezone
from datetime import timedelta
from places.models import Event, Route, Neighborhood, EventCategory


class Command(BaseCommand):
    help = 'Seed famous walking events and trails from around the world'

    def handle(self, *args, **options):
        self.stdout.write('Seeding world walking events and trails...')

        # Create categories if they don't exist
        categories = {
            'Marathon': {'icon': '🏃', 'color': '#ff6b6b'},
            'Festival': {'icon': '🎉', 'color': '#4ecdc4'},
            'Cultural': {'icon': '🏛️', 'color': '#ffe66d'},
            'Trail': {'icon': '🥾', 'color': '#a8e6cf'},
            'Heritage': {'icon': '🏰', 'color': '#ffd93d'},
        }

        cat_objects = {}
        for name, attrs in categories.items():
            cat, created = EventCategory.objects.get_or_create(
                name=name,
                defaults={'icon': attrs['icon'], 'color': attrs['color']}
            )
            cat_objects[name] = cat
            if created:
                self.stdout.write(f'  Created category: {name}')

        # Famous Walking Events Around the World
        famous_events = [
            {
                'title': 'Dublin Marathon',
                'description': 'Ireland\'s premier marathon through the historic streets of Dublin',
                'when': timezone.now() + timedelta(days=120),
                'location': Point(-6.2603, 53.3498, srid=4326),  # Dublin
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,ireland',
                'status': 'active',
                'website_url': 'https://www.dublinmarathon.ie',
            },
            {
                'title': 'Camino de Santiago - Start',
                'description': 'Begin your journey on the famous Camino de Santiago pilgrimage route',
                'when': timezone.now() + timedelta(days=60),
                'location': Point(-8.5449, 42.8782, srid=4326),  # Santiago de Compostela
                'category': cat_objects['Trail'],
                'tags': 'pilgrimage,spain,walking',
                'status': 'active',
            },
            {
                'title': 'London Marathon',
                'description': 'One of the world\'s most famous marathons',
                'when': timezone.now() + timedelta(days=90),
                'location': Point(-0.1276, 51.5074, srid=4326),  # London
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,uk',
                'status': 'active',
            },
            {
                'title': 'New York City Marathon',
                'description': 'The largest marathon in the world',
                'when': timezone.now() + timedelta(days=150),
                'location': Point(-74.0060, 40.7128, srid=4326),  # New York
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,usa',
                'status': 'active',
            },
            {
                'title': 'Tokyo Marathon',
                'description': 'Experience the vibrant streets of Tokyo',
                'when': timezone.now() + timedelta(days=180),
                'location': Point(139.6503, 35.6762, srid=4326),  # Tokyo
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,japan',
                'status': 'active',
            },
            {
                'title': 'Berlin Marathon',
                'description': 'Fast and flat course through historic Berlin',
                'when': timezone.now() + timedelta(days=200),
                'location': Point(13.4050, 52.5200, srid=4326),  # Berlin
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,germany',
                'status': 'active',
            },
            {
                'title': 'Edinburgh Festival Fringe',
                'description': 'World\'s largest arts festival with walking tours',
                'when': timezone.now() + timedelta(days=100),
                'location': Point(-3.1883, 55.9533, srid=4326),  # Edinburgh
                'category': cat_objects['Festival'],
                'tags': 'festival,arts,scotland',
                'status': 'active',
            },
            {
                'title': 'Paris Marathon',
                'description': 'Run through the beautiful streets of Paris',
                'when': timezone.now() + timedelta(days=110),
                'location': Point(2.3522, 48.8566, srid=4326),  # Paris
                'category': cat_objects['Marathon'],
                'tags': 'marathon,running,france',
                'status': 'active',
            },
            {
                'title': 'Sydney Harbour Bridge Walk',
                'description': 'Guided walk across the iconic Sydney Harbour Bridge',
                'when': timezone.now() + timedelta(days=30),
                'location': Point(151.2093, -33.8688, srid=4326),  # Sydney
                'category': cat_objects['Cultural'],
                'tags': 'walking,australia,landmark',
                'status': 'active',
            },
            {
                'title': 'Machu Picchu Trail Start',
                'description': 'Begin the famous Inca Trail to Machu Picchu',
                'when': timezone.now() + timedelta(days=45),
                'location': Point(-72.5451, -13.1631, srid=4326),  # Cusco, Peru
                'category': cat_objects['Trail'],
                'tags': 'hiking,peru,inca',
                'status': 'active',
            },
        ]

        # Create events
        for event_data in famous_events:
            event, created = Event.objects.get_or_create(
                title=event_data['title'],
                defaults=event_data
            )
            if created:
                self.stdout.write(f'  Created event: {event.title}')

        # Famous Trails/Walks
        famous_trails = [
            {
                'name': 'Camino de Santiago (French Way)',
                'description': 'The most popular route of the Camino de Santiago pilgrimage',
                'path': LineString([
                    (-0.9046, 42.6612),  # St. Jean Pied de Port
                    (-1.6432, 42.8184),  # Pamplona
                    (-3.7038, 40.4168),  # Madrid area
                    (-4.7245, 41.6523),  # León
                    (-7.8667, 42.8782),  # Santiago de Compostela
                ], srid=4326),
                'difficulty': 3,
            },
            {
                'name': 'Appalachian Trail (Section)',
                'description': 'Famous long-distance hiking trail in the eastern United States',
                'path': LineString([
                    (-84.3880, 34.6270),  # Springer Mountain, Georgia
                    (-83.1136, 35.5951),  # North Carolina
                    (-81.6868, 36.5951),  # Tennessee
                    (-80.8431, 37.5407),  # Virginia
                ], srid=4326),
                'difficulty': 4,
            },
            {
                'name': 'Great Wall of China Walk',
                'description': 'Walk along sections of the Great Wall of China',
                'path': LineString([
                    (116.5704, 40.4319),  # Badaling
                    (116.0147, 40.2992),  # Mutianyu
                    (115.8250, 40.1833),  # Jinshanling
                ], srid=4326),
                'difficulty': 3,
            },
            {
                'name': 'Milford Track',
                'description': 'New Zealand\'s most famous walking track',
                'path': LineString([
                    (167.7370, -44.6710),  # Te Anau
                    (167.9200, -44.6800),  # Milford Sound
                ], srid=4326),
                'difficulty': 3,
            },
            {
                'name': 'West Highland Way',
                'description': 'Scotland\'s premier long-distance walking route',
                'path': LineString([
                    (-4.2518, 55.8642),  # Milngavie
                    (-4.6326, 56.1900),  # Loch Lomond
                    (-4.7761, 56.4907),  # Fort William
                ], srid=4326),
                'difficulty': 2,
            },
            {
                'name': 'Pacific Crest Trail (Section)',
                'description': 'Long-distance trail from Mexico to Canada',
                'path': LineString([
                    (-117.1611, 32.7157),  # Southern California
                    (-118.2437, 34.0522),  # Los Angeles area
                    (-122.4194, 37.7749),  # San Francisco area
                ], srid=4326),
                'difficulty': 5,
            },
        ]

        # Create routes
        for trail_data in famous_trails:
            route, created = Route.objects.get_or_create(
                name=trail_data['name'],
                defaults=trail_data
            )
            if created:
                self.stdout.write(f'  Created trail: {route.name}')

        self.stdout.write(self.style.SUCCESS('Successfully seeded world events and trails!'))
        self.stdout.write(f'  Events: {Event.objects.count()}')
        self.stdout.write(f'  Trails: {Route.objects.count()}')
        self.stdout.write(f'  Categories: {EventCategory.objects.count()}')

