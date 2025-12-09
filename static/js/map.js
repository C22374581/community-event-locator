/* global L, bootstrap */
(() => {
  "use strict";
  
  // Prevent access to layers before initialization
  window.eventsLayer = null;
  window.routesLayer = null;
  window.neighborhoodsLayer = null;
  window.map = null;

  // ====== CONFIG ======
  const API_ROOT = "/api/";
  const API = {
    // neighborhoods removed - not loading them
    routes:        `${API_ROOT}routes/`,
    // events is paginated in DRF -> we ask for ALL events
    events:        `${API_ROOT}events/?page=1&page_size=10000`,
    nearby:   (lat, lng, r) => `${API_ROOT}events/nearby/?lat=${lat}&lng=${lng}&radius=${r}`,
    // inHood removed - neighborhoods not displayed
    along:    (id, buffer) => `${API_ROOT}events/along_route/?route_id=${id}&buffer=${buffer}`,
  };

  const DUBLIN = [53.3498, -6.2603];
  const WORLD_VIEW = [20, 0]; // Center of world for global view

  // ====== DOM HELPERS ======
  const $ = (sel) => document.querySelector(sel);
  const pick = (...sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  // Loading + toast (ids/classes must match map.html)
  const loadingEl = $("#loading");
  const toastEl   = $("#toast");
  const toastBody = $("#toast-body");

  function setLoading(v) {
    if (!loadingEl) return;
    loadingEl.classList.toggle("d-none", !v);
  }

  function toast(message, type = "info", ms = 2400) {
    if (!toastEl || !toastBody) {
      // make sure errors still surface during dev
      console.warn("Toast:", message);
      alert(message);
      return;
    }
    toastEl.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 start-50 translate-middle-x mt-3`;
    toastBody.textContent = message;
    new bootstrap.Toast(toastEl, { delay: ms }).show();
  }

  // Fetch JSON with timeout + nice errors
  async function fetchJSON(url, { timeout = 10000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  // ====== LEAFLET: MAP + LAYERS ======
  // Start with world view for global platform
  const map = L.map("map", { 
    zoomControl: false,
    minZoom: 2,
    maxZoom: 19,
    worldCopyJump: true
  }).setView(WORLD_VIEW, 2); // World view initially
  
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // CRITICAL: Create layers and assign to window IMMEDIATELY to prevent "before initialization" errors
  // Styled groups - CREATE FIRST
  // Neighborhoods removed - not displaying on map (ugly shapes)
  const neighborhoodsLayer = L.geoJSON(null, {
    style: { color: "#0dcaf0", weight: 2, fillOpacity: 0.08 },
    onEachFeature: (f, layer) => {
      const name = f?.properties?.name ?? "Neighborhood";
      layer.bindPopup(`<b>${name}</b>`);
    },
  }); // NOT added to map - neighborhoods removed from display

  const routesLayer = L.geoJSON(null, {
    style: { color: "#ffc107", weight: 3 },
    onEachFeature: (f, layer) => {
      const p = f?.properties || {};
      const name = p.name || "Trail";
      const difficulty = p.difficulty_display || (p.difficulty ? ['Easy', 'Moderate', 'Challenging', 'Hard', 'Extreme'][p.difficulty - 1] : '');
      const distance = p.distance_km ? `${p.distance_km.toFixed(1)} km` : (p.distance_meters ? `${(p.distance_meters / 1000).toFixed(1)} km` : '');
      const country = p.country?.name || '';
      const duration = p.estimated_duration_hours ? `${p.estimated_duration_hours.toFixed(1)} hours` : '';
      
      // Create rich popup content for trails
      const popupContent = `
        <div style="min-width: 200px; color: #0f172a;">
          <h6 style="color: #0f172a; font-weight: 600; margin-bottom: 0.5rem;">${name}</h6>
          ${p.description ? `<p style="color: #64748b; font-size: 0.875rem; margin-bottom: 0.5rem;">${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}</p>` : ''}
          <div style="color: #0f172a; font-size: 0.875rem;">
            ${difficulty ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-signpost-split"></i> ${difficulty}</div>` : ''}
            ${distance ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-arrows-angle-expand"></i> ${distance}</div>` : ''}
            ${duration ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-clock"></i> ${duration}</div>` : ''}
            ${country ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-geo-alt"></i> ${country}</div>` : ''}
            ${p.elevation_gain ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-mountains"></i> +${p.elevation_gain}m elevation</div>` : ''}
          </div>
        </div>
      `;
      
      // Bind popup with proper options
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
        closeButton: true,
        autoPan: true
      });
      
      // Ensure popup opens on click - CRITICAL FIX
      layer.on('click', function(e) {
        e.originalEvent?.stopPropagation();
        this.openPopup();
        // Get center of route for zooming
        const bounds = this.getBounds();
        if (bounds && bounds.isValid()) {
          map.fitBounds(bounds.pad(0.1), { animate: true, duration: 1.5 });
        }
      });
    },
  }).addTo(map);

  const eventsLayer = L.geoJSON(null, {
    pointToLayer: (_f, latlng) =>
      L.circleMarker(latlng, {
        radius: 8,
        color: "#20c997",
        weight: 2,
        fillColor: "#20c997",
        fillOpacity: 0.9,
      }),
    onEachFeature: (f, layer) => {
      const p = f?.properties || {};
      const when = p.when ? new Date(p.when).toLocaleString() : "TBD";
      const hood = p.neighborhood_name || (p.neighborhood ? `Neighborhood #${p.neighborhood}` : "—");
      const category = p.category?.name || "Event";
      const country = p.country?.name || "";
      
      // Create rich popup content
      const popupContent = `
        <div style="min-width: 200px; color: #0f172a;">
          <h6 style="color: #0f172a; font-weight: 600; margin-bottom: 0.5rem;">${p.title ?? "Event"}</h6>
          ${p.description ? `<p style="color: #64748b; font-size: 0.875rem; margin-bottom: 0.5rem;">${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}</p>` : ''}
          <div style="color: #0f172a; font-size: 0.875rem;">
            <div style="margin-bottom: 0.25rem;"><i class="bi bi-clock"></i> ${when}</div>
            ${country ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-geo-alt"></i> ${country}</div>` : ''}
            ${hood ? `<div style="margin-bottom: 0.25rem;"><i class="bi bi-pin-map"></i> ${hood}</div>` : ''}
            ${category ? `<div style="margin-top: 0.5rem;"><span class="badge bg-primary">${category}</span></div>` : ''}
          </div>
        </div>
      `;
      
      // Bind popup with proper options
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
        closeButton: true,
        autoPan: true
      });
      
      // Ensure popup opens on click - CRITICAL FIX
      layer.on('click', function(e) {
        e.originalEvent?.stopPropagation();
        this.openPopup();
        map.setView(this.getLatLng(), Math.max(map.getZoom(), 13));
      });
    },
  }).addTo(map);

  // Make map and layers globally available IMMEDIATELY after creation
  // This prevents "Cannot access before initialization" errors
  window.map = map;
  window.eventsLayer = eventsLayer;
  window.routesLayer = routesLayer;
  window.neighborhoodsLayer = neighborhoodsLayer;
  window.mapLayersReady = true;

  // Center marker + radius circle (used by "Nearby")
  // Start at world center, user can move it
  let centerMarker = L.marker(WORLD_VIEW, { draggable: true }).addTo(map);
  let centerCircle = L.circle(centerMarker.getLatLng(), {
    radius: 1000,
    color: "#0d6efd",
    opacity: 0.3,
  }).addTo(map);

  // ====== UTIL ======
  function fitIfValid(bounds) {
    if (bounds && bounds.isValid && bounds.isValid()) {
      map.fitBounds(bounds.pad(0.12));
    }
  }
  function featureGroupBounds(...layers) {
    const group = L.featureGroup(layers);
    return group.getBounds();
  }
  function findLayerById(geoJsonGroup, id) {
    let found = null;
    geoJsonGroup.eachLayer((lyr) => {
      const fid = lyr?.feature?.id ?? lyr?.feature?.properties?.id;
      if (String(fid) === String(id)) found = lyr;
    });
    return found;
  }

  /**
   * DRF + GeoJSON tolerant coercion:
   * - FeatureCollection -> features[]
   * - Feature -> [Feature]
   * - Array<Feature> -> as-is
   * - Paginated { results: ... } -> unwrap recursively
   * Returns [] for anything unknown instead of throwing.
   */
  function toFeatureArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    // DRF pagination wrapper?
    if (Object.prototype.hasOwnProperty.call(data, "results")) {
      return toFeatureArray(data.results);
    }
    // FeatureCollection
    if (data.type === "FeatureCollection") {
      return Array.isArray(data.features) ? data.features : [];
    }
    // Single Feature
    if (data.type === "Feature") return [data];
    // Unknown => don't break UI
    console.warn("Unexpected GeoJSON shape:", data);
    return [];
  }

  function populateSelect(selectEl, geojson, labelFn) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const feats = toFeatureArray(geojson);
    for (const f of feats) {
      const opt = document.createElement("option");
      const fid = f.id ?? f?.properties?.id;
      opt.value = fid ?? "";
      const label = labelFn ? labelFn(f) : `#${fid}`;
      opt.textContent = label || `#${fid ?? ""}`;
      selectEl.appendChild(opt);
    }
  }

  // ====== BASE DATA LOAD & WIRING ======
  let baseNeighborhoods = null;
  let baseRoutes = null;
  let baseEvents = null;

  async function loadBaseData() {
    setLoading(true);
    try {
      console.log('Loading map data...');
      // fetch in parallel with better error handling
      // Neighborhoods removed - not loading them anymore
      const [rts, evs] = await Promise.all([
        fetchJSON(API.routes).catch((e) => {
          console.warn('Failed to load routes:', e);
          return {type: 'FeatureCollection', features: []};
        }),
        fetchJSON(API.events).catch((e) => {
          console.warn('Failed to load events:', e);
          return {type: 'FeatureCollection', features: []};
        }),
      ]);
      
      // Set neighborhoods to empty - not using them
      const nbh = {type: 'FeatureCollection', features: []};

      const routeCount = rts?.features?.length || 0;
      const eventCount = evs?.results?.features?.length || evs?.features?.length || 0;
      console.log('Data received:', {
        routes: routeCount,
        events: eventCount
      });
      
      // CRITICAL: Ensure all 60 routes load - retry if needed
      if (routeCount < 60) {
        console.warn(`Expected 60 routes but only got ${routeCount}. Fetching all routes...`);
        // Try to fetch all routes explicitly with retry
        const fetchAllRoutes = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              const allRoutes = await fetchJSON('/api/routes/');
              const allRouteFeatures = toFeatureArray(allRoutes);
              console.log(`Attempt ${i + 1}: Got ${allRouteFeatures.length} routes`);
              
              if (allRouteFeatures.length > routeCount) {
                routesLayer.clearLayers();
                routesLayer.addData(allRouteFeatures);
                rts = {type: 'FeatureCollection', features: allRouteFeatures};
                console.log(`✅ Loaded ${allRouteFeatures.length} routes total`);
                return;
              }
            } catch (e) {
              console.warn(`Failed to reload routes (attempt ${i + 1}):`, e);
              if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
              }
            }
          }
        };
        fetchAllRoutes();
      } else {
        console.log(`✅ All ${routeCount} routes loaded`);
      }

      baseNeighborhoods = nbh;
      baseRoutes = rts;
      baseEvents = evs;

      // Draw – defensively coerce to arrays of Features for Leaflet
      const rtsFeatures = toFeatureArray(rts);
      const evFC = evs?.results ?? evs; // paginated {results: FC} or plain FC
      const evFeatures = toFeatureArray(evFC);

      console.log('Features to add:', {
        routes: rtsFeatures.length,
        events: evFeatures.length
      });

      // Add routes to map with coordinate validation and fixing
      if (rtsFeatures.length > 0) {
        routesLayer.clearLayers();
        
        // Fix coordinates for routes that have them swapped
        const fixedFeatures = rtsFeatures.map(feature => {
          if (!feature.geometry || !feature.geometry.coordinates) return feature;
          
          const coords = feature.geometry.coordinates;
          const props = feature.properties || {};
          const routeName = props.name || 'Unknown';
          
          // For LineString: [[lng, lat], [lng, lat], ...]
          if (feature.geometry.type === 'LineString' && Array.isArray(coords[0]) && coords[0].length === 2) {
            const [firstX, firstY] = coords[0];
            
            // Check if coordinates are swapped
            // Valid ranges: lat = -90 to 90, lng = -180 to 180
            // If first value is in lat range (<=90) and second is in lng range (>90), they're swapped
            const likelySwapped = Math.abs(firstX) <= 90 && Math.abs(firstY) > 90 && Math.abs(firstY) <= 180;
            
            // Also check if route has country and coordinates don't match
            let countryMismatch = false;
            if (props.country && props.country.code) {
              // Simplified country bounds check
              const countryChecks = {
                'US': (x, y) => x >= -180 && x <= -66 && y >= 18 && y <= 72,
                'GB': (x, y) => x >= -10 && x <= 2 && y >= 50 && y <= 61,
                'FR': (x, y) => x >= -5 && x <= 10 && y >= 42 && y <= 51,
                'ES': (x, y) => x >= -10 && x <= 5 && y >= 36 && y <= 44,
                'IT': (x, y) => x >= 6 && x <= 19 && y >= 36 && y <= 47,
                'DE': (x, y) => x >= 5 && x <= 15 && y >= 47 && y <= 55,
                'CN': (x, y) => x >= 73 && x <= 135 && y >= 18 && y <= 54,
                'JP': (x, y) => x >= 123 && x <= 146 && y >= 24 && y <= 46,
                'AU': (x, y) => x >= 113 && x <= 154 && y >= -44 && y <= -10,
                'NZ': (x, y) => x >= 166 && x <= 179 && y >= -48 && y <= -34,
                'NP': (x, y) => x >= 80 && x <= 89 && y >= 26 && y <= 31,
                'PE': (x, y) => x >= -82 && x <= -68 && y >= -20 && y <= 0,
                'IS': (x, y) => x >= -25 && x <= -13 && y >= 63 && y <= 67,
              };
              
              const check = countryChecks[props.country.code];
              if (check) {
                const inBounds = check(firstX, firstY);
                const swappedInBounds = check(firstY, firstX);
                if (!inBounds && swappedInBounds) {
                  countryMismatch = true;
                }
              }
            }
            
            if (likelySwapped || countryMismatch) {
              console.warn(`⚠️ Fixing swapped coordinates for route: ${routeName}`);
              // Swap coordinates: [lng, lat] was actually [lat, lng]
              const fixedCoords = coords.map(([a, b]) => [b, a]);
              return {
                ...feature,
                geometry: {
                  ...feature.geometry,
                  coordinates: fixedCoords
                }
              };
            }
          }
          
          return feature;
        });
        
        // Add routes - Leaflet will automatically convert GeoJSON [lng, lat] to Leaflet [lat, lng]
        routesLayer.addData(fixedFeatures);
        console.log(`✅ Added ${fixedFeatures.length} routes to map`);
      } else {
        console.warn('No routes to add to map');
      }
      
      // Add events to map
      if (evFeatures.length > 0) {
        eventsLayer.clearLayers();
        eventsLayer.addData(evFeatures);
        console.log(`✅ Added ${evFeatures.length} events to map`);
      }
      
      // Fit bounds if we have data, otherwise show world view
      if (evFeatures.length > 0 || rtsFeatures.length > 0) {
        const bounds = featureGroupBounds(routesLayer, eventsLayer);
        if (bounds && bounds.isValid && bounds.isValid()) {
          map.fitBounds(bounds.pad(0.12));
        }
      } else {
        map.setView(WORLD_VIEW, 2);
        toast("No data available. Showing world view.", "warning");
      }

      // populate selects (support either id being present)
      // Neighborhood select removed - neighborhoods not displayed
      const routeSel = pick("#routeId", "#route");

      populateSelect(
        routeSel,
        rts,
        (f) => f?.properties?.name || `Route ${f?.id}`
      );

      // change -> zoom to selected feature
      routeSel?.addEventListener("change", () => {
        const lyr = findLayerById(routesLayer, routeSel.value);
        if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      });

      toast(`Map data loaded: ${evFeatures.length} events, ${rtsFeatures.length} routes.`, "success", 2000);
    } catch (e) {
      console.error(e);
      toast("Failed to load map data.", "danger");
      // don't rethrow – keep UI interactive
    } finally {
      setLoading(false);
    }
  }

  // ====== CONTROLS ======
  const latEl        = pick("#lat");
  const lngEl        = pick("#lng");
  const radiusEl     = pick("#radius");
  const radiusValue  = pick("#radiusValue");
  const bufferEl     = pick("#buffer", "#bufferMeters");
  const bufferValue  = pick("#bufferValue");

  if (latEl && lngEl) {
    const syncFromMarker = () => {
      const { lat, lng } = centerMarker.getLatLng();
      latEl.value = lat.toFixed(6);
      lngEl.value = lng.toFixed(6);
      centerCircle.setLatLng(centerMarker.getLatLng());
    };
    // initialize with world view coordinates
    latEl.value = WORLD_VIEW[0].toFixed(6);
    lngEl.value = WORLD_VIEW[1].toFixed(6);
    syncFromMarker();
    centerMarker.on("move", syncFromMarker);
  }

  if (radiusEl) {
    const updateRadius = () => {
      const r = parseInt(radiusEl.value || "1000", 10);
      if (radiusValue) radiusValue.textContent = r;
      centerCircle.setRadius(r);
      fitIfValid(centerCircle.getBounds());
    };
    radiusEl.addEventListener("input", updateRadius);
    updateRadius();
  }

  if (bufferEl && bufferValue) {
    const updateBufferText = () => (bufferValue.textContent = bufferEl.value);
    bufferEl.addEventListener("input", updateBufferText);
    updateBufferText();
  }

  // ====== FILTERS ======
  async function nearby() {
    const lat = parseFloat(latEl?.value ?? centerMarker.getLatLng().lat);
    const lng = parseFloat(lngEl?.value ?? centerMarker.getLatLng().lng);
    const r   = parseInt(radiusEl?.value ?? "1000", 10);
    setLoading(true);
    try {
      const data = await fetchJSON(API.nearby(lat, lng, r));
      eventsLayer.clearLayers().addData(toFeatureArray(data));
      fitIfValid(centerCircle.getBounds());
      toast(`Loaded nearby events within ${r}m.`, "info");
    } catch (e) {
      console.error(e);
      toast("Failed nearby search.", "danger");
    } finally {
      setLoading(false);
    }
  }

  // Neighborhood filter removed - neighborhoods not displayed on map

  async function filterAlongRoute() {
    const sel = pick("#routeId", "#route");
    if (!sel || !sel.value) return toast("Select a route.", "warning");
    const buf = parseInt(bufferEl?.value || "200", 10);
    setLoading(true);
    try {
      const data = await fetchJSON(API.along(sel.value, buf));
      eventsLayer.clearLayers().addData(toFeatureArray(data));
      const lyr = findLayerById(routesLayer, sel.value);
      if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      toast(`Filtered along route (${buf}m).`, "info");
    } catch (e) {
      console.error(e);
      toast("Failed to filter along route.", "danger");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    // reload base data and reset marker/circle to center
    // Use world view for global platform
    map.setView(WORLD_VIEW, 2);
    centerMarker.setLatLng(WORLD_VIEW);
    centerCircle.setLatLng(WORLD_VIEW);
    if (latEl) latEl.value = WORLD_VIEW[0].toFixed(6);
    if (lngEl) lngEl.value = WORLD_VIEW[1].toFixed(6);
    loadBaseData();
  }
  
  // Make toast function globally available
  window.toast = toast;

  // optional: geolocate user and run nearby
  async function geolocateAndNearby() {
    if (!navigator.geolocation) return nearby();
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        centerMarker.setLatLng([latitude, longitude]);
        centerCircle.setLatLng([latitude, longitude]);
        if (latEl) latEl.value = latitude.toFixed(6);
        if (lngEl) lngEl.value = longitude.toFixed(6);
        await nearby();
      },
      async () => {
        setLoading(false);
        await nearby(); // fallback to typed values
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // ====== WIRE UI ======
  pick("#btnNearby")?.addEventListener("click", geolocateAndNearby);
  pick("#btnReset")?.addEventListener("click", resetAll);
  // Neighborhood button removed - neighborhoods not displayed
  pick("#btnRoute")?.addEventListener("click", filterAlongRoute);
  
  // ====== ADVANCED FILTERS ======
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const clusteringCheckbox = document.getElementById("enableClustering");
  const showPOICheckbox = document.getElementById("showPOI");
  
  // Load categories for filter
  async function loadCategories() {
    try {
      const response = await fetch('/api/categories/');
      const categories = await response.json();
      const catArray = Array.isArray(categories) ? categories : (categories.results || []);
      
      if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        catArray.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat.id;
          opt.textContent = cat.name;
          categoryFilter.appendChild(opt);
        });
      }
    } catch (e) {
      console.warn('Failed to load categories:', e);
    }
  }
  
  // Category filter
  if (categoryFilter) {
    categoryFilter.addEventListener('change', async () => {
      const catId = categoryFilter.value;
      if (!catId) {
        loadBaseData();
        return;
      }
      
      setLoading(true);
      try {
        const response = await fetch(`/api/events/?category=${catId}&page_size=10000`);
        const data = await response.json();
        const features = toFeatureArray(data);
        eventsLayer.clearLayers();
        if (features.length > 0) {
          eventsLayer.addData(features);
          toast(`Showing ${features.length} events in selected category`, 'info');
        } else {
          toast('No events found in this category', 'warning');
        }
      } catch (e) {
        console.error(e);
        toast('Failed to filter by category', 'danger');
      } finally {
        setLoading(false);
      }
    });
  }
  
  // Status filter
  if (statusFilter) {
    statusFilter.addEventListener('change', async () => {
      const status = statusFilter.value;
      if (!status) {
        loadBaseData();
        return;
      }
      
      setLoading(true);
      try {
        let url = '/api/events/?page_size=10000';
        if (status === 'upcoming') {
          url += '&upcoming=true';
        } else if (status === 'today') {
          url += '&today=true';
        } else if (status === 'active') {
          url += '&status=active';
        }
        
        const response = await fetch(url);
        const data = await response.json();
        const features = toFeatureArray(data);
        eventsLayer.clearLayers();
        if (features.length > 0) {
          eventsLayer.addData(features);
          toast(`Showing ${features.length} ${status} events`, 'info');
        } else {
          toast(`No ${status} events found`, 'warning');
        }
      } catch (e) {
        console.error(e);
        toast('Failed to filter by status', 'danger');
      } finally {
        setLoading(false);
      }
    });
  }
  
  // Clustering toggle (placeholder - would need marker clustering library)
  if (clusteringCheckbox) {
    clusteringCheckbox.addEventListener('change', (e) => {
      toast(e.target.checked ? 'Marker clustering enabled' : 'Marker clustering disabled', 'info');
    });
  }
  
  // POI toggle
  if (showPOICheckbox) {
    showPOICheckbox.addEventListener('change', (e) => {
      if (window.OSMOverpass) {
        window.OSMOverpass.togglePOI(e.target.checked);
      } else {
        toast('Points of Interest feature loading...', 'info');
        // Load POI script if not loaded
        const script = document.createElement('script');
        script.src = '/static/js/osm-overpass.js';
        script.onload = () => {
          if (window.OSMOverpass) {
            window.OSMOverpass.togglePOI(e.target.checked);
          }
        };
        document.head.appendChild(script);
      }
    });
  }
  
  // Load categories on page load
  loadCategories();

  // click map to move center marker
  map.on("click", (e) => {
    centerMarker.setLatLng(e.latlng);
    centerCircle.setLatLng(e.latlng);
    if (latEl) latEl.value = e.latlng.lat.toFixed(6);
    if (lngEl) lngEl.value = e.latlng.lng.toFixed(6);
  });

  // Make loadBaseData globally available
  window.loadBaseData = loadBaseData;

  // ====== HANDLE URL PARAMETERS (event= or trail=) ======
  async function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('event');
    const trailId = urlParams.get('trail');
    
    if (eventId) {
      // Wait for events to be loaded, then find and zoom to event
      const findAndZoomToEvent = () => {
        let found = false;
        eventsLayer.eachLayer((layer) => {
          if (found) return;
          const feature = layer.feature;
          if (feature && (feature.properties?.id == eventId || feature.id == eventId)) {
            found = true;
            const coords = feature.geometry?.coordinates;
            if (coords && coords.length >= 2) {
              const [lng, lat] = coords;
              // Zoom to event location with appropriate zoom level
              map.setView([lat, lng], 13, { animate: true, duration: 1.5 });
              
              // Highlight the event marker
              layer.openPopup();
              if (layer.setStyle) {
                layer.setStyle({
                  radius: 14,
                  color: "#ff6b6b",
                  weight: 4,
                  fillColor: "#ff6b6b",
                  fillOpacity: 1
                });
              }
              
              toast(`Showing event: ${feature.properties?.title || 'Event'}`, 'success');
            }
          }
        });
        return found;
      };
      
      // Try immediately, then retry after a delay if not found
      if (!findAndZoomToEvent()) {
        setTimeout(() => {
          if (!findAndZoomToEvent()) {
            // If still not found, fetch from API
            fetchJSON(`/api/events/?page=1&page_size=500`)
              .then(response => {
                const eventData = response?.results || response;
                const features = Array.isArray(eventData) ? eventData : (eventData?.features || []);
                const event = features.find(f => f.properties?.id == eventId || f.id == eventId);
                
                if (event && event.geometry?.coordinates) {
                  const [lng, lat] = event.geometry.coordinates;
                  map.setView([lat, lng], 13, { animate: true, duration: 1.5 });
                  toast(`Showing event: ${event.properties?.title || 'Event'}`, 'success');
                }
              })
              .catch(e => console.warn('Failed to load event from API:', e));
          }
        }, 1000);
      }
    } else if (trailId) {
      // Wait for routes to be loaded, then find and zoom to route
      const findAndZoomToRoute = () => {
        let found = false;
        routesLayer.eachLayer((layer) => {
          if (found) return;
          const feature = layer.feature;
          const trailIdNum = parseInt(trailId);
          const featureId = feature?.properties?.id || feature?.id;
          
          // Try both string and number comparison
          if (feature && (featureId == trailId || featureId == trailIdNum)) {
            found = true;
            
            console.log('🔍 Found route:', feature.properties?.name, 'ID:', featureId);
            
            // CRITICAL: ALWAYS use layer.getBounds() - Leaflet handles all coordinate conversion
            // This is the ONLY reliable method - it uses Leaflet's actual displayed coordinates
            let zoomed = false;
            try {
              if (layer.getBounds && typeof layer.getBounds === 'function') {
                const bounds = layer.getBounds();
                console.log('📍 Route bounds:', bounds.toBBoxString());
                
                if (bounds && typeof bounds.isValid === 'function' && bounds.isValid()) {
                  // Use the bounds that Leaflet calculated from the displayed route
                  map.fitBounds(bounds.pad(0.2), { animate: true, duration: 1.5 });
                  zoomed = true;
                  console.log('✅ Successfully zoomed to route using layer.getBounds()');
                } else {
                  console.error('❌ Invalid bounds from layer.getBounds()');
                }
              } else {
                console.error('❌ Layer does not have getBounds() method');
              }
            } catch (e) {
              console.error('❌ Error getting bounds:', e, 'Layer type:', layer.constructor.name);
            }
            
            // If getBounds() didn't work, the route might not be properly loaded
            if (!zoomed) {
              console.error('❌ CRITICAL: Could not zoom to route. Route may not be displayed correctly on map.');
              console.error('Layer info:', {
                hasBounds: !!layer.getBounds,
                layerType: layer.constructor.name,
                hasFeature: !!feature,
                hasGeometry: !!feature?.geometry,
                geometryType: feature?.geometry?.type
              });
              
              // Last resort: try to get center from feature and zoom there
              if (feature.geometry && feature.geometry.coordinates) {
                try {
                  const coords = feature.geometry.coordinates;
                  let centerPoint = null;
                  
                  if (feature.geometry.type === 'LineString' && coords.length > 0) {
                    // Get middle coordinate
                    const midIndex = Math.floor(coords.length / 2);
                    const [lng, lat] = coords[midIndex];
                    centerPoint = [lat, lng]; // Convert GeoJSON [lng,lat] to Leaflet [lat,lng]
                    console.log('📍 Using middle coordinate as fallback:', centerPoint);
                  }
                  
                  if (centerPoint && centerPoint[0] >= -90 && centerPoint[0] <= 90 && 
                      centerPoint[1] >= -180 && centerPoint[1] <= 180) {
                    map.setView(centerPoint, 12, { animate: true, duration: 1.5 });
                    console.log('✅ Used fallback center point');
                  }
                } catch (e) {
                  console.error('❌ Fallback also failed:', e);
                }
              }
            }
            
            // Highlight the route
            try {
              layer.openPopup();
              if (layer.setStyle) {
                layer.setStyle({
                  color: "#ff6b6b",
                  weight: 6,
                  opacity: 1
                });
              }
            } catch (e) {
              console.warn('Could not highlight route:', e);
            }
            
            toast(`Showing trail: ${feature.properties?.name || 'Trail'}`, 'success');
          }
        });
        return found;
      };
      
      // Try immediately, then retry after delays if not found
      if (!findAndZoomToRoute()) {
        setTimeout(() => {
          if (!findAndZoomToRoute()) {
            console.log('⚠️ Route not found in loaded layers, checking all routes...');
            // Debug: List all routes in layer
            let routeCount = 0;
            routesLayer.eachLayer((layer) => {
              const f = layer.feature;
              const id = f?.properties?.id || f?.id;
              routeCount++;
              console.log(`  Route ${routeCount}: ID=${id}, Name=${f?.properties?.name}`);
            });
            console.log(`Total routes in layer: ${routeCount}, Looking for ID: ${trailId}`);
            
            // Last resort: fetch route from API and add to map temporarily
            fetchJSON(`/api/routes/`)
              .then(data => {
                const routes = data.features || [];
                console.log(`Fetched ${routes.length} routes from API, looking for trail ID: ${trailId}`);
                
                const route = routes.find(r => {
                  const routeId = r.properties?.id || r.id;
                  const matches = routeId == trailId || routeId == parseInt(trailId);
                  if (matches) {
                    console.log('✅ Found route in API:', r.properties?.name, 'Geometry type:', r.geometry?.type);
                    console.log('📍 First coord:', r.geometry?.coordinates?.[0]);
                    console.log('📍 Last coord:', r.geometry?.coordinates?.[r.geometry?.coordinates?.length - 1]);
                  }
                  return matches;
                });
                
                if (route && route.geometry && route.geometry.coordinates) {
                  // Create bounds from route coordinates
                  const coords = route.geometry.coordinates;
                  let allPoints = [];
                  
                  // Handle LineString: [[lng, lat], [lng, lat], ...] - GeoJSON format
                  if (route.geometry.type === 'LineString' && Array.isArray(coords[0]) && coords[0].length === 2) {
                    // Convert from GeoJSON [lng, lat] to Leaflet [lat, lng]
                    allPoints = coords.map((coord) => {
                      const [lng, lat] = coord;
                      return [lat, lng]; // Leaflet format
                    });
                    console.log('Converted LineString coordinates:', allPoints.length, 'points');
                  }
                  // Handle MultiLineString
                  else if (route.geometry.type === 'MultiLineString' && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
                    coords.forEach(line => {
                      if (Array.isArray(line) && line.length > 0 && Array.isArray(line[0]) && line[0].length === 2) {
                        line.forEach((coord) => {
                          const [lng, lat] = coord;
                          allPoints.push([lat, lng]); // Convert to Leaflet format
                        });
                      }
                    });
                    console.log('Converted MultiLineString coordinates:', allPoints.length, 'points');
                  }
                  
                  // Validate and create bounds
                  const validPoints = allPoints.filter(([lat, lng]) => {
                    const isValid = typeof lat === 'number' && typeof lng === 'number' &&
                      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
                    if (!isValid) {
                      console.warn('Invalid coordinate:', lat, lng);
                    }
                    return isValid;
                  });
                  
                  console.log('Valid points:', validPoints.length, 'out of', allPoints.length);
                  
                  if (validPoints.length > 0) {
                    const bounds = L.latLngBounds(validPoints);
                    if (bounds.isValid()) {
                      console.log('✅ Navigating to route bounds:', bounds.toBBoxString());
                      map.fitBounds(bounds.pad(0.2), { animate: true, duration: 1.5 });
                      toast(`Showing trail: ${route.properties?.name || 'Trail'}`, 'success');
                    } else {
                      console.error('❌ Invalid bounds created from valid points');
                      toast('Could not find trail location', 'warning');
                    }
                  } else {
                    console.error('❌ No valid points found');
                    toast('Could not find trail location', 'warning');
                  }
                } else {
                  console.error('❌ Route not found or missing geometry');
                  toast('Trail not found', 'warning');
                }
              })
              .catch(err => {
                console.error('Error fetching route from API:', err);
                toast('Could not load trail', 'error');
              });
          }
        }, 2000);
      }
    }
  }

  // ====== INIT ======
  document.addEventListener("DOMContentLoaded", async () => {
    await loadBaseData();
    // After data is loaded, handle URL parameters
    setTimeout(() => {
      handleURLParameters();
    }, 500); // Small delay to ensure layers are populated
  });
})();
