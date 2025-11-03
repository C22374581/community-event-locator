/* global L, bootstrap */
(() => {
  "use strict";

  // ====== CONFIG ======
  const API_ROOT = "/api/";
  const API = {
    neighborhoods: `${API_ROOT}neighborhoods/`,
    routes:        `${API_ROOT}routes/`,
    // events is paginated in DRF -> we ask for a big page
    events:        `${API_ROOT}events/?page=1&page_size=200`,
    nearby:   (lat, lng, r) => `${API_ROOT}events/nearby/?lat=${lat}&lng=${lng}&radius=${r}`,
    inHood:   (id)         => `${API_ROOT}events/in_neighborhood/?neighborhood_id=${id}`,
    along:    (id, buffer) => `${API_ROOT}events/along_route/?route_id=${id}&buffer=${buffer}`,
  };

  const DUBLIN = [53.3498, -6.2603];

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
  const map = L.map("map", { zoomControl: false }).setView(DUBLIN, 12);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.control.scale({ imperial: false }).addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  // Styled groups
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

  const eventsLayer = L.geoJSON(null, {
    pointToLayer: (_f, latlng) =>
      L.circleMarker(latlng, {
        radius: 7,
        color: "#20c997",
        weight: 2,
        fillColor: "#20c997",
        fillOpacity: 0.9,
      }),
    onEachFeature: (f, layer) => {
      const p = f?.properties || {};
      const when = p.when ? new Date(p.when).toLocaleString() : "TBD";
      const hood = p.neighborhood ? `Neighborhood #${p.neighborhood}` : "—";
      layer.bindPopup(
        `
        <div class="small">
          <div class="fw-semibold">${p.title ?? "Event"}</div>
          <div class="text-muted">${p.description ?? ""}</div>
          <div><i class="bi bi-clock"></i> ${when}</div>
          <div><i class="bi bi-geo"></i> ${hood}</div>
        </div>
        `
      );
    },
  }).addTo(map);

  // Center marker + radius circle (used by "Nearby")
  let centerMarker = L.marker(DUBLIN, { draggable: true }).addTo(map);
  let centerCircle = L.circle(centerMarker.getLatLng(), {
    radius: 1000,
    color: "#0d6efd",
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
      // fetch in parallel
      const [nbh, rts, evs] = await Promise.all([
        fetchJSON(API.neighborhoods),
        fetchJSON(API.routes),
        fetchJSON(API.events),
      ]);

      baseNeighborhoods = nbh;
      baseRoutes = rts;
      baseEvents = evs;

      // Draw – defensively coerce to arrays of Features for Leaflet
      neighborhoodsLayer.clearLayers().addData(toFeatureArray(nbh));
      routesLayer.clearLayers().addData(toFeatureArray(rts));

      const evFC = evs?.results ?? evs; // paginated {results: FC} or plain FC
      eventsLayer.clearLayers().addData(toFeatureArray(evFC));

      // populate selects (support either id being present)
      const hoodSel  = pick("#neighborhoodId", "#hood");
      const routeSel = pick("#routeId", "#route");

      populateSelect(
        hoodSel,
        nbh,
        (f) => f?.properties?.name || `Neighborhood ${f?.id}`
      );
      populateSelect(
        routeSel,
        rts,
        (f) => f?.properties?.name || `Route ${f?.id}`
      );

      // change -> zoom to selected feature
      hoodSel?.addEventListener("change", () => {
        const lyr = findLayerById(neighborhoodsLayer, hoodSel.value);
        if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      });
      routeSel?.addEventListener("change", () => {
        const lyr = findLayerById(routesLayer, routeSel.value);
        if (lyr?.getBounds) fitIfValid(lyr.getBounds());
      });

      // fit to everything once
      fitIfValid(
        featureGroupBounds(neighborhoodsLayer, routesLayer, eventsLayer)
      );
      toast("Map data loaded.", "success", 1500);
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
    // initialize with current values
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

  async function filterByNeighborhood() {
    const sel = pick("#neighborhoodId", "#hood");
    if (!sel || !sel.value) return toast("Select a neighborhood.", "warning");
    setLoading(true);
    try {
      const data = await fetchJSON(API.inHood(sel.value));
      eventsLayer.clearLayers().addData(toFeatureArray(data));
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
    centerMarker.setLatLng(DUBLIN);
    centerCircle.setLatLng(DUBLIN);
    if (latEl) latEl.value = DUBLIN[0].toFixed(6);
    if (lngEl) lngEl.value = DUBLIN[1].toFixed(6);
    loadBaseData();
  }

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
  pick("#btnNeighborhood", "#btnHood")?.addEventListener("click", filterByNeighborhood);
  pick("#btnRoute")?.addEventListener("click", filterAlongRoute);

  // click map to move center marker
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
