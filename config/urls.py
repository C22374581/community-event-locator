from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from places.views import home, map_view
from places.views_api import EventViewSet, RouteViewSet, NeighborhoodViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'routes', RouteViewSet)
router.register(r'neighborhoods', NeighborhoodViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home, name='home'),
    path('map/', map_view, name='map'),
    path('api/', include(router.urls)),
]


