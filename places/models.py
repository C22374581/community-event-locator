from django.contrib.gis.db import models

class Neighborhood(models.Model):
    name = models.CharField(max_length=120)
    area = models.PolygonField(srid=4326)

    class Meta:
        indexes = [models.GiSTIndex(fields=['area'])]

    def __str__(self):
        return self.name

class Route(models.Model):
    name = models.CharField(max_length=120)
    path = models.LineStringField(srid=4326)

    class Meta:
        indexes = [models.GiSTIndex(fields=['path'])]

    def __str__(self):
        return self.name

class Event(models.Model):
    title = models.CharField(max_length=140)
    description = models.TextField(blank=True)
    when = models.DateTimeField()
    location = models.PointField(srid=4326)
    neighborhood = models.ForeignKey(
        Neighborhood, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        indexes = [models.GiSTIndex(fields=['location'])]

    def __str__(self):
        return self.title

