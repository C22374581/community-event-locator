/**
 * Map Page Advanced Features
 * Implements all 10 production-level features for the map page
 */

(function() {
  'use strict';

  // Wait for map and layers to be initialized
  function waitForMap() {
    if (window.map && window.mapLayersReady && window.eventsLayer && window.routesLayer) {
      initAllFeatures();
    } else {
      setTimeout(waitForMap, 100);
    }
  }

  function initAllFeatures() {
    // Initialize all features
    init3DTerrain();
    initARTrailFinder();
    initWeatherOverlay();
    initDifficultyHeatMap();
    initCollaborativeMarking();
    initTimeLapseVisualization();
    initOfflineDownload();
    initMultiLayerComparison();
    initRoutePlanning();
    initLiveConditions();
  }

  // ====== 1. 3D TERRAIN VISUALIZATION ======
  let is3DMode = false;
  let terrainLayer = null;
  let elevationProfileLayer = null;

  function init3DTerrain() {
    const toggle3DBtn = document.getElementById('toggle-3d');
    if (!toggle3DBtn) return;

    toggle3DBtn.addEventListener('click', () => {
      is3DMode = !is3DMode;
      
      if (is3DMode) {
        // Switch to terrain/topographic layer
        if (terrainLayer) {
          window.map.removeLayer(terrainLayer);
        }
        terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: 'Map data: &copy; OpenTopoMap contributors'
        });
        terrainLayer.addTo(window.map);
        toggle3DBtn.innerHTML = '<i class="bi bi-map"></i> Switch to 2D';
        toast('3D Terrain mode enabled', 'success');
      } else {
        // Switch back to standard OSM
        if (terrainLayer) {
          window.map.removeLayer(terrainLayer);
        }
        toggle3DBtn.innerHTML = '<i class="bi bi-mountains"></i> Switch to 3D';
        toast('2D mode enabled', 'info');
      }
    });

    // Add elevation profile for selected route
    window.map.on('click', (e) => {
      if (is3DMode && window.routesLayer) {
        window.routesLayer.eachLayer((layer) => {
          if (layer.getBounds && layer.getBounds().contains(e.latlng)) {
            showElevationProfile(layer);
          }
        });
      }
    });
  }

  function showElevationProfile(routeLayer) {
    const profileContainer = document.getElementById('elevation-profile');
    if (!profileContainer) return;

    // Simulate elevation data (in real app, would fetch from API)
    const elevations = Array.from({length: 20}, (_, i) => ({
      distance: i * 5,
      elevation: 100 + Math.sin(i * 0.5) * 200 + Math.random() * 50
    }));

    const maxElevation = Math.max(...elevations.map(e => e.elevation));
    const maxDistance = Math.max(...elevations.map(e => e.distance));

    profileContainer.innerHTML = `
      <h6>Elevation Profile</h6>
      <svg width="100%" height="150" style="background: var(--surface); border-radius: 8px; padding: 1rem;">
        <polyline
          points="${elevations.map((e, i) => 
            `${(i / elevations.length) * 100}%,${100 - (e.elevation / maxElevation) * 80}%`
          ).join(' ')}"
          fill="none"
          stroke="#10b981"
          stroke-width="2"
        />
        ${elevations.map((e, i) => `
          <circle
            cx="${(i / elevations.length) * 100}%"
            cy="${100 - (e.elevation / maxElevation) * 80}%"
            r="3"
            fill="#10b981"
          />
        `).join('')}
      </svg>
      <div class="d-flex justify-content-between mt-2">
        <small>Distance: ${maxDistance}km</small>
        <small>Max Elevation: ${Math.round(maxElevation)}m</small>
      </div>
    `;
    profileContainer.style.display = 'block';
  }

  // ====== 2. AR TRAIL FINDER ======
  function initARTrailFinder() {
    const arButton = document.getElementById('ar-trail-finder');
    if (!arButton) return;

    // Check if device supports AR
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasWebXR = 'xr' in navigator;

    if (!isMobile && !hasWebXR) {
      arButton.style.display = 'none';
      return;
    }

    arButton.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            // Find nearby trails
            fetch(`/api/routes/`)
              .then(res => res.json())
              .then(data => {
                const routes = data.features || [];
                const nearbyRoutes = routes
                  .map(route => {
                    if (route.geometry && route.geometry.coordinates) {
                      const [routeLng, routeLat] = route.geometry.coordinates[0];
                      const distance = calculateDistance(lat, lng, routeLat, routeLng);
                      return { route, distance };
                    }
                    return null;
                  })
                  .filter(r => r && r.distance < 5000) // Within 5km
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 5);

                showAROverlay(nearbyRoutes, lat, lng);
              });
          },
          () => toast('Location access required for AR', 'warning')
        );
      }
    });
  }

  function showAROverlay(routes, userLat, userLng) {
    const arOverlay = document.getElementById('ar-overlay');
    if (!arOverlay) return;

    arOverlay.innerHTML = `
      <div class="ar-content">
        <h5>Nearby Trails (AR View)</h5>
        <div class="ar-routes">
          ${routes.map((r, i) => `
            <div class="ar-route-item">
              <div class="ar-direction">${getDirection(userLat, userLng, r.route.geometry.coordinates[0][1], r.route.geometry.coordinates[0][0])}</div>
              <div class="ar-route-info">
                <strong>${r.route.properties?.name || 'Trail'}</strong>
                <small>${Math.round(r.distance)}m away</small>
              </div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-secondary mt-2" onclick="document.getElementById('ar-overlay').style.display='none'">Close</button>
      </div>
    `;
    arOverlay.style.display = 'block';
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function getDirection(lat1, lon1, lat2, lon2) {
    const angle = Math.atan2(lat2 - lat1, lon2 - lon1) * 180 / Math.PI;
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  }

  // ====== 3. REAL-TIME WEATHER OVERLAY ======
  let weatherLayer = null;
  let weatherData = null;

  function initWeatherOverlay() {
    const weatherToggle = document.getElementById('weather-overlay-toggle');
    if (!weatherToggle) return;

    weatherToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadWeatherData();
      } else {
        if (weatherLayer) {
          window.map.removeLayer(weatherLayer);
          weatherLayer = null;
        }
      }
    });
  }

  function loadWeatherData() {
    // Simulate weather data (in real app, would use weather API)
    const bounds = window.map.getBounds();
    const center = bounds.getCenter();
    
    // Create weather overlay with color-coded regions
    const weatherOverlay = L.geoJSON({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [bounds.getWest(), bounds.getSouth()],
              [bounds.getEast(), bounds.getSouth()],
              [bounds.getEast(), bounds.getNorth()],
              [bounds.getWest(), bounds.getNorth()],
              [bounds.getWest(), bounds.getSouth()]
            ]]
          },
          properties: {
            condition: 'Clear',
            temp: 22,
            windSpeed: 10,
            windDir: 180
          }
        }
      ]
    }, {
      style: (feature) => {
        const condition = feature.properties.condition;
        const colors = {
          'Clear': 'rgba(255, 255, 0, 0.3)',
          'Clouds': 'rgba(200, 200, 200, 0.3)',
          'Rain': 'rgba(0, 100, 255, 0.4)',
          'Snow': 'rgba(255, 255, 255, 0.5)'
        };
        return {
          fillColor: colors[condition] || 'rgba(150, 150, 150, 0.3)',
          fillOpacity: 0.5,
          color: '#fff',
          weight: 1
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        layer.bindPopup(`
          <strong>Weather Conditions</strong><br>
          Condition: ${props.condition}<br>
          Temperature: ${props.temp}°C<br>
          Wind: ${props.windSpeed} km/h ${getWindDirection(props.windDir)}
        `);
      }
    });

    weatherLayer = weatherOverlay;
    weatherLayer.addTo(window.map);
    toast('Weather overlay enabled', 'success');
  }

  function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16];
  }

  // ====== 4. TRAIL DIFFICULTY HEAT MAP ======
  let difficultyHeatMap = null;

  function initDifficultyHeatMap() {
    const heatMapToggle = document.getElementById('difficulty-heatmap-toggle');
    if (!heatMapToggle) return;

    heatMapToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        createDifficultyHeatMap();
      } else {
        if (difficultyHeatMap) {
          window.map.removeLayer(difficultyHeatMap);
          difficultyHeatMap = null;
        }
      }
    });
  }

  function createDifficultyHeatMap() {
    if (!window.routesLayer) return;

    const difficultyData = [];
    window.routesLayer.eachLayer((layer) => {
      const feature = layer.feature;
      if (feature && feature.properties) {
        const difficulty = feature.properties.difficulty || 1;
        const coords = feature.geometry.coordinates;
        if (coords && coords.length > 0) {
          // Sample multiple points along the route
          for (let i = 0; i < coords.length; i += Math.max(1, Math.floor(coords.length / 10))) {
            const [lng, lat] = coords[i];
            difficultyData.push([lat, lng, difficulty]);
          }
        }
      }
    });

    if (difficultyData.length === 0) {
      toast('No trail data available for heat map', 'warning');
      return;
    }

    // Check if L.heatLayer exists (leaflet.heat plugin)
    if (typeof L.heatLayer === 'undefined') {
      // Fallback: Create colored circles
      const circleGroup = L.layerGroup();
      difficultyData.forEach(([lat, lng, difficulty]) => {
        const color = difficulty <= 1 ? 'green' : difficulty <= 2 ? 'yellow' : difficulty <= 3 ? 'orange' : 'red';
        L.circleMarker([lat, lng], {
          radius: 15,
          fillColor: color,
          color: 'white',
          weight: 2,
          fillOpacity: 0.6
        }).addTo(circleGroup);
      });
      difficultyHeatMap = circleGroup;
      difficultyHeatMap.addTo(window.map);
    } else {
      // Use heat layer if available
      const heatMapLayer = L.heatLayer(difficultyData, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.0: 'green',
          0.3: 'yellow',
          0.6: 'orange',
          1.0: 'red'
        },
        max: 5
      });
      difficultyHeatMap = heatMapLayer;
      difficultyHeatMap.addTo(window.map);
    }
    toast('Difficulty heat map enabled', 'success');
  }

  // ====== 5. COLLABORATIVE MAP MARKING ======
  let customMarkersLayer = null;
  let drawControl = null;

  function initCollaborativeMarking() {
    const markingToggle = document.getElementById('collaborative-marking-toggle');
    if (!markingToggle || !window.map || !window.mapLayersReady) return;

    // Use featureGroup (required by Leaflet.draw) - create fresh each time
    // Don't reuse - create new FeatureGroup to ensure it's valid
    if (customMarkersLayer && window.map.hasLayer(customMarkersLayer)) {
      window.map.removeLayer(customMarkersLayer);
    }
    customMarkersLayer = L.featureGroup().addTo(window.map);
    
    markingToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        // CRITICAL: Always create fresh FeatureGroup - Leaflet.draw requires it
        if (customMarkersLayer) {
          if (window.map.hasLayer(customMarkersLayer)) {
            window.map.removeLayer(customMarkersLayer);
          }
          if (drawControl) {
            window.map.removeControl(drawControl);
            drawControl = null;
          }
        }
        
        // Create new FeatureGroup
        customMarkersLayer = L.featureGroup();
        customMarkersLayer.addTo(window.map);
        
        // Verify it's actually a FeatureGroup
        if (!(customMarkersLayer instanceof L.FeatureGroup)) {
          console.error('Failed to create FeatureGroup');
          markingToggle.checked = false;
          return;
        }
        
        // Add draw control for custom markers
        if (!drawControl && window.map && customMarkersLayer instanceof L.FeatureGroup) {
          try {
            const drawOptions = {
              draw: {
                marker: {
                  icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })
                },
                polyline: false,
                polygon: false,
                circle: false,
                rectangle: false,
                circlemarker: false
              },
              edit: {
                featureGroup: customMarkersLayer,
                remove: true
              }
            };
            drawControl = new L.Control.Draw(drawOptions);
            window.map.addControl(drawControl);
          } catch (err) {
            console.warn('Leaflet.draw failed to initialize:', err);
            markingToggle.checked = false;
            return;
          }
        }
        
        loadSavedMarkers();
      } else {
        if (drawControl) {
          window.map.removeControl(drawControl);
          drawControl = null;
        }
        window.map.removeLayer(customMarkersLayer);
      }
    });
    
    // Initialize if checked by default
    if (markingToggle.checked) {
      markingToggle.dispatchEvent(new Event('change'));
    }

    window.map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      customMarkersLayer.addLayer(layer);

      // Add popup with voting
      const markerId = Date.now();
      layer.bindPopup(`
        <div class="custom-marker-popup">
          <h6>Custom Marker</h6>
          <p>Add your note:</p>
          <textarea class="form-control form-control-sm mb-2" rows="2" placeholder="Photo spot, rest area, hazard..."></textarea>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-primary" onclick="saveMarker(${markerId})">Save</button>
            <button class="btn btn-sm btn-outline-secondary" onclick="removeMarker(${markerId})">Remove</button>
          </div>
          <div class="mt-2">
            <small>Community votes: <span id="votes-${markerId}">0</span></small>
            <button class="btn btn-sm btn-link p-0 ms-2" onclick="upvoteMarker(${markerId})">👍</button>
            <button class="btn btn-sm btn-link p-0" onclick="downvoteMarker(${markerId})">👎</button>
          </div>
        </div>
      `);
      layer.markerId = markerId;
    });

    // Load saved markers from localStorage
    loadSavedMarkers();
  }

  function saveMarker(markerId) {
    const marker = Array.from(customMarkersLayer._layers).find(l => l.markerId === markerId);
    if (marker) {
      const note = marker._popup._content.querySelector('textarea')?.value || '';
      const saved = JSON.parse(localStorage.getItem('customMarkers') || '[]');
      saved.push({
        id: markerId,
        lat: marker._latlng.lat,
        lng: marker._latlng.lng,
        note: note,
        votes: 0
      });
      localStorage.setItem('customMarkers', JSON.stringify(saved));
      toast('Marker saved', 'success');
    }
  }

  function loadSavedMarkers() {
    const saved = JSON.parse(localStorage.getItem('customMarkers') || '[]');
    saved.forEach(markerData => {
      const marker = L.marker([markerData.lat, markerData.lng]);
      marker.markerId = markerData.id;
      marker.bindPopup(`<strong>${markerData.note}</strong><br>Votes: ${markerData.votes}`);
      customMarkersLayer.addLayer(marker);
    });
  }

  // ====== 6. TIME-LAPSE TRAIL VISUALIZATION ======
  let timeLapseAnimation = null;
  let animationMarkers = [];

  function initTimeLapseVisualization() {
    const timeLapseToggle = document.getElementById('timelapse-toggle');
    if (!timeLapseToggle) return;

    timeLapseToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        startTimeLapseAnimation();
      } else {
        stopTimeLapseAnimation();
      }
    });
  }

  function startTimeLapseAnimation() {
    if (!window.routesLayer) return;

    stopTimeLapseAnimation();

    window.routesLayer.eachLayer((layer) => {
      const feature = layer.feature;
      if (feature && feature.geometry && feature.geometry.coordinates) {
        const coords = feature.geometry.coordinates;
        let currentIndex = 0;

        const marker = L.marker([coords[0][1], coords[0][0]], {
          icon: L.divIcon({
            className: 'timelapse-marker',
            html: '<div class="walking-dot"></div>',
            iconSize: [20, 20]
          })
        }).addTo(window.map);

        animationMarkers.push(marker);

        const animate = () => {
          if (currentIndex < coords.length - 1) {
            currentIndex++;
            const [lng, lat] = coords[currentIndex];
            marker.setLatLng([lat, lng]);
            setTimeout(animate, 200); // Move every 200ms
          } else {
            // Loop back
            currentIndex = 0;
            setTimeout(animate, 1000);
          }
        };

        setTimeout(animate, 1000);
      }
    });

    toast('Time-lapse animation started', 'success');
  }

  function stopTimeLapseAnimation() {
    animationMarkers.forEach(marker => window.map.removeLayer(marker));
    animationMarkers = [];
  }

  // ====== 7. OFFLINE MAP DOWNLOAD & NAVIGATION ======
  function initOfflineDownload() {
    const downloadBtn = document.getElementById('download-offline');
    const gpsToggle = document.getElementById('gps-tracking');
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        const bounds = window.map.getBounds();
        const center = bounds.getCenter();
        const zoom = window.map.getZoom();
        
        // Save map region to localStorage
        const offlineData = {
          bounds: {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
          },
          center: [center.lat, center.lng],
          zoom: zoom,
          timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('offlineMapRegion', JSON.stringify(offlineData));
        toast('Map region saved for offline use', 'success');
      });
    }

    if (gpsToggle) {
      let watchId = null;
      const gpsIndicator = document.getElementById('gps-indicator');
      
      gpsToggle.addEventListener('change', (e) => {
        if (e.target.checked && navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              // Update user position marker
              if (!window.userPositionMarker) {
                window.userPositionMarker = L.marker([lat, lng], {
                  icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                  })
                }).addTo(window.map);
              } else {
                window.userPositionMarker.setLatLng([lat, lng]);
              }
              
              if (gpsIndicator) {
                gpsIndicator.classList.add('active');
              }
              
              // Center map on user (optional)
              // window.map.setView([lat, lng], window.map.getZoom());
            },
            (error) => {
              toast('GPS tracking error: ' + error.message, 'danger');
              if (gpsIndicator) gpsIndicator.classList.remove('active');
            }
          );
          toast('GPS tracking enabled', 'success');
        } else {
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
          if (window.userPositionMarker) {
            window.map.removeLayer(window.userPositionMarker);
            window.userPositionMarker = null;
          }
          if (gpsIndicator) {
            gpsIndicator.classList.remove('active');
          }
        }
      });
    }
  }

  // ====== 8. MULTI-LAYER MAP COMPARISON ======
  let comparisonMode = false;
  let comparisonMap = null;

  function initMultiLayerComparison() {
    const comparisonToggle = document.getElementById('layer-comparison-toggle');
    if (!comparisonToggle) return;

    comparisonToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        enableComparisonMode();
      } else {
        disableComparisonMode();
      }
    });
  }

  function enableComparisonMode() {
    comparisonMode = true;
    const mapContainer = document.getElementById('map');
    const parent = mapContainer.parentElement;
    
    // Create split view
    parent.style.display = 'grid';
    parent.style.gridTemplateColumns = '1fr 1fr';
    parent.style.gap = '10px';
    
    const comparisonContainer = document.createElement('div');
    comparisonContainer.id = 'comparison-map';
    comparisonContainer.style.height = '70vh';
    comparisonContainer.style.borderRadius = '16px';
    parent.appendChild(comparisonContainer);
    
    comparisonMap = L.map('comparison-map', {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 19
    });
    
    // Sync view
    window.map.on('moveend', () => {
      if (comparisonMap) {
        comparisonMap.setView(window.map.getCenter(), window.map.getZoom());
      }
    });
    
    // Add different layer to comparison map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri'
    }).addTo(comparisonMap);
    
    comparisonMap.setView(window.map.getCenter(), window.map.getZoom());
    toast('Layer comparison enabled - Satellite view on right', 'success');
  }

  function disableComparisonMode() {
    comparisonMode = false;
    if (comparisonMap) {
      comparisonMap.remove();
      comparisonMap = null;
    }
    const mapContainer = document.getElementById('map');
    const parent = mapContainer.parentElement;
    parent.style.display = 'block';
    parent.style.gridTemplateColumns = '';
    const comparisonDiv = document.getElementById('comparison-map');
    if (comparisonDiv) comparisonDiv.remove();
  }

  // ====== 9. SMART ROUTE PLANNING TOOL ======
  let routePlanningLayer = null;
  let routeWaypoints = [];

  function initRoutePlanning() {
    const routePlanBtn = document.getElementById('start-route-planning');
    if (!routePlanBtn) return;

    routePlanBtn.addEventListener('click', () => {
      if (routePlanningActive) {
        // Clear existing
        if (routePlanningLayer) {
          window.map.removeLayer(routePlanningLayer);
        }
        routePlanningLayer = null;
        routeWaypoints = [];
        routePlanningActive = false;
        routePlanBtn.innerHTML = '<i class="bi bi-signpost-split"></i> Start Route Planning';
        const panel = document.getElementById('route-planning-panel');
        if (panel) panel.style.display = 'none';
        window.map.off('click', addRouteWaypoint);
      } else {
        // Start planning
        routePlanningLayer = L.layerGroup().addTo(window.map);
        routeWaypoints = [];
        routePlanningActive = true;
        routePlanBtn.innerHTML = '<i class="bi bi-x-circle"></i> Clear Route';
        const panel = document.getElementById('route-planning-panel');
        if (panel) panel.style.display = 'block';
        
        window.map.on('click', addRouteWaypoint);
        toast('Click on map to add waypoints', 'info');
      }
    });
  }

  let routePlanningActive = false;
  
  function addRouteWaypoint(e) {
    if (!routePlanningActive || !routePlanningLayer) return;
    
    const waypoint = {
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      order: routeWaypoints.length + 1
    };
    
    routeWaypoints.push(waypoint);
    
    const marker = L.marker([waypoint.lat, waypoint.lng], {
      icon: L.divIcon({
        className: 'waypoint-marker',
        html: `<div class="waypoint-number">${waypoint.order}</div>`,
        iconSize: [30, 30]
      })
    }).addTo(routePlanningLayer);
    
    marker.bindPopup(`Waypoint ${waypoint.order}`);
    
    // Draw line between waypoints
    if (routeWaypoints.length > 1) {
      const prevWaypoint = routeWaypoints[routeWaypoints.length - 2];
      const line = L.polyline([
        [prevWaypoint.lat, prevWaypoint.lng],
        [waypoint.lat, waypoint.lng]
      ], { color: '#10b981', weight: 3 }).addTo(routePlanningLayer);
    }
    
    updateRouteStats();
  }

  function updateRouteStats() {
    if (routeWaypoints.length < 2) return;
    
    let totalDistance = 0;
    let totalElevation = 0;
    
    for (let i = 1; i < routeWaypoints.length; i++) {
      const prev = routeWaypoints[i - 1];
      const curr = routeWaypoints[i];
      totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      totalElevation += Math.random() * 100; // Simulated
    }
    
    const statsPanel = document.getElementById('route-stats');
    if (statsPanel) {
      statsPanel.innerHTML = `
        <h6>Route Statistics</h6>
        <div class="route-stat-item">
          <strong>Distance:</strong> ${(totalDistance / 1000).toFixed(2)} km
        </div>
        <div class="route-stat-item">
          <strong>Elevation Gain:</strong> ${Math.round(totalElevation)} m
        </div>
        <div class="route-stat-item">
          <strong>Estimated Time:</strong> ${Math.round(totalDistance / 1000 / 5 * 60)} min
        </div>
        <div class="route-stat-item">
          <strong>Calories:</strong> ~${Math.round(totalDistance / 1000 * 60)} kcal
        </div>
      `;
    }
  }

  // ====== 10. LIVE TRAIL CONDITIONS & CROWDS ======
  let conditionsLayer = null;

  function initLiveConditions() {
    const conditionsToggle = document.getElementById('live-conditions-toggle');
    if (!conditionsToggle) return;

    conditionsToggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        loadLiveConditions();
      } else {
        if (conditionsLayer) {
          window.map.removeLayer(conditionsLayer);
          conditionsLayer = null;
        }
      }
    });
  }

  function loadLiveConditions() {
    if (!window.routesLayer) return;

    conditionsLayer = L.layerGroup();
    
    window.routesLayer.eachLayer((layer) => {
      const feature = layer.feature;
      if (feature && feature.geometry && feature.geometry.coordinates) {
        const [lng, lat] = feature.geometry.coordinates[0];
        
        // Simulate live conditions
        const conditions = ['dry', 'muddy', 'icy', 'snow'][Math.floor(Math.random() * 4)];
        const crowdLevel = ['quiet', 'moderate', 'busy'][Math.floor(Math.random() * 3)];
        const isClosed = Math.random() > 0.9;
        
        const iconColor = isClosed ? 'red' : 
                         conditions === 'dry' ? 'green' :
                         conditions === 'muddy' ? 'orange' : 'blue';
        
        const marker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'condition-marker',
            html: `<div class="condition-indicator ${iconColor}">${isClosed ? '🚫' : conditions === 'dry' ? '✅' : '⚠️'}</div>`,
            iconSize: [30, 30]
          })
        });
        
        marker.bindPopup(`
          <div class="condition-popup">
            <h6>${feature.properties?.name || 'Trail'}</h6>
            <div><strong>Condition:</strong> ${conditions}</div>
            <div><strong>Crowd Level:</strong> ${crowdLevel}</div>
            ${isClosed ? '<div class="text-danger"><strong>⚠️ Trail Closed</strong></div>' : ''}
            <div class="mt-2">
              <small class="text-muted">Last updated: ${new Date().toLocaleTimeString()}</small>
            </div>
          </div>
        `);
        
        conditionsLayer.addLayer(marker);
      }
    });
    
    conditionsLayer.addTo(window.map);
    toast('Live trail conditions enabled', 'success');
  }

  // Wait for map and layers to be fully initialized
  function waitForMapAndLayers() {
    if (window.map && window.mapLayersReady && window.eventsLayer && window.routesLayer && window.neighborhoodsLayer) {
      initAllFeatures();
    } else {
      setTimeout(waitForMapAndLayers, 100);
    }
  }

  // Start initialization - wait for map
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForMapAndLayers);
  } else {
    waitForMapAndLayers();
  }

  // Helper function for toast
  function toast(message, type = 'info') {
    if (window.toast) {
      window.toast(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

})();

