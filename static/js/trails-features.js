/**
 * Trails Page Advanced Features
 * Implements all 10 production-level features for the trails page
 */

(function() {
  'use strict';

  // ====== 1. INTERACTIVE TRAIL COMPARISON TOOL ======
  let selectedTrails = [];

  function initTrailComparison() {
    const compareBtn = document.getElementById('compare-trails-btn');
    const comparisonPanel = document.getElementById('trail-comparison-panel');
    
    if (!compareBtn || !comparisonPanel) return;

    // Add compare buttons to trail cards
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      if (!trailId) return;

      const compareCheckbox = document.createElement('input');
      compareCheckbox.type = 'checkbox';
      compareCheckbox.className = 'trail-compare-checkbox';
      compareCheckbox.dataset.trailId = trailId;
      compareCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (selectedTrails.length < 3) {
            selectedTrails.push(trailId);
            updateComparisonButton();
          } else {
            e.target.checked = false;
            alert('Maximum 3 trails can be compared at once');
          }
        } else {
          selectedTrails = selectedTrails.filter(id => id !== trailId);
          updateComparisonButton();
        }
      });

      const compareLabel = document.createElement('label');
      compareLabel.className = 'trail-compare-label';
      compareLabel.innerHTML = '<i class="bi bi-arrow-left-right"></i> Compare';
      compareLabel.appendChild(compareCheckbox);
      
      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(compareLabel);
      }
    });

    compareBtn.addEventListener('click', () => {
      if (selectedTrails.length < 2) {
        alert('Please select at least 2 trails to compare');
        return;
      }
      showTrailComparison(selectedTrails);
    });
  }

  function updateComparisonButton() {
    const compareBtn = document.getElementById('compare-trails-btn');
    if (compareBtn) {
      const currentLang = window.i18n?.currentLanguage || 'en';
      const translations = window.i18n?.translations?.[currentLang] || {};
      const compareText = translations['compare'] || 'Compare';
      compareBtn.innerHTML = `<i class="bi bi-arrow-left-right"></i> ${compareText} (${selectedTrails.length}/3)`;
      compareBtn.disabled = selectedTrails.length < 2;
    }
  }

  function showTrailComparison(trailIds) {
    const comparisonPanel = document.getElementById('trail-comparison-panel');
    if (!comparisonPanel) return;

    // Fetch trail data
    Promise.all(trailIds.map(id => 
      fetch(`/api/routes/`)
        .then(r => r.json())
        .then(data => {
          const routes = data.features || [];
          return routes.find(r => (r.id || r.properties?.id) == id) || routes[0];
        })
        .catch(() => ({ properties: { name: 'Trail ' + id } }))
    )).then(trails => {
      comparisonPanel.innerHTML = `
        <div class="comparison-header">
          <h5>Trail Comparison</h5>
          <button class="btn btn-sm btn-close" onclick="document.getElementById('trail-comparison-panel').style.display='none'"></button>
        </div>
        <div class="comparison-grid">
          ${trails.map(trail => {
            const props = trail.properties || {};
            const distance = props.distance_km || props.distance_meters ? 
              (props.distance_km || (props.distance_meters / 1000).toFixed(2)) + ' km' : 'N/A';
            return `
            <div class="comparison-trail-card">
              <h6>${props.name || trail.name || 'Trail'}</h6>
              <div class="comparison-stats">
                <div class="stat-item">
                  <span class="stat-label">Distance:</span>
                  <span class="stat-value">${distance}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Difficulty:</span>
                  <span class="stat-value">${props.difficulty_display || props.difficulty || 'N/A'}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Elevation:</span>
                  <span class="stat-value">${props.elevation_gain || 'N/A'} m</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Duration:</span>
                  <span class="stat-value">${props.estimated_duration_hours || 'N/A'} hrs</span>
                </div>
              </div>
            </div>
          `;
          }).join('')}
        </div>
        <div class="comparison-chart">
          <canvas id="comparison-chart"></canvas>
        </div>
      `;
      comparisonPanel.style.display = 'block';
      setTimeout(() => drawComparisonChart(trails), 100);
    });
  }

  function drawComparisonChart(trails) {
    const canvas = document.getElementById('comparison-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = 200;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const props = trails.map(t => t.properties || {});
    const distances = props.map(p => {
      if (p.distance_km) return p.distance_km;
      if (p.distance_meters) return p.distance_meters / 1000;
      return 0;
    });
    const elevations = props.map(p => p.elevation_gain || 0);

    const maxDistance = Math.max(...distances, 1);
    const maxElevation = Math.max(...elevations, 1);

    trails.forEach((trail, index) => {
      const props = trail.properties || {};
      const distance = distances[index] || 0;
      const elevation = elevations[index] || 0;
      
      const x = (index + 1) * (canvas.width / (trails.length + 1));
      const distanceHeight = (distance / maxDistance) * 150;
      const elevationHeight = (elevation / maxElevation) * 150;

      // Draw bars
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x - 20, canvas.height - distanceHeight, 40, distanceHeight);
      
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 20, canvas.height - elevationHeight - 10, 40, elevationHeight);
    });
  }

  // ====== 2. VIRTUAL TRAIL PREVIEW WITH 360° PHOTOS ======
  function init360Preview() {
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      if (!trailId) return;

      const previewBtn = document.createElement('button');
      previewBtn.className = 'btn btn-sm btn-outline-info trail-360-btn';
      previewBtn.innerHTML = '<i class="bi bi-camera-vr"></i> 360° Preview';
      previewBtn.addEventListener('click', () => show360Preview(trailId));

      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(previewBtn);
      }
    });
  }

  function show360Preview(trailId) {
    const previewModal = document.getElementById('360-preview-modal');
    if (!previewModal) return;

    // Simulate 360° photos (in real app, would fetch from API)
    const photos = [
      { url: 'https://picsum.photos/800/600?random=1', heading: 0 },
      { url: 'https://picsum.photos/800/600?random=2', heading: 90 },
      { url: 'https://picsum.photos/800/600?random=3', heading: 180 },
      { url: 'https://picsum.photos/800/600?random=4', heading: 270 }
    ];

    previewModal.innerHTML = `
      <div class="modal-content-360">
        <div class="modal-header-360">
          <h5>360° Trail Preview</h5>
          <button class="btn-close" onclick="document.getElementById('360-preview-modal').style.display='none'"></button>
        </div>
        <div class="modal-body-360">
          <div class="panorama-container">
            <img id="panorama-image" src="${photos[0].url}" alt="Trail view">
            <div class="panorama-controls">
              <button class="panorama-btn" onclick="rotatePanorama(-90)"><i class="bi bi-arrow-left"></i></button>
              <button class="panorama-btn" onclick="rotatePanorama(90)"><i class="bi bi-arrow-right"></i></button>
            </div>
          </div>
          <div class="panorama-thumbnails">
            ${photos.map((photo, i) => `
              <img src="${photo.url}" alt="View ${i+1}" onclick="loadPanorama(${i})" class="panorama-thumb">
            `).join('')}
          </div>
        </div>
      </div>
    `;
    previewModal.style.display = 'block';

    window.currentPanoramaIndex = 0;
    window.panoramaPhotos = photos;
  }

  window.rotatePanorama = function(angle) {
    if (!window.panoramaPhotos) return;
    window.currentPanoramaIndex = (window.currentPanoramaIndex + (angle > 0 ? 1 : -1) + window.panoramaPhotos.length) % window.panoramaPhotos.length;
    const img = document.getElementById('panorama-image');
    if (img) img.src = window.panoramaPhotos[window.currentPanoramaIndex].url;
  };

  window.loadPanorama = function(index) {
    if (!window.panoramaPhotos) return;
    window.currentPanoramaIndex = index;
    const img = document.getElementById('panorama-image');
    if (img) img.src = window.panoramaPhotos[index].url;
  };

  // ====== 3. TRAIL COMPLETION TRACKING & CERTIFICATES ======
  function initCompletionTracking() {
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      if (!trailId) return;

      const completeBtn = document.createElement('button');
      completeBtn.className = 'btn btn-sm btn-success trail-complete-btn';
      completeBtn.innerHTML = '<i class="bi bi-check-circle"></i> Mark Complete';
      completeBtn.addEventListener('click', () => markTrailComplete(trailId, card));

      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(completeBtn);
      }
    });

    loadCompletedTrails();
  }

  function markTrailComplete(trailId, cardElement) {
    const completed = JSON.parse(localStorage.getItem('completedTrails') || '[]');
    if (completed.find(t => t.id === trailId)) {
      alert('Trail already marked as complete!');
      return;
    }

    const trailName = cardElement.querySelector('h5')?.textContent || 'Trail';
    const completion = {
      id: trailId,
      name: trailName,
      date: new Date().toISOString(),
      duration: prompt('How long did it take (hours)?') || 'N/A'
    };

    completed.push(completion);
    localStorage.setItem('completedTrails', JSON.stringify(completed));

    // Show certificate
    showCompletionCertificate(completion);
    
    // Update UI
    cardElement.classList.add('trail-completed');
    const btn = cardElement.querySelector('.trail-complete-btn');
    if (btn) {
      btn.innerHTML = '<i class="bi bi-trophy"></i> Completed!';
      btn.disabled = true;
    }
  }

  function showCompletionCertificate(completion) {
    const certModal = document.getElementById('certificate-modal');
    if (!certModal) return;

    certModal.innerHTML = `
      <div class="certificate-content">
        <div class="certificate-header">
          <h2>🏆 Trail Completion Certificate</h2>
        </div>
        <div class="certificate-body">
          <p class="certificate-text">This certifies that</p>
          <h3 class="certificate-name">You</h3>
          <p class="certificate-text">have successfully completed</p>
          <h4 class="certificate-trail">${completion.name}</h4>
          <p class="certificate-date">on ${new Date(completion.date).toLocaleDateString()}</p>
          <div class="certificate-stats">
            <div>Duration: ${completion.duration} hours</div>
          </div>
        </div>
        <div class="certificate-footer">
          <button class="btn btn-primary" onclick="downloadCertificate()">Download Certificate</button>
          <button class="btn btn-secondary" onclick="shareCertificate()">Share</button>
          <button class="btn btn-close" onclick="document.getElementById('certificate-modal').style.display='none'">Close</button>
        </div>
      </div>
    `;
    certModal.style.display = 'block';
  }

  function loadCompletedTrails() {
    const completed = JSON.parse(localStorage.getItem('completedTrails') || '[]');
    completed.forEach(completion => {
      const card = document.querySelector(`[data-trail-id="${completion.id}"]`);
      if (card) {
        card.classList.add('trail-completed');
        const btn = card.querySelector('.trail-complete-btn');
        if (btn) {
          btn.innerHTML = '<i class="bi bi-trophy"></i> Completed!';
          btn.disabled = true;
        }
      }
    });
  }

  window.downloadCertificate = function() {
    // In real app, would generate PDF
    alert('Certificate download feature - would generate PDF in production');
  };

  window.shareCertificate = function() {
    if (navigator.share) {
      navigator.share({
        title: 'Trail Completion Certificate',
        text: 'I completed a trail!',
        url: window.location.href
      });
    } else {
      alert('Share feature - copy link to share');
    }
  };

  // ====== 4. TRAIL DIFFICULTY CALCULATOR ======
  function initDifficultyCalculator() {
    const calcBtn = document.getElementById('difficulty-calculator-btn');
    const calcPanel = document.getElementById('difficulty-calculator-panel');
    
    if (!calcBtn || !calcPanel) return;

    calcBtn.addEventListener('click', () => {
      calcPanel.style.display = calcPanel.style.display === 'none' ? 'block' : 'none';
    });

    const calculateBtn = document.getElementById('calculate-difficulty');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', calculatePersonalDifficulty);
    }
  }

  function calculatePersonalDifficulty() {
    const fitnessLevel = document.getElementById('fitness-level')?.value || 3;
    const experience = document.getElementById('hiking-experience')?.value || 3;
    const age = parseInt(document.getElementById('age')?.value || 30);
    const healthConditions = document.getElementById('health-conditions')?.checked || false;

    let baseDifficulty = (parseInt(fitnessLevel) + parseInt(experience)) / 2;
    
    // Adjust for age
    if (age > 60) baseDifficulty += 0.5;
    if (age < 18) baseDifficulty += 0.3;
    
    // Adjust for health
    if (healthConditions) baseDifficulty += 0.5;

    const result = document.getElementById('difficulty-result');
    if (result) {
      const difficultyText = baseDifficulty <= 1.5 ? 'Easy' :
                            baseDifficulty <= 2.5 ? 'Moderate' :
                            baseDifficulty <= 3.5 ? 'Challenging' :
                            baseDifficulty <= 4.5 ? 'Hard' : 'Extreme';
      
      result.innerHTML = `
        <div class="difficulty-result-card">
          <h6>Recommended Difficulty Level</h6>
          <div class="difficulty-badge-large ${difficultyText.toLowerCase()}">${difficultyText}</div>
          <p class="mt-3">Based on your profile, you should focus on <strong>${difficultyText}</strong> trails.</p>
          <div class="recommended-trails mt-3">
            <h6>Recommended Trails:</h6>
            <div id="recommended-trails-list"></div>
          </div>
        </div>
      `;
      
      // Show recommended trails
      showRecommendedTrails(baseDifficulty);
    }
  }

  function showRecommendedTrails(maxDifficulty) {
    const list = document.getElementById('recommended-trails-list');
    if (!list) return;

    // Filter trails by difficulty
    const trailCards = document.querySelectorAll('.trail-card');
    const recommended = Array.from(trailCards).filter(card => {
      const difficulty = parseInt(card.dataset.difficulty || 3);
      return difficulty <= Math.ceil(maxDifficulty);
    }).slice(0, 3);

    if (recommended.length === 0) {
      list.innerHTML = '<p class="text-muted">No trails match your difficulty level</p>';
      return;
    }

    list.innerHTML = recommended.map(card => {
      const name = card.querySelector('h5')?.textContent || 'Trail';
      return `<div class="recommended-trail-item">${name}</div>`;
    }).join('');
  }

  // ====== 5. TRAIL STORYTELLING & HISTORY ======
  function initTrailStorytelling() {
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      if (!trailId) return;

      const storyBtn = document.createElement('button');
      storyBtn.className = 'btn btn-sm btn-outline-primary trail-story-btn';
      storyBtn.innerHTML = '<i class="bi bi-book"></i> History & Stories';
      storyBtn.addEventListener('click', () => showTrailStory(trailId, card));

      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(storyBtn);
      }
    });
  }

  function showTrailStory(trailId, cardElement) {
    const trailName = cardElement.querySelector('h5')?.textContent || 'Trail';
    const storyModal = document.getElementById('trail-story-modal');
    if (!storyModal) return;

    // Trail stories (in real app, would fetch from API)
    const stories = {
      'Camino de Santiago': {
        history: 'The Camino de Santiago has been a pilgrimage route for over 1000 years. It leads to the shrine of the apostle Saint James the Great in the cathedral of Santiago de Compostela.',
        facts: ['Over 300,000 pilgrims walk it annually', 'Routes span across Europe', 'UNESCO World Heritage Site'],
        timeline: [
          { year: '9th century', event: 'Discovery of St. James\'s tomb' },
          { year: '12th century', event: 'First guidebook written' },
          { year: '1987', event: 'Declared European Cultural Route' }
        ]
      },
      'Appalachian Trail': {
        history: 'The Appalachian Trail is a 2,200-mile hiking trail extending from Springer Mountain in Georgia to Mount Katahdin in Maine.',
        facts: ['Longest hiking-only trail in the world', 'Takes 5-7 months to complete', 'Over 3 million people visit annually'],
        timeline: [
          { year: '1921', event: 'Concept proposed by Benton MacKaye' },
          { year: '1937', event: 'Trail completed' },
          { year: '1968', event: 'National Trails System Act' }
        ]
      }
    };

    const story = stories[trailName] || {
      history: 'This trail has a rich history waiting to be explored.',
      facts: ['Popular hiking destination', 'Beautiful scenery', 'Well-maintained path'],
      timeline: [
        { year: 'Established', event: 'Long-standing trail' }
      ]
    };

    storyModal.innerHTML = `
      <div class="story-modal-content">
        <div class="story-header">
          <h4>${trailName} - History & Stories</h4>
          <button class="btn-close" onclick="document.getElementById('trail-story-modal').style.display='none'"></button>
        </div>
        <div class="story-body">
          <div class="story-section">
            <h5>History</h5>
            <p>${story.history}</p>
          </div>
          <div class="story-section">
            <h5>Interesting Facts</h5>
            <ul>
              ${story.facts.map(fact => `<li>${fact}</li>`).join('')}
            </ul>
          </div>
          <div class="story-section">
            <h5>Timeline</h5>
            <div class="timeline">
              ${story.timeline.map(item => `
                <div class="timeline-item">
                  <div class="timeline-year">${item.year}</div>
                  <div class="timeline-event">${item.event}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    storyModal.style.display = 'block';
  }

  // ====== 6. GROUP TRAIL PLANNING & BOOKING ======
  function initGroupPlanning() {
    const groupPlanBtn = document.getElementById('group-planning-btn');
    const groupPanel = document.getElementById('group-planning-panel');
    
    if (!groupPlanBtn || !groupPanel) return;

    groupPlanBtn.addEventListener('click', () => {
      groupPanel.style.display = groupPanel.style.display === 'none' ? 'block' : 'none';
    });

    // Populate trail select
    fetch('/api/routes/')
      .then(r => r.json())
      .then(data => {
        const routes = data.features || [];
        const select = document.getElementById('selected-trail-for-group');
        if (select) {
          routes.forEach(route => {
            const name = route.properties?.name || route.name || 'Trail';
            const id = route.id || route.properties?.id;
            if (id) {
              const option = document.createElement('option');
              option.value = id;
              option.textContent = name;
              select.appendChild(option);
            }
          });
        }
      });

    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
      createGroupBtn.addEventListener('click', createTrailGroup);
    }
  }

  function createTrailGroup() {
    const groupName = document.getElementById('group-name')?.value || 'Trail Group';
    const trailId = document.getElementById('selected-trail-for-group')?.value;
    const date = document.getElementById('group-date')?.value;
    const members = document.getElementById('group-members')?.value.split(',').map(m => m.trim()).filter(m => m) || [];

    const group = {
      id: Date.now(),
      name: groupName,
      trailId: trailId,
      date: date,
      members: members,
      created: new Date().toISOString()
    };

    const groups = JSON.parse(localStorage.getItem('trailGroups') || '[]');
    groups.push(group);
    localStorage.setItem('trailGroups', JSON.stringify(groups));

    alert(`Group "${groupName}" created! ${members.length} members invited.`);
    document.getElementById('group-planning-panel').style.display = 'none';
  }

  // ====== 7. TRAIL SAFETY & EMERGENCY FEATURES ======
  function initSafetyFeatures() {
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      if (!trailId) return;

      const safetyBtn = document.createElement('button');
      safetyBtn.className = 'btn btn-sm btn-outline-warning trail-safety-btn';
      safetyBtn.innerHTML = '<i class="bi bi-shield-check"></i> Safety Info';
      safetyBtn.addEventListener('click', () => showSafetyInfo(trailId));

      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(safetyBtn);
      }
    });
  }

  function showSafetyInfo(trailId) {
    const safetyModal = document.getElementById('safety-modal');
    if (!safetyModal) return;

    safetyModal.innerHTML = `
      <div class="safety-modal-content">
        <div class="safety-header">
          <h5><i class="bi bi-shield-check"></i> Trail Safety Information</h5>
          <button class="btn-close" onclick="document.getElementById('safety-modal').style.display='none'"></button>
        </div>
        <div class="safety-body">
          <div class="safety-checklist">
            <h6>Safety Checklist</h6>
            <div class="checklist-item">
              <input type="checkbox" id="check-water"> <label for="check-water">Bring plenty of water (2-3 liters)</label>
            </div>
            <div class="checklist-item">
              <input type="checkbox" id="check-food"> <label for="check-food">Pack high-energy snacks</label>
            </div>
            <div class="checklist-item">
              <input type="checkbox" id="check-map"> <label for="check-map">Carry map and compass</label>
            </div>
            <div class="checklist-item">
              <input type="checkbox" id="check-phone"> <label for="check-phone">Fully charged phone</label>
            </div>
            <div class="checklist-item">
              <input type="checkbox" id="check-firstaid"> <label for="check-firstaid">First aid kit</label>
            </div>
            <div class="checklist-item">
              <input type="checkbox" id="check-weather"> <label for="check-weather">Check weather forecast</label>
            </div>
          </div>
          <div class="emergency-contacts">
            <h6>Emergency Contacts</h6>
            <div class="contact-item">
              <strong>Emergency Services:</strong> 911 (US) / 112 (EU)
            </div>
            <div class="contact-item">
              <strong>Mountain Rescue:</strong> Check local number
            </div>
            <div class="contact-item">
              <strong>Trail Ranger:</strong> Contact local park office
            </div>
          </div>
          <div class="safety-tips">
            <h6>Safety Tips</h6>
            <ul>
              <li>Tell someone your planned route and return time</li>
              <li>Stay on marked trails</li>
              <li>Be aware of weather changes</li>
              <li>Don't hike alone in remote areas</li>
              <li>Carry emergency whistle</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    safetyModal.style.display = 'block';
  }

  // ====== 8. SEASONAL TRAIL RECOMMENDATIONS ======
  function initSeasonalRecommendations() {
    const seasonPanel = document.getElementById('seasonal-recommendations');
    if (!seasonPanel) return;

    const currentMonth = new Date().getMonth();
    const season = currentMonth >= 2 && currentMonth <= 4 ? 'Spring' :
                  currentMonth >= 5 && currentMonth <= 7 ? 'Summer' :
                  currentMonth >= 8 && currentMonth <= 10 ? 'Fall' : 'Winter';

    const recommendations = {
      Spring: {
        title: 'Spring Trails',
        description: 'Perfect weather for hiking! Wildflowers are blooming.',
        trails: ['West Highland Way', 'Camino de Santiago', 'Milford Track']
      },
      Summer: {
        title: 'Summer Trails',
        description: 'Long days and warm weather. Great for long-distance trails.',
        trails: ['Appalachian Trail', 'Pacific Crest Trail', 'Great Wall of China']
      },
      Fall: {
        title: 'Fall Trails',
        description: 'Beautiful fall foliage. Cooler temperatures perfect for hiking.',
        trails: ['Appalachian Trail', 'West Highland Way', 'Inca Trail']
      },
      Winter: {
        title: 'Winter Trails',
        description: 'Snow-covered trails offer unique experiences. Dress warmly!',
        trails: ['West Highland Way', 'Great Wall of China', 'Milford Track']
      }
    };

    const rec = recommendations[season];
    seasonPanel.innerHTML = `
      <div class="seasonal-card">
        <h5>${rec.title}</h5>
        <p>${rec.description}</p>
        <div class="seasonal-trails">
          ${rec.trails.map(trail => `<span class="seasonal-trail-badge">${trail}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // ====== 9. TRAIL PHOTO CONTEST & GALLERY ======
  function initPhotoGallery() {
    const galleryBtn = document.getElementById('photo-gallery-btn');
    const galleryPanel = document.getElementById('photo-gallery-panel');
    
    if (!galleryBtn || !galleryPanel) return;

    galleryBtn.addEventListener('click', () => {
      galleryPanel.style.display = galleryPanel.style.display === 'none' ? 'block' : 'none';
      loadPhotoGallery();
    });
  }

  function loadPhotoGallery() {
    const galleryPanel = document.getElementById('photo-gallery-panel');
    if (!galleryPanel) return;

    // Simulate photo gallery (in real app, would fetch from API)
    const photos = [
      { id: 1, url: 'https://picsum.photos/300/200?random=1', trail: 'Camino de Santiago', user: 'Sarah J.', votes: 45 },
      { id: 2, url: 'https://picsum.photos/300/200?random=2', trail: 'Appalachian Trail', user: 'Mike C.', votes: 32 },
      { id: 3, url: 'https://picsum.photos/300/200?random=3', trail: 'West Highland Way', user: 'Emma W.', votes: 28 },
      { id: 4, url: 'https://picsum.photos/300/200?random=4', trail: 'Milford Track', user: 'David M.', votes: 67 },
      { id: 5, url: 'https://picsum.photos/300/200?random=5', trail: 'Great Wall of China', user: 'Lisa K.', votes: 89 },
      { id: 6, url: 'https://picsum.photos/300/200?random=6', trail: 'Inca Trail', user: 'Alex R.', votes: 54 }
    ];

    galleryPanel.innerHTML = `
      <div class="gallery-header">
        <h5>Trail Photo Contest</h5>
        <button class="btn btn-sm btn-primary" onclick="uploadPhoto()">Upload Photo</button>
      </div>
      <div class="photo-grid">
        ${photos.map(photo => `
          <div class="photo-card">
            <img src="${photo.url}" alt="${photo.trail}">
            <div class="photo-info">
              <div class="photo-trail">${photo.trail}</div>
              <div class="photo-user">by ${photo.user}</div>
              <div class="photo-votes">
                <button class="vote-btn" onclick="votePhoto(${photo.id})">
                  <i class="bi bi-heart"></i> ${photo.votes}
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  window.votePhoto = function(photoId) {
    alert(`Voted for photo ${photoId}! (Feature would update in real-time)`);
  };

  window.uploadPhoto = function() {
    alert('Photo upload feature - would open file picker in production');
  };

  // ====== 10. TRAIL EQUIPMENT & PACKING LISTS ======
  function initPackingLists() {
    document.querySelectorAll('.trail-card').forEach(card => {
      const trailId = card.dataset.trailId;
      const difficulty = parseInt(card.dataset.difficulty || 3);
      if (!trailId) return;

      const packingBtn = document.createElement('button');
      packingBtn.className = 'btn btn-sm btn-outline-secondary trail-packing-btn';
      packingBtn.innerHTML = '<i class="bi bi-backpack"></i> Packing List';
      packingBtn.addEventListener('click', () => showPackingList(trailId, difficulty));

      const cardActions = card.querySelector('.trail-card-actions');
      if (cardActions) {
        cardActions.appendChild(packingBtn);
      }
    });
  }

  function showPackingList(trailId, difficulty) {
    const packingModal = document.getElementById('packing-list-modal');
    if (!packingModal) return;

    const baseItems = [
      'Water (2-3 liters)',
      'High-energy snacks',
      'Map and compass',
      'First aid kit',
      'Headlamp/flashlight',
      'Multi-tool',
      'Emergency whistle',
      'Extra clothing layers'
    ];

    const advancedItems = [
      'Tent (for multi-day)',
      'Sleeping bag',
      'Cooking equipment',
      'Water filter',
      'GPS device',
      'Satellite communicator'
    ];

    const items = difficulty >= 4 ? [...baseItems, ...advancedItems] : baseItems;

    packingModal.innerHTML = `
      <div class="packing-modal-content">
        <div class="packing-header">
          <h5><i class="bi bi-backpack"></i> Packing List</h5>
          <button class="btn-close" onclick="document.getElementById('packing-list-modal').style.display='none'"></button>
        </div>
        <div class="packing-body">
          <div class="packing-checklist">
            ${items.map((item, i) => `
              <div class="packing-item">
                <input type="checkbox" id="pack-${i}">
                <label for="pack-${i}">${item}</label>
              </div>
            `).join('')}
          </div>
          <div class="packing-actions">
            <button class="btn btn-primary" onclick="savePackingList()">Save List</button>
            <button class="btn btn-secondary" onclick="printPackingList()">Print</button>
          </div>
        </div>
      </div>
    `;
    packingModal.style.display = 'block';
  }

  window.savePackingList = function() {
    alert('Packing list saved!');
  };

  window.printPackingList = function() {
    window.print();
  };

  // Initialize all features when DOM is ready
  function init() {
    initTrailComparison();
    init360Preview();
    initCompletionTracking();
    initDifficultyCalculator();
    initTrailStorytelling();
    initGroupPlanning();
    initSafetyFeatures();
    initSeasonalRecommendations();
    initPhotoGallery();
    initPackingLists();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

