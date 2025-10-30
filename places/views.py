# places/views.py
from django.shortcuts import render
from .models import Event, Route, Neighborhood

def home(request):
    stats = {
        "events": Event.objects.count(),
        "routes": Route.objects.count(),
        "neighborhoods": Neighborhood.objects.count(),
    }
    return render(request, "home.html", {"stats": stats})

def map_view(request):
    return render(request, "map.html")


