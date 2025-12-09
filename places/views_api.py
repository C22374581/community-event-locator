# places/views_api.py
"""
Advanced API layer for spatial data with PostGIS queries.

This module provides comprehensive REST API endpoints for events, routes, and neighborhoods
with advanced spatial query capabilities including:
- Custom polygon searches
- Temporal-spatial queries
- Distance-based ranking
- Multi-route buffer searches
- Category and tag filtering
"""
from django.shortcuts import get_object_or_404
from django.contrib.gis.geos import Point, Polygon, GEOSGeometry
from django.contrib.gis.measure import D
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, F, FloatField
from django.db.models.functions import Cast

from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet, ReadOnlyModelViewSet
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle

from .models import Event, Route, Neighborhood, EventCategory, SpatialQueryLog

# Custom pagination to load ALL events
class LargeResultsSetPagination(PageNumberPagination):
    page_size = 10000  # Load all events
    page_size_query_param = 'page_size'
    max_page_size = 10000
from .serializers import (
    EventGeoSerializer,
    RouteGeoSerializer,
    NeighborhoodGeoSerializer,
    EventCategorySerializer,
)

"""
API layer for spatial data (Events, Routes, Neighborhoods).
GeoJSON endpoints with spatial queries using PostGIS + DRF-GIS.

Endpoints you get:
- /api/events/                     (paginated list + search + ordering + bbox)
- /api/events/nearby/              (lat/lng + radius)
- /api/events/in_neighborhood/     (neighborhood_id)
- /api/events/along_route/         (route_id + buffer)
- /api/events/stats/               (summary counts)

- /api/routes/                     (GeoJSON FeatureCollection, no pagination)
- /api/neighborhoods/              (GeoJSON FeatureCollection, no pagination)
"""

# ------------------------------------------------------------
# Helpers
# ------------------------------------------------------------

def _first_geom_attr(obj, candidates):
    """Return the first geometry-like field on the model instance."""
    for name in candidates:
        if hasattr(obj, name):
            return getattr(obj, name)
    raise AttributeError(
        f"{obj.__class__.__name__} has none of {', '.join(candidates)}"
    )

# Fallback field names for geometry lookup on your models
EVENT_POINT_FIELD = ("location", "geom", "point")
ROUTE_LINE_FIELDS = ("path", "line", "geom", "linestring", "geometry")
HOOD_POLY_FIELDS  = ("area", "polygon", "geom", "geometry", "boundary")


def _log_spatial_query(query_type, parameters, result_count, execution_time_ms, request):
    """
    Helper function to log spatial queries to SpatialQueryLog.
    
    Args:
        query_type: Type of query (nearby, polygon, route, etc.)
        parameters: Dict of query parameters
        result_count: Number of results returned
        execution_time_ms: Query execution time in milliseconds
        request: Django request object
    """
    try:
        user = request.user if request.user.is_authenticated else None
        ip_address = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
        
        SpatialQueryLog.objects.create(
            query_type=query_type,
            parameters=parameters,
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            user=user,
            ip_address=ip_address if ip_address else None
        )
    except Exception as e:
        # Don't fail the request if logging fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to log spatial query: {e}")


# ------------------------------------------------------------
# Event API
# ------------------------------------------------------------

