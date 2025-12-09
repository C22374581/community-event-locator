/**
 * Enhanced Map JavaScript with Marker Clustering, Multiple Layers, and Draw Tools
 * 
 * Features:
 * - Marker clustering for dense event areas
 * - Multiple base map layers (OSM, Satellite, Terrain, Dark)
 * - Leaflet Draw for polygon search
 * - Category-based markers
 * - Advanced filtering
 */

/* global L, bootstrap */
(() => {
  "use strict";

  // ====== CONFIG ======
  const API_ROOT = "/api/";
  const API = {
    neighborhoods: `${API_ROOT}neighborhoods/`,
    routes: `${API_ROOT}routes/`,
    categories: `${API_ROOT}categories/`,
    events: `${API_ROOT}events/?page=1&page_size=200`,
    nearby: (lat, lng, r) => `${API_ROOT}events/nearby/?lat=${lat}&lng=${lng}&radius=${r}`,
    inHood: (id) => `${API_ROOT}events/in_neighborhood/?neighborhood_id=${id}`,
    along: (id, buffer) => `${API_ROOT}events/along_route/?route_id=${id}&buffer=${buffer}`,
    inPolygon: `${API_ROOT}events/in_polygon/`,
    todayNearby: (lat, lng, r) => `${API_ROOT}events/today_nearby/?lat=${lat}&lng=${lng}&radius=${r}`,
    rankedDistance: (lat, lng, limit) => `${API_ROOT}events/ranked_by_distance/?lat=${lat}&lng=${lng}&limit=${limit}`,
  };

  const DUBLIN = [53.3498, -6.2603];

  // ====== STATE ======
  let markerClusterGroup = null;
  let useClustering = false;
  let categories = [];
  let currentBaseLayer = null;
  let drawControl = null;
  let drawnPolygon = null;

  // ====== DOM HELPERS ======
  const $ = (sel) => document.querySelector(sel);
  const pick = (...sels) => {
    for (const s of sels) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  };

  const loadingEl = $("#loading");
  const toastEl = $("#toast");
  const toastBody = $("#toast-body");

  function setLoading(v) {
    if (!loadingEl) return;
    loadingEl.classList.toggle("d-none", !v);
  }

  function toast(message, type = "info", ms = 2400) {
    if (!toastEl || !toastBody) {
      console.warn("Toast:", message);
      return;
    }
    toastEl.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 start-50 translate-middle-x mt-3`;
    toastBody.textContent = message;
    new bootstrap.Toast(toastEl, { delay: ms }).show();
  }

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

  // ====== LEAFLET: MAP + BASE LAYERS ======
  const map = L.map("map", { zoomControl: false }).setView(DUBLIN, 12);
  window.map = map; // Make available globally
  
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  // Create multiple base layers
  const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  });

  const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "&copy; Esri",
  });

  const terrainLayer = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: "&copy; OpenTopoMap",
  });

  const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  });

  // Add default layer
  osmLayer.addTo(map);
  currentBaseLayer = osmLayer;

  // Layer control
  const baseMaps = {
    "OpenStreetMap": osmLayer,
    "Satellite": satelliteLayer,
    "Terrain": terrainLayer,
    "Dark Mode": darkLayer,
  };

  const layerControl = L.control.layers(baseMaps).addTo(map);
  
  // Update layer control in sidebar
  const layerControlDiv = document.getElementById('layerControl');
  if (layerControlDiv) {
    Object.keys(baseMaps).forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline-secondary w-100 mb-1';
      btn.textContent = name;
      btn.onclick = () => {
        map.removeLayer(currentBaseLayer);
        baseMaps[name].addTo(map);
        currentBaseLayer = baseMaps[name];
        // Update active state
        layerControlDiv.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      };
      if (name === 'OpenStreetMap') btn.classList.add('active');
      layerControlDiv.appendChild(btn);
    });
  }

  // Handle layer change
  map.on('baselayerchange', (e) => {
    currentBaseLayer = e.layer;
  });

  // ====== DRAW CONTROL ======
  const drawControl = new L.Control.Draw({
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
      },
      polyline: false,
      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false,
    },
    edit: {
      featureGroup: new L.FeatureGroup(),
      remove: true,
    },
  });

  map.addControl(drawControl);

  // Handle polygon drawing
  map.on(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    drawnPolygon = layer;
    layer.addTo(map);
    
    // Convert to GeoJSON and search
    const geoJson = layer.toGeoJSON();
    searchInPolygon(geoJson);
  });

  map.on(L.Draw.Event.DELETED, () => {
    drawnPolygon = null;
    eventsLayer.clearLayers();
  });

  // ====== DATA LAYERS ======
  const neighborhoodsLayer = L.geoJSON(null, {
    style: { color: "#0dcaf0", weight: 2, fillOpacity: 0.08 },
    onEachFeature: (f, layer) => {
      const name = f?.properties?.name ?? "Neighborhood";
      layer.bindPopup(`<b>${name}</b>`);
    },
  }).addTo(map);

  const routesLayer = L.geoJSON(null, {
    style: { color: "#ffc107", weight: 3 },
    onEachFeature: (f, layer) => {
      const name = f?.properties?.name ?? "Route";
      layer.bindPopup(`<b>${name}</b>`);
    },
  }).addTo(map);

  // Events layer - with clustering support
  const eventsLayer = L.geoJSON(null, {
    pointToLayer: (feature, latlng) => {
      const props = feature.properties || {};
      const category = props.category || {};
      const color = category.color || "#20c997";
      
      return L.circleMarker(latlng, {
        radius: 8,
        color: color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      });
    },
    onEachFeature: (f, layer) => {
      const p = f?.properties || {};
      const when = p.when ? new Date(p.when).toLocaleString() : "TBD";
      const category = p.category ? `<div><i class="bi bi-tag"></i> ${p.category.name}</div>` : "";
      const tags = p.tags_list && p.tags_list.length > 0 
        ? `<div><i class="bi bi-bookmark"></i> ${p.tags_list.join(', ')}</div>` : "";
      
      layer.bindPopup(`
        <div class="small">
          <div class="fw-semibold">${p.title ?? "Event"}</div>
          <div class="text-muted">${p.description ?? ""}</div>
          <div><i class="bi bi-clock"></i> ${when}</div>
          ${category}
          ${tags}
          ${p.website_url ? `<div><a href="${p.website_url}" target="_blank">Website</a></div>` : ""}
        </div>
      `);
    },
  });

  // Marker clustering
  function updateEventsDisplay(features) {
    eventsLayer.clearLayers();
    
    if (useClustering && markerClusterGroup) {
      map.removeLayer(markerClusterGroup);
    }

    if (features && features.length > 0) {
      eventsLayer.addData(features);
      
      if (useClustering) {
        markerClusterGroup = L.markerClusterGroup({
          chunkedLoading: true,
          maxClusterRadius: 50,
        });
        
        eventsLayer.eachLayer((layer) => {
          markerClusterGroup.addLayer(layer);
        });
        
        markerClusterGroup.addTo(map);
      } else {
        eventsLayer.addTo(map);
      }
    }
  }

  // ====== POLYGON SEARCH ======
  async function searchInPolygon(geoJson) {
    setLoading(true);
    try {
      const response = await fetch(API.inPolygon, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geoJson),
      });
      
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      
      const data = await response.json();
      const features = toFeatureArray(data);
      updateEventsDisplay(features);
      
      toast(`Found ${features.length} events in polygon`, 'success');
    } catch (error) {
      console.error(error);
      toast('Failed to search polygon', 'danger');
    } finally {
      setLoading(false);
    }
  }

  // ====== UTILITY FUNCTIONS ======
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

  function toFeatureArray(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Object.prototype.hasOwnProperty.call(data, "results")) {
      return toFeatureArray(data.results);
    }
    if (data.type === "FeatureCollection") {
      return Array.isArray(data.features) ? data.features : [];
    }
    if (data.type === "Feature") return [data];
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

  // ====== LOAD BASE DATA ======
  let baseNeighborhoods = null;
  let baseRoutes = null;
  let baseEvents = null;

  async function loadBaseData() {
    setLoading(true);
    try {
      const [nbh, rts, evs, cats] = await Promise.all([
        fetchJSON(API.neighborhoods),
        fetchJSON(API.routes),
        fetchJSON(API.events),
        fetchJSON(API.categories),
      ]);

      baseNeighborhoods = nbh;
      baseRoutes = rts;
      baseEvents = evs;
      categories = Array.isArray(cats) ? cats : (cats.results || []);

      neighborhoodsLayer.clearLayers().addData(toFeatureArray(nbh));
      routesLayer.clearLayers().addData(toFeatureArray(rts));

      const evFC = evs?.results ?? evs;
      updateEventsDisplay(toFeatureArray(evFC));

      // Populate selects
      const hoodSel = pick("#neighborhoodId", "#hood");
      const routeSel = pick("#routeId", "#route");
      const catSel = document.getElementById("categoryFilter");

      populateSelect(hoodSel, nbh, (f) => f?.properties?.name || `Neighborhood ${f?.id}`);
      populateSelect(routeSel, rts, (f) => f?.properties?.name || `Route ${f?.id}`);
      
      if (catSel) {
        catSel.innerHTML = '<option value="">All Categories</option>';
        categories.forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat.id;
          opt.textContent = cat.name;
          catSel.appendChild(opt);
        });
      }

      // Event listeners for selects
      hoodSel?.addEventListener("change", () => {
        const lyr = findLayerById(neighborhoodsLayer, hoodSel.value);
        if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      });

      routeSel?.addEventListener("change", () => {
        const lyr = findLayerById(routesLayer, routeSel.value);
        if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      });

      fitIfValid(featureGroupBounds(neighborhoodsLayer, routesLayer, eventsLayer));
      toast("Map data loaded.", "success", 1500);
    } catch (e) {
      console.error(e);
      toast("Failed to load map data.", "danger");
    } finally {
      setLoading(false);
    }
  }

  // ====== FILTERS ======
  const latEl = pick("#lat");
  const lngEl = pick("#lng");
  const radiusEl = pick("#radius");
  const radiusValue = pick("#radiusValue");
  const bufferEl = pick("#buffer", "#bufferMeters");
  const bufferValue = pick("#bufferValue");

  if (latEl && lngEl) {
    const syncFromMarker = () => {
      const { lat, lng } = centerMarker.getLatLng();
      latEl.value = lat.toFixed(6);
      lngEl.value = lng.toFixed(6);
      centerCircle.setLatLng(centerMarker.getLatLng());
    };
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

  // Center marker + radius circle
  let centerMarker = L.marker(DUBLIN, { draggable: true }).addTo(map);
  let centerCircle = L.circle(centerMarker.getLatLng(), {
    radius: 1000,
    color: "#0d6efd",
  }).addTo(map);

  // ====== FILTER FUNCTIONS ======
  async function nearby() {
    const lat = parseFloat(latEl?.value ?? centerMarker.getLatLng().lat);
    const lng = parseFloat(lngEl?.value ?? centerMarker.getLatLng().lng);
    const r = parseInt(radiusEl?.value ?? "1000", 10);
    setLoading(true);
    try {
      const data = await fetchJSON(API.nearby(lat, lng, r));
      updateEventsDisplay(toFeatureArray(data));
      fitIfValid(centerCircle.getBounds());
      toast(`Loaded ${toFeatureArray(data).length} nearby events within ${r}m.`, "info");
    } catch (e) {
      console.error(e);
      toast("Failed nearby search.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function filterByNeighborhood() {
    const sel = pick("#neighborhoodId", "#hood");
    if (!sel || !sel.value) return toast("Select a neighborhood.", "warning");
    setLoading(true);
    try {
      const data = await fetchJSON(API.inHood(sel.value));
      updateEventsDisplay(toFeatureArray(data));
      const lyr = findLayerById(neighborhoodsLayer, sel.value);
      if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      toast("Filtered by neighborhood.", "info");
    } catch (e) {
      console.error(e);
      toast("Failed to filter by neighborhood.", "danger");
    } finally {
      setLoading(false);
    }
  }

  async function filterAlongRoute() {
    const sel = pick("#routeId", "#route");
    if (!sel || !sel.value) return toast("Select a route.", "warning");
    const buf = parseInt(bufferEl?.value || "200", 10);
    setLoading(true);
    try {
      const data = await fetchJSON(API.along(sel.value, buf));
      updateEventsDisplay(toFeatureArray(data));
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
    centerMarker.setLatLng(DUBLIN);
    centerCircle.setLatLng(DUBLIN);
    if (latEl) latEl.value = DUBLIN[0].toFixed(6);
    if (lngEl) lngEl.value = DUBLIN[1].toFixed(6);
    if (drawnPolygon) {
      map.removeLayer(drawnPolygon);
      drawnPolygon = null;
    }
    loadBaseData();
  }

  // ====== ADVANCED FILTERS ======
  const categoryFilter = document.getElementById("categoryFilter");
  const statusFilter = document.getElementById("statusFilter");
  const clusteringCheckbox = document.getElementById("enableClustering");

  if (categoryFilter) {
    categoryFilter.addEventListener("change", async () => {
      const catId = categoryFilter.value;
      if (!catId) {
        loadBaseData();
        return;
      }
      
      setLoading(true);
      try {
        const url = `${API.events}&category=${catId}`;
        const data = await fetchJSON(url);
        const features = toFeatureArray(data.results || data);
        updateEventsDisplay(features);
        toast(`Filtered by category`, "info");
      } catch (e) {
        console.error(e);
        toast("Failed to filter by category", "danger");
      } finally {
        setLoading(false);
      }
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", async () => {
      const status = statusFilter.value;
      if (!status) {
        loadBaseData();
        return;
      }
      
      setLoading(true);
      try {
        let url = API.events;
        if (status === "upcoming") url += "&upcoming=true";
        if (status === "today") url += "&today=true";
        if (status === "active") url += "&status=active";
        
        const data = await fetchJSON(url);
        const features = toFeatureArray(data.results || data);
        updateEventsDisplay(features);
        toast(`Filtered by status: ${status}`, "info");
      } catch (e) {
        console.error(e);
        toast("Failed to filter by status", "danger");
      } finally {
        setLoading(false);
      }
    });
  }

  if (clusteringCheckbox) {
    clusteringCheckbox.addEventListener("change", (e) => {
      useClustering = e.target.checked;
      if (baseEvents) {
        const evFC = baseEvents?.results ?? baseEvents;
        updateEventsDisplay(toFeatureArray(evFC));
      }
    });
  }

  // ====== WIRE UI ======
  pick("#btnNearby")?.addEventListener("click", nearby);
  pick("#btnReset")?.addEventListener("click", resetAll);
  pick("#btnNeighborhood", "#btnHood")?.addEventListener("click", filterByNeighborhood);
  pick("#btnRoute")?.addEventListener("click", filterAlongRoute);

  map.on("click", (e) => {
    centerMarker.setLatLng(e.latlng);
    centerCircle.setLatLng(e.latlng);
    if (latEl) latEl.value = e.latlng.lat.toFixed(6);
    if (lngEl) lngEl.value = e.latlng.lng.toFixed(6);
  });

  // ====== INIT ======
  document.addEventListener("DOMContentLoaded", async () => {
    await loadBaseData();
  });
})();

