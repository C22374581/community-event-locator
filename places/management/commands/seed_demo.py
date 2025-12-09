from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from random import random, choice, randint
from datetime import timedelta

from django.contrib.gis.geos import Point, LineString, Polygon
from django.contrib.gis.db.models import GeometryField, PointField, LineStringField, PolygonField, MultiPolygonField

from places.models import Event, Neighborhood, Route


# ---------- helpers for making simple shapes ----------

def jitter(value, spread):
    """Small random offset around value."""
    return value + (random() - 0.5) * 2 * spread


def square_polygon(center_lat, center_lng, half_deg=0.01):
    """Small square polygon around (lat, lng) in WGS84 degrees."""
    lat, lng = center_lat, center_lng
    ring = [
        (lng - half_deg, lat - half_deg),
        (lng - half_deg, lat + half_deg),
        (lng + half_deg, lat + half_deg),
        (lng + half_deg, lat - half_deg),
        (lng - half_deg, lat - half_deg),
    ]
    return Polygon(ring, srid=4326)


def line_from_latlngs(points):
    """LineString from list of (lat, lng) tuples in WGS84."""
    coords = [(lng, lat) for lat, lng in points]
    return LineString(coords, srid=4326)


def point(lat, lng):
    return Point(lng, lat, srid=4326)


# ---------- helpers to discover geometry fields on models ----------

def _first_field(model, klass):
    """Return first field name on model that is instance of klass (or None)."""
    for f in model._meta.get_fields():
        if isinstance(getattr(f, "target_field", f), klass):
            return f.name
    return None


def get_polygon_field(model):
    return _first_field(model, PolygonField) or _first_field(model, MultiPolygonField)


def get_linestring_field(model):
    return _first_field(model, LineStringField)


def get_point_field(model):
    return _first_field(model, PointField)


# ---------- sample content ----------

TITLES = [
    "Food Market", "Tech Meetup", "Live Music", "Art Fair", "Farmers Market",
    "Community Cleanup", "Charity Run", "Book Club", "Coding Dojo", "Open Mic",
    "Vintage Fair", "Local Makers", "Cinema Night", "Board Games", "Hack Night",
]

DESCS = [
    "Local vendors and great vibes.",
    "Come meet friendly folks and share ideas.",
    "Featuring upcoming artists and bands.",
    "Pop-up stalls and tasty food.",
    "Hands-on session for beginners and pros.",
    "Family friendly event.",
    "Free entry. All welcome.",
    "Limited capacity — arrive early!",
]


class Command(BaseCommand):
    help = "Seed demo neighborhoods, routes, and events for the Community Event Locator"

    def add_arguments(self, parser):
        parser.add_argument("--events", type=int, default=150, help="How many events to create")
        parser.add_argument("--hoods", type=int, default=6, help="How many neighborhoods")
        parser.add_argument("--routes", type=int, default=5, help="How many routes")
        parser.add_argument("--reset", action="store_true", help="Delete existing demo data first")
        parser.add_argument("--center-lat", type=float, default=53.3498, help="City latitude")
        parser.add_argument("--center-lng", type=float, default=-6.2603, help="City longitude")

    @transaction.atomic
    def handle(self, *args, **opts):
        n_events = opts["events"]
        n_hoods = opts["hoods"]
        n_routes = opts["routes"]
        lat0 = opts["center_lat"]
        lng0 = opts["center_lng"]

        # figure out geometry field names once
        hood_geom = get_polygon_field(Neighborhood)
        route_geom = get_linestring_field(Route)
        event_point = get_point_field(Event)  # expected to be 'location' in your project

        if not hood_geom:
            raise SystemExit("Could not find a Polygon/MultiPolygon field on Neighborhood model.")
        if not route_geom:
            raise SystemExit("Could not find a LineString field on Route model.")
        if not event_point:
            raise SystemExit("Could not find a Point field on Event model.")

        if opts["reset"]:
            self.stdout.write("Clearing existing data…")
            Event.objects.all().delete()
            Route.objects.all().delete()
            Neighborhood.objects.all().delete()

        # ----- neighborhoods -----
        self.stdout.write(self.style.NOTICE("Seeding neighborhoods…"))
        hoods = []
        span = 0.04
        steps = max(2, int((n_hoods ** 0.5) + 0.999))
        grid = []
        for i in range(steps):
            for j in range(steps):
                grid.append((
                    jitter(lat0 + span * (i / (steps - 1) - 0.5), 0.002),
                    jitter(lng0 + span * (j / (steps - 1) - 0.5), 0.002)
                ))
        grid = grid[:n_hoods]

        for idx, (la, ln) in enumerate(grid, start=1):
            hood = Neighborhood(name=f"Neighborhood {idx}")
            setattr(hood, hood_geom, square_polygon(la, ln, half_deg=0.01))
            hood.save()
            hoods.append(hood)

        self.stdout.write(self.style.SUCCESS(f"Created {len(hoods)} neighborhoods"))

        # ----- routes -----
        self.stdout.write(self.style.NOTICE("Seeding routes…"))
        routes = []
        for i in range(n_routes):
            base_lat = jitter(lat0, 0.02)
            base_lng = jitter(lng0, 0.02)
            pts = []
            for k in range(randint(5, 7)):
                pts.append((
                    jitter(base_lat + (k - 3) * 0.005, 0.003),
                    jitter(base_lng + (k - 3) * 0.008, 0.003)
                ))
            r = Route(name=f"Route {i+1}")
            setattr(r, route_geom, line_from_latlngs(pts))
            r.save()
            routes.append(r)

        self.stdout.write(self.style.SUCCESS(f"Created {len(routes)} routes"))

        # ----- events -----
        self.stdout.write(self.style.NOTICE("Seeding events…"))
        now = timezone.now()
        events = []
        for _ in range(n_events):
            # 70% inside some neighborhood
            if random() < 0.7 and hoods:
                hood = choice(hoods)
                c = getattr(hood, hood_geom).centroid
                la = jitter(c.y, 0.006)
                ln = jitter(c.x, 0.006)
            else:
                hood = None
                la = jitter(lat0, 0.045)
                ln = jitter(lng0, 0.045)

            when = now + timedelta(days=randint(-5, 30), hours=randint(0, 23))

            ev = Event(
                title=choice(TITLES),
                description=choice(DESCS),
                when=when,
                neighborhood=hood,
            )
            setattr(ev, event_point, point(la, ln))
            events.append(ev)

        Event.objects.bulk_create(events, batch_size=500)
        self.stdout.write(self.style.SUCCESS(f"Created {len(events)} events"))
        self.stdout.write(self.style.SUCCESS("Demo data seeding complete ✅"))
