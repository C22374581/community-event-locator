"""
Management command to fix routes with swapped coordinates.
"""
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import LineString
from places.models import Route


class Command(BaseCommand):
    help = 'Fix routes with swapped coordinates (lat/lng)'

    def handle(self, *args, **options):
        self.stdout.write('🔧 Fixing route coordinates...')
        
        fixed_count = 0
        total_routes = Route.objects.count()
        
        for route in Route.objects.all():
            if not route.path:
                continue
                
            coords = list(route.path.coords)
            if not coords:
                continue
            
            # Check first coordinate
            first_coord = coords[0]
            x, y = first_coord[0], first_coord[1]
            
            # If coordinates are swapped, x (lng) will be in lat range and y (lat) will be in lng range
            # Valid lat: -90 to 90, Valid lng: -180 to 180
            # If |x| > 90 or |y| > 180, they might be swapped
            # But also check: if |x| <= 90 and |y| <= 180 but x looks more like lat (smaller absolute value for most places)
            # Actually, better check: if the route has a country, check if coordinates are in that country's general area
            
            needs_fix = False
            
            # Check if coordinates are clearly wrong (outside valid ranges)
            if abs(x) > 180 or abs(y) > 90:
                needs_fix = True
                self.stdout.write(f'  ⚠️ {route.name}: Coordinates out of range, swapping...')
            # Check if coordinates might be swapped (x in lat range, y in lng range)
            elif abs(x) <= 90 and abs(y) > 90 and abs(y) <= 180:
                # x is in lat range, y is in lng range - likely swapped
                needs_fix = True
                self.stdout.write(f'  ⚠️ {route.name}: Coordinates appear swapped, fixing...')
            # Check if route has country and coordinates don't match country location
            elif route.country:
                # Get country's approximate location (simplified check)
                country_bounds = {
                    'US': (-180, -66, 18, 72),  # (min_lng, max_lng, min_lat, max_lat)
                    'GB': (-10, 2, 50, 61),
                    'FR': (-5, 10, 42, 51),
                    'ES': (-10, 5, 36, 44),
                    'IT': (6, 19, 36, 47),
                    'DE': (5, 15, 47, 55),
                    'CN': (73, 135, 18, 54),
                    'JP': (123, 146, 24, 46),
                    'AU': (113, 154, -44, -10),
                    'NZ': (166, 179, -48, -34),
                    'NP': (80, 89, 26, 31),
                    'PE': (-82, -68, -20, 0),
                    'IS': (-25, -13, 63, 67),
                }
                
                bounds = country_bounds.get(route.country.code)
                if bounds:
                    min_lng, max_lng, min_lat, max_lat = bounds
                    # Check if coordinates are in country bounds
                    if not (min_lng <= x <= max_lng and min_lat <= y <= max_lat):
                        # Coordinates don't match country - might be swapped
                        # Try swapped coordinates
                        if min_lng <= y <= max_lng and min_lat <= x <= max_lat:
                            needs_fix = True
                            self.stdout.write(f'  ⚠️ {route.name}: Coordinates don\'t match country {route.country.code}, swapping...')
            
            if needs_fix:
                # Swap coordinates: (x, y) -> (y, x) for all points
                fixed_coords = [(y, x) for x, y in coords]
                route.path = LineString(fixed_coords, srid=4326)
                route.save()
                fixed_count += 1
                self.stdout.write(f'  ✅ Fixed {route.name}')
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Fixed {fixed_count} out of {total_routes} routes'))
        if fixed_count > 0:
            self.stdout.write('Routes have been updated with correct coordinates!')