class EventViewSet(GenericViewSet):
    """
    API for listing and filtering Events with spatial queries.
    """
    queryset = Event.objects.all()                # <-- fixes DRF AssertionError
    serializer_class = EventGeoSerializer
    pagination_class = LargeResultsSetPagination

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    
    def get_queryset(self):
        """Get queryset with safe select_related to avoid errors."""
        qs = Event.objects.all()
        try:
            qs = qs.select_related('category', 'organizer', 'country', 'neighborhood')
        except Exception:
            try:
                qs = qs.select_related('category')
            except Exception:
                pass
        return qs

    def list(self, request):
        """
        List events with advanced filtering.
        
        Query parameters:
        - bbox: Bounding box (minLng,minLat,maxLng,maxLat)
        - q: Text search (title/description)
        - category: Category ID
        - tags: Comma-separated tags
        - status: Event status (active, cancelled, etc.)
        - ordering: Sort field (-when, when, title, etc.)
        - upcoming: Filter upcoming events only (true/false)
        - today: Filter events today only (true/false)
        """
        qs = self.get_queryset()

        # --- BBOX filter (?bbox=minLng,minLat,maxLng,maxLat)
        bbox = (request.GET.get("bbox") or "").strip()
        bbox_used = False
        if bbox:
            try:
                min_lng, min_lat, max_lng, max_lat = [float(x) for x in bbox.split(",")]
                envelope = Polygon.from_bbox((min_lng, min_lat, max_lng, max_lat))
                qs = qs.filter(**{f"{EVENT_POINT_FIELD[0]}__within": envelope})
                bbox_used = True
            except Exception:
                pass

        # --- Category filter
        category_id = request.GET.get("category")
        if category_id:
            try:
                qs = qs.filter(category_id=int(category_id))
            except ValueError:
                pass

        # --- Tags filter
        tags = request.GET.get("tags", "").strip()
        if tags:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]
            for tag in tag_list:
                qs = qs.filter(tags__icontains=tag)

        # --- Status filter
        status = request.GET.get("status", "").strip()
        if status:
            qs = qs.filter(status=status)

        # --- Text search (title or description)
        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        # --- Temporal filters
        if request.GET.get("upcoming") == "true":
            qs = qs.filter(when__gt=timezone.now())
        
        if request.GET.get("today") == "true":
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            qs = qs.filter(when__gte=today_start, when__lt=today_end)

        # --- Ordering (default newest first by 'when')
        ordering = (request.GET.get("ordering") or "-when").strip()
        qs = qs.order_by(ordering)

        # --- Pagination
        page = self.paginate_queryset(qs)
        
        # Log bbox queries if bbox was used
        if bbox_used:
            import time
            start_time = time.time()
            result_count = qs.count()
            execution_time_ms = (time.time() - start_time) * 1000
            try:
                min_lng, min_lat, max_lng, max_lat = [float(x) for x in bbox.split(",")]
                _log_spatial_query(
                    query_type='bbox',
                    parameters={'min_lng': min_lng, 'min_lat': min_lat, 'max_lng': max_lng, 'max_lat': max_lat},
                    result_count=result_count,
                    execution_time_ms=execution_time_ms,
                    request=request
                )
            except Exception:
                pass
        
        # CRITICAL: Catch ALL exceptions including SkipField to prevent 500 errors
        try:
            # Serialize events - catch SkipField when accessing ser.data
            from rest_framework.fields import SkipField
            ser = EventGeoSerializer(page or qs, many=True, context={'request': request})
            try:
                # Accessing ser.data can raise SkipField - catch it here
                data = ser.data
            except SkipField:
                # SkipField caught - return empty data
                data = {'type': 'FeatureCollection', 'features': []}
            except Exception as ser_error:
                # Any other serialization error - return empty data
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Event serialization error: {ser_error}")
                data = {'type': 'FeatureCollection', 'features': []}
            
            if page is not None:
                return self.get_paginated_response(data)
            return Response(data)
        except Exception as e:
            # Final fallback - return empty data on ANY error
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error in events list view: {e}\n{traceback.format_exc()}")
            empty_data = {'type': 'FeatureCollection', 'features': []}
            if page is not None:
                paginator = self.pagination_class()
                return paginator.get_paginated_response(empty_data)
            return Response(empty_data)

    # --------------------------------------------------------
    # Nearby (lat/lng + radius)
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        import time
        start_time = time.time()
        
        try:
            lat = float(request.GET.get("lat"))
            lng = float(request.GET.get("lng"))
            radius = int(request.GET.get("radius", 1000))
        except (TypeError, ValueError):
            return Response({"error": "Invalid lat/lng/radius."}, status=400)

        pt = Point(lng, lat, srid=4326)
        qs = self.get_queryset().filter(
            **{f"{EVENT_POINT_FIELD[0]}__distance_lte": (pt, D(m=radius))}
        )
        result_count = qs.count()
        ser = EventGeoSerializer(qs, many=True)
        
        execution_time_ms = (time.time() - start_time) * 1000
        _log_spatial_query(
            query_type='nearby',
            parameters={'lat': lat, 'lng': lng, 'radius': radius},
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            request=request
        )
        
        return Response(ser.data)

    # --------------------------------------------------------
    # In Neighborhood
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def in_neighborhood(self, request):
        import time
        start_time = time.time()
        
        hood_id = request.GET.get("neighborhood_id")
        if not hood_id:
            return Response({"error": "neighborhood_id is required."}, status=400)

        hood = get_object_or_404(Neighborhood, pk=hood_id)
        hood_geom = _first_geom_attr(hood, HOOD_POLY_FIELDS)

        qs = self.get_queryset().filter(
            **{f"{EVENT_POINT_FIELD[0]}__within": hood_geom}
        )
        result_count = qs.count()
        ser = EventGeoSerializer(qs, many=True)
        
        execution_time_ms = (time.time() - start_time) * 1000
        _log_spatial_query(
            query_type='neighborhood',
            parameters={'neighborhood_id': int(hood_id)},
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            request=request
        )
        
        return Response(ser.data)

    # --------------------------------------------------------
    # Along Route (buffer in meters)
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def along_route(self, request):
        import time
        start_time = time.time()
        
        route_id = request.GET.get("route_id")
        try:
            buffer_m = int(request.GET.get("buffer", 200))
        except ValueError:
            buffer_m = 200

        if not route_id:
            return Response({"error": "route_id is required."}, status=400)

        route = get_object_or_404(Route, pk=route_id)
        route_geom = _first_geom_attr(route, ROUTE_LINE_FIELDS)

        # server-side distance threshold to the route geometry
        qs = self.get_queryset().filter(
            **{f"{EVENT_POINT_FIELD[0]}__distance_lte": (route_geom, D(m=buffer_m))}
        )
        result_count = qs.count()
        ser = EventGeoSerializer(qs, many=True)
        
        execution_time_ms = (time.time() - start_time) * 1000
        _log_spatial_query(
            query_type='route',
            parameters={'route_id': int(route_id), 'buffer': buffer_m},
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            request=request
        )
        
        return Response(ser.data)

    # --------------------------------------------------------
    # Custom Polygon Search
    # --------------------------------------------------------
    @action(detail=False, methods=["post", "get"])
    def in_polygon(self, request):
        """
        Find events within a custom polygon.
        
        POST: Send GeoJSON polygon in request body
        GET: ?polygon=[[lng1,lat1],[lng2,lat2],...] (array of coordinates)
        """
        if request.method == "POST":
            # Expect GeoJSON polygon in body
            try:
                data = request.data
                if data.get("type") == "Feature" and data.get("geometry", {}).get("type") == "Polygon":
                    coords = data["geometry"]["coordinates"][0]
                elif data.get("type") == "Polygon":
                    coords = data["coordinates"][0]
                else:
                    return Response({"error": "Invalid GeoJSON format. Expected Polygon."}, status=400)
                
                polygon = Polygon(coords, srid=4326)
            except Exception as e:
                return Response({"error": f"Invalid polygon data: {str(e)}"}, status=400)
        else:
            # GET with polygon parameter
            polygon_str = request.GET.get("polygon")
            if not polygon_str:
                return Response({"error": "polygon parameter required"}, status=400)
            try:
                import json
                coords = json.loads(polygon_str)
                polygon = Polygon(coords, srid=4326)
            except Exception as e:
                return Response({"error": f"Invalid polygon format: {str(e)}"}, status=400)

        import time
        start_time = time.time()
        
        qs = self.get_queryset().filter(**{f"{EVENT_POINT_FIELD[0]}__within": polygon})
        result_count = qs.count()
        ser = EventGeoSerializer(qs, many=True)
        
        execution_time_ms = (time.time() - start_time) * 1000
        _log_spatial_query(
            query_type='polygon',
            parameters={'polygon_coords_count': len(coords)},
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            request=request
        )
        
        return Response(ser.data)

    # --------------------------------------------------------
    # Temporal-Spatial Query (Events today within radius)
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def today_nearby(self, request):
        """
        Find events happening today within a radius.
        
        Query params: lat, lng, radius (meters)
        """
        try:
            lat = float(request.GET.get("lat"))
            lng = float(request.GET.get("lng"))
            radius = int(request.GET.get("radius", 5000))
        except (TypeError, ValueError):
            return Response({"error": "Invalid lat/lng/radius."}, status=400)

        pt = Point(lng, lat, srid=4326)
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        qs = self.get_queryset().filter(
            **{f"{EVENT_POINT_FIELD[0]}__distance_lte": (pt, D(m=radius))},
            when__gte=today_start,
            when__lt=today_end
        )
        ser = EventGeoSerializer(qs, many=True, context={'reference_point': pt})
        return Response(ser.data)

    # --------------------------------------------------------
    # Distance-Based Ranking
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def ranked_by_distance(self, request):
        """
        Get events ranked by distance from a point.
        
        Query params: lat, lng, limit (optional)
        """
        try:
            lat = float(request.GET.get("lat"))
            lng = float(request.GET.get("lng"))
            limit = int(request.GET.get("limit", 50))
        except (TypeError, ValueError):
            return Response({"error": "Invalid lat/lng/limit."}, status=400)

        pt = Point(lng, lat, srid=4326)
        
        # Annotate with distance using PostGIS ST_Distance
        from django.contrib.gis.db.models.functions import Distance as DistanceFunc
        
        import time
        start_time = time.time()
        
        # Use PostGIS Distance function
        # Note: Distance returns degrees, convert to meters (approximate)
        qs = self.get_queryset().annotate(
            distance_deg=DistanceFunc(f'{EVENT_POINT_FIELD[0]}', pt)
        )
        
        # Convert to meters and order (1 degree ≈ 111000 meters at equator)
        # We'll use the distance in the serializer context instead
        qs = qs.order_by('distance_deg')[:limit]
        result_count = qs.count()

        ser = EventGeoSerializer(qs, many=True, context={'reference_point': pt})
        
        execution_time_ms = (time.time() - start_time) * 1000
        _log_spatial_query(
            query_type='distance_ranked',
            parameters={'lat': lat, 'lng': lng, 'limit': limit},
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            request=request
        )
        
        return Response(ser.data)

    # --------------------------------------------------------
    # Multi-Route Buffer Search
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def along_routes(self, request):
        """
        Find events near multiple routes.
        
        Query params: route_ids (comma-separated), buffer (meters)
        """
        route_ids_str = request.GET.get("route_ids")
        if not route_ids_str:
            return Response({"error": "route_ids parameter required (comma-separated)"}, status=400)
        
        try:
            route_ids = [int(id.strip()) for id in route_ids_str.split(",")]
            buffer_m = int(request.GET.get("buffer", 200))
        except ValueError:
            return Response({"error": "Invalid route_ids or buffer format"}, status=400)

        routes = Route.objects.filter(id__in=route_ids)
        if not routes.exists():
            return Response({"error": "No routes found"}, status=404)

        # Find events within buffer of any route
        qs = self.get_queryset().none()
        for route in routes:
            route_geom = _first_geom_attr(route, ROUTE_LINE_FIELDS)
            route_events = self.get_queryset().filter(
                **{f"{EVENT_POINT_FIELD[0]}__distance_lte": (route_geom, D(m=buffer_m))}
            )
            qs = qs | route_events

        # Remove duplicates
        qs = qs.distinct()
        ser = EventGeoSerializer(qs, many=True)
        return Response(ser.data)

    # --------------------------------------------------------
    # Stats summary (enhanced)
    # --------------------------------------------------------
    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Enhanced statistics endpoint."""
        qs = self.get_queryset()
        total = qs.count()
        with_geo = qs.exclude(**{EVENT_POINT_FIELD[0]: None}).count()
        no_geo = total - with_geo
        
        # Status breakdown
        status_counts = {}
        for status_code, status_name in Event.STATUS_CHOICES:
            status_counts[status_code] = qs.filter(status=status_code).count()
        
        # Category breakdown
        category_counts = {}
        for category in EventCategory.objects.all():
            category_counts[category.name] = qs.filter(category=category).count()
        
        # Upcoming vs past
        now = timezone.now()
        upcoming = qs.filter(when__gt=now).count()
        past = qs.filter(when__lt=now).count()
        
        return Response({
            "total_events": total,
            "geocoded": with_geo,
            "missing_geometry": no_geo,
            "upcoming": upcoming,
            "past": past,
            "status_breakdown": status_counts,
            "category_breakdown": category_counts,
        })


# ------------------------------------------------------------
# Route API
# ------------------------------------------------------------

class RouteViewSet(GenericViewSet):
    """Return routes as GeoJSON FeatureCollection (no pagination)."""
    queryset = Route.objects.all()
    serializer_class = RouteGeoSerializer

    def get_queryset(self):
        """Get queryset without prefetching waypoints (table may not exist)."""
        return Route.objects.all().select_related('country')

    def list(self, request):
        try:
            qs = self.get_queryset()
            q = (request.GET.get("q") or "").strip()
            if q:
                qs = qs.filter(name__icontains=q)

            ordering = (request.GET.get("ordering") or "name").strip()
            qs = qs.order_by(ordering)
            
            # Ensure we get ALL routes - no pagination limit
            # Count for logging
            total_count = qs.count()
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Loading {total_count} routes from database")

            ser = RouteGeoSerializer(qs, many=True, context={'request': request})
            # CRITICAL: Catch SkipField when accessing ser.data
            from rest_framework.fields import SkipField
            try:
                data = ser.data
                # Ensure it's a FeatureCollection
                if isinstance(data, list):
                    data = {'type': 'FeatureCollection', 'features': data}
                elif 'type' not in data:
                    data = {'type': 'FeatureCollection', 'features': data.get('features', [])}
                logger.info(f"Returning {len(data.get('features', []))} route features")
            except SkipField:
                # SkipField caught - return empty data
                data = {'type': 'FeatureCollection', 'features': []}
            except Exception as data_error:
                # Any other error - return empty data
                logger.warning(f"Route serialization error: {data_error}")
                data = {'type': 'FeatureCollection', 'features': []}
            return Response(data)
        except Exception as e:
            # Final fallback - return empty data on ANY error
            import logging
            import traceback
            from rest_framework.fields import SkipField
            logger = logging.getLogger(__name__)
            if not isinstance(e, SkipField):
                logger.error(f"Error in routes list: {e}\n{traceback.format_exc()}")
            return Response({'type': 'FeatureCollection', 'features': []})


# ------------------------------------------------------------
# Neighborhood API
# ------------------------------------------------------------

class NeighborhoodViewSet(GenericViewSet):
    
    def get_queryset(self):
        """Get queryset with safe select_related."""
        qs = Neighborhood.objects.all()
        try:
            qs = qs.select_related('country', 'region')
        except Exception:
            pass
        return qs
    """
    API for Neighborhoods.
    
    Returns neighborhoods as GeoJSON FeatureCollection with event counts.
    """
    queryset = Neighborhood.objects.all()
    serializer_class = NeighborhoodGeoSerializer
    permission_classes = [AllowAny]

    def list(self, request):
        qs = self.get_queryset()
        q = (request.GET.get("q") or "").strip()
        if q:
            qs = qs.filter(name__icontains=q)

        ordering = (request.GET.get("ordering") or "name").strip()
        qs = qs.order_by(ordering)

        ser = NeighborhoodGeoSerializer(qs, many=True)
        return Response(ser.data)


# ------------------------------------------------------------
# EventCategory API
# ------------------------------------------------------------
class EventCategoryViewSet(ReadOnlyModelViewSet):
    """
    Read-only API for Event Categories.
    
    Returns list of all event categories.
    """
    queryset = EventCategory.objects.all()
    serializer_class = EventCategorySerializer
    permission_classes = [AllowAny]
