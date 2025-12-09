/**
 * OpenStreetMap Overpass API Integration
 * 
 * Fetches Points of Interest (POI) from OpenStreetMap using Overpass API
 * and displays them as an overlay on the map.
 */

(function() {
  'use strict';

  // Overpass API endpoint
  const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
  
  let poiLayer = null;
  let currentBounds = null;
  let poiEnabled = false;

  /**
   * Build Overpass QL query for POIs within bounds
   */
  function buildOverpassQuery(bounds, amenityTypes = ['restaurant', 'cafe', 'parking', 'fuel', 'hotel', 'attraction', 'tourism', 'museum', 'monument']) {
    const {south, west, north, east} = bounds;
    
    // Expand search area slightly for better coverage
    const latDiff = (north - south) * 0.1;
    const lngDiff = (east - west) * 0.1;
    const expandedSouth = Math.max(-90, south - latDiff);
    const expandedWest = Math.max(-180, west - lngDiff);
    const expandedNorth = Math.min(90, north + latDiff);
    const expandedEast = Math.min(180, east + lngDiff);
    
    // Build query for multiple amenity types
    const amenityQueries = amenityTypes.map(type => 
      `node["amenity"="${type}"](${expandedSouth},${expandedWest},${expandedNorth},${expandedEast});`
    ).join('\n');
    
    // Also add tourism and historic sites
    const tourismQueries = `
      node["tourism"](${expandedSouth},${expandedWest},${expandedNorth},${expandedEast});
      node["historic"](${expandedSouth},${expandedWest},${expandedNorth},${expandedEast});
    `;

    return `
      [out:json][timeout:30];
      (
        ${amenityQueries}
        ${tourismQueries}
      );
      out body;
      >;
      out skel qt;
    `;
  }

  /**
   * Fetch POIs from Overpass API
   */
  async function fetchPOIs(bounds, amenityTypes) {
    const query = buildOverpassQuery(bounds, amenityTypes);
    
    try {
      const response = await fetch(OVERPASS_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status}`);
      }

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.error('[OSM Overpass] Error fetching POIs:', error);
      return [];
    }
  }

  /**
   * Convert OSM elements to GeoJSON features
   */
  function osmToGeoJSON(elements) {
    return elements
      .filter(el => el.type === 'node' && el.lat && el.lon)
      .map(el => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [el.lon, el.lat]
        },
        properties: {
          id: el.id,
          name: el.tags?.name || 'Unnamed',
          amenity: el.tags?.amenity || 'unknown',
          type: el.tags?.amenity,
          ...el.tags
        }
      }));
  }

  /**
   * Create POI layer with custom markers
   */
  function createPOILayer(geoJsonData) {
    if (poiLayer) {
      window.map.removeLayer(poiLayer);
    }

    const amenityIcons = {
      restaurant: { color: '#ff6b6b', icon: '🍽️' },
      cafe: { color: '#4ecdc4', icon: '☕' },
      parking: { color: '#ffe66d', icon: '🅿️' },
      fuel: { color: '#95e1d3', icon: '⛽' },
      default: { color: '#a8a8a8', icon: '📍' }
    };

    poiLayer = L.geoJSON(geoJsonData, {
      pointToLayer: (feature, latlng) => {
        const amenity = feature.properties.amenity || 'default';
        const config = amenityIcons[amenity] || amenityIcons.default;
        
        return L.marker(latlng, {
          icon: L.divIcon({
            className: 'poi-marker',
            html: `<div style="
              background-color: ${config.color};
              border-radius: 50%;
              width: 24px;
              height: 24px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${config.icon}</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        });
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const name = props.name || 'Unnamed POI';
        const amenity = props.amenity || 'unknown';
        
        layer.bindPopup(`
          <div class="small">
            <strong>${name}</strong><br>
            <span class="text-muted">${amenity}</span>
            ${props['addr:street'] ? `<br>${props['addr:street']}` : ''}
          </div>
        `);
      }
    });

    return poiLayer;
  }

  /**
   * Load POIs for current map bounds
   */
  async function loadPOIs() {
    if (!poiEnabled || !window.map) return;

    const bounds = window.map.getBounds();
    currentBounds = bounds;

    setLoading(true);
    try {
      const elements = await fetchPOIs(bounds, ['restaurant', 'cafe', 'parking', 'fuel', 'hotel', 'attraction', 'tourism', 'museum', 'monument', 'viewpoint', 'picnic_site', 'information']);
      const geoJsonData = {
        type: 'FeatureCollection',
        features: osmToGeoJSON(elements)
      };

      const layer = createPOILayer(geoJsonData);
      layer.addTo(window.map);
      
      toast(`Loaded ${geoJsonData.features.length} Points of Interest`, 'success');
    } catch (error) {
      console.error('[OSM Overpass]', error);
      toast('Failed to load Points of Interest', 'danger');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Toggle POI display
   */
  function togglePOI(enabled) {
    poiEnabled = enabled;
    if (enabled) {
      loadPOIs();
      // Reload when map moves
      if (window.map) {
        window.map.off('moveend', loadPOIs);
        window.map.on('moveend', loadPOIs);
      }
    } else {
      if (poiLayer) {
        window.map.removeLayer(poiLayer);
        poiLayer = null;
      }
      if (window.map) {
        window.map.off('moveend', loadPOIs);
      }
    }
  }

  /**
   * Helper functions (assumed to be available from map.js)
   */
  function setLoading(v) {
    const el = document.getElementById('loading');
    if (el) el.classList.toggle('d-none', !v);
  }

  function toast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toast-body');
    if (toastEl && toastBody) {
      toastEl.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 start-50 translate-middle-x mt-3`;
      toastBody.textContent = message;
      new bootstrap.Toast(toastEl, { delay: 3000 }).show();
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const showPOICheckbox = document.getElementById('showPOI');
    if (showPOICheckbox) {
      showPOICheckbox.addEventListener('change', (e) => {
        togglePOI(e.target.checked);
      });
    }

    // Wait for map to be initialized
    setTimeout(() => {
      if (window.map && showPOICheckbox?.checked) {
        togglePOI(true);
      }
    }, 1000);
  });

  // Export for external use
  window.OSMOverpass = {
    loadPOIs,
    togglePOI
  };

})();

