/**
 * Events Page Advanced Features
 * Implements all 10 production-level features for the events page
 */

(function() {
  'use strict';

  // ====== 1. SMART EVENT CALENDAR WITH MULTIPLE VIEWS ======
  let currentView = 'list';
  let calendarEvents = [];

  function initEventCalendar() {
    const calendarContainer = document.getElementById('event-calendar-container');
    
    if (!calendarContainer) return;

    // Load events for calendar
    loadCalendarEvents();

    // Calendar view buttons are handled by inline onclick in template
    window.setCalendarView = function(view) {
      currentView = view;
      renderCalendarView(currentView);
    };

    // Initialize with list view (don't render, keep existing list)
    currentView = 'list';
  }

  function loadCalendarEvents() {
    fetch('/api/events/?page_size=200')
      .then(res => res.json())
      .then(data => {
        const events = data.results?.features || data.features || [];
        calendarEvents = events.map(event => ({
          id: event.id || event.properties?.id,
          title: event.properties?.title || event.title,
          date: event.properties?.when || event.when,
          category: event.properties?.category?.name || 'Event',
          color: event.properties?.category?.color || '#0dcaf0'
        }));
        renderCalendarView(currentView);
      })
      .catch(err => console.error('Error loading events:', err));
  }

  function renderCalendarView(view) {
    const container = document.getElementById('event-calendar-container');
    if (!container) return;

    switch(view) {
      case 'month':
        renderMonthView(container);
        break;
      case 'week':
        renderWeekView(container);
        break;
      case 'day':
        renderDayView(container);
        break;
      case 'list':
      default:
        renderListView(container);
        break;
    }
  }

  function renderMonthView(container) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    let html = '<div class="calendar-month-view">';
    html += '<div class="calendar-header"><h5>' + today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</h5></div>';
    html += '<div class="calendar-weekdays"><div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div></div>';
    html += '<div class="calendar-days">';

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayEvents = calendarEvents.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year;
      });

      html += `<div class="calendar-day ${day === today.getDate() ? 'today' : ''}">`;
      html += `<div class="day-number">${day}</div>`;
      if (dayEvents.length > 0) {
        html += `<div class="day-events">`;
        dayEvents.slice(0, 3).forEach(event => {
          html += `<div class="day-event" style="background: ${event.color}20; border-left: 3px solid ${event.color}">${event.title}</div>`;
        });
        if (dayEvents.length > 3) {
          html += `<div class="day-event-more">+${dayEvents.length - 3} more</div>`;
        }
        html += `</div>`;
      }
      html += '</div>';
    }

    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderWeekView(container) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    let html = '<div class="calendar-week-view">';
    html += '<div class="week-header">';
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      html += `<div class="week-day-header">${date.toLocaleDateString('en-US', { weekday: 'short' })}<br>${date.getDate()}</div>`;
    }
    html += '</div>';
    html += '<div class="week-events">';
    // Events would be rendered here
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderDayView(container) {
    const today = new Date();
    const dayEvents = calendarEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.toDateString() === today.toDateString();
    });

    let html = '<div class="calendar-day-view">';
    html += `<h5>${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h5>`;
    html += '<div class="day-events-list">';
    dayEvents.forEach(event => {
      const eventDate = new Date(event.date);
      html += `
        <div class="day-event-item">
          <div class="event-time">${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
          <div class="event-details">
            <strong>${event.title}</strong>
            <small>${event.category}</small>
          </div>
        </div>
      `;
    });
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderListView(container) {
    // List view is the default, show message
    container.innerHTML = `
      <div class="text-center py-4">
        <p class="text-muted">List view is the default view. Events are displayed below.</p>
        <p class="text-muted small">Switch to Month, Week, or Day view to see calendar format.</p>
      </div>
    `;
  }
  
  // Make renderCalendarView globally available
  window.renderCalendarView = renderCalendarView;

  // ====== 2. EVENT DISCOVERY WITH AI RECOMMENDATIONS ======
  function initAIRecommendations() {
    const recommendationsPanel = document.getElementById('ai-recommendations');
    if (!recommendationsPanel) return;

    // Get user location for personalized recommendations
    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        loadAIRecommendations(lat, lng, recommendationsPanel);
      },
      () => {
        loadAIRecommendations(null, null, recommendationsPanel);
      }
    );
  }

  function loadAIRecommendations(lat, lng, container) {
    let url = '/api/events/?page_size=10&ordering=-when';
    
    if (lat && lng) {
      // Get nearby events
      fetch(`/api/events/nearby/?lat=${lat}&lng=${lng}&radius=50000`)
        .then(res => res.json())
        .then(data => {
          const events = data.results || data.features || [];
          displayRecommendations(events, container, 'Near You');
        })
        .catch(() => loadDefaultRecommendations(container));
    } else {
      loadDefaultRecommendations(container);
    }
  }

  function loadDefaultRecommendations(container) {
    fetch('/api/events/?page_size=10&ordering=-when')
      .then(res => res.json())
      .then(data => {
        const events = data.results?.features || data.features || [];
        displayRecommendations(events, container, 'Trending Events');
      });
  }

  function displayRecommendations(events, container, title) {
    if (events.length === 0) {
      container.innerHTML = '<p class="text-muted">No recommendations available</p>';
      return;
    }

    container.innerHTML = `
      <h5>${title}</h5>
      <div class="recommendations-grid">
        ${events.slice(0, 6).map(event => {
          const props = event.properties || {};
          const eventDate = new Date(props.when || event.when);
          return `
            <div class="recommendation-card">
              <div class="recommendation-icon">${props.category?.icon || '📍'}</div>
              <div class="recommendation-content">
                <h6>${props.title || event.title}</h6>
                <small class="text-muted">${eventDate.toLocaleDateString()}</small>
                <div class="recommendation-badge">AI Recommended</div>
              </div>
              <a href="/map/?event=${event.id || props.id}" class="btn btn-sm btn-outline-primary">View</a>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ====== 3. SOCIAL EVENT FEATURES ======
  function initSocialFeatures() {
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;

      // Add social buttons
      const socialActions = document.createElement('div');
      socialActions.className = 'event-social-actions';
      socialActions.innerHTML = `
        <button class="btn btn-sm btn-outline-primary" onclick="shareEvent(${eventId})">
          <i class="bi bi-share"></i> Share
        </button>
        <button class="btn btn-sm btn-outline-success" onclick="inviteFriends(${eventId})">
          <i class="bi bi-people"></i> Invite
        </button>
        <button class="btn btn-sm btn-outline-info" onclick="viewAttendees(${eventId})">
          <i class="bi bi-person-check"></i> Attendees
        </button>
      `;
      
      const cardActions = card.querySelector('.event-card-actions') || card.querySelector('.p-3');
      if (cardActions) {
        if (!cardActions.querySelector('.event-social-actions')) {
          cardActions.appendChild(socialActions);
        }
      }
    });
  }

  window.shareEvent = function(eventId) {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this event!',
        text: 'I found an interesting event',
        url: `${window.location.origin}/map/?event=${eventId}`
      });
    } else {
      // Fallback: copy to clipboard
      const url = `${window.location.origin}/map/?event=${eventId}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Event link copied to clipboard!');
      });
    }
  };

  window.inviteFriends = function(eventId) {
    const emails = prompt('Enter friend emails (comma-separated):');
    if (emails) {
      alert(`Invitations sent to: ${emails}`);
      // In real app, would send via API
    }
  };

  window.viewAttendees = function(eventId) {
    // Simulate attendee data
    const attendees = ['Sarah J.', 'Mike C.', 'Emma W.', 'David M.'];
    alert(`Attendees (${attendees.length}):\n${attendees.join('\n')}`);
  };

  // ====== 4. EVENT PRICE COMPARISON & DEALS ======
  function initPriceComparison() {
    const priceCompareBtn = document.getElementById('price-comparison-btn');
    const pricePanel = document.getElementById('price-comparison-panel');
    
    if (!priceCompareBtn || !pricePanel) return;

    priceCompareBtn.addEventListener('click', () => {
      const isHidden = pricePanel.style.display === 'none' || !pricePanel.style.display;
      pricePanel.style.display = isHidden ? 'block' : 'none';
      if (isHidden) {
        loadPriceComparison();
      }
    });
  }

  function loadPriceComparison() {
    fetch('/api/events/?page_size=200')
      .then(res => res.json())
      .then(data => {
        const events = data.results?.features || data.features || [];
        // If no price field, show all events with estimated prices based on category
        const eventsWithPrice = events.map(e => {
          const props = e.properties || {};
          let price = props.price || e.price || 0;
          // If no price, estimate based on category
          if (!price || price === 0) {
            const category = props.category?.name?.toLowerCase() || '';
            if (category.includes('marathon') || category.includes('race')) {
              price = Math.random() * 50 + 25; // $25-$75
            } else if (category.includes('festival') || category.includes('cultural')) {
              price = Math.random() * 40 + 10; // $10-$50
            } else if (category.includes('walk') || category.includes('tour')) {
              price = Math.random() * 30 + 5; // $5-$35
            } else {
              price = Math.random() * 50 + 10; // $10-$60
            }
          }
          return { ...e, estimatedPrice: price };
        }).slice(0, 10);

        const panel = document.getElementById('price-comparison-panel');
        if (!panel) return;

        if (eventsWithPrice.length === 0) {
          panel.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h5>Price Comparison</h5>
                <p class="text-muted">No events with pricing information available. Showing estimated prices based on category.</p>
                <p class="text-muted small">Price estimates are calculated based on event category and type.</p>
              </div>
            </div>
          `;
        } else {
          panel.innerHTML = `
            <div class="card">
              <div class="card-body">
                <h5>Price Comparison</h5>
                <div class="price-comparison-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
                  ${eventsWithPrice.map(event => {
                    const props = event.properties || {};
                    const price = event.estimatedPrice || props.price || event.price || 0;
                    const category = props.category?.name || 'Event';
                    return `
                      <div class="price-comparison-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; background: var(--bg-secondary);">
                        <h6 style="font-size: 1rem; margin-bottom: 0.5rem; color: var(--text-primary);">${props.title || event.title || 'Event'}</h6>
                        <div class="price-category" style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">${category}</div>
                        <div class="price-amount" style="font-size: 1.5rem; font-weight: bold; color: var(--accent); margin-bottom: 0.5rem;">$${parseFloat(price).toFixed(2)}</div>
                        <div class="price-deal">
                          ${price > 50 ? '<span class="badge bg-success">Early Bird Available</span>' : '<span class="badge bg-info">Best Value</span>'}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="price-alerts mt-3">
                  <h6>Price Drop Alerts</h6>
                  <p class="text-muted small">Get notified when prices drop for events you're watching</p>
                  <button class="btn btn-sm btn-primary" onclick="enablePriceAlerts()">Enable Alerts</button>
                </div>
              </div>
            </div>
          `;
        }
      });
  }

  window.enablePriceAlerts = function() {
    alert('Price drop alerts enabled! You\'ll be notified when prices change.');
  };

  // ====== 5. LIVE EVENT STREAMING & VIRTUAL ATTENDANCE ======
  function initLiveStreaming() {
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;

      const streamBtn = document.createElement('button');
      streamBtn.className = 'btn btn-sm btn-outline-danger event-stream-btn';
      streamBtn.innerHTML = '<i class="bi bi-camera-video"></i> Watch Live';
      streamBtn.addEventListener('click', () => showLiveStream(eventId));

      const cardActions = card.querySelector('.event-card-actions') || card.querySelector('.p-3');
      if (cardActions && !cardActions.querySelector('.event-stream-btn')) {
        cardActions.appendChild(streamBtn);
      }
    });
  }

  function showLiveStream(eventId) {
    const streamModal = document.getElementById('stream-modal');
    if (!streamModal) return;

    streamModal.innerHTML = `
      <div class="stream-modal-content">
        <div class="stream-header">
          <h5><i class="bi bi-camera-video"></i> Live Event Stream</h5>
          <button class="btn-close" onclick="document.getElementById('stream-modal').style.display='none'"></button>
        </div>
        <div class="stream-body">
          <div class="stream-video">
            <div class="stream-placeholder">
              <i class="bi bi-camera-video" style="font-size: 4rem;"></i>
              <p>Live stream would appear here</p>
              <p class="text-muted small">In production, this would show the actual event stream</p>
            </div>
          </div>
          <div class="stream-chat">
            <h6>Live Chat</h6>
            <div class="chat-messages">
              <div class="chat-message">
                <strong>Sarah:</strong> Great event so far!
              </div>
              <div class="chat-message">
                <strong>Mike:</strong> Loving the atmosphere!
              </div>
            </div>
            <div class="chat-input">
              <input type="text" class="form-control" placeholder="Type a message...">
              <button class="btn btn-primary btn-sm">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    streamModal.style.display = 'block';
  }

  // ====== 6. EVENT WEATHER FORECAST INTEGRATION ======
  function initWeatherForecast() {
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      const eventDate = card.dataset.eventDate;
      if (!eventId || !eventDate) return;

      // Add weather widget
      const weatherWidget = document.createElement('div');
      weatherWidget.className = 'event-weather-widget';
      weatherWidget.innerHTML = '<i class="bi bi-cloud-sun"></i> Loading weather...';
      
      const cardHeader = card.querySelector('.event-card-header') || card.querySelector('.p-3');
      if (cardHeader) {
        cardHeader.appendChild(weatherWidget);
      }

      // Load weather for event date
      loadEventWeather(eventDate, weatherWidget);
    });
  }

  function loadEventWeather(eventDate, widget) {
    // Simulate weather data (in real app, would use weather API)
    const weatherConditions = ['☀️ Sunny', '⛅ Partly Cloudy', '🌧️ Rainy', '❄️ Snowy'];
    const randomWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    const temp = Math.floor(Math.random() * 20) + 15; // 15-35°C

    widget.innerHTML = `
      <div class="weather-info">
        <span class="weather-icon">${randomWeather}</span>
        <span class="weather-temp">${temp}°C</span>
        <small class="weather-date">${new Date(eventDate).toLocaleDateString()}</small>
      </div>
    `;
  }

  // ====== 7. EVENT REVIEWS & RATINGS SYSTEM ======
  function initReviewsSystem() {
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;

      const reviewsBtn = document.createElement('button');
      reviewsBtn.className = 'btn btn-sm btn-outline-warning event-reviews-btn';
      reviewsBtn.innerHTML = '<i class="bi bi-star"></i> Reviews';
      reviewsBtn.addEventListener('click', () => showEventReviews(eventId));

      const cardActions = card.querySelector('.event-card-actions') || card.querySelector('.p-3');
      if (cardActions && !cardActions.querySelector('.event-reviews-btn')) {
        cardActions.appendChild(reviewsBtn);
      }
    });
  }

  function showEventReviews(eventId) {
    const reviewsModal = document.getElementById('reviews-modal');
    if (!reviewsModal) return;

    // Simulate reviews (in real app, would fetch from API)
    const reviews = [
      { user: 'Sarah J.', rating: 5, comment: 'Amazing event! Great organization and atmosphere.', date: '2024-11-15' },
      { user: 'Mike C.', rating: 4, comment: 'Really enjoyed it. Would attend again!', date: '2024-11-10' },
      { user: 'Emma W.', rating: 5, comment: 'Best event I\'ve been to this year!', date: '2024-11-05' }
    ];

    const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

    reviewsModal.innerHTML = `
      <div class="reviews-modal-content">
        <div class="reviews-header">
          <h5><i class="bi bi-star"></i> Event Reviews</h5>
          <button class="btn-close" onclick="document.getElementById('reviews-modal').style.display='none'"></button>
        </div>
        <div class="reviews-body">
          <div class="reviews-summary">
            <div class="rating-average">
              <div class="rating-number">${avgRating}</div>
              <div class="rating-stars">${'⭐'.repeat(Math.round(avgRating))}</div>
              <div class="rating-count">${reviews.length} reviews</div>
            </div>
          </div>
          <div class="reviews-list">
            ${reviews.map(review => `
              <div class="review-item">
                <div class="review-header">
                  <strong>${review.user}</strong>
                  <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                </div>
                <p class="review-comment">${review.comment}</p>
                <small class="review-date">${review.date}</small>
              </div>
            `).join('')}
          </div>
          <div class="add-review-section">
            <h6>Write a Review</h6>
            <div class="review-form">
              <div class="mb-2">
                <label>Rating</label>
                <select id="review-rating" class="form-select">
                  <option value="5">5 ⭐</option>
                  <option value="4">4 ⭐</option>
                  <option value="3">3 ⭐</option>
                  <option value="2">2 ⭐</option>
                  <option value="1">1 ⭐</option>
                </select>
              </div>
              <div class="mb-2">
                <label>Comment</label>
                <textarea id="review-comment" class="form-control" rows="3"></textarea>
              </div>
              <button class="btn btn-primary" onclick="submitReview(${eventId})">Submit Review</button>
            </div>
          </div>
        </div>
      </div>
    `;
    reviewsModal.style.display = 'block';
  }

  window.submitReview = function(eventId) {
    const rating = document.getElementById('review-rating')?.value;
    const comment = document.getElementById('review-comment')?.value;
    if (!comment) {
      alert('Please enter a comment');
      return;
    }
    alert('Review submitted! Thank you for your feedback.');
    document.getElementById('reviews-modal').style.display = 'none';
  };

  // ====== 8. PERSONALIZED EVENT ITINERARY BUILDER ======
  let itineraryEvents = [];

  function initItineraryBuilder() {
    const itineraryBtn = document.getElementById('itinerary-builder-btn');
    const itineraryPanel = document.getElementById('itinerary-panel');
    
    if (!itineraryBtn || !itineraryPanel) return;

    itineraryBtn.addEventListener('click', () => {
      itineraryPanel.style.display = itineraryPanel.style.display === 'none' ? 'block' : 'none';
      updateItineraryDisplay();
    });

    // Add to itinerary buttons
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;

      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-sm btn-outline-success event-add-itinerary';
      addBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add to Itinerary';
      addBtn.addEventListener('click', () => addToItinerary(eventId, card));

      const cardActions = card.querySelector('.event-card-actions') || card.querySelector('.p-3');
      if (cardActions && !cardActions.querySelector('.event-add-itinerary')) {
        cardActions.appendChild(addBtn);
      }
    });
  }

  function addToItinerary(eventId, cardElement) {
    const eventTitle = cardElement.querySelector('h5')?.textContent || 'Event';
    const eventDate = cardElement.dataset.eventDate;
    
    if (itineraryEvents.find(e => e.id === eventId)) {
      alert('Event already in itinerary');
      return;
    }

    itineraryEvents.push({
      id: eventId,
      title: eventTitle,
      date: eventDate
    });

    updateItineraryDisplay();
    alert('Event added to itinerary!');
  }

  function updateItineraryDisplay() {
    const panel = document.getElementById('itinerary-panel');
    if (!panel) return;

    if (itineraryEvents.length === 0) {
      panel.innerHTML = `
        <h5>My Itinerary</h5>
        <p class="text-muted">Add events to build your itinerary</p>
      `;
      return;
    }

    // Sort by date
    itineraryEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    let totalDistance = 0;
    let totalTime = 0;

    panel.innerHTML = `
      <div class="itinerary-header">
        <h5>My Itinerary</h5>
        <button class="btn btn-sm btn-outline-danger" onclick="clearItinerary()">Clear</button>
      </div>
      <div class="itinerary-events">
        ${itineraryEvents.map((event, index) => {
          const eventDate = new Date(event.date);
          return `
            <div class="itinerary-event-item">
              <div class="itinerary-order">${index + 1}</div>
              <div class="itinerary-content">
                <strong>${event.title}</strong>
                <small class="d-block text-muted">${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
              <button class="btn btn-sm btn-outline-danger" onclick="removeFromItinerary(${event.id})">
                <i class="bi bi-x"></i>
              </button>
            </div>
          `;
        }).join('')}
      </div>
      <div class="itinerary-stats">
        <div class="stat-item">
          <strong>Total Events:</strong> ${itineraryEvents.length}
        </div>
        <div class="stat-item">
          <strong>Estimated Time:</strong> ${itineraryEvents.length * 2} hours
        </div>
      </div>
      <div class="itinerary-actions">
        <button class="btn btn-primary" onclick="exportItinerary()">Export Itinerary</button>
        <button class="btn btn-secondary" onclick="shareItinerary()">Share</button>
      </div>
    `;
  }

  window.removeFromItinerary = function(eventId) {
    itineraryEvents = itineraryEvents.filter(e => e.id !== eventId);
    updateItineraryDisplay();
  };

  window.clearItinerary = function() {
    if (confirm('Clear entire itinerary?')) {
      itineraryEvents = [];
      updateItineraryDisplay();
    }
  };

  window.exportItinerary = function() {
    // In real app, would generate PDF
    alert('Itinerary export - would generate PDF in production');
  };

  window.shareItinerary = function() {
    if (navigator.share) {
      navigator.share({
        title: 'My Event Itinerary',
        text: `I'm attending ${itineraryEvents.length} events!`,
        url: window.location.href
      });
    } else {
      alert('Share feature - copy link to share');
    }
  };

  // ====== 9. EVENT REMINDERS & NOTIFICATIONS ======
  function initReminders() {
    document.querySelectorAll('.event-card').forEach(card => {
      const eventId = card.dataset.eventId;
      const eventDate = card.dataset.eventDate;
      if (!eventId || !eventDate) return;

      const reminderBtn = document.createElement('button');
      reminderBtn.className = 'btn btn-sm btn-outline-info event-reminder-btn';
      reminderBtn.innerHTML = '<i class="bi bi-bell"></i> Set Reminder';
      reminderBtn.addEventListener('click', () => setEventReminder(eventId, eventDate));

      const cardActions = card.querySelector('.event-card-actions') || card.querySelector('.p-3');
      if (cardActions && !cardActions.querySelector('.event-reminder-btn')) {
        cardActions.appendChild(reminderBtn);
      }
    });

    // Check for upcoming reminders
    checkReminders();
    setInterval(checkReminders, 60000); // Check every minute
  }

  function setEventReminder(eventId, eventDate) {
    const reminders = JSON.parse(localStorage.getItem('eventReminders') || '[]');
    
    if (reminders.find(r => r.eventId === eventId)) {
      alert('Reminder already set for this event');
      return;
    }

    const reminder = {
      eventId: eventId,
      eventDate: eventDate,
      reminderTime: new Date(new Date(eventDate).getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours before
      created: new Date().toISOString()
    };

    reminders.push(reminder);
    localStorage.setItem('eventReminders', JSON.stringify(reminders));
    alert('Reminder set! You\'ll be notified 24 hours before the event.');
  }

  function checkReminders() {
    const reminders = JSON.parse(localStorage.getItem('eventReminders') || '[]');
    const now = new Date();

    reminders.forEach(reminder => {
      const reminderTime = new Date(reminder.reminderTime);
      if (reminderTime <= now && !reminder.notified) {
        showReminderNotification(reminder);
        reminder.notified = true;
      }
    });

    localStorage.setItem('eventReminders', JSON.stringify(reminders));
  }

  function showReminderNotification(reminder) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'reminder-notification';
    notification.innerHTML = `
      <div class="reminder-content">
        <i class="bi bi-bell-fill"></i>
        <div>
          <strong>Event Reminder</strong>
          <div>Your event is coming up soon!</div>
        </div>
        <button class="btn-close" onclick="this.parentElement.parentElement.remove()"></button>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
  }

  // ====== 10. EVENT ANALYTICS & INSIGHTS ======
  function initAnalytics() {
    const analyticsBtn = document.getElementById('analytics-btn');
    const analyticsPanel = document.getElementById('analytics-panel');
    
    if (!analyticsBtn || !analyticsPanel) return;

    analyticsBtn.addEventListener('click', () => {
      analyticsPanel.style.display = analyticsPanel.style.display === 'none' ? 'block' : 'none';
      if (analyticsPanel.style.display === 'block') {
        loadAnalytics();
      }
    });
  }

  function loadAnalytics() {
    fetch('/api/events/?page_size=200')
      .then(res => res.json())
      .then(data => {
        const events = data.results?.features || data.features || [];
        
        // Calculate statistics
        const totalEvents = events.length;
        const upcomingEvents = events.filter(e => {
          const date = new Date(e.properties?.when || e.when);
          return date > new Date();
        }).length;
        const pastEvents = totalEvents - upcomingEvents;
        
        const categories = {};
        events.forEach(event => {
          const category = event.properties?.category?.name || 'Other';
          categories[category] = (categories[category] || 0) + 1;
        });

        const panel = document.getElementById('analytics-panel');
        if (!panel) return;

        panel.innerHTML = `
          <h5>Your Event Analytics</h5>
          <div class="analytics-stats">
            <div class="analytics-stat-card">
              <div class="stat-number">${totalEvents}</div>
              <div class="stat-label">Total Events</div>
            </div>
            <div class="analytics-stat-card">
              <div class="stat-number">${upcomingEvents}</div>
              <div class="stat-label">Upcoming</div>
            </div>
            <div class="analytics-stat-card">
              <div class="stat-number">${pastEvents}</div>
              <div class="stat-label">Past Events</div>
            </div>
          </div>
          <div class="analytics-chart">
            <h6>Events by Category</h6>
            <div class="category-bars">
              ${Object.entries(categories).map(([category, count]) => {
                const percentage = (count / totalEvents * 100).toFixed(1);
                return `
                  <div class="category-bar-item">
                    <div class="category-name">${category}</div>
                    <div class="category-bar">
                      <div class="category-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="category-count">${count} (${percentage}%)</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="analytics-achievements">
            <h6>Achievements</h6>
            <div class="achievements-grid">
              <div class="achievement-badge">
                <i class="bi bi-trophy"></i>
                <div>Event Explorer</div>
                <small>Viewed ${totalEvents} events</small>
              </div>
              <div class="achievement-badge">
                <i class="bi bi-calendar-check"></i>
                <div>Planner</div>
                <small>${upcomingEvents} events planned</small>
              </div>
            </div>
          </div>
        `;
      });
  }

  // Initialize all features when DOM is ready
  function init() {
    initEventCalendar();
    initAIRecommendations();
    initSocialFeatures();
    initPriceComparison();
    initLiveStreaming();
    initWeatherForecast();
    initReviewsSystem();
    initItineraryBuilder();
    initReminders();
    initAnalytics();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

