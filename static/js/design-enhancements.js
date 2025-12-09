/**
 * Design Enhancements JavaScript
 * Implements all visual and UX improvements
 */

(function() {
  'use strict';

  // ====== 1. MICRO-INTERACTIONS AND HOVER EFFECTS ======
  function initMicroInteractions() {
    // Add ripple effect to buttons
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });

    // Add hover glow to cards
    document.querySelectorAll('.card, .event-card, .trail-card').forEach(card => {
      card.classList.add('hover-glow');
    });

    // Smooth hover animations for nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('mouseenter', function() {
        this.style.transition = 'transform 0.3s ease';
      });
    });
  }

  // ====== 2. SMOOTH PAGE TRANSITIONS ======
  function initPageTransitions() {
    // Add transition class to main content
    const main = document.querySelector('main');
    if (main) {
      main.classList.add('page-transition');
    }

    // Handle page navigation
    document.querySelectorAll('a[href^="/"]').forEach(link => {
      link.addEventListener('click', function(e) {
        if (this.hostname === window.location.hostname && !this.target) {
          const href = this.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
            // Add exit animation
            if (main) {
              main.classList.add('page-exit');
            }
          }
        }
      });
    });
  }

  // ====== 3. LOADING SKELETONS ======
  function initLoadingSkeletons() {
    // Replace spinners with skeletons
    document.querySelectorAll('.spinner-border, .spinner-grow').forEach(spinner => {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton skeleton-card';
      skeleton.innerHTML = `
        <div class="skeleton-title"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text" style="width: 60%;"></div>
      `;
      spinner.parentNode.replaceChild(skeleton, spinner);
    });

    // Show skeleton while loading
    window.showSkeleton = function(container) {
      if (!container) return;
      container.innerHTML = `
        <div class="skeleton-grid">
          ${Array(6).fill(0).map(() => `
            <div class="skeleton-card-item">
              <div class="skeleton-title"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-text"></div>
              <div class="skeleton-button" style="margin-top: 1rem;"></div>
            </div>
          `).join('')}
        </div>
      `;
    };

    window.hideSkeleton = function(container) {
      if (!container) return;
      const skeletons = container.querySelectorAll('.skeleton');
      skeletons.forEach(s => s.remove());
    };
  }

  // ====== 4. PARALLAX SCROLLING EFFECTS ======
  function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax-layer');
    
    if (parallaxElements.length === 0) return;

    let ticking = false;

    function updateParallax() {
      const scrolled = window.pageYOffset;
      
      parallaxElements.forEach((element, index) => {
        const speed = (index + 1) * 0.5;
        const yPos = -(scrolled * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    });
  }

  // Add parallax to hero sections
  function initHeroParallax() {
    const heroSections = document.querySelectorAll('.hero-section, .hero-parallax');
    heroSections.forEach(hero => {
      hero.classList.add('hero-parallax');
    });
  }

  // ====== 5. ANIMATED ICONS AND ILLUSTRATIONS ======
  function initAnimatedIcons() {
    // Add bounce animation to important icons
    document.querySelectorAll('.bi-star-fill, .bi-heart-fill').forEach(icon => {
      icon.classList.add('icon-bounce');
    });

    // Add pulse to notification icons
    document.querySelectorAll('.bi-bell, .bi-bell-fill').forEach(icon => {
      icon.classList.add('icon-pulse');
    });

    // Add rotate to loading icons
    document.querySelectorAll('.bi-arrow-repeat, .bi-arrow-clockwise').forEach(icon => {
      icon.classList.add('icon-rotate');
    });

    // Animate illustrations on scroll
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('float');
            observer.unobserve(entry.target);
          }
        });
      });

      document.querySelectorAll('.illustration, .empty-state-icon').forEach(el => {
        observer.observe(el);
      });
    }
  }

  // ====== 6. CONTEXTUAL HELP TOOLTIPS ======
  function initTooltips() {
    // Create tooltip system
    document.querySelectorAll('[data-tooltip]').forEach(element => {
      const tooltipText = element.getAttribute('data-tooltip');
      const position = element.getAttribute('data-tooltip-position') || 'top';
      
      const tooltip = document.createElement('div');
      tooltip.className = `tooltip tooltip-${position}`;
      tooltip.textContent = tooltipText;
      
      const container = document.createElement('div');
      container.className = 'tooltip-container';
      element.parentNode.insertBefore(container, element);
      container.appendChild(element);
      container.appendChild(tooltip);

      element.addEventListener('mouseenter', () => {
        tooltip.classList.add('show');
      });

      element.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
      });
    });

    // Add help icons with tooltips
    document.querySelectorAll('[data-help]').forEach(element => {
      const helpText = element.getAttribute('data-help');
      const helpIcon = document.createElement('span');
      helpIcon.className = 'help-icon';
      helpIcon.setAttribute('data-tooltip', helpText);
      helpIcon.setAttribute('data-tooltip-position', 'right');
      helpIcon.textContent = '?';
      element.appendChild(helpIcon);
    });
  }

  // ====== 7. ONBOARDING TOUR ======
  const tour = {
    steps: [],
    currentStep: 0,
    overlay: null,

    init() {
      // Check if user has seen tour
      if (localStorage.getItem('tour-completed') === 'true') {
        return;
      }

      // Define tour steps
      this.steps = [
        {
          element: '.navbar-brand',
          title: 'Welcome to World Walking Events!',
          description: 'This is your home base. Click here anytime to return to the homepage.',
          position: 'bottom'
        },
        {
          element: '#smart-search, #global-search',
          title: 'Global Search',
          description: 'Search for events, trails, and locations worldwide. Try voice search too!',
          position: 'bottom'
        },
        {
          element: '#theme-toggle',
          title: 'Customize Your Experience',
          description: 'Change themes, switch languages, and adjust accessibility settings.',
          position: 'left'
        },
        {
          element: '.accessibility-toggle, .language-switcher',
          title: 'Accessibility Options',
          description: 'Adjust font size, contrast, and other accessibility features here.',
          position: 'left'
        }
      ];

      // Show tour after a delay
      setTimeout(() => {
        if (this.steps.length > 0) {
          this.show();
        }
      }, 2000);
    },

    show() {
      if (this.currentStep >= this.steps.length) {
        this.complete();
        return;
      }

      const step = this.steps[this.currentStep];
      // Handle multiple selectors (comma-separated)
      const selectors = step.element.split(',').map(s => s.trim());
      let element = null;
      for (const selector of selectors) {
        element = document.querySelector(selector);
        if (element) break;
      }
      
      if (!element) {
        this.currentStep++;
        this.show();
        return;
      }

      // Create overlay
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        document.body.appendChild(this.overlay);
      }

      // Highlight element
      element.classList.add('tour-highlight');
      const rect = element.getBoundingClientRect();

      // Create popup - ALWAYS position in top-right corner for consistency
      const popup = document.createElement('div');
      popup.className = 'tour-popup';
      // Fixed position: top-right corner, always visible
      popup.style.top = '80px';
      popup.style.right = '20px';
      popup.style.left = 'auto';
      popup.style.maxWidth = '400px';
      
      // Get translations if available
      const currentLang = window.i18n?.currentLanguage || 'en';
      const translations = window.i18n?.translations?.[currentLang] || {};
      
      popup.innerHTML = `
        <div class="tour-progress">${this.currentStep + 1} / ${this.steps.length}</div>
        <h5 data-i18n-tour="tour-step-${this.currentStep}-title">${step.title}</h5>
        <p data-i18n-tour="tour-step-${this.currentStep}-desc">${step.description}</p>
        <div class="tour-navigation">
          <button class="btn btn-sm btn-outline-secondary" onclick="tour.skip()" data-i18n="skip-tour">Skip Tour</button>
          <div>
            ${this.currentStep > 0 ? '<button class="btn btn-sm btn-outline-primary" onclick="tour.prev()" data-i18n="previous">Previous</button>' : ''}
            <button class="btn btn-sm btn-primary" onclick="tour.next()" data-i18n="next">Next</button>
          </div>
        </div>
      `;
      
      // Translate tour popup if i18n is available
      if (window.i18n && window.i18n.translatePage) {
        setTimeout(() => {
          window.i18n.translatePage(currentLang);
        }, 100);
      }

      document.body.appendChild(popup);
      this.currentPopup = popup;
    },

    next() {
      this.cleanup();
      this.currentStep++;
      this.show();
    },

    prev() {
      this.cleanup();
      this.currentStep--;
      this.show();
    },

    skip() {
      this.complete();
    },

    cleanup() {
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
      if (this.currentPopup) {
        this.currentPopup.remove();
      }
    },

    complete() {
      this.cleanup();
      if (this.overlay) {
        this.overlay.remove();
      }
      localStorage.setItem('tour-completed', 'true');
    }
  };

  window.tour = tour;

  // ====== 8. EMPTY STATE ILLUSTRATIONS ======
  function initEmptyStates() {
    // Auto-detect empty states and add illustrations
    document.querySelectorAll('.events-grid, .trails-grid').forEach(container => {
      if (container.children.length === 0 || 
          (container.children.length === 1 && container.querySelector('.text-center'))) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
          <div class="empty-state-icon">
            <i class="bi bi-inbox"></i>
          </div>
          <h3 class="empty-state-title" data-i18n="no-items-found">No items found</h3>
          <p class="empty-state-description" data-i18n="try-adjusting-filters">Try adjusting your filters or search terms to find what you're looking for.</p>
          <div class="empty-state-action">
            <button class="btn btn-primary" onclick="window.location.href='/'" data-i18n="explore-home">Explore Home</button>
          </div>
        `;
        container.appendChild(emptyState);
      }
    });
  }

  // ====== 9. ERROR STATE HANDLING ======
  function initErrorHandling() {
    window.showError = function(message, details = null) {
      const errorToast = document.createElement('div');
      errorToast.className = 'error-toast';
      errorToast.innerHTML = `
        <div>
          <strong>Error</strong>
          <div>${message}</div>
          ${details ? `<div class="error-details" style="margin-top: 0.5rem; font-size: 0.75rem;">${details}</div>` : ''}
        </div>
        <button class="error-toast-close" onclick="this.parentElement.remove()">&times;</button>
      `;
      document.body.appendChild(errorToast);
      
      setTimeout(() => {
        errorToast.style.animation = 'slide-in-right 0.3s ease-out reverse';
        setTimeout(() => errorToast.remove(), 300);
      }, 5000);
    };

    // Global error handler
    window.addEventListener('error', (e) => {
      console.error('Global error:', e.error);
      // Don't show every error to user, only important ones
    });

    // Handle fetch errors
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      return originalFetch.apply(this, args)
        .catch(error => {
          if (!error.handled) {
            showError('Network error. Please check your connection.', error.message);
            error.handled = true;
          }
          throw error;
        });
    };
  }

  // ====== 10. SUCCESS ANIMATIONS AND FEEDBACK ======
  function initSuccessAnimations() {
    window.showSuccess = function(message, showConfetti = false) {
      const successToast = document.createElement('div');
      successToast.className = 'success-toast';
      successToast.innerHTML = `
        <div class="success-toast-icon">
          <i class="bi bi-check-circle-fill"></i>
        </div>
        <div>
          <strong>Success!</strong>
          <div>${message}</div>
        </div>
        <button class="error-toast-close" onclick="this.parentElement.remove()" style="color: white;">&times;</button>
      `;
      document.body.appendChild(successToast);
      
      if (showConfetti) {
        createConfetti();
      }

      setTimeout(() => {
        successToast.style.animation = 'slide-in-right 0.3s ease-out reverse';
        setTimeout(() => successToast.remove(), 300);
      }, 3000);
    };

    window.showProgress = function(message, progress = 0) {
      let progressToast = document.getElementById('progress-toast');
      if (!progressToast) {
        progressToast = document.createElement('div');
        progressToast.id = 'progress-toast';
        progressToast.className = 'progress-feedback';
        document.body.appendChild(progressToast);
      }

      progressToast.innerHTML = `
        <div>${message}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      `;

      if (progress >= 100) {
        setTimeout(() => {
          progressToast.style.animation = 'slide-in-up 0.3s ease-out reverse';
          setTimeout(() => progressToast.remove(), 300);
        }, 1000);
      }
    };

    function createConfetti() {
      const confettiContainer = document.createElement('div');
      confettiContainer.className = 'confetti';
      document.body.appendChild(confettiContainer);

      const colors = ['#0dcaf0', '#28a745', '#ffc107', '#dc3545', '#6f42c1'];
      for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 3 + 's';
        piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confettiContainer.appendChild(piece);
      }

      setTimeout(() => confettiContainer.remove(), 5000);
    }
  }

  // Initialize all enhancements
  function init() {
    initMicroInteractions();
    initPageTransitions();
    initLoadingSkeletons();
    initParallax();
    initHeroParallax();
    initAnimatedIcons();
    initTooltips();
    tour.init();
    initEmptyStates();
    initErrorHandling();
    initSuccessAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

