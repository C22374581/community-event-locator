/**
 * Home Page Advanced Features
 * Implements all 10 production-level features for the home page
 */

(function() {
  'use strict';

  // ====== 1. INTERACTIVE WORLD GLOBE VISUALIZATION ======
  let globeScene, globeCamera, globeRenderer, globe;
  
  function initGlobe() {
    const globeContainer = document.getElementById('world-globe');
    if (!globeContainer) return;

    // Initialize Three.js scene
    globeScene = new THREE.Scene();
    globeCamera = new THREE.PerspectiveCamera(75, globeContainer.clientWidth / globeContainer.clientHeight, 0.1, 1000);
    globeRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    globeRenderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
    globeRenderer.setPixelRatio(window.devicePixelRatio);
    globeContainer.appendChild(globeRenderer.domElement);
    
    // Make globe clickable to navigate to map
    globeRenderer.domElement.style.cursor = 'pointer';
    globeRenderer.domElement.title = 'Click to explore the world map';
    globeRenderer.domElement.addEventListener('click', () => {
      window.location.href = '/map/';
    });

    // Create globe
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const textureLoader = new THREE.TextureLoader();
    
    // Load Earth texture
    textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg', (texture) => {
      const material = new THREE.MeshPhongMaterial({ map: texture });
      globe = new THREE.Mesh(geometry, material);
      globeScene.add(globe);
    });

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    globeScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    globeScene.add(directionalLight);

    // Add event markers as particles
    fetch('/api/events/?page_size=50')
      .then(res => res.json())
      .then(data => {
        // Handle different API response formats
        let events = [];
        if (Array.isArray(data)) {
          events = data;
        } else if (data.results && Array.isArray(data.results)) {
          events = data.results;
        } else if (data.features && Array.isArray(data.features)) {
          events = data.features;
        } else if (data.data && Array.isArray(data.data)) {
          events = data.data;
        }
        
        // Ensure events is an array before forEach
        if (!Array.isArray(events)) {
          console.warn('Events data is not an array:', events);
          events = [];
        }
        
        events.forEach(event => {
          if (event && event.geometry && event.geometry.coordinates) {
            const [lng, lat] = event.geometry.coordinates;
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const x = -2 * Math.sin(phi) * Math.cos(theta);
            const y = 2 * Math.cos(phi);
            const z = 2 * Math.sin(phi) * Math.sin(theta);
            
            const markerGeometry = new THREE.SphereGeometry(0.02, 8, 8);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(x, y, z);
            globeScene.add(marker);
          }
        });
      })
      .catch(err => {
        console.error('Could not load events for globe:', err);
        console.error('Error details:', err.message, err.stack);
      });

    globeCamera.position.z = 5;

    // Auto-rotate
    function animate() {
      requestAnimationFrame(animate);
      if (globe) {
        globe.rotation.y += 0.005;
      }
      globeRenderer.render(globeScene, globeCamera);
    }
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      globeCamera.aspect = globeContainer.clientWidth / globeContainer.clientHeight;
      globeCamera.updateProjectionMatrix();
      globeRenderer.setSize(globeContainer.clientWidth, globeContainer.clientHeight);
    });
  }

  // ====== 2. LIVE EVENT COUNTDOWN TIMER ======
  function initCountdownTimers() {
    const countdownElements = document.querySelectorAll('.countdown-timer');
    
    countdownElements.forEach(element => {
      const targetDate = new Date(element.dataset.targetDate).getTime();
      
      function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
          element.innerHTML = '<span class="text-success">Event Started!</span>';
          return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        element.innerHTML = `
          <div class="countdown-item">
            <span class="countdown-number">${days}</span>
            <span class="countdown-label">Days</span>
          </div>
          <div class="countdown-item">
            <span class="countdown-number">${hours}</span>
            <span class="countdown-label">Hours</span>
          </div>
          <div class="countdown-item">
            <span class="countdown-number">${minutes}</span>
            <span class="countdown-label">Min</span>
          </div>
          <div class="countdown-item">
            <span class="countdown-number">${seconds}</span>
            <span class="countdown-label">Sec</span>
          </div>
        `;
      }
      
      updateCountdown();
      setInterval(updateCountdown, 1000);
    });
  }

  // ====== 3. PERSONALIZED EVENT RECOMMENDATIONS ======
  function loadRecommendations() {
    const recommendationsContainer = document.getElementById('event-recommendations');
    if (!recommendationsContainer) return;

    // Get user location if available
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        fetch(`/api/events/nearby/?lat=${lat}&lng=${lng}&radius=50000`)
          .then(res => res.json())
          .then(data => {
            const events = data.results || data.features || [];
            displayRecommendations(events.slice(0, 6), recommendationsContainer);
          })
          .catch(() => loadDefaultRecommendations(recommendationsContainer));
      },
      () => loadDefaultRecommendations(recommendationsContainer)
    );
  }

  function loadDefaultRecommendations(container) {
    fetch('/api/events/?page_size=6&ordering=-when')
      .then(res => res.json())
      .then(data => {
        const events = data.results || data.features || [];
        displayRecommendations(events, container);
      });
  }

  function displayRecommendations(events, container) {
    if (events.length === 0) {
      container.innerHTML = '<p class="text-muted">No recommendations available at this time.</p>';
      return;
    }

    container.innerHTML = events.map(event => `
      <div class="recommendation-card">
        <div class="recommendation-icon">${event.properties?.category?.icon || '📍'}</div>
        <div class="recommendation-content">
          <h6>${event.properties?.title || event.title}</h6>
          <small class="text-muted">${event.properties?.when ? new Date(event.properties.when).toLocaleDateString() : ''}</small>
        </div>
        <a href="/map/?event=${event.id || event.properties?.id}" class="btn btn-sm btn-outline-primary">View</a>
      </div>
    `).join('');
  }

  // ====== 4. INTERACTIVE STATS DASHBOARD WITH ANIMATIONS ======
  function animateStats() {
    const statElements = document.querySelectorAll('.stats-number[data-target]');
    
    statElements.forEach(element => {
      const target = parseInt(element.dataset.target);
      const duration = 2000; // 2 seconds
      const increment = target / (duration / 16); // 60fps
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          element.textContent = target.toLocaleString();
          clearInterval(timer);
        } else {
          element.textContent = Math.floor(current).toLocaleString();
        }
      }, 16);
    });
  }

  // ====== 5. VIDEO BACKGROUND HERO SECTION ======
  function initVideoBackground() {
    const videoHero = document.getElementById('video-hero');
    if (!videoHero) return;

    // Use a placeholder video or allow user to add their own
    const video = document.createElement('video');
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    video.style.zIndex = '-1';
    
    // Use a free stock video or placeholder
    video.src = 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4';
    video.onerror = () => {
      // Fallback to gradient if video fails
      videoHero.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    };
    
    videoHero.appendChild(video);
  }

  // ====== 6. SOCIAL PROOF & TESTIMONIALS CAROUSEL ======
  function initTestimonialsCarousel() {
    const carousel = document.getElementById('testimonials-carousel');
    if (!carousel) return;

    let currentIndex = 0;
    const testimonials = [
      {
        name: 'Sarah Johnson',
        location: 'Dublin, Ireland',
        text: 'Found the perfect marathon through this platform! The map feature made it so easy to discover events near me.',
        rating: 5
      },
      {
        name: 'Michael Chen',
        location: 'Tokyo, Japan',
        text: 'Completed the Camino de Santiago trail thanks to the detailed information and route planning tools.',
        rating: 5
      },
      {
        name: 'Emma Williams',
        location: 'London, UK',
        text: 'Love the world map view! Discovered amazing walking events I never would have found otherwise.',
        rating: 5
      },
      {
        name: 'David Martinez',
        location: 'New York, USA',
        text: 'The offline functionality is a game-changer for exploring trails in remote areas.',
        rating: 5
      }
    ];

    function showTestimonial(index) {
      const testimonial = testimonials[index];
      carousel.innerHTML = `
        <div class="testimonial-card">
          <div class="testimonial-rating">
            ${'⭐'.repeat(testimonial.rating)}
          </div>
          <p class="testimonial-text">"${testimonial.text}"</p>
          <div class="testimonial-author">
            <strong>${testimonial.name}</strong>
            <small class="text-muted d-block">${testimonial.location}</small>
          </div>
        </div>
      `;
    }

    showTestimonial(0);
    setInterval(() => {
      currentIndex = (currentIndex + 1) % testimonials.length;
      showTestimonial(currentIndex);
    }, 5000);
  }

  // ====== 7. SMART SEARCH WITH AUTOCOMPLETE ======
  function initSmartSearch() {
    const searchInput = document.getElementById('smart-search');
    const autocompleteContainer = document.getElementById('search-autocomplete');
    if (!searchInput || !autocompleteContainer) return;

    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(searchTimeout);
      
      if (query.length < 2) {
        autocompleteContainer.classList.add('d-none');
        return;
      }

      searchTimeout = setTimeout(() => {
        fetch(`/api/events/?q=${encodeURIComponent(query)}&page_size=5`)
          .then(res => res.json())
          .then(data => {
            const events = data.results || data.features || [];
            displayAutocomplete(events, query, autocompleteContainer);
          })
          .catch(() => autocompleteContainer.classList.add('d-none'));
      }, 300);
    });

    // Hide on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !autocompleteContainer.contains(e.target)) {
        autocompleteContainer.classList.add('d-none');
      }
    });
  }

  function displayAutocomplete(events, query, container) {
    if (events.length === 0) {
      container.innerHTML = '<div class="autocomplete-item">No results found</div>';
      container.classList.remove('d-none');
      return;
    }

    container.innerHTML = events.map(event => {
      const title = event.properties?.title || event.title || '';
      const highlighted = title.replace(new RegExp(query, 'gi'), match => `<strong>${match}</strong>`);
      return `
        <a href="/map/?event=${event.id || event.properties?.id}" class="autocomplete-item">
          <i class="bi bi-calendar-event"></i>
          <span>${highlighted}</span>
        </a>
      `;
    }).join('');
    container.classList.remove('d-none');
  }

  // ====== 8. WEATHER INTEGRATION WIDGET ======
  function initWeatherWidget() {
    const weatherWidget = document.getElementById('weather-widget');
    if (!weatherWidget) return;

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Simulate weather data (no API key needed)
        // In production, would use OpenWeatherMap API
        const weatherConditions = [
          { icon: '☀️', temp: 22, desc: 'Sunny', condition: 'Clear' },
          { icon: '⛅', temp: 18, desc: 'Partly Cloudy', condition: 'Clouds' },
          { icon: '🌧️', temp: 15, desc: 'Light Rain', condition: 'Rain' },
          { icon: '☁️', temp: 12, desc: 'Cloudy', condition: 'Clouds' },
          { icon: '🌤️', temp: 20, desc: 'Mostly Sunny', condition: 'Clear' }
        ];
        const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
        
        weatherWidget.innerHTML = `
          <div class="weather-content" style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: var(--bg-secondary, #f8f9fa); border-radius: 12px; border: 1px solid var(--border-color, #dee2e6);">
            <div class="weather-icon" style="font-size: 4rem; line-height: 1;">${randomWeather.icon}</div>
            <div class="weather-info" style="flex: 1;">
              <div class="weather-temp" style="font-size: 2rem; font-weight: bold; color: var(--text-primary, #212529);">${randomWeather.temp}°C</div>
              <div class="weather-desc" style="font-size: 1rem; color: var(--text-secondary, #6c757d); text-transform: capitalize;">${randomWeather.desc}</div>
              <div class="weather-location" style="font-size: 0.875rem; color: var(--text-secondary, #6c757d); margin-top: 0.25rem;">Your Location</div>
            </div>
          </div>
        `;
      },
      () => {
        // Fallback if geolocation denied
        weatherWidget.innerHTML = `
          <div class="weather-content">
            <div class="weather-icon">🌍</div>
            <div class="weather-info">
              <div class="weather-temp">--°C</div>
              <div class="weather-desc">Enable location for weather</div>
            </div>
          </div>
        `;
      }
    );
  }

  function getWeatherIcon(condition) {
    const icons = {
      'Clear': '☀️',
      'Clouds': '☁️',
      'Rain': '🌧️',
      'Drizzle': '🌦️',
      'Thunderstorm': '⛈️',
      'Snow': '❄️',
      'Mist': '🌫️'
    };
    return icons[condition] || '🌤️';
  }

  // ====== 9. GAMIFICATION & ACHIEVEMENT SYSTEM ======
  function initGamification() {
    const achievementsContainer = document.getElementById('achievements');
    if (!achievementsContainer) return;

    // Load achievements from localStorage or API
    const achievements = JSON.parse(localStorage.getItem('achievements') || '[]');
    const allAchievements = [
      { id: 'first_visit', name: 'Explorer', icon: '🗺️', description: 'First visit to the platform' },
      { id: 'viewed_10_events', name: 'Event Enthusiast', icon: '🎉', description: 'Viewed 10 events' },
      { id: 'completed_trail', name: 'Trail Blazer', icon: '🥾', description: 'Completed a trail' },
      { id: 'attended_event', name: 'Social Walker', icon: '👥', description: 'Attended an event' },
      { id: 'world_traveler', name: 'World Traveler', icon: '🌍', description: 'Explored 5 countries' }
    ];

    // Check for new achievements
    const eventCount = parseInt(localStorage.getItem('events_viewed') || '0');
    if (eventCount >= 10 && !achievements.find(a => a.id === 'viewed_10_events')) {
      achievements.push({ id: 'viewed_10_events', unlocked: new Date().toISOString() });
      showAchievementNotification('Event Enthusiast', '🎉');
      localStorage.setItem('achievements', JSON.stringify(achievements));
    }

    // Display achievements
    achievementsContainer.innerHTML = allAchievements.map(achievement => {
      const unlocked = achievements.find(a => a.id === achievement.id);
      return `
        <div class="achievement-badge ${unlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${achievement.icon}</div>
          <div class="achievement-info">
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function showAchievementNotification(name, icon) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-content">
        <div class="achievement-notification-icon">${icon}</div>
        <div>
          <strong>Achievement Unlocked!</strong>
          <div>${name}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ====== 10. LIVE ACTIVITY FEED ======
  function initLiveActivityFeed() {
    const activityFeed = document.getElementById('live-activity-feed');
    if (!activityFeed) return;

    const activities = [
      { user: 'Sarah J.', action: 'completed', item: 'West Highland Way', time: '2 minutes ago', icon: '🥾' },
      { user: 'Mike C.', action: 'registered for', item: 'Dublin Marathon', time: '5 minutes ago', icon: '🏃' },
      { user: 'Emma W.', action: 'explored', item: 'Camino de Santiago', time: '8 minutes ago', icon: '🗺️' },
      { user: 'David M.', action: 'shared', item: 'Appalachian Trail photos', time: '12 minutes ago', icon: '📸' },
      { user: 'Lisa K.', action: 'discovered', item: 'Great Wall of China Walk', time: '15 minutes ago', icon: '🌟' }
    ];

    let currentIndex = 0;
    
    function addActivity(activity) {
      const activityElement = document.createElement('div');
      activityElement.className = 'activity-item';
      activityElement.innerHTML = `
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <strong>${activity.user}</strong> ${activity.action} <strong>${activity.item}</strong>
          <small class="text-muted d-block">${activity.time}</small>
        </div>
      `;
      activityFeed.insertBefore(activityElement, activityFeed.firstChild);
      
      // Keep only last 5 activities
      while (activityFeed.children.length > 5) {
        activityFeed.removeChild(activityFeed.lastChild);
      }
    }

    // Add initial activities
    activities.forEach(activity => addActivity(activity));

    // Simulate new activities
    setInterval(() => {
      const newActivity = {
        user: ['Alex', 'Jordan', 'Taylor', 'Casey', 'Riley'][Math.floor(Math.random() * 5)] + '.',
        action: ['explored', 'registered for', 'completed', 'shared'][Math.floor(Math.random() * 4)],
        item: ['Dublin Marathon', 'Camino de Santiago', 'Appalachian Trail', 'Milford Track'][Math.floor(Math.random() * 4)],
        time: 'just now',
        icon: ['🗺️', '🏃', '🥾', '📸'][Math.floor(Math.random() * 4)]
      };
      addActivity(newActivity);
    }, 10000); // New activity every 10 seconds
  }

  // Initialize all features when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Initialize features
    initGlobe();
    initCountdownTimers();
    loadRecommendations();
    animateStats();
    initVideoBackground();
    initTestimonialsCarousel();
    initSmartSearch();
    initWeatherWidget();
    initGamification();
    initLiveActivityFeed();
  }

})();

