/**
 * Cross-Page Features
 * Features that apply to all pages across the application
 */

(function() {
  'use strict';

  // ====== 1. DARK MODE TOGGLE WITH SMOOTH TRANSITIONS ======
  const darkMode = {
    init() {
      this.detectSystemPreference();
      this.createToggle();
      this.loadSavedTheme();
      this.applyTheme();
    },

    detectSystemPreference() {
      if (!localStorage.getItem('theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
      }
    },

    createToggle() {
      const navbar = document.querySelector('.navbar');
      if (!navbar) return;

      const toggle = document.createElement('div');
      toggle.className = 'theme-toggle-container';
      toggle.innerHTML = `
        <button id="theme-toggle" class="btn btn-sm btn-outline-light" title="Toggle theme">
          <i class="bi bi-moon-fill" id="theme-icon"></i>
        </button>
        <div class="theme-menu">
          <button class="theme-option" data-theme="light">
            <i class="bi bi-sun"></i> Light
          </button>
          <button class="theme-option" data-theme="dark">
            <i class="bi bi-moon"></i> Dark
          </button>
          <button class="theme-option" data-theme="sunset">
            <i class="bi bi-sunset"></i> Sunset
          </button>
          <button class="theme-option" data-theme="ocean">
            <i class="bi bi-water"></i> Ocean
          </button>
          <button class="theme-option" data-theme="forest">
            <i class="bi bi-tree"></i> Forest
          </button>
          <button class="theme-option" data-theme="high-contrast">
            <i class="bi bi-circle-half"></i> High Contrast
          </button>
        </div>
      `;

      const navCollapse = navbar.querySelector('.collapse');
      if (navCollapse) {
        navCollapse.appendChild(toggle);
      }

      document.getElementById('theme-toggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle.querySelector('.theme-menu').classList.toggle('show');
      });

      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          this.setTheme(theme);
          toggle.querySelector('.theme-menu').classList.remove('show');
        });
      });

      document.addEventListener('click', () => {
        toggle.querySelector('.theme-menu')?.classList.remove('show');
      });
    },

    loadSavedTheme() {
      const saved = localStorage.getItem('theme') || 'light';
      this.setTheme(saved);
      this.applyTheme(saved);
    },

    setTheme(theme) {
      localStorage.setItem('theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      // Apply theme to all pages
      this.applyTheme(theme);
      this.updateIcon(theme);
    },
    
    applyTheme(theme) {
      // Force apply theme CSS variables
      const root = document.documentElement;
      const themes = {
        light: {
          '--bg-primary': '#ffffff',
          '--bg-secondary': '#f8f9fa',
          '--text-primary': '#212529',
          '--text-secondary': '#6c757d',
          '--border-color': '#dee2e6',
          '--accent': '#0dcaf0'
        },
        dark: {
          '--bg-primary': '#1a1a1a',
          '--bg-secondary': '#2d2d2d',
          '--text-primary': '#ffffff',
          '--text-secondary': '#b0b0b0',
          '--border-color': '#404040',
          '--accent': '#0dcaf0'
        },
        sunset: {
          '--bg-primary': '#fff5e6',
          '--bg-secondary': '#ffe6cc',
          '--text-primary': '#4a2c1a',
          '--text-secondary': '#8b6f47',
          '--border-color': '#ffcc99',
          '--accent': '#ff6b35'
        },
        ocean: {
          '--bg-primary': '#e6f3ff',
          '--bg-secondary': '#cce6ff',
          '--text-primary': '#003366',
          '--text-secondary': '#0066cc',
          '--border-color': '#99ccff',
          '--accent': '#0066cc'
        },
        forest: {
          '--bg-primary': '#e6f5e6',
          '--bg-secondary': '#ccf2cc',
          '--text-primary': '#1a4d1a',
          '--text-secondary': '#2d7a2d',
          '--border-color': '#99e699',
          '--accent': '#2d7a2d'
        },
        'high-contrast': {
          '--bg-primary': '#000000',
          '--bg-secondary': '#ffffff',
          '--text-primary': '#ffffff',
          '--text-secondary': '#ffffff',
          '--border-color': '#ffffff',
          '--accent': '#ffff00'
        }
      };
      
      const themeVars = themes[theme] || themes.light;
      Object.entries(themeVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
    },

    updateIcon(theme) {
      const icon = document.getElementById('theme-icon');
      if (!icon) return;

      const icons = {
        light: 'bi-sun-fill',
        dark: 'bi-moon-fill',
        sunset: 'bi-sunset-fill',
        ocean: 'bi-water',
        forest: 'bi-tree-fill',
        'high-contrast': 'bi-circle-half'
      };
      icon.className = `bi ${icons[theme] || icons.dark}`;
    },

    applyTheme() {
      const theme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      this.updateIcon(theme);
    }
  };

  // ====== 2. MULTI-LANGUAGE SUPPORT WITH AUTO-DETECTION ======
  const i18n = {
    languages: {
      en: { name: 'English', rtl: false },
      es: { name: 'Español', rtl: false },
      fr: { name: 'Français', rtl: false },
      de: { name: 'Deutsch', rtl: false },
      it: { name: 'Italiano', rtl: false },
      pt: { name: 'Português', rtl: false },
      zh: { name: '中文', rtl: false },
      ja: { name: '日本語', rtl: false },
      ar: { name: 'العربية', rtl: true },
      he: { name: 'עברית', rtl: true }
    },

    translations: {
      en: {
        home: 'Home',
        map: 'World Map',
        trails: 'Trails',
        events: 'Events',
        api: 'API',
        search: 'Search',
        language: 'Language',
        'discover-events': 'Discover Walking Events & Trails Worldwide',
        'explore-subtitle': 'Explore famous marathons, cultural festivals, and legendary walking trails from around the globe.',
        'explore-map': 'Explore World Map',
        'browse-trails': 'Browse Trails',
        'view-events': 'View Events',
        'walking-events': 'Walking Events Worldwide',
        'discover-subtitle': 'Discover marathons, festivals, and cultural events from around the globe',
        'walking-trails': 'Walking Trails & Routes',
        'discover-trails': 'Discover famous walking trails and routes from around the world',
        'view-on-map': 'View on Map',
        'price-comparison': 'Price Comparison',
        'analytics': 'Analytics',
        'calendar-view': 'Calendar View',
        'my-itinerary': 'My Itinerary',
        'nearby': 'Nearby',
        'along-route': 'Along route',
        'advanced-filters': 'Advanced Filters',
        'map-layers': 'Map Layers',
        'advanced-features': 'Advanced Features',
        'points-of-interest': 'Show Points of Interest',
        'enable-clustering': 'Enable Marker Clustering',
        'category': 'Category',
        'status': 'Status',
        'all-categories': 'All Categories',
        'all-status': 'All Status',
        'active': 'Active',
        'upcoming': 'Upcoming Only',
        'today': 'Today Only',
        'events': 'Events',
        'routes': 'Routes',
        'categories': 'Categories',
        'regions': 'Regions',
        'next-major-event': 'Next Major Event',
        'explore-the-world': 'Explore the World',
        'globe-description': 'Hover over countries to see event density. Click to explore that region on the map.',
        'current-weather': 'Current Weather',
        'events-you-might-like': 'Events You Might Like',
        'upcoming-events': 'Upcoming Events',
        'view-on-map': 'View on Map',
        'view-all-events': 'View All Events',
        'famous-walking-trails': 'Famous Walking Trails',
        'view-trail': 'View Trail',
        'explore-all-trails': 'Explore All Trails',
        'what-our-users-say': 'What Our Users Say',
        'your-achievements': 'Your Achievements',
        'live-activity-feed': 'Live Activity Feed',
        'live-activity-description': 'See what\'s happening right now in the community',
        'events-by-category': 'Events by Category',
        'event': 'event',
        'events-plural': 'events',
        'global-coverage': 'Global Coverage',
        'global-coverage-desc': 'Events and trails from every continent. Explore famous marathons, cultural festivals, and legendary walking routes worldwide.',
        'spatial-queries': 'Advanced Spatial Queries',
        'spatial-queries-desc': 'Powerful spatial queries let you find events by location, distance, routes, and custom areas. Powered by PostGIS.',
        'progressive-web-app': 'Progressive Web App',
        'progressive-web-app-desc': 'Progressive Web App that works offline. Install on your device and explore events even without internet.',
        'days': 'Days',
        'hours': 'Hours',
        'min': 'Min',
        'sec': 'Sec',
        'event-started': 'Event Started!',
        'no-recommendations': 'No recommendations available at this time.',
        'view': 'View',
        'perfect-for-walking': 'Perfect for walking',
        'your-location': 'Your Location',
        'enable-location-for-weather': 'Enable location for weather',
        'search-placeholder': 'Search events, trails, or locations...',
        'interactive-maps': 'Interactive Maps',
        'works-offline': 'Works Offline',
        'event-calendar': 'Event Calendar',
        'month': 'Month',
        'week': 'Week',
        'day': 'Day',
        'list': 'List',
        'filter-by-category': 'Filter by Category',
        'filter-by-status': 'Filter by Status',
        'no-description': 'No description available.',
        'no-events-found': 'No events found. Try adjusting your filters.',
        'update-available': 'Update available! A new version of the app is ready.',
        'update-now': 'Update Now',
        'install-app': 'Install App',
        'install-app-desc': 'Add to home screen for quick access',
        'install': 'Install',
        'compare': 'Compare',
        'difficulty-calculator': 'Difficulty Calculator',
        'group-planning': 'Group Planning',
        'photo-gallery': 'Photo Gallery',
        'trail-difficulty-calculator': 'Trail Difficulty Calculator',
        'find-trails-match': 'Find trails that match your fitness level',
        'fitness-level': 'Fitness Level',
        'beginner': 'Beginner',
        'novice': 'Novice',
        'intermediate': 'Intermediate',
        'advanced': 'Advanced',
        'expert': 'Expert',
        'hiking-experience': 'Hiking Experience',
        'first-time': 'First time',
        'a-few-hikes': 'A few hikes',
        'regular-hiker': 'Regular hiker',
        'experienced': 'Experienced',
        'professional': 'Professional',
        'age': 'Age',
        'health-conditions': 'I have health conditions that may affect hiking',
        'calculate': 'Calculate',
        'create-trail-group': 'Create Trail Group',
        'group-name': 'Group Name',
        'my-trail-group': 'My Trail Group',
        'select-trail': 'Select Trail',
        'choose-trail': 'Choose a trail...',
        'date': 'Date',
        'invite-members': 'Invite Members (comma-separated emails)',
        'create-group': 'Create Group',
        'trails': 'Trails',
        'latitude': 'Latitude',
        'longitude': 'Longitude',
        'radius-m': 'Radius (m)',
        'find-nearby': 'Find nearby',
        'reset': 'Reset',
        'route': 'Route',
        'buffer-m': 'Buffer (m)',
        'events-along-route': 'Events along route',
        'switch-to-3d': 'Switch to 3D',
        'ar-trail-finder': 'AR Trail Finder',
        'weather-overlay': 'Weather Overlay',
        'difficulty-heat-map': 'Difficulty Heat Map',
        'custom-markers': 'Custom Markers',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Offline Download',
        'multi-layer-comparison': 'Multi-Layer Comparison',
        'start-route-planning': 'Start Route Planning',
        'live-trail-conditions': 'Live Trail Conditions',
        'world-walking-events': 'World Walking Events',
        'app-title': 'World Walking Events',
        'app-description': 'Find events, routes, and trails worldwide',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'No items found',
        'try-adjusting-filters': 'Try adjusting your filters or search terms to find what you\'re looking for.',
        'explore-home': 'Explore Home',
        'skip-tour': 'Skip Tour',
        'previous': 'Previous',
        'next': 'Next',
        'tour-step-0-title': 'Welcome to World Walking Events!',
        'tour-step-0-desc': 'This is your home base. Click here anytime to return to the homepage.',
        'tour-step-1-title': 'Global Search',
        'tour-step-1-desc': 'Search for events, trails, and locations worldwide. Try voice search too!',
        'tour-step-2-title': 'Customize Your Experience',
        'tour-step-2-desc': 'Change themes, switch languages, and adjust accessibility settings.',
        'tour-step-3-title': 'Accessibility Options',
        'tour-step-3-desc': 'Adjust font size, contrast, and other accessibility features here.',
        'compare-trails': 'Compare Trails',
        'compare-count': '(0/3)',
        'easy': 'Easy',
        'moderate': 'Moderate',
        'hard': 'Hard',
        'expert-difficulty': 'Expert',
        'no-trails-found': 'No trails found. Try adjusting your filters.'
      },
      es: {
        home: 'Inicio',
        map: 'Mapa Mundial',
        trails: 'Senderos',
        events: 'Eventos',
        api: 'API',
        search: 'Buscar',
        language: 'Idioma',
        'discover-events': 'Descubre Eventos y Senderos para Caminar en Todo el Mundo',
        'explore-subtitle': 'Explora maratones famosos, festivales culturales y senderos legendarios de todo el mundo.',
        'explore-map': 'Explorar Mapa Mundial',
        'browse-trails': 'Explorar Senderos',
        'view-events': 'Ver Eventos',
        'walking-events': 'Eventos para Caminar en Todo el Mundo',
        'discover-subtitle': 'Descubre maratones, festivales y eventos culturales de todo el mundo',
        'walking-trails': 'Senderos y Rutas para Caminar',
        'discover-trails': 'Descubre famosos senderos y rutas para caminar de todo el mundo',
        'view-on-map': 'Ver en Mapa',
        'price-comparison': 'Comparación de Precios',
        'analytics': 'Análisis',
        'calendar-view': 'Vista de Calendario',
        'my-itinerary': 'Mi Itinerario',
        'nearby': 'Cercano',
        'along-route': 'A lo largo de la ruta',
        'advanced-filters': 'Filtros Avanzados',
        'map-layers': 'Capas del Mapa',
        'advanced-features': 'Características Avanzadas',
        'points-of-interest': 'Mostrar Puntos de Interés',
        'enable-clustering': 'Habilitar Agrupación de Marcadores',
        'category': 'Categoría',
        'status': 'Estado',
        'all-categories': 'Todas las Categorías',
        'all-status': 'Todos los Estados',
        'active': 'Activo',
        'upcoming': 'Próximos',
        'today': 'Solo Hoy',
        'events': 'Eventos',
        'routes': 'Rutas',
        'categories': 'Categorías',
        'regions': 'Regiones',
        'next-major-event': 'Próximo Evento Principal',
        'explore-the-world': 'Explora el Mundo',
        'globe-description': 'Pasa el mouse sobre los países para ver la densidad de eventos. Haz clic para explorar esa región en el mapa.',
        'current-weather': 'Clima Actual',
        'events-you-might-like': 'Eventos que Te Podrían Gustar',
        'upcoming-events': 'Próximos Eventos',
        'view-all-events': 'Ver Todos los Eventos',
        'famous-walking-trails': 'Senderos Famosos para Caminar',
        'view-trail': 'Ver Sendero',
        'explore-all-trails': 'Explorar Todos los Senderos',
        'what-our-users-say': 'Lo que Dicen Nuestros Usuarios',
        'your-achievements': 'Tus Logros',
        'live-activity-feed': 'Feed de Actividad en Vivo',
        'live-activity-description': 'Ve lo que está pasando ahora mismo en la comunidad',
        'events-by-category': 'Eventos por Categoría',
        'event': 'evento',
        'events-plural': 'eventos',
        'global-coverage': 'Cobertura Global',
        'global-coverage-desc': 'Eventos y senderos de todos los continentes. Explora maratones famosos, festivales culturales y rutas legendarias para caminar en todo el mundo.',
        'spatial-queries': 'Consultas Espaciales Avanzadas',
        'spatial-queries-desc': 'Consultas espaciales poderosas te permiten encontrar eventos por ubicación, distancia, rutas y áreas personalizadas. Potenciado por PostGIS.',
        'progressive-web-app': 'Aplicación Web Progresiva',
        'progressive-web-app-desc': 'Aplicación Web Progresiva que funciona sin conexión. Instala en tu dispositivo y explora eventos incluso sin internet.',
        'days': 'Días',
        'hours': 'Horas',
        'min': 'Min',
        'sec': 'Seg',
        'event-started': '¡Evento Iniciado!',
        'no-recommendations': 'No hay recomendaciones disponibles en este momento.',
        'view': 'Ver',
        'perfect-for-walking': 'Perfecto para caminar',
        'your-location': 'Tu Ubicación',
        'enable-location-for-weather': 'Habilita la ubicación para el clima',
        'search-placeholder': 'Buscar eventos, senderos o ubicaciones...',
        'interactive-maps': 'Mapas Interactivos',
        'works-offline': 'Funciona Sin Conexión',
        'event-calendar': 'Calendario de Eventos',
        'month': 'Mes',
        'week': 'Semana',
        'day': 'Día',
        'list': 'Lista',
        'filter-by-category': 'Filtrar por Categoría',
        'filter-by-status': 'Filtrar por Estado',
        'no-description': 'No hay descripción disponible.',
        'no-events-found': 'No se encontraron eventos. Intenta ajustar tus filtros.',
        'update-available': '¡Actualización disponible! Una nueva versión de la aplicación está lista.',
        'update-now': 'Actualizar Ahora',
        'install-app': 'Instalar Aplicación',
        'install-app-desc': 'Agregar a la pantalla de inicio para acceso rápido',
        'install': 'Instalar',
        'compare': 'Comparar',
        'difficulty-calculator': 'Calculadora de Dificultad',
        'group-planning': 'Planificación de Grupo',
        'photo-gallery': 'Galería de Fotos',
        'trail-difficulty-calculator': 'Calculadora de Dificultad de Sendero',
        'find-trails-match': 'Encuentra senderos que coincidan con tu nivel de condición física',
        'fitness-level': 'Nivel de Condición Física',
        'beginner': 'Principiante',
        'novice': 'Novato',
        'intermediate': 'Intermedio',
        'advanced': 'Avanzado',
        'expert': 'Experto',
        'hiking-experience': 'Experiencia en Senderismo',
        'first-time': 'Primera vez',
        'a-few-hikes': 'Algunas caminatas',
        'regular-hiker': 'Senderista regular',
        'experienced': 'Experimentado',
        'professional': 'Profesional',
        'age': 'Edad',
        'health-conditions': 'Tengo condiciones de salud que pueden afectar el senderismo',
        'calculate': 'Calcular',
        'create-trail-group': 'Crear Grupo de Sendero',
        'group-name': 'Nombre del Grupo',
        'my-trail-group': 'Mi Grupo de Sendero',
        'select-trail': 'Seleccionar Sendero',
        'choose-trail': 'Elige un sendero...',
        'date': 'Fecha',
        'invite-members': 'Invitar Miembros (correos separados por comas)',
        'create-group': 'Crear Grupo',
        'trails': 'Senderos',
        'latitude': 'Latitud',
        'longitude': 'Longitud',
        'radius-m': 'Radio (m)',
        'find-nearby': 'Buscar cerca',
        'reset': 'Restablecer',
        'route': 'Ruta',
        'buffer-m': 'Búfer (m)',
        'events-along-route': 'Eventos a lo largo de la ruta',
        'switch-to-3d': 'Cambiar a 3D',
        'ar-trail-finder': 'Buscador de Senderos AR',
        'weather-overlay': 'Superposición del Clima',
        'difficulty-heat-map': 'Mapa de Calor de Dificultad',
        'custom-markers': 'Marcadores Personalizados',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Descarga Sin Conexión',
        'multi-layer-comparison': 'Comparación de Múltiples Capas',
        'start-route-planning': 'Iniciar Planificación de Ruta',
        'live-trail-conditions': 'Condiciones de Sendero en Vivo',
        'world-walking-events': 'Eventos para Caminar en el Mundo',
        'app-title': 'Eventos para Caminar en el Mundo',
        'app-description': 'Encuentra eventos, rutas y senderos en todo el mundo',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'No se encontraron elementos',
        'try-adjusting-filters': 'Intenta ajustar tus filtros o términos de búsqueda para encontrar lo que buscas.',
        'explore-home': 'Explorar Inicio',
        'skip-tour': 'Saltar Tour',
        'previous': 'Anterior',
        'next': 'Siguiente',
        'tour-step-0-title': '¡Bienvenido a Eventos para Caminar en el Mundo!',
        'tour-step-0-desc': 'Esta es tu base de inicio. Haz clic aquí en cualquier momento para volver a la página de inicio.',
        'tour-step-1-title': 'Búsqueda Global',
        'tour-step-1-desc': 'Busca eventos, senderos y ubicaciones en todo el mundo. ¡Prueba también la búsqueda por voz!',
        'tour-step-2-title': 'Personaliza Tu Experiencia',
        'tour-step-2-desc': 'Cambia temas, cambia idiomas y ajusta la configuración de accesibilidad.',
        'tour-step-3-title': 'Opciones de Accesibilidad',
        'tour-step-3-desc': 'Ajusta el tamaño de fuente, el contraste y otras funciones de accesibilidad aquí.',
        'compare-trails': 'Comparar Senderos',
        'compare-count': '(0/3)',
        'easy': 'Fácil',
        'moderate': 'Moderado',
        'hard': 'Difícil',
        'expert-difficulty': 'Experto',
        'no-trails-found': 'No se encontraron senderos. Intenta ajustar tus filtros.'
      },
      fr: {
        home: 'Accueil',
        map: 'Carte du Monde',
        trails: 'Sentiers',
        events: 'Événements',
        api: 'API',
        search: 'Rechercher',
        language: 'Langue',
        'discover-events': 'Découvrez les Événements et Sentiers de Marche dans le Monde',
        'explore-subtitle': 'Explorez des marathons célèbres, des festivals culturels et des sentiers légendaires du monde entier.',
        'explore-map': 'Explorer la Carte du Monde',
        'browse-trails': 'Parcourir les Sentiers',
        'view-events': 'Voir les Événements',
        'walking-events': 'Événements de Marche dans le Monde',
        'discover-subtitle': 'Découvrez des marathons, festivals et événements culturels du monde entier',
        'walking-trails': 'Sentiers et Itinéraires de Marche',
        'discover-trails': 'Découvrez de célèbres sentiers et itinéraires de marche du monde entier',
        'view-on-map': 'Voir sur la Carte',
        'price-comparison': 'Comparaison des Prix',
        'analytics': 'Analyses',
        'calendar-view': 'Vue Calendrier',
        'my-itinerary': 'Mon Itinéraire',
        'nearby': 'À Proximité',
        'along-route': 'Le Long de la Route',
        'advanced-filters': 'Filtres Avancés',
        'map-layers': 'Couches de Carte',
        'advanced-features': 'Fonctionnalités Avancées',
        'points-of-interest': 'Afficher les Points d\'Intérêt',
        'enable-clustering': 'Activer le Regroupement de Marqueurs',
        'category': 'Catégorie',
        'status': 'Statut',
        'all-categories': 'Toutes les Catégories',
        'all-status': 'Tous les Statuts',
        'active': 'Actif',
        'upcoming': 'À Venir',
        'today': 'Aujourd\'hui Seulement',
        'events': 'Événements',
        'routes': 'Itinéraires',
        'categories': 'Catégories',
        'regions': 'Régions',
        'next-major-event': 'Prochain Événement Principal',
        'explore-the-world': 'Explorer le Monde',
        'globe-description': 'Survolez les pays pour voir la densité des événements. Cliquez pour explorer cette région sur la carte.',
        'current-weather': 'Météo Actuelle',
        'events-you-might-like': 'Événements que Vous Pourriez Aimer',
        'upcoming-events': 'Événements à Venir',
        'view-all-events': 'Voir Tous les Événements',
        'famous-walking-trails': 'Sentiers de Marche Célèbres',
        'view-trail': 'Voir le Sentier',
        'explore-all-trails': 'Explorer Tous les Sentiers',
        'what-our-users-say': 'Ce que Disent Nos Utilisateurs',
        'your-achievements': 'Vos Réalisations',
        'live-activity-feed': 'Flux d\'Activité en Direct',
        'live-activity-description': 'Voyez ce qui se passe en ce moment dans la communauté',
        'events-by-category': 'Événements par Catégorie',
        'event': 'événement',
        'events-plural': 'événements',
        'global-coverage': 'Couverture Mondiale',
        'global-coverage-desc': 'Événements et sentiers de tous les continents. Explorez des marathons célèbres, des festivals culturels et des routes de marche légendaires dans le monde entier.',
        'spatial-queries': 'Requêtes Spatiales Avancées',
        'spatial-queries-desc': 'Des requêtes spatiales puissantes vous permettent de trouver des événements par emplacement, distance, routes et zones personnalisées. Alimenté par PostGIS.',
        'progressive-web-app': 'Application Web Progressive',
        'progressive-web-app-desc': 'Application Web Progressive qui fonctionne hors ligne. Installez sur votre appareil et explorez les événements même sans internet.',
        'days': 'Jours',
        'hours': 'Heures',
        'min': 'Min',
        'sec': 'Sec',
        'event-started': 'Événement Démarré!',
        'no-recommendations': 'Aucune recommandation disponible pour le moment.',
        'view': 'Voir',
        'perfect-for-walking': 'Parfait pour la marche',
        'your-location': 'Votre Emplacement',
        'enable-location-for-weather': 'Activez l\'emplacement pour la météo',
        'search-placeholder': 'Rechercher des événements, sentiers ou emplacements...',
        'interactive-maps': 'Cartes Interactives',
        'works-offline': 'Fonctionne Hors Ligne',
        'event-calendar': 'Calendrier des Événements',
        'month': 'Mois',
        'week': 'Semaine',
        'day': 'Jour',
        'list': 'Liste',
        'filter-by-category': 'Filtrer par Catégorie',
        'filter-by-status': 'Filtrer par Statut',
        'no-description': 'Aucune description disponible.',
        'no-events-found': 'Aucun événement trouvé. Essayez d\'ajuster vos filtres.',
        'update-available': 'Mise à jour disponible! Une nouvelle version de l\'application est prête.',
        'update-now': 'Mettre à Jour Maintenant',
        'install-app': 'Installer l\'Application',
        'install-app-desc': 'Ajouter à l\'écran d\'accueil pour un accès rapide',
        'install': 'Installer',
        'compare': 'Comparer',
        'difficulty-calculator': 'Calculateur de Difficulté',
        'group-planning': 'Planification de Groupe',
        'photo-gallery': 'Galerie de Photos',
        'trail-difficulty-calculator': 'Calculateur de Difficulté de Sentier',
        'find-trails-match': 'Trouvez des sentiers qui correspondent à votre niveau de forme physique',
        'fitness-level': 'Niveau de Forme Physique',
        'beginner': 'Débutant',
        'novice': 'Novice',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé',
        'expert': 'Expert',
        'hiking-experience': 'Expérience de Randonnée',
        'first-time': 'Première fois',
        'a-few-hikes': 'Quelques randonnées',
        'regular-hiker': 'Randonneur régulier',
        'experienced': 'Expérimenté',
        'professional': 'Professionnel',
        'age': 'Âge',
        'health-conditions': 'J\'ai des problèmes de santé qui peuvent affecter la randonnée',
        'calculate': 'Calculer',
        'create-trail-group': 'Créer un Groupe de Sentier',
        'group-name': 'Nom du Groupe',
        'my-trail-group': 'Mon Groupe de Sentier',
        'select-trail': 'Sélectionner un Sentier',
        'choose-trail': 'Choisissez un sentier...',
        'date': 'Date',
        'invite-members': 'Inviter des Membres (emails séparés par des virgules)',
        'create-group': 'Créer un Groupe',
        'trails': 'Sentiers',
        'latitude': 'Latitude',
        'longitude': 'Longitude',
        'radius-m': 'Rayon (m)',
        'find-nearby': 'Trouver à proximité',
        'reset': 'Réinitialiser',
        'route': 'Route',
        'buffer-m': 'Tampon (m)',
        'events-along-route': 'Événements le long de la route',
        'switch-to-3d': 'Passer en 3D',
        'ar-trail-finder': 'Trouveur de Sentier AR',
        'weather-overlay': 'Superposition Météo',
        'difficulty-heat-map': 'Carte de Chaleur de Difficulté',
        'custom-markers': 'Marqueurs Personnalisés',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Téléchargement Hors Ligne',
        'multi-layer-comparison': 'Comparaison Multi-Couches',
        'start-route-planning': 'Commencer la Planification de Route',
        'live-trail-conditions': 'Conditions de Sentier en Direct',
        'world-walking-events': 'Événements de Marche dans le Monde',
        'app-title': 'Événements de Marche dans le Monde',
        'app-description': 'Trouvez des événements, des itinéraires et des sentiers dans le monde entier',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'Aucun élément trouvé',
        'try-adjusting-filters': 'Essayez d\'ajuster vos filtres ou termes de recherche pour trouver ce que vous cherchez.',
        'explore-home': 'Explorer l\'Accueil',
        'skip-tour': 'Passer le Tour',
        'previous': 'Précédent',
        'next': 'Suivant',
        'tour-step-0-title': 'Bienvenue dans les Événements de Marche dans le Monde!',
        'tour-step-0-desc': 'C\'est votre base d\'accueil. Cliquez ici à tout moment pour revenir à la page d\'accueil.',
        'tour-step-1-title': 'Recherche Globale',
        'tour-step-1-desc': 'Recherchez des événements, des sentiers et des emplacements dans le monde entier. Essayez également la recherche vocale!',
        'tour-step-2-title': 'Personnalisez Votre Expérience',
        'tour-step-2-desc': 'Changez les thèmes, changez les langues et ajustez les paramètres d\'accessibilité.',
        'tour-step-3-title': 'Options d\'Accessibilité',
        'tour-step-3-desc': 'Ajustez la taille de la police, le contraste et d\'autres fonctionnalités d\'accessibilité ici.',
        'compare-trails': 'Comparer les Sentiers',
        'compare-count': '(0/3)',
        'easy': 'Facile',
        'moderate': 'Modéré',
        'hard': 'Difficile',
        'expert-difficulty': 'Expert',
        'no-trails-found': 'Aucun sentier trouvé. Essayez d\'ajuster vos filtres.'
      },
      de: {
        home: 'Startseite',
        map: 'Weltkarte',
        trails: 'Wanderwege',
        events: 'Veranstaltungen',
        api: 'API',
        search: 'Suchen',
        language: 'Sprache',
        'discover-events': 'Entdecken Sie Wanderveranstaltungen & Wege Weltweit',
        'explore-subtitle': 'Erkunden Sie berühmte Marathons, Kulturfestivals und legendäre Wanderwege aus aller Welt.',
        'explore-map': 'Weltkarte Erkunden',
        'browse-trails': 'Wege Durchsuchen',
        'view-events': 'Veranstaltungen Anzeigen',
        'walking-events': 'Wanderveranstaltungen Weltweit',
        'discover-subtitle': 'Entdecken Sie Marathons, Festivals und kulturelle Veranstaltungen aus aller Welt',
        'walking-trails': 'Wanderwege & Routen',
        'discover-trails': 'Entdecken Sie berühmte Wanderwege und Routen aus aller Welt',
        'view-on-map': 'Auf Karte Anzeigen',
        'price-comparison': 'Preisvergleich',
        'analytics': 'Analysen',
        'calendar-view': 'Kalenderansicht',
        'my-itinerary': 'Mein Reiseplan',
        'nearby': 'In der Nähe',
        'along-route': 'Entlang der Route',
        'advanced-filters': 'Erweiterte Filter',
        'map-layers': 'Kartenebenen',
        'advanced-features': 'Erweiterte Funktionen',
        'points-of-interest': 'Interessante Punkte Anzeigen',
        'enable-clustering': 'Marker-Clustering Aktivieren',
        'category': 'Kategorie',
        'status': 'Status',
        'all-categories': 'Alle Kategorien',
        'all-status': 'Alle Status',
        'active': 'Aktiv',
        'upcoming': 'Bevorstehend',
        'today': 'Nur Heute',
        'events': 'Veranstaltungen',
        'routes': 'Routen',
        'categories': 'Kategorien',
        'regions': 'Regionen',
        'next-major-event': 'Nächstes Großes Event',
        'explore-the-world': 'Die Welt Erkunden',
        'globe-description': 'Bewegen Sie die Maus über Länder, um die Event-Dichte zu sehen. Klicken Sie, um diese Region auf der Karte zu erkunden.',
        'current-weather': 'Aktuelles Wetter',
        'events-you-might-like': 'Events, die Ihnen Gefallen Könnten',
        'upcoming-events': 'Bevorstehende Events',
        'view-all-events': 'Alle Events Anzeigen',
        'famous-walking-trails': 'Berühmte Wanderwege',
        'view-trail': 'Weg Anzeigen',
        'explore-all-trails': 'Alle Wege Erkunden',
        'what-our-users-say': 'Was Unsere Nutzer Sagen',
        'your-achievements': 'Ihre Erfolge',
        'live-activity-feed': 'Live-Aktivitätsfeed',
        'live-activity-description': 'Sehen Sie, was gerade in der Community passiert',
        'events-by-category': 'Events nach Kategorie',
        'event': 'Event',
        'events-plural': 'Events',
        'global-coverage': 'Globale Abdeckung',
        'global-coverage-desc': 'Events und Wege von jedem Kontinent. Erkunden Sie berühmte Marathons, Kulturfestivals und legendäre Wanderrouten weltweit.',
        'spatial-queries': 'Erweiterte Räumliche Abfragen',
        'spatial-queries-desc': 'Leistungsstarke räumliche Abfragen ermöglichen es Ihnen, Events nach Standort, Entfernung, Routen und benutzerdefinierten Bereichen zu finden. Angetrieben von PostGIS.',
        'progressive-web-app': 'Progressive Web App',
        'progressive-web-app-desc': 'Progressive Web App, die offline funktioniert. Installieren Sie auf Ihrem Gerät und erkunden Sie Events auch ohne Internet.',
        'days': 'Tage',
        'hours': 'Stunden',
        'min': 'Min',
        'sec': 'Sek',
        'event-started': 'Event Gestartet!',
        'no-recommendations': 'Derzeit sind keine Empfehlungen verfügbar.',
        'view': 'Anzeigen',
        'perfect-for-walking': 'Perfekt zum Gehen',
        'your-location': 'Ihr Standort',
        'enable-location-for-weather': 'Standort für Wetter aktivieren',
        'search-placeholder': 'Events, Wege oder Standorte suchen...',
        'interactive-maps': 'Interaktive Karten',
        'works-offline': 'Funktioniert Offline',
        'event-calendar': 'Event-Kalender',
        'month': 'Monat',
        'week': 'Woche',
        'day': 'Tag',
        'list': 'Liste',
        'filter-by-category': 'Nach Kategorie Filtern',
        'filter-by-status': 'Nach Status Filtern',
        'no-description': 'Keine Beschreibung verfügbar.',
        'no-events-found': 'Keine Events gefunden. Versuchen Sie, Ihre Filter anzupassen.',
        'update-available': 'Update verfügbar! Eine neue Version der App ist bereit.',
        'update-now': 'Jetzt Aktualisieren',
        'install-app': 'App Installieren',
        'install-app-desc': 'Zum Startbildschirm hinzufügen für schnellen Zugriff',
        'install': 'Installieren',
        'compare': 'Vergleichen',
        'difficulty-calculator': 'Schwierigkeitsrechner',
        'group-planning': 'Gruppenplanung',
        'photo-gallery': 'Fotogalerie',
        'trail-difficulty-calculator': 'Weg-Schwierigkeitsrechner',
        'find-trails-match': 'Finden Sie Wege, die Ihrem Fitnesslevel entsprechen',
        'fitness-level': 'Fitnesslevel',
        'beginner': 'Anfänger',
        'novice': 'Anfänger',
        'intermediate': 'Mittelstufe',
        'advanced': 'Fortgeschritten',
        'expert': 'Experte',
        'hiking-experience': 'Wandererfahrung',
        'first-time': 'Erstes Mal',
        'a-few-hikes': 'Einige Wanderungen',
        'regular-hiker': 'Regelmäßiger Wanderer',
        'experienced': 'Erfahren',
        'professional': 'Professionell',
        'age': 'Alter',
        'health-conditions': 'Ich habe gesundheitliche Probleme, die das Wandern beeinträchtigen können',
        'calculate': 'Berechnen',
        'create-trail-group': 'Weg-Gruppe Erstellen',
        'group-name': 'Gruppenname',
        'my-trail-group': 'Meine Weg-Gruppe',
        'select-trail': 'Weg Auswählen',
        'choose-trail': 'Wählen Sie einen Weg...',
        'date': 'Datum',
        'invite-members': 'Mitglieder Einladen (E-Mails durch Kommas getrennt)',
        'create-group': 'Gruppe Erstellen',
        'trails': 'Wege',
        'latitude': 'Breitengrad',
        'longitude': 'Längengrad',
        'radius-m': 'Radius (m)',
        'find-nearby': 'In der Nähe Finden',
        'reset': 'Zurücksetzen',
        'route': 'Route',
        'buffer-m': 'Puffer (m)',
        'events-along-route': 'Events entlang der Route',
        'switch-to-3d': 'Zu 3D Wechseln',
        'ar-trail-finder': 'AR-Weg-Finder',
        'weather-overlay': 'Wetter-Overlay',
        'difficulty-heat-map': 'Schwierigkeits-Wärmekarte',
        'custom-markers': 'Benutzerdefinierte Markierungen',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Offline-Download',
        'multi-layer-comparison': 'Mehrschichtiger Vergleich',
        'start-route-planning': 'Routenplanung Starten',
        'live-trail-conditions': 'Live-Weg-Bedingungen',
        'world-walking-events': 'Weltweite Wanderveranstaltungen',
        'app-title': 'Weltweite Wanderveranstaltungen',
        'app-description': 'Finden Sie Veranstaltungen, Routen und Wege weltweit',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'Keine Elemente gefunden',
        'try-adjusting-filters': 'Versuchen Sie, Ihre Filter oder Suchbegriffe anzupassen, um zu finden, wonach Sie suchen.',
        'explore-home': 'Startseite Erkunden',
        'skip-tour': 'Tour Überspringen',
        'previous': 'Zurück',
        'next': 'Weiter',
        'tour-step-0-title': 'Willkommen bei Weltweiten Gehveranstaltungen!',
        'tour-step-0-desc': 'Dies ist Ihre Basis. Klicken Sie hier jederzeit, um zur Startseite zurückzukehren.',
        'tour-step-1-title': 'Globale Suche',
        'tour-step-1-desc': 'Suchen Sie nach Veranstaltungen, Wegen und Standorten weltweit. Probieren Sie auch die Sprachsuche!',
        'tour-step-2-title': 'Passen Sie Ihre Erfahrung an',
        'tour-step-2-desc': 'Ändern Sie Themen, wechseln Sie Sprachen und passen Sie die Barrierefreiheitseinstellungen an.',
        'tour-step-3-title': 'Barrierefreiheitsoptionen',
        'tour-step-3-desc': 'Passen Sie Schriftgröße, Kontrast und andere Barrierefreiheitsfunktionen hier an.',
        'compare-trails': 'Wege Vergleichen',
        'compare-count': '(0/3)',
        'easy': 'Einfach',
        'moderate': 'Mittel',
        'hard': 'Schwer',
        'expert-difficulty': 'Experte',
        'no-trails-found': 'Keine Wege gefunden. Versuchen Sie, Ihre Filter anzupassen.'
      },
      it: {
        home: 'Home',
        map: 'Mappa del Mondo',
        trails: 'Sentieri',
        events: 'Eventi',
        api: 'API',
        search: 'Cerca',
        language: 'Lingua',
        'discover-events': 'Scopri Eventi e Sentieri per Camminare in Tutto il Mondo',
        'explore-subtitle': 'Esplora maratone famose, festival culturali e sentieri leggendari da tutto il mondo.',
        'explore-map': 'Esplora Mappa del Mondo',
        'browse-trails': 'Sfoglia Sentieri',
        'view-events': 'Visualizza Eventi',
        'walking-events': 'Eventi per Camminare in Tutto il Mondo',
        'discover-subtitle': 'Scopri maratone, festival ed eventi culturali da tutto il mondo',
        'walking-trails': 'Sentieri e Percorsi per Camminare',
        'discover-trails': 'Scopri famosi sentieri e percorsi per camminare da tutto il mondo',
        'view-on-map': 'Visualizza su Mappa',
        'price-comparison': 'Confronto Prezzi',
        'analytics': 'Analisi',
        'calendar-view': 'Vista Calendario',
        'my-itinerary': 'Il Mio Itinerario',
        'nearby': 'Nelle Vicinanze',
        'along-route': 'Lungo il Percorso',
        'advanced-filters': 'Filtri Avanzati',
        'map-layers': 'Livelli Mappa',
        'advanced-features': 'Funzionalità Avanzate',
        'points-of-interest': 'Mostra Punti di Interesse',
        'enable-clustering': 'Abilita Raggruppamento Marcatori',
        'category': 'Categoria',
        'status': 'Stato',
        'all-categories': 'Tutte le Categorie',
        'all-status': 'Tutti gli Stati',
        'active': 'Attivo',
        'upcoming': 'Prossimi',
        'today': 'Solo Oggi',
        'events': 'Eventi',
        'routes': 'Percorsi',
        'categories': 'Categorie',
        'regions': 'Regioni',
        'next-major-event': 'Prossimo Evento Principale',
        'explore-the-world': 'Esplora il Mondo',
        'globe-description': 'Passa il mouse sui paesi per vedere la densità degli eventi. Clicca per esplorare quella regione sulla mappa.',
        'current-weather': 'Meteo Attuale',
        'events-you-might-like': 'Eventi che Potrebbero Piacerti',
        'upcoming-events': 'Prossimi Eventi',
        'view-all-events': 'Visualizza Tutti gli Eventi',
        'famous-walking-trails': 'Sentieri Famosi per Camminare',
        'view-trail': 'Visualizza Sentiero',
        'explore-all-trails': 'Esplora Tutti i Sentieri',
        'what-our-users-say': 'Cosa Dicono i Nostri Utenti',
        'your-achievements': 'I Tuoi Risultati',
        'live-activity-feed': 'Feed Attività in Diretta',
        'live-activity-description': 'Vedi cosa sta succedendo in questo momento nella community',
        'events-by-category': 'Eventi per Categoria',
        'event': 'evento',
        'events-plural': 'eventi',
        'global-coverage': 'Copertura Globale',
        'global-coverage-desc': 'Eventi e sentieri da ogni continente. Esplora maratone famose, festival culturali e rotte leggendarie per camminare in tutto il mondo.',
        'spatial-queries': 'Query Spaziali Avanzate',
        'spatial-queries-desc': 'Query spaziali potenti ti permettono di trovare eventi per posizione, distanza, rotte e aree personalizzate. Alimentato da PostGIS.',
        'progressive-web-app': 'Applicazione Web Progressiva',
        'progressive-web-app-desc': 'Applicazione Web Progressiva che funziona offline. Installa sul tuo dispositivo e esplora eventi anche senza internet.',
        'days': 'Giorni',
        'hours': 'Ore',
        'min': 'Min',
        'sec': 'Sec',
        'event-started': 'Evento Iniziato!',
        'no-recommendations': 'Nessuna raccomandazione disponibile al momento.',
        'view': 'Visualizza',
        'perfect-for-walking': 'Perfetto per camminare',
        'your-location': 'La Tua Posizione',
        'enable-location-for-weather': 'Abilita la posizione per il meteo',
        'search-placeholder': 'Cerca eventi, sentieri o posizioni...',
        'interactive-maps': 'Mappe Interattive',
        'works-offline': 'Funziona Offline',
        'event-calendar': 'Calendario Eventi',
        'month': 'Mese',
        'week': 'Settimana',
        'day': 'Giorno',
        'list': 'Lista',
        'filter-by-category': 'Filtra per Categoria',
        'filter-by-status': 'Filtra per Stato',
        'no-description': 'Nessuna descrizione disponibile.',
        'no-events-found': 'Nessun evento trovato. Prova ad aggiustare i tuoi filtri.',
        'update-available': 'Aggiornamento disponibile! Una nuova versione dell\'app è pronta.',
        'update-now': 'Aggiorna Ora',
        'install-app': 'Installa App',
        'install-app-desc': 'Aggiungi alla schermata home per accesso rapido',
        'install': 'Installa',
        'compare': 'Confronta',
        'difficulty-calculator': 'Calcolatore di Difficoltà',
        'group-planning': 'Pianificazione di Gruppo',
        'photo-gallery': 'Galleria Foto',
        'trail-difficulty-calculator': 'Calcolatore di Difficoltà del Sentiero',
        'find-trails-match': 'Trova sentieri che corrispondono al tuo livello di forma fisica',
        'fitness-level': 'Livello di Forma Fisica',
        'beginner': 'Principiante',
        'novice': 'Novizio',
        'intermediate': 'Intermedio',
        'advanced': 'Avanzato',
        'expert': 'Esperto',
        'hiking-experience': 'Esperienza di Escursionismo',
        'first-time': 'Prima volta',
        'a-few-hikes': 'Alcune escursioni',
        'regular-hiker': 'Escursionista regolare',
        'experienced': 'Esperto',
        'professional': 'Professionista',
        'age': 'Età',
        'health-conditions': 'Ho condizioni di salute che possono influenzare l\'escursionismo',
        'calculate': 'Calcola',
        'create-trail-group': 'Crea Gruppo Sentiero',
        'group-name': 'Nome del Gruppo',
        'my-trail-group': 'Il Mio Gruppo Sentiero',
        'select-trail': 'Seleziona Sentiero',
        'choose-trail': 'Scegli un sentiero...',
        'date': 'Data',
        'invite-members': 'Invita Membri (email separate da virgole)',
        'create-group': 'Crea Gruppo',
        'trails': 'Sentieri',
        'latitude': 'Latitudine',
        'longitude': 'Longitudine',
        'radius-m': 'Raggio (m)',
        'find-nearby': 'Trova nelle vicinanze',
        'reset': 'Reimposta',
        'route': 'Rotta',
        'buffer-m': 'Buffer (m)',
        'events-along-route': 'Eventi lungo la rotta',
        'switch-to-3d': 'Passa a 3D',
        'ar-trail-finder': 'Cercatore Sentiero AR',
        'weather-overlay': 'Overlay Meteo',
        'difficulty-heat-map': 'Mappa di Calore della Difficoltà',
        'custom-markers': 'Marcatori Personalizzati',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Download Offline',
        'multi-layer-comparison': 'Confronto Multi-Livello',
        'start-route-planning': 'Inizia Pianificazione Rotta',
        'live-trail-conditions': 'Condizioni Sentiero in Diretta',
        'world-walking-events': 'Eventi per Camminare nel Mondo',
        'app-title': 'Eventi per Camminare nel Mondo',
        'app-description': 'Trova eventi, rotte e sentieri in tutto il mondo',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'Nessun elemento trovato',
        'try-adjusting-filters': 'Prova ad aggiustare i tuoi filtri o termini di ricerca per trovare quello che stai cercando.',
        'explore-home': 'Esplora Home',
        'skip-tour': 'Salta Tour',
        'previous': 'Precedente',
        'next': 'Successivo',
        'tour-step-0-title': 'Benvenuto in Eventi per Camminare nel Mondo!',
        'tour-step-0-desc': 'Questa è la tua base di partenza. Clicca qui in qualsiasi momento per tornare alla homepage.',
        'tour-step-1-title': 'Ricerca Globale',
        'tour-step-1-desc': 'Cerca eventi, sentieri e posizioni in tutto il mondo. Prova anche la ricerca vocale!',
        'tour-step-2-title': 'Personalizza la Tua Esperienza',
        'tour-step-2-desc': 'Cambia temi, cambia lingue e regola le impostazioni di accessibilità.',
        'tour-step-3-title': 'Opzioni di Accessibilità',
        'tour-step-3-desc': 'Regola la dimensione del carattere, il contrasto e altre funzionalità di accessibilità qui.',
        'compare-trails': 'Confronta Sentieri',
        'compare-count': '(0/3)',
        'easy': 'Facile',
        'moderate': 'Moderato',
        'hard': 'Difficile',
        'expert-difficulty': 'Esperto',
        'no-trails-found': 'Nessun sentiero trovato. Prova ad aggiustare i tuoi filtri.'
      },
      pt: {
        home: 'Início',
        map: 'Mapa Mundial',
        trails: 'Trilhas',
        events: 'Eventos',
        api: 'API',
        search: 'Pesquisar',
        language: 'Idioma',
        'discover-events': 'Descubra Eventos e Trilhas para Caminhar em Todo o Mundo',
        'explore-subtitle': 'Explore maratonas famosas, festivais culturais e trilhas lendárias de todo o mundo.',
        'explore-map': 'Explorar Mapa Mundial',
        'browse-trails': 'Navegar Trilhas',
        'view-events': 'Ver Eventos',
        'walking-events': 'Eventos para Caminhar em Todo o Mundo',
        'discover-subtitle': 'Descubra maratonas, festivais e eventos culturais de todo o mundo',
        'walking-trails': 'Trilhas e Rotas para Caminhar',
        'discover-trails': 'Descubra famosas trilhas e rotas para caminhar de todo o mundo',
        'view-on-map': 'Ver no Mapa',
        'price-comparison': 'Comparação de Preços',
        'analytics': 'Análises',
        'calendar-view': 'Visualização de Calendário',
        'my-itinerary': 'Meu Itinerário',
        'nearby': 'Próximo',
        'along-route': 'Ao Longo da Rota',
        'advanced-filters': 'Filtros Avançados',
        'map-layers': 'Camadas do Mapa',
        'advanced-features': 'Recursos Avançados',
        'points-of-interest': 'Mostrar Pontos de Interesse',
        'enable-clustering': 'Ativar Agrupamento de Marcadores',
        'category': 'Categoria',
        'status': 'Status',
        'all-categories': 'Todas as Categorias',
        'all-status': 'Todos os Status',
        'active': 'Ativo',
        'upcoming': 'Próximos',
        'today': 'Apenas Hoje',
        'events': 'Eventos',
        'routes': 'Rotas',
        'categories': 'Categorias',
        'regions': 'Regiões',
        'next-major-event': 'Próximo Evento Principal',
        'explore-the-world': 'Explorar o Mundo',
        'globe-description': 'Passe o mouse sobre os países para ver a densidade de eventos. Clique para explorar essa região no mapa.',
        'current-weather': 'Clima Atual',
        'events-you-might-like': 'Eventos que Você Pode Gostar',
        'upcoming-events': 'Próximos Eventos',
        'view-all-events': 'Ver Todos os Eventos',
        'famous-walking-trails': 'Trilhas Famosas para Caminhar',
        'view-trail': 'Ver Trilha',
        'explore-all-trails': 'Explorar Todas as Trilhas',
        'what-our-users-say': 'O que Nossos Usuários Dizem',
        'your-achievements': 'Suas Conquistas',
        'live-activity-feed': 'Feed de Atividade ao Vivo',
        'live-activity-description': 'Veja o que está acontecendo agora na comunidade',
        'events-by-category': 'Eventos por Categoria',
        'event': 'evento',
        'events-plural': 'eventos',
        'global-coverage': 'Cobertura Global',
        'global-coverage-desc': 'Eventos e trilhas de todos os continentes. Explore maratonas famosas, festivais culturais e rotas lendárias para caminhar em todo o mundo.',
        'spatial-queries': 'Consultas Espaciais Avançadas',
        'spatial-queries-desc': 'Consultas espaciais poderosas permitem encontrar eventos por localização, distância, rotas e áreas personalizadas. Alimentado por PostGIS.',
        'progressive-web-app': 'Aplicativo Web Progressivo',
        'progressive-web-app-desc': 'Aplicativo Web Progressivo que funciona offline. Instale no seu dispositivo e explore eventos mesmo sem internet.',
        'days': 'Dias',
        'hours': 'Horas',
        'min': 'Min',
        'sec': 'Seg',
        'event-started': 'Evento Iniciado!',
        'no-recommendations': 'Nenhuma recomendação disponível no momento.',
        'view': 'Ver',
        'perfect-for-walking': 'Perfeito para caminhar',
        'your-location': 'Sua Localização',
        'enable-location-for-weather': 'Ativar localização para o clima',
        'search-placeholder': 'Pesquisar eventos, trilhas ou localizações...',
        'interactive-maps': 'Mapas Interativos',
        'works-offline': 'Funciona Offline',
        'event-calendar': 'Calendário de Eventos',
        'month': 'Mês',
        'week': 'Semana',
        'day': 'Dia',
        'list': 'Lista',
        'filter-by-category': 'Filtrar por Categoria',
        'filter-by-status': 'Filtrar por Status',
        'no-description': 'Nenhuma descrição disponível.',
        'no-events-found': 'Nenhum evento encontrado. Tente ajustar seus filtros.',
        'update-available': 'Atualização disponível! Uma nova versão do aplicativo está pronta.',
        'update-now': 'Atualizar Agora',
        'install-app': 'Instalar Aplicativo',
        'install-app-desc': 'Adicionar à tela inicial para acesso rápido',
        'install': 'Instalar',
        'compare': 'Comparar',
        'difficulty-calculator': 'Calculadora de Dificuldade',
        'group-planning': 'Planejamento de Grupo',
        'photo-gallery': 'Galeria de Fotos',
        'trail-difficulty-calculator': 'Calculadora de Dificuldade de Trilha',
        'find-trails-match': 'Encontre trilhas que correspondam ao seu nível de condicionamento físico',
        'fitness-level': 'Nível de Condicionamento Físico',
        'beginner': 'Iniciante',
        'novice': 'Novato',
        'intermediate': 'Intermediário',
        'advanced': 'Avançado',
        'expert': 'Especialista',
        'hiking-experience': 'Experiência em Caminhada',
        'first-time': 'Primeira vez',
        'a-few-hikes': 'Algumas caminhadas',
        'regular-hiker': 'Caminhante regular',
        'experienced': 'Experiente',
        'professional': 'Profissional',
        'age': 'Idade',
        'health-conditions': 'Tenho condições de saúde que podem afetar a caminhada',
        'calculate': 'Calcular',
        'create-trail-group': 'Criar Grupo de Trilha',
        'group-name': 'Nome do Grupo',
        'my-trail-group': 'Meu Grupo de Trilha',
        'select-trail': 'Selecionar Trilha',
        'choose-trail': 'Escolha uma trilha...',
        'date': 'Data',
        'invite-members': 'Convidar Membros (emails separados por vírgulas)',
        'create-group': 'Criar Grupo',
        'trails': 'Trilhas',
        'latitude': 'Latitude',
        'longitude': 'Longitude',
        'radius-m': 'Raio (m)',
        'find-nearby': 'Encontrar nas proximidades',
        'reset': 'Redefinir',
        'route': 'Rota',
        'buffer-m': 'Buffer (m)',
        'events-along-route': 'Eventos ao longo da rota',
        'switch-to-3d': 'Mudar para 3D',
        'ar-trail-finder': 'Localizador de Trilha AR',
        'weather-overlay': 'Sobreposição do Clima',
        'difficulty-heat-map': 'Mapa de Calor de Dificuldade',
        'custom-markers': 'Marcadores Personalizados',
        'time-lapse': 'Time-Lapse',
        'offline-download': 'Download Offline',
        'multi-layer-comparison': 'Comparação de Múltiplas Camadas',
        'start-route-planning': 'Iniciar Planejamento de Rota',
        'live-trail-conditions': 'Condições de Trilha ao Vivo',
        'world-walking-events': 'Eventos para Caminhar no Mundo',
        'app-title': 'Eventos para Caminhar no Mundo',
        'app-description': 'Encontre eventos, rotas e trilhas em todo o mundo',
        'km': 'km',
        'm': 'm',
        'no-items-found': 'Nenhum item encontrado',
        'try-adjusting-filters': 'Tente ajustar seus filtros ou termos de pesquisa para encontrar o que você está procurando.',
        'explore-home': 'Explorar Início',
        'skip-tour': 'Pular Tour',
        'previous': 'Anterior',
        'next': 'Próximo',
        'tour-step-0-title': 'Bem-vindo aos Eventos para Caminhar no Mundo!',
        'tour-step-0-desc': 'Esta é sua base inicial. Clique aqui a qualquer momento para voltar à página inicial.',
        'tour-step-1-title': 'Busca Global',
        'tour-step-1-desc': 'Pesquise eventos, trilhas e locais em todo o mundo. Experimente também a pesquisa por voz!',
        'tour-step-2-title': 'Personalize Sua Experiência',
        'tour-step-2-desc': 'Altere temas, troque idiomas e ajuste as configurações de acessibilidade.',
        'tour-step-3-title': 'Opções de Acessibilidade',
        'tour-step-3-desc': 'Ajuste o tamanho da fonte, contraste e outros recursos de acessibilidade aqui.',
        'compare-trails': 'Comparar Trilhas',
        'compare-count': '(0/3)',
        'easy': 'Fácil',
        'moderate': 'Moderado',
        'hard': 'Difícil',
        'expert-difficulty': 'Especialista',
        'no-trails-found': 'Nenhuma trilha encontrada. Tente ajustar seus filtros.'
      },
      zh: {
        home: '首页',
        map: '世界地图',
        trails: '步道',
        events: '活动',
        api: 'API',
        search: '搜索',
        language: '语言',
        'discover-events': '发现全球步行活动和步道',
        'explore-subtitle': '探索世界著名的马拉松、文化节和传奇步道。',
        'explore-map': '探索世界地图',
        'browse-trails': '浏览步道',
        'view-events': '查看活动',
        'walking-events': '全球步行活动',
        'discover-subtitle': '发现来自世界各地的马拉松、节日和文化活动',
        'walking-trails': '步行步道和路线',
        'discover-trails': '发现来自世界各地的著名步行步道和路线',
        'view-on-map': '在地图上查看',
        'price-comparison': '价格比较',
        'analytics': '分析',
        'calendar-view': '日历视图',
        'my-itinerary': '我的行程',
        'nearby': '附近',
        'along-route': '沿路线',
        'advanced-filters': '高级筛选',
        'map-layers': '地图图层',
        'advanced-features': '高级功能',
        'points-of-interest': '显示兴趣点',
        'enable-clustering': '启用标记聚类',
        'category': '类别',
        'status': '状态',
        'all-categories': '所有类别',
        'all-status': '所有状态',
        'active': '活跃',
        'upcoming': '即将到来',
        'today': '仅今天',
        'events': '活动',
        'routes': '路线',
        'categories': '类别',
        'regions': '地区',
        'next-major-event': '下一个主要活动',
        'explore-the-world': '探索世界',
        'globe-description': '将鼠标悬停在国家上以查看活动密度。点击以在地图上探索该地区。',
        'current-weather': '当前天气',
        'events-you-might-like': '您可能喜欢的活动',
        'upcoming-events': '即将举行的活动',
        'view-all-events': '查看所有活动',
        'famous-walking-trails': '著名步行步道',
        'view-trail': '查看步道',
        'explore-all-trails': '探索所有步道',
        'what-our-users-say': '用户评价',
        'your-achievements': '您的成就',
        'live-activity-feed': '实时活动动态',
        'live-activity-description': '查看社区中正在发生的事情',
        'events-by-category': '按类别分类的活动',
        'event': '活动',
        'events-plural': '活动',
        'global-coverage': '全球覆盖',
        'global-coverage-desc': '来自各大洲的活动和步道。探索世界著名的马拉松、文化节和传奇步行路线。',
        'spatial-queries': '高级空间查询',
        'spatial-queries-desc': '强大的空间查询让您可以通过位置、距离、路线和自定义区域查找活动。由 PostGIS 提供支持。',
        'progressive-web-app': '渐进式网络应用',
        'progressive-web-app-desc': '可离线工作的渐进式网络应用。在您的设备上安装，即使没有互联网也可以探索活动。',
        'days': '天',
        'hours': '小时',
        'min': '分钟',
        'sec': '秒',
        'event-started': '活动已开始！',
        'no-recommendations': '目前没有可用的推荐。',
        'view': '查看',
        'perfect-for-walking': '适合步行',
        'your-location': '您的位置',
        'enable-location-for-weather': '启用位置以获取天气',
        'search-placeholder': '搜索活动、步道或位置...',
        'interactive-maps': '交互式地图',
        'works-offline': '离线工作',
        'event-calendar': '活动日历',
        'month': '月',
        'week': '周',
        'day': '日',
        'list': '列表',
        'filter-by-category': '按类别筛选',
        'filter-by-status': '按状态筛选',
        'no-description': '没有可用的描述。',
        'no-events-found': '未找到活动。请尝试调整您的筛选条件。',
        'update-available': '有更新可用！应用程序的新版本已准备就绪。',
        'update-now': '立即更新',
        'install-app': '安装应用',
        'install-app-desc': '添加到主屏幕以便快速访问',
        'install': '安装',
        'compare': '比较',
        'difficulty-calculator': '难度计算器',
        'group-planning': '团队规划',
        'photo-gallery': '照片库',
        'trail-difficulty-calculator': '步道难度计算器',
        'find-trails-match': '找到与您的健身水平相匹配的步道',
        'fitness-level': '健身水平',
        'beginner': '初学者',
        'novice': '新手',
        'intermediate': '中级',
        'advanced': '高级',
        'expert': '专家',
        'hiking-experience': '徒步经验',
        'first-time': '第一次',
        'a-few-hikes': '几次徒步',
        'regular-hiker': '经常徒步',
        'experienced': '有经验',
        'professional': '专业',
        'age': '年龄',
        'health-conditions': '我有可能影响徒步的健康状况',
        'calculate': '计算',
        'create-trail-group': '创建步道组',
        'group-name': '组名',
        'my-trail-group': '我的步道组',
        'select-trail': '选择步道',
        'choose-trail': '选择一个步道...',
        'date': '日期',
        'invite-members': '邀请成员（用逗号分隔的电子邮件）',
        'create-group': '创建组',
        'trails': '步道',
        'latitude': '纬度',
        'longitude': '经度',
        'radius-m': '半径（米）',
        'find-nearby': '查找附近',
        'reset': '重置',
        'route': '路线',
        'buffer-m': '缓冲区（米）',
        'events-along-route': '沿路线的活动',
        'switch-to-3d': '切换到3D',
        'ar-trail-finder': 'AR步道查找器',
        'weather-overlay': '天气叠加',
        'difficulty-heat-map': '难度热图',
        'custom-markers': '自定义标记',
        'time-lapse': '延时',
        'offline-download': '离线下载',
        'multi-layer-comparison': '多层比较',
        'start-route-planning': '开始路线规划',
        'live-trail-conditions': '实时步道条件',
        'world-walking-events': '世界步行活动',
        'app-title': '世界步行活动',
        'app-description': '在全球范围内查找活动、路线和步道',
        'km': '公里',
        'm': '米',
        'no-items-found': '未找到项目',
        'try-adjusting-filters': '尝试调整您的过滤器或搜索词以找到您要查找的内容。',
        'explore-home': '探索首页',
        'skip-tour': '跳过导览',
        'previous': '上一个',
        'next': '下一个',
        'tour-step-0-title': '欢迎来到世界步行活动！',
        'tour-step-0-desc': '这是您的主页。随时点击此处返回主页。',
        'tour-step-1-title': '全球搜索',
        'tour-step-1-desc': '搜索全球的活动、步道和位置。也试试语音搜索！',
        'tour-step-2-title': '自定义您的体验',
        'tour-step-2-desc': '更改主题、切换语言并调整辅助功能设置。',
        'tour-step-3-title': '辅助功能选项',
        'tour-step-3-desc': '在此处调整字体大小、对比度和其他辅助功能。',
        'compare-trails': '比较步道',
        'compare-count': '(0/3)',
        'easy': '简单',
        'moderate': '中等',
        'hard': '困难',
        'expert-difficulty': '专家',
        'no-trails-found': '未找到步道。尝试调整您的过滤器。'
      },
      ja: {
        home: 'ホーム',
        map: '世界地図',
        trails: 'トレイル',
        events: 'イベント',
        api: 'API',
        search: '検索',
        language: '言語',
        'discover-events': '世界中のウォーキングイベントとトレイルを発見',
        'explore-subtitle': '世界中の有名なマラソン、文化祭、伝説的なウォーキングトレイルを探索。',
        'explore-map': '世界地図を探索',
        'browse-trails': 'トレイルを閲覧',
        'view-events': 'イベントを表示',
        'walking-events': '世界中のウォーキングイベント',
        'discover-subtitle': '世界中のマラソン、フェスティバル、文化イベントを発見',
        'walking-trails': 'ウォーキングトレイルとルート',
        'discover-trails': '世界中の有名なウォーキングトレイルとルートを発見',
        'view-on-map': '地図で表示',
        'price-comparison': '価格比較',
        'analytics': '分析',
        'calendar-view': 'カレンダービュー',
        'my-itinerary': 'マイ行程',
        'nearby': '近く',
        'along-route': 'ルート沿い',
        'advanced-filters': '高度なフィルター',
        'map-layers': '地図レイヤー',
        'advanced-features': '高度な機能',
        'points-of-interest': '興味のあるポイントを表示',
        'enable-clustering': 'マーカークラスタリングを有効化',
        'category': 'カテゴリー',
        'status': 'ステータス',
        'all-categories': 'すべてのカテゴリー',
        'all-status': 'すべてのステータス',
        'active': 'アクティブ',
        'upcoming': '今後のみ',
        'today': '今日のみ',
        'events': 'イベント',
        'routes': 'ルート',
        'categories': 'カテゴリー',
        'regions': '地域',
        'next-major-event': '次の主要イベント',
        'explore-the-world': '世界を探索',
        'globe-description': '国にマウスを合わせるとイベント密度が表示されます。クリックしてマップ上でその地域を探索します。',
        'current-weather': '現在の天気',
        'events-you-might-like': 'おすすめのイベント',
        'upcoming-events': '今後のイベント',
        'view-all-events': 'すべてのイベントを表示',
        'famous-walking-trails': '有名なウォーキングトレイル',
        'view-trail': 'トレイルを表示',
        'explore-all-trails': 'すべてのトレイルを探索',
        'what-our-users-say': 'ユーザーの声',
        'your-achievements': 'あなたの実績',
        'live-activity-feed': 'ライブアクティビティフィード',
        'live-activity-description': 'コミュニティで今起こっていることを見る',
        'events-by-category': 'カテゴリー別イベント',
        'event': 'イベント',
        'events-plural': 'イベント',
        'global-coverage': 'グローバルカバレッジ',
        'global-coverage-desc': 'すべての大陸からのイベントとトレイル。世界中の有名なマラソン、文化祭、伝説的なウォーキングルートを探索。',
        'spatial-queries': '高度な空間クエリ',
        'spatial-queries-desc': '強力な空間クエリにより、場所、距離、ルート、カスタムエリアでイベントを見つけることができます。PostGIS によって提供。',
        'progressive-web-app': 'プログレッシブウェブアプリ',
        'progressive-web-app-desc': 'オフラインで動作するプログレッシブウェブアプリ。デバイスにインストールして、インターネットなしでもイベントを探索できます。',
        'days': '日',
        'hours': '時間',
        'min': '分',
        'sec': '秒',
        'event-started': 'イベント開始！',
        'no-recommendations': '現在、推奨事項はありません。',
        'view': '表示',
        'perfect-for-walking': 'ウォーキングに最適',
        'your-location': 'あなたの場所',
        'enable-location-for-weather': '天気のために位置情報を有効にする',
        'search-placeholder': 'イベント、トレイル、または場所を検索...',
        'interactive-maps': 'インタラクティブマップ',
        'works-offline': 'オフラインで動作',
        'event-calendar': 'イベントカレンダー',
        'month': '月',
        'week': '週',
        'day': '日',
        'list': 'リスト',
        'filter-by-category': 'カテゴリーでフィルター',
        'filter-by-status': 'ステータスでフィルター',
        'no-description': '説明がありません。',
        'no-events-found': 'イベントが見つかりませんでした。フィルターを調整してみてください。',
        'update-available': '更新が利用可能です！アプリの新しいバージョンが準備できました。',
        'update-now': '今すぐ更新',
        'install-app': 'アプリをインストール',
        'install-app-desc': 'クイックアクセスのためにホーム画面に追加',
        'install': 'インストール',
        'compare': '比較',
        'difficulty-calculator': '難易度計算機',
        'group-planning': 'グループ計画',
        'photo-gallery': 'フォトギャラリー',
        'trail-difficulty-calculator': 'トレイル難易度計算機',
        'find-trails-match': 'あなたのフィットネスレベルに合うトレイルを見つける',
        'fitness-level': 'フィットネスレベル',
        'beginner': '初心者',
        'novice': '初心者',
        'intermediate': '中級',
        'advanced': '上級',
        'expert': 'エキスパート',
        'hiking-experience': 'ハイキング経験',
        'first-time': '初めて',
        'a-few-hikes': '数回のハイキング',
        'regular-hiker': '定期的なハイカー',
        'experienced': '経験豊富',
        'professional': 'プロフェッショナル',
        'age': '年齢',
        'health-conditions': 'ハイキングに影響を与える可能性のある健康状態があります',
        'calculate': '計算',
        'create-trail-group': 'トレイルグループを作成',
        'group-name': 'グループ名',
        'my-trail-group': '私のトレイルグループ',
        'select-trail': 'トレイルを選択',
        'choose-trail': 'トレイルを選択...',
        'date': '日付',
        'invite-members': 'メンバーを招待（カンマ区切りのメール）',
        'create-group': 'グループを作成',
        'trails': 'トレイル',
        'latitude': '緯度',
        'longitude': '経度',
        'radius-m': '半径（m）',
        'find-nearby': '近くを検索',
        'reset': 'リセット',
        'route': 'ルート',
        'buffer-m': 'バッファ（m）',
        'events-along-route': 'ルート沿いのイベント',
        'switch-to-3d': '3Dに切り替え',
        'ar-trail-finder': 'ARトレイルファインダー',
        'weather-overlay': '天気オーバーレイ',
        'difficulty-heat-map': '難易度ヒートマップ',
        'custom-markers': 'カスタムマーカー',
        'time-lapse': 'タイムラプス',
        'offline-download': 'オフラインダウンロード',
        'multi-layer-comparison': 'マルチレイヤー比較',
        'start-route-planning': 'ルート計画を開始',
        'live-trail-conditions': 'ライブトレイル条件',
        'world-walking-events': '世界ウォーキングイベント',
        'app-title': '世界ウォーキングイベント',
        'app-description': '世界中のイベント、ルート、トレイルを見つける',
        'km': 'km',
        'm': 'm',
        'no-items-found': '項目が見つかりません',
        'try-adjusting-filters': 'フィルターや検索語を調整して、探しているものを見つけてください。',
        'explore-home': 'ホームを探索',
        'skip-tour': 'ツアーをスキップ',
        'previous': '前へ',
        'next': '次へ',
        'tour-step-0-title': '世界ウォーキングイベントへようこそ！',
        'tour-step-0-desc': 'これがあなたのホームベースです。いつでもここをクリックしてホームページに戻ります。',
        'tour-step-1-title': 'グローバル検索',
        'tour-step-1-desc': '世界中のイベント、トレイル、場所を検索します。音声検索もお試しください！',
        'tour-step-2-title': '体験をカスタマイズ',
        'tour-step-2-desc': 'テーマを変更し、言語を切り替え、アクセシビリティ設定を調整します。',
        'tour-step-3-title': 'アクセシビリティオプション',
        'tour-step-3-desc': 'ここでフォントサイズ、コントラスト、その他のアクセシビリティ機能を調整します。',
        'compare-trails': 'トレイルを比較',
        'compare-count': '(0/3)',
        'easy': '簡単',
        'moderate': '中程度',
        'hard': '困難',
        'expert-difficulty': 'エキスパート',
        'no-trails-found': 'トレイルが見つかりません。フィルターを調整してみてください。'
      },
      ar: {
        home: 'الرئيسية',
        map: 'خريطة العالم',
        trails: 'المسارات',
        events: 'الأحداث',
        api: 'API',
        search: 'بحث',
        language: 'اللغة',
        'discover-events': 'اكتشف أحداث المشي والمسارات في جميع أنحاء العالم',
        'explore-subtitle': 'استكشف الماراثونات الشهيرة والمهرجانات الثقافية والمسارات الأسطورية من جميع أنحاء العالم.',
        'explore-map': 'استكشف خريطة العالم',
        'browse-trails': 'تصفح المسارات',
        'view-events': 'عرض الأحداث',
        'walking-events': 'أحداث المشي في جميع أنحاء العالم',
        'discover-subtitle': 'اكتشف الماراثونات والمهرجانات والأحداث الثقافية من جميع أنحاء العالم',
        'walking-trails': 'مسارات وممرات المشي',
        'discover-trails': 'اكتشف مسارات وممرات المشي الشهيرة من جميع أنحاء العالم',
        'view-on-map': 'عرض على الخريطة',
        'price-comparison': 'مقارنة الأسعار',
        'analytics': 'التحليلات',
        'calendar-view': 'عرض التقويم',
        'my-itinerary': 'خط سيري',
        'nearby': 'بالقرب',
        'along-route': 'على طول الطريق',
        'advanced-filters': 'مرشحات متقدمة',
        'map-layers': 'طبقات الخريطة',
        'advanced-features': 'ميزات متقدمة',
        'points-of-interest': 'إظهار نقاط الاهتمام',
        'enable-clustering': 'تمكين تجميع العلامات',
        'category': 'الفئة',
        'status': 'الحالة',
        'all-categories': 'جميع الفئات',
        'all-status': 'جميع الحالات',
        'active': 'نشط',
        'upcoming': 'القادمة فقط',
        'today': 'اليوم فقط',
        'events': 'الأحداث',
        'routes': 'الطرق',
        'categories': 'الفئات',
        'regions': 'المناطق',
        'next-major-event': 'الحدث الرئيسي القادم',
        'explore-the-world': 'استكشف العالم',
        'globe-description': 'مرر الماوس فوق البلدان لرؤية كثافة الأحداث. انقر لاستكشاف تلك المنطقة على الخريطة.',
        'current-weather': 'الطقس الحالي',
        'events-you-might-like': 'الأحداث التي قد تعجبك',
        'upcoming-events': 'الأحداث القادمة',
        'view-all-events': 'عرض جميع الأحداث',
        'famous-walking-trails': 'مسارات المشي الشهيرة',
        'view-trail': 'عرض المسار',
        'explore-all-trails': 'استكشف جميع المسارات',
        'what-our-users-say': 'ماذا يقول مستخدمونا',
        'your-achievements': 'إنجازاتك',
        'live-activity-feed': 'خلاصة النشاط المباشر',
        'live-activity-description': 'شاهد ما يحدث الآن في المجتمع',
        'events-by-category': 'الأحداث حسب الفئة',
        'event': 'حدث',
        'events-plural': 'أحداث',
        'global-coverage': 'التغطية العالمية',
        'global-coverage-desc': 'أحداث ومسارات من كل قارة. استكشف الماراثونات الشهيرة والمهرجانات الثقافية وطرق المشي الأسطورية في جميع أنحاء العالم.',
        'spatial-queries': 'استعلامات مكانية متقدمة',
        'spatial-queries-desc': 'تسمح لك الاستعلامات المكانية القوية بالعثور على الأحداث حسب الموقع والمسافة والطرق والمناطق المخصصة. مدعوم من PostGIS.',
        'progressive-web-app': 'تطبيق ويب تقدمي',
        'progressive-web-app-desc': 'تطبيق ويب تقدمي يعمل بدون اتصال. قم بتثبيته على جهازك واستكشف الأحداث حتى بدون إنترنت.',
        'days': 'أيام',
        'hours': 'ساعات',
        'min': 'دقيقة',
        'sec': 'ثانية',
        'event-started': 'تم بدء الحدث!',
        'no-recommendations': 'لا توجد توصيات متاحة في الوقت الحالي.',
        'view': 'عرض',
        'perfect-for-walking': 'مثالي للمشي',
        'your-location': 'موقعك',
        'enable-location-for-weather': 'تفعيل الموقع للطقس',
        'search-placeholder': 'البحث عن الأحداث أو المسارات أو المواقع...',
        'interactive-maps': 'خرائط تفاعلية',
        'works-offline': 'يعمل بدون اتصال',
        'event-calendar': 'تقويم الأحداث',
        'month': 'شهر',
        'week': 'أسبوع',
        'day': 'يوم',
        'list': 'قائمة',
        'filter-by-category': 'تصفية حسب الفئة',
        'filter-by-status': 'تصفية حسب الحالة',
        'no-description': 'لا يوجد وصف متاح.',
        'no-events-found': 'لم يتم العثور على أحداث. حاول تعديل المرشحات الخاصة بك.',
        'update-available': 'تحديث متاح! إصدار جديد من التطبيق جاهز.',
        'update-now': 'تحديث الآن',
        'install-app': 'تثبيت التطبيق',
        'install-app-desc': 'إضافة إلى الشاشة الرئيسية للوصول السريع',
        'install': 'تثبيت',
        'compare': 'مقارنة',
        'difficulty-calculator': 'حاسبة الصعوبة',
        'group-planning': 'تخطيط المجموعة',
        'photo-gallery': 'معرض الصور',
        'trail-difficulty-calculator': 'حاسبة صعوبة المسار',
        'find-trails-match': 'ابحث عن مسارات تطابق مستوى لياقتك البدنية',
        'fitness-level': 'مستوى اللياقة البدنية',
        'beginner': 'مبتدئ',
        'novice': 'مبتدئ',
        'intermediate': 'متوسط',
        'advanced': 'متقدم',
        'expert': 'خبير',
        'hiking-experience': 'خبرة المشي',
        'first-time': 'المرة الأولى',
        'a-few-hikes': 'بعض المشي',
        'regular-hiker': 'متنزه منتظم',
        'experienced': 'خبير',
        'professional': 'محترف',
        'age': 'العمر',
        'health-conditions': 'لدي حالات صحية قد تؤثر على المشي',
        'calculate': 'حساب',
        'create-trail-group': 'إنشاء مجموعة مسار',
        'group-name': 'اسم المجموعة',
        'my-trail-group': 'مجموعة المسار الخاصة بي',
        'select-trail': 'اختر المسار',
        'choose-trail': 'اختر مسارًا...',
        'date': 'التاريخ',
        'invite-members': 'دعوة الأعضاء (بريد إلكتروني مفصول بفواصل)',
        'create-group': 'إنشاء مجموعة',
        'trails': 'المسارات',
        'latitude': 'خط العرض',
        'longitude': 'خط الطول',
        'radius-m': 'نصف القطر (م)',
        'find-nearby': 'البحث في الجوار',
        'reset': 'إعادة تعيين',
        'route': 'الطريق',
        'buffer-m': 'المنطقة العازلة (م)',
        'events-along-route': 'الأحداث على طول الطريق',
        'switch-to-3d': 'التبديل إلى 3D',
        'ar-trail-finder': 'باحث المسار AR',
        'weather-overlay': 'تراكب الطقس',
        'difficulty-heat-map': 'خريطة حرارية للصعوبة',
        'custom-markers': 'علامات مخصصة',
        'time-lapse': 'الفاصل الزمني',
        'offline-download': 'تنزيل بدون اتصال',
        'multi-layer-comparison': 'مقارنة متعددة الطبقات',
        'start-route-planning': 'بدء تخطيط الطريق',
        'live-trail-conditions': 'ظروف المسار المباشرة',
        'world-walking-events': 'أحداث المشي في العالم',
        'app-title': 'أحداث المشي في العالم',
        'app-description': 'ابحث عن الأحداث والطرق والمسارات في جميع أنحاء العالم',
        'km': 'كم',
        'm': 'م',
        'no-items-found': 'لم يتم العثور على عناصر',
        'try-adjusting-filters': 'حاول تعديل المرشحات أو مصطلحات البحث للعثور على ما تبحث عنه.',
        'explore-home': 'استكشف الصفحة الرئيسية',
        'skip-tour': 'تخطي الجولة',
        'previous': 'السابق',
        'next': 'التالي',
        'tour-step-0-title': 'مرحبًا بك في أحداث المشي في العالم!',
        'tour-step-0-desc': 'هذه هي قاعدتك الرئيسية. انقر هنا في أي وقت للعودة إلى الصفحة الرئيسية.',
        'tour-step-1-title': 'البحث العالمي',
        'tour-step-1-desc': 'ابحث عن الأحداث والمسارات والمواقع في جميع أنحاء العالم. جرب البحث الصوتي أيضًا!',
        'tour-step-2-title': 'خصص تجربتك',
        'tour-step-2-desc': 'قم بتغيير السمات وتبديل اللغات وتعديل إعدادات إمكانية الوصول.',
        'tour-step-3-title': 'خيارات إمكانية الوصول',
        'tour-step-3-desc': 'اضبط حجم الخط والتباين وميزات إمكانية الوصول الأخرى هنا.',
        'compare-trails': 'مقارنة المسارات',
        'compare-count': '(0/3)',
        'easy': 'سهل',
        'moderate': 'متوسط',
        'hard': 'صعب',
        'expert-difficulty': 'خبير',
        'no-trails-found': 'لم يتم العثور على مسارات. حاول تعديل المرشحات.'
      },
      he: {
        home: 'בית',
        map: 'מפת העולם',
        trails: 'שבילים',
        events: 'אירועים',
        api: 'API',
        search: 'חיפוש',
        language: 'שפה',
        'discover-events': 'גלה אירועי הליכה ושבילים ברחבי העולם',
        'explore-subtitle': 'חקור מרתונים מפורסמים, פסטיבלים תרבותיים ושבילי הליכה אגדיים מכל רחבי העולם.',
        'explore-map': 'חקור מפת העולם',
        'browse-trails': 'עיין בשבילים',
        'view-events': 'הצג אירועים',
        'walking-events': 'אירועי הליכה ברחבי העולם',
        'discover-subtitle': 'גלה מרתונים, פסטיבלים ואירועים תרבותיים מכל רחבי העולם',
        'walking-trails': 'שבילי ומסלולי הליכה',
        'discover-trails': 'גלה שבילי ומסלולי הליכה מפורסמים מכל רחבי העולם',
        'view-on-map': 'הצג במפה',
        'price-comparison': 'השוואת מחירים',
        'analytics': 'ניתוח',
        'calendar-view': 'תצוגת לוח שנה',
        'my-itinerary': 'המסלול שלי',
        'nearby': 'בקרבת מקום',
        'along-route': 'לאורך המסלול',
        'advanced-filters': 'מסננים מתקדמים',
        'map-layers': 'שכבות מפה',
        'advanced-features': 'תכונות מתקדמות',
        'points-of-interest': 'הצג נקודות עניין',
        'enable-clustering': 'הפעל קיבוץ סמנים',
        'category': 'קטגוריה',
        'status': 'סטטוס',
        'all-categories': 'כל הקטגוריות',
        'all-status': 'כל הסטטוסים',
        'active': 'פעיל',
        'upcoming': 'הבאים בלבד',
        'today': 'היום בלבד',
        'events': 'אירועים',
        'routes': 'מסלולים',
        'categories': 'קטגוריות',
        'regions': 'אזורים',
        'next-major-event': 'האירוע הגדול הבא',
        'explore-the-world': 'חקור את העולם',
        'globe-description': 'העבר את העכבר מעל מדינות כדי לראות את צפיפות האירועים. לחץ כדי לחקור את האזור הזה במפה.',
        'current-weather': 'מזג אוויר נוכחי',
        'events-you-might-like': 'אירועים שאולי תאהב',
        'upcoming-events': 'אירועים קרובים',
        'view-all-events': 'הצג את כל האירועים',
        'famous-walking-trails': 'שבילי הליכה מפורסמים',
        'view-trail': 'הצג שביל',
        'explore-all-trails': 'חקור את כל השבילים',
        'what-our-users-say': 'מה המשתמשים שלנו אומרים',
        'your-achievements': 'ההישגים שלך',
        'live-activity-feed': 'פיד פעילות חי',
        'live-activity-description': 'ראה מה קורה עכשיו בקהילה',
        'events-by-category': 'אירועים לפי קטגוריה',
        'event': 'אירוע',
        'events-plural': 'אירועים',
        'global-coverage': 'כיסוי גלובלי',
        'global-coverage-desc': 'אירועים ושבילים מכל היבשות. חקור מרתונים מפורסמים, פסטיבלים תרבותיים ושבילי הליכה אגדיים ברחבי העולם.',
        'spatial-queries': 'שאילתות מרחביות מתקדמות',
        'spatial-queries-desc': 'שאילתות מרחביות חזקות מאפשרות לך למצוא אירועים לפי מיקום, מרחק, מסלולים ואזורים מותאמים אישית. מופעל על ידי PostGIS.',
        'progressive-web-app': 'אפליקציית אינטרנט מתקדמת',
        'progressive-web-app-desc': 'אפליקציית אינטרנט מתקדמת שעובדת במצב לא מקוון. התקן במכשיר שלך וחקור אירועים גם ללא אינטרנט.',
        'days': 'ימים',
        'hours': 'שעות',
        'min': 'דקות',
        'sec': 'שניות',
        'event-started': 'האירוע התחיל!',
        'no-recommendations': 'אין המלצות זמינות כרגע.',
        'view': 'הצג',
        'perfect-for-walking': 'מושלם להליכה',
        'your-location': 'המיקום שלך',
        'enable-location-for-weather': 'הפעל מיקום למזג אוויר',
        'search-placeholder': 'חפש אירועים, שבילים או מיקומים...',
        'interactive-maps': 'מפות אינטראקטיביות',
        'works-offline': 'עובד במצב לא מקוון',
        'event-calendar': 'יומן אירועים',
        'month': 'חודש',
        'week': 'שבוע',
        'day': 'יום',
        'list': 'רשימה',
        'filter-by-category': 'סנן לפי קטגוריה',
        'filter-by-status': 'סנן לפי סטטוס',
        'no-description': 'אין תיאור זמין.',
        'no-events-found': 'לא נמצאו אירועים. נסה להתאים את המסננים שלך.',
        'update-available': 'עדכון זמין! גרסה חדשה של האפליקציה מוכנה.',
        'update-now': 'עדכן עכשיו',
        'install-app': 'התקן אפליקציה',
        'install-app-desc': 'הוסף למסך הבית לגישה מהירה',
        'install': 'התקן',
        'compare': 'השווה',
        'difficulty-calculator': 'מחשבון קושי',
        'group-planning': 'תכנון קבוצה',
        'photo-gallery': 'גלריית תמונות',
        'trail-difficulty-calculator': 'מחשבון קושי שביל',
        'find-trails-match': 'מצא שבילים התואמים לרמת הכושר שלך',
        'fitness-level': 'רמת כושר',
        'beginner': 'מתחיל',
        'novice': 'מתחיל',
        'intermediate': 'בינוני',
        'advanced': 'מתקדם',
        'expert': 'מומחה',
        'hiking-experience': 'ניסיון טיולים',
        'first-time': 'פעם ראשונה',
        'a-few-hikes': 'כמה טיולים',
        'regular-hiker': 'מטייל קבוע',
        'experienced': 'מנוסה',
        'professional': 'מקצועי',
        'age': 'גיל',
        'health-conditions': 'יש לי בעיות בריאות שעלולות להשפיע על טיולים',
        'calculate': 'חשב',
        'create-trail-group': 'צור קבוצת שביל',
        'group-name': 'שם הקבוצה',
        'my-trail-group': 'קבוצת השביל שלי',
        'select-trail': 'בחר שביל',
        'choose-trail': 'בחר שביל...',
        'date': 'תאריך',
        'invite-members': 'הזמן חברים (אימיילים מופרדים בפסיקים)',
        'create-group': 'צור קבוצה',
        'trails': 'שבילים',
        'latitude': 'קו רוחב',
        'longitude': 'קו אורך',
        'radius-m': 'רדיוס (מ)',
        'find-nearby': 'מצא בקרבת מקום',
        'reset': 'איפוס',
        'route': 'מסלול',
        'buffer-m': 'חיץ (מ)',
        'events-along-route': 'אירועים לאורך המסלול',
        'switch-to-3d': 'עבור ל-3D',
        'ar-trail-finder': 'מציאת שביל AR',
        'weather-overlay': 'שכבת מזג אוויר',
        'difficulty-heat-map': 'מפת חום קושי',
        'custom-markers': 'סמנים מותאמים אישית',
        'time-lapse': 'צילום מהיר',
        'offline-download': 'הורדה במצב לא מקוון',
        'multi-layer-comparison': 'השוואה מרובת שכבות',
        'start-route-planning': 'התחל תכנון מסלול',
        'live-trail-conditions': 'תנאי שביל חיים',
        'world-walking-events': 'אירועי הליכה בעולם',
        'app-title': 'אירועי הליכה בעולם',
        'app-description': 'מצא אירועים, מסלולים ושבילים ברחבי העולם',
        'km': 'ק"מ',
        'm': 'מ',
        'no-items-found': 'לא נמצאו פריטים',
        'try-adjusting-filters': 'נסה להתאים את המסננים או מונחי החיפוש כדי למצוא את מה שאתה מחפש.',
        'explore-home': 'חקור בית',
        'skip-tour': 'דלג על סיור',
        'previous': 'הקודם',
        'next': 'הבא',
        'tour-step-0-title': 'ברוכים הבאים לאירועי הליכה בעולם!',
        'tour-step-0-desc': 'זה הבסיס הביתי שלך. לחץ כאן בכל עת כדי לחזור לדף הבית.',
        'tour-step-1-title': 'חיפוש גלובלי',
        'tour-step-1-desc': 'חפש אירועים, שבילים ומיקומים ברחבי העולם. נסה גם חיפוש קולי!',
        'tour-step-2-title': 'התאם את החוויה שלך',
        'tour-step-2-desc': 'שנה ערכות נושא, החלף שפות והתאם הגדרות נגישות.',
        'tour-step-3-title': 'אפשרויות נגישות',
        'tour-step-3-desc': 'התאם את גודל הגופן, הניגודיות ותכונות נגישות אחרות כאן.',
        'compare-trails': 'השווה שבילים',
        'compare-count': '(0/3)',
        'easy': 'קל',
        'moderate': 'בינוני',
        'hard': 'קשה',
        'expert-difficulty': 'מומחה',
        'no-trails-found': 'לא נמצאו שבילים. נסה להתאים את המסננים.'
      }
    },

    init() {
      this.detectLanguage();
      this.createLanguageSwitcher();
      this.loadLanguage();
    },

    detectLanguage() {
      if (!localStorage.getItem('language')) {
        // Detect from browser
        const browserLang = navigator.language.split('-')[0];
        if (this.languages[browserLang]) {
          localStorage.setItem('language', browserLang);
        } else {
          // Detect from geolocation (simplified)
          this.detectFromLocation();
        }
      }
    },

    detectFromLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          position => {
            // Simplified: would use reverse geocoding API in production
            const defaultLang = 'en';
            if (!localStorage.getItem('language')) {
              localStorage.setItem('language', defaultLang);
            }
          },
          () => {
            if (!localStorage.getItem('language')) {
              localStorage.setItem('language', 'en');
            }
          }
        );
      }
    },

    createLanguageSwitcher() {
      const navbar = document.querySelector('.navbar .collapse');
      if (!navbar) return;

      const langSwitcher = document.createElement('div');
      langSwitcher.className = 'language-switcher';
      langSwitcher.innerHTML = `
        <button class="btn btn-sm btn-outline-light" id="lang-toggle">
          <i class="bi bi-globe"></i> <span id="current-lang">EN</span>
        </button>
        <div class="language-menu">
          ${Object.entries(this.languages).map(([code, lang]) => `
            <button class="lang-option" data-lang="${code}">
              ${lang.name}
            </button>
          `).join('')}
        </div>
      `;

      navbar.appendChild(langSwitcher);

      document.getElementById('lang-toggle')?.addEventListener('click', (e) => {
        e.stopPropagation();
        langSwitcher.querySelector('.language-menu').classList.toggle('show');
      });

      document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', () => {
          const lang = btn.dataset.lang;
          this.setLanguage(lang);
          langSwitcher.querySelector('.language-menu').classList.remove('show');
        });
      });

      document.addEventListener('click', () => {
        langSwitcher.querySelector('.language-menu')?.classList.remove('show');
      });
    },

    setLanguage(lang) {
      localStorage.setItem('language', lang);
      const langData = this.languages[lang];
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', langData.rtl ? 'rtl' : 'ltr');
      this.translatePage(lang);
      const langEl = document.getElementById('current-lang');
      if (langEl) langEl.textContent = lang.toUpperCase();
    },

    translatePage(lang) {
      const translations = this.translations[lang] || this.translations.en;
      
      // Translate all elements with data-i18n attribute
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[key]) {
          // Preserve icon if it exists
          const icon = el.querySelector('i');
          if (icon) {
            el.innerHTML = icon.outerHTML + ' ' + translations[key];
          } else {
            el.textContent = translations[key];
          }
        }
      });
      
      // Translate placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (translations[key]) {
          el.placeholder = translations[key];
        }
      });
      
      // Translate common text patterns
      const textPatterns = [
        { selector: 'h1.hero-title', keys: ['discover-events', 'walking-events', 'walking-trails'] },
        { selector: '.hero-subtitle, p.text-muted', keys: ['explore-subtitle', 'discover-subtitle', 'discover-trails'] },
        { selector: 'a[href*="map"]', keys: ['explore-map', 'view-on-map'] },
        { selector: 'a[href*="trails"]', keys: ['browse-trails'] },
        { selector: 'a[href*="events"]', keys: ['view-events'] },
        { selector: '#price-comparison-btn', keys: ['price-comparison'] },
        { selector: '#analytics-btn', keys: ['analytics'] },
        { selector: '#calendar-view-toggle', keys: ['calendar-view'] },
        { selector: '#itinerary-builder-btn', keys: ['my-itinerary'] },
        { selector: '.card-title', keys: ['nearby', 'along-route', 'advanced-filters', 'map-layers', 'advanced-features'] },
        { selector: 'label[for="categoryFilter"]', keys: ['category'] },
        { selector: 'label[for="statusFilter"]', keys: ['status'] },
        { selector: 'label[for="showPOI"]', keys: ['points-of-interest'] },
        { selector: 'label[for="enableClustering"]', keys: ['enable-clustering'] },
        { selector: 'option[value=""]', keys: ['all-categories', 'all-status'] },
        { selector: '.stats-label', keys: ['events', 'routes', 'categories', 'regions'] }
      ];
      
      // Translate page title
      const titleEl = document.querySelector('[data-i18n-title]');
      if (titleEl && translations['app-title']) {
        document.title = translations['app-title'];
      }
      
      // Translate meta description
      const metaDesc = document.querySelector('meta[name="description"][data-i18n-meta]');
      if (metaDesc && translations['app-description']) {
        metaDesc.setAttribute('content', translations['app-description']);
      }
      
      // Translate distance units (km/m)
      document.querySelectorAll('[data-i18n-distance-km]').forEach(el => {
        const text = el.textContent.trim();
        const num = text.replace(/[^\d.]/g, '');
        if (num && translations['km']) {
          el.textContent = `${num} ${translations['km']}`;
        }
      });
      document.querySelectorAll('[data-i18n-distance-m]').forEach(el => {
        const text = el.textContent.trim();
        const num = text.replace(/[^\d.]/g, '');
        if (num && translations['m']) {
          el.textContent = `${num} ${translations['m']}`;
        }
      });
      
      // Translate compare count
      document.querySelectorAll('[data-i18n-compare-count]').forEach(el => {
        const text = el.textContent.trim();
        const match = text.match(/\((\d+)\/(\d+)\)/);
        if (match) {
          el.textContent = `(${match[1]}/${match[2]})`;
        }
      });
      
      // Translate tour popups
      document.querySelectorAll('[data-i18n-tour]').forEach(el => {
        const key = el.dataset.i18nTour;
        if (translations[key]) {
          el.textContent = translations[key];
        }
      });
      
      textPatterns.forEach(pattern => {
        document.querySelectorAll(pattern.selector).forEach((el, idx) => {
          const key = pattern.keys[idx];
          if (key && translations[key] && el.textContent.trim()) {
            // Only translate if text matches English version
            const englishText = this.translations.en[key];
            if (englishText && el.textContent.includes(englishText)) {
              const icon = el.querySelector('i');
              if (icon) {
                el.innerHTML = icon.outerHTML + ' ' + translations[key];
              } else {
                el.textContent = el.textContent.replace(englishText, translations[key]);
              }
            }
          }
        });
      });
    },

    loadLanguage() {
      const lang = localStorage.getItem('language') || 'en';
      this.setLanguage(lang);
    }
  };

  // ====== 3. ADVANCED ACCESSIBILITY FEATURES ======
  const accessibility = {
    init() {
      this.createAccessibilityPanel();
      this.initKeyboardNavigation();
      this.initScreenReaderSupport();
    },

    createAccessibilityPanel() {
      // Remove any existing panel first
      const existing = document.querySelector('.accessibility-panel');
      if (existing) {
        existing.remove();
      }
      
      const panel = document.createElement('div');
      panel.className = 'accessibility-panel';
      panel.style.cssText = 'position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 99999 !important; display: block !important; visibility: visible !important;';
      panel.innerHTML = `
        <button class="accessibility-toggle" title="Accessibility Options" style="width: 50px; height: 50px; border-radius: 50%; background: #ffc107 !important; color: #000 !important; border: 2px solid #000 !important; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3) !important; display: flex !important; align-items: center; justify-content: center;">
          <i class="bi bi-person"></i>
        </button>
        <div class="accessibility-menu">
          <h6>Accessibility Options</h6>
          <div class="accessibility-option">
            <label>Font Size</label>
            <input type="range" id="font-size-slider" min="12" max="24" value="16" step="1">
            <span id="font-size-value">16px</span>
          </div>
          <div class="accessibility-option">
            <label>
              <input type="checkbox" id="high-contrast"> High Contrast
            </label>
          </div>
          <div class="accessibility-option">
            <label>
              <input type="checkbox" id="colorblind-mode"> Colorblind Mode
            </label>
          </div>
          <div class="accessibility-option">
            <label>
              <input type="checkbox" id="screen-reader-mode"> Screen Reader Mode
            </label>
          </div>
          <button class="btn btn-sm btn-primary w-100 mt-2" onclick="accessibility.resetAll()">Reset All</button>
        </div>
      `;
      document.body.appendChild(panel);
      
      // Force visibility
      panel.style.display = 'block';
      panel.style.visibility = 'visible';
      panel.style.opacity = '1';

      document.querySelector('.accessibility-toggle')?.addEventListener('click', () => {
        panel.querySelector('.accessibility-menu').classList.toggle('show');
      });

      document.getElementById('font-size-slider')?.addEventListener('input', (e) => {
        const size = e.target.value;
        document.documentElement.style.fontSize = size + 'px';
        document.getElementById('font-size-value').textContent = size + 'px';
        localStorage.setItem('fontSize', size);
      });

      document.getElementById('high-contrast')?.addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.checked);
        localStorage.setItem('highContrast', e.target.checked);
      });

      document.getElementById('colorblind-mode')?.addEventListener('change', (e) => {
        document.body.classList.toggle('colorblind-mode', e.target.checked);
        localStorage.setItem('colorblindMode', e.target.checked);
      });

      document.getElementById('screen-reader-mode')?.addEventListener('change', (e) => {
        document.body.classList.toggle('screen-reader-mode', e.target.checked);
        localStorage.setItem('screenReaderMode', e.target.checked);
      });

      this.loadAccessibilitySettings();
    },

    initKeyboardNavigation() {
      // Skip to main content
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-to-main';
      skipLink.textContent = 'Skip to main content';
      document.body.insertBefore(skipLink, document.body.firstChild);

      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Alt + S: Search
        if (e.altKey && e.key === 's') {
          e.preventDefault();
          document.getElementById('global-search')?.focus();
        }
        // Alt + M: Menu
        if (e.altKey && e.key === 'm') {
          e.preventDefault();
          document.querySelector('.navbar-toggler')?.click();
        }
        // Alt + H: Home
        if (e.altKey && e.key === 'h') {
          e.preventDefault();
          window.location.href = '/';
        }
      });
    },

    initScreenReaderSupport() {
      // Add ARIA labels
      document.querySelectorAll('button').forEach(btn => {
        if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
          btn.setAttribute('aria-label', 'Button');
        }
      });

      // Add skip links
      document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.setAttribute('aria-label', link.textContent || 'Link');
      });
    },

    loadAccessibilitySettings() {
      const fontSize = localStorage.getItem('fontSize');
      if (fontSize) {
        document.documentElement.style.fontSize = fontSize + 'px';
        document.getElementById('font-size-slider').value = fontSize;
        document.getElementById('font-size-value').textContent = fontSize + 'px';
      }

      if (localStorage.getItem('highContrast') === 'true') {
        document.body.classList.add('high-contrast');
        document.getElementById('high-contrast').checked = true;
      }

      if (localStorage.getItem('colorblindMode') === 'true') {
        document.body.classList.add('colorblind-mode');
        document.getElementById('colorblind-mode').checked = true;
      }

      if (localStorage.getItem('screenReaderMode') === 'true') {
        document.body.classList.add('screen-reader-mode');
        document.getElementById('screen-reader-mode').checked = true;
      }
    },

    resetAll() {
      localStorage.removeItem('fontSize');
      localStorage.removeItem('highContrast');
      localStorage.removeItem('colorblindMode');
      localStorage.removeItem('screenReaderMode');
      document.documentElement.style.fontSize = '';
      document.body.classList.remove('high-contrast', 'colorblind-mode', 'screen-reader-mode');
      document.getElementById('font-size-slider').value = 16;
      document.getElementById('font-size-value').textContent = '16px';
      document.getElementById('high-contrast').checked = false;
      document.getElementById('colorblind-mode').checked = false;
      document.getElementById('screen-reader-mode').checked = false;
    }
  };

  window.accessibility = accessibility;

  // ====== 4. PWA ENHANCEMENTS ======
  const pwaEnhancements = {
    init() {
      this.initPushNotifications();
      this.initBackgroundSync();
      this.initInstallPrompt();
    },

    initPushNotifications() {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('Push notifications enabled');
          }
        });
      }
    },

    initBackgroundSync() {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          // Background sync is available
          console.log('Background sync available');
        });
      }
    },

    initInstallPrompt() {
      let deferredPrompt;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        this.showInstallBanner();
      });

      document.getElementById('pwa-install-btn')?.addEventListener('click', () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted install');
            }
            deferredPrompt = null;
            document.getElementById('pwa-install-banner')?.classList.add('d-none');
          });
        }
      });
    },

    showInstallBanner() {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.classList.remove('d-none');
      }
    }
  };

  // ====== 5. SOCIAL MEDIA INTEGRATION ======
  const socialMedia = {
    init() {
      this.createShareButtons();
      this.initSocialLogin();
    },

    createShareButtons() {
      // Add share buttons to shareable content
      document.querySelectorAll('.event-card, .trail-card').forEach(card => {
        if (!card.querySelector('.social-share-buttons')) {
          const shareButtons = document.createElement('div');
          shareButtons.className = 'social-share-buttons';
          shareButtons.innerHTML = `
            <button class="btn btn-sm btn-outline-primary" onclick="socialMedia.share('facebook', this)">
              <i class="bi bi-facebook"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="socialMedia.share('twitter', this)">
              <i class="bi bi-twitter"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="socialMedia.share('pinterest', this)">
              <i class="bi bi-pinterest"></i>
            </button>
            <button class="btn btn-sm btn-outline-success" onclick="socialMedia.share('whatsapp', this)">
              <i class="bi bi-whatsapp"></i>
            </button>
          `;
          card.appendChild(shareButtons);
        }
      });
    },

    share(platform, button) {
      const url = window.location.href;
      const title = document.title;
      const text = document.querySelector('meta[name="description"]')?.content || '';

      const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(text)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
      };

      if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      }
    },

    initSocialLogin() {
      // Social login buttons (would integrate with OAuth in production)
      const loginButtons = document.querySelectorAll('.social-login-btn');
      loginButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const provider = btn.dataset.provider;
          // In production, would redirect to OAuth endpoint
          console.log(`Login with ${provider}`);
        });
      });
    }
  };

  window.socialMedia = socialMedia;

  // ====== 6. PERFORMANCE OPTIMIZATIONS ======
  const performance = {
    init() {
      this.initLazyLoading();
      this.initInfiniteScroll();
      this.initImageOptimization();
    },

    initLazyLoading() {
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
              }
            }
          });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
          imageObserver.observe(img);
        });
      }
    },

    initInfiniteScroll() {
      const containers = document.querySelectorAll('.infinite-scroll-container');
      containers.forEach(container => {
        let page = 1;
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              page++;
              this.loadMoreContent(container, page);
            }
          });
        });

        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        container.appendChild(sentinel);
        observer.observe(sentinel);
      });
    },

    loadMoreContent(container, page) {
      // In production, would fetch from API
      console.log(`Loading page ${page}`);
    },

    initImageOptimization() {
      // Add loading="lazy" to all images
      document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('loading')) {
          img.setAttribute('loading', 'lazy');
        }
      });
    }
  };

  // ====== 7. ADVANCED SEARCH & FILTERING ======
  const advancedSearch = {
    init() {
      this.createSearchBar();
      this.initVoiceSearch();
      this.initSearchHistory();
      this.initSavedSearches();
    },

    createSearchBar() {
      const navbar = document.querySelector('.navbar .collapse');
      if (!navbar) return;

      const searchContainer = document.createElement('div');
      searchContainer.className = 'global-search-container';
      searchContainer.innerHTML = `
        <div class="input-group">
          <input type="text" id="global-search" class="form-control" placeholder="Search events, trails..." 
                 aria-label="Search">
          <button class="btn btn-outline-light" type="button" id="voice-search-btn" title="Voice Search">
            <i class="bi bi-mic"></i>
          </button>
          <button class="btn btn-outline-light" type="button" id="search-btn">
            <i class="bi bi-search"></i>
          </button>
        </div>
        <div class="search-results" id="search-results"></div>
      `;

      navbar.insertBefore(searchContainer, navbar.firstChild);

      const searchInput = document.getElementById('global-search');
      let searchTimeout;

      searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length > 2) {
          searchTimeout = setTimeout(() => {
            this.performSearch(query);
          }, 300);
        } else {
          document.getElementById('search-results').innerHTML = '';
        }
      });

      document.getElementById('search-btn')?.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
          this.performSearch(query, true);
        }
      });

      document.getElementById('voice-search-btn')?.addEventListener('click', () => {
        this.startVoiceSearch();
      });
    },

    performSearch(query, fullSearch = false) {
      fetch(`/api/events/?search=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          const events = data.results?.features || data.features || [];
          this.displaySearchResults(events, query, fullSearch);
          this.saveToHistory(query);
        })
        .catch(err => console.error('Search error:', err));
    },

    displaySearchResults(results, query, fullSearch) {
      const resultsContainer = document.getElementById('search-results');
      if (!resultsContainer) return;

      if (fullSearch) {
        // Redirect to search results page
        window.location.href = `/search/?q=${encodeURIComponent(query)}`;
        return;
      }

      if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item">No results found</div>';
        return;
      }

      resultsContainer.innerHTML = results.slice(0, 5).map(event => {
        const props = event.properties || {};
        return `
          <div class="search-result-item" onclick="window.location.href='/map/?event=${event.id || props.id}'">
            <strong>${props.title || event.title}</strong>
            <small>${props.category?.name || 'Event'}</small>
          </div>
        `;
      }).join('');

      resultsContainer.classList.add('show');
    },

    initVoiceSearch() {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        document.getElementById('voice-search-btn')?.addEventListener('click', () => {
          recognition.start();
          document.getElementById('voice-search-btn').innerHTML = '<i class="bi bi-mic-fill"></i>';
        });

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          document.getElementById('global-search').value = transcript;
          this.performSearch(transcript, true);
          document.getElementById('voice-search-btn').innerHTML = '<i class="bi bi-mic"></i>';
        };

        recognition.onerror = () => {
          document.getElementById('voice-search-btn').innerHTML = '<i class="bi bi-mic"></i>';
        };
      } else {
        document.getElementById('voice-search-btn')?.setAttribute('disabled', 'true');
      }
    },

    initSearchHistory() {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      // Display history in search dropdown
    },

    saveToHistory(query) {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      if (!history.includes(query)) {
        history.unshift(query);
        if (history.length > 10) history.pop();
        localStorage.setItem('searchHistory', JSON.stringify(history));
      }
    },

    initSavedSearches() {
      // Saved searches functionality
      const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      // Display saved searches
    }
  };

  // ====== 8. USER PERSONALIZATION ======
  const personalization = {
    init() {
      this.loadUserPreferences();
      this.initFavorites();
      this.initActivityFeed();
    },

    loadUserPreferences() {
      const prefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      // Apply preferences
    },

    initFavorites() {
      document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.itemId;
          const itemType = btn.dataset.itemType;
          this.toggleFavorite(itemId, itemType, btn);
        });
      });
    },

    toggleFavorite(itemId, itemType, btn) {
      const favorites = JSON.parse(localStorage.getItem('favorites') || '{}');
      if (!favorites[itemType]) favorites[itemType] = [];

      const index = favorites[itemType].indexOf(itemId);
      if (index > -1) {
        favorites[itemType].splice(index, 1);
        btn.classList.remove('active');
      } else {
        favorites[itemType].push(itemId);
        btn.classList.add('active');
      }

      localStorage.setItem('favorites', JSON.stringify(favorites));
    },

    initActivityFeed() {
      // Activity feed would be loaded from API
      const feed = document.getElementById('activity-feed');
      if (feed) {
        this.loadActivityFeed();
      }
    },

    loadActivityFeed() {
      // Fetch activity feed from API
    }
  };

  // ====== 9. ANALYTICS & INSIGHTS DASHBOARD ======
  const analytics = {
    init() {
      this.trackPageView();
      this.initUserAnalytics();
    },

    trackPageView() {
      const page = window.location.pathname;
      const views = JSON.parse(localStorage.getItem('pageViews') || '{}');
      views[page] = (views[page] || 0) + 1;
      localStorage.setItem('pageViews', JSON.stringify(views));
    },

    initUserAnalytics() {
      // Track user interactions
      document.addEventListener('click', (e) => {
        const target = e.target.closest('a, button');
        if (target) {
          this.trackEvent('click', target.textContent || target.href);
        }
      });
    },

    trackEvent(type, data) {
      const events = JSON.parse(localStorage.getItem('userEvents') || '[]');
      events.push({ type, data, timestamp: new Date().toISOString() });
      if (events.length > 100) events.shift();
      localStorage.setItem('userEvents', JSON.stringify(events));
    }
  };

  // ====== 10. COMMUNITY FEATURES ======
  const community = {
    init() {
      this.initUserProfiles();
      this.initFollowSystem();
      this.initChallenges();
      this.initLeaderboards();
    },

    initUserProfiles() {
      // User profile functionality
      const profileBtn = document.getElementById('user-profile-btn');
      if (profileBtn) {
        profileBtn.addEventListener('click', () => {
          this.showUserProfile();
        });
      }
    },

    showUserProfile() {
      // Display user profile modal
    },

    initFollowSystem() {
      document.querySelectorAll('.follow-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const userId = btn.dataset.userId;
          this.toggleFollow(userId, btn);
        });
      });
    },

    toggleFollow(userId, btn) {
      const following = JSON.parse(localStorage.getItem('following') || '[]');
      const index = following.indexOf(userId);
      
      if (index > -1) {
        following.splice(index, 1);
        btn.textContent = 'Follow';
        btn.classList.remove('active');
      } else {
        following.push(userId);
        btn.textContent = 'Following';
        btn.classList.add('active');
      }

      localStorage.setItem('following', JSON.stringify(following));
    },

    initChallenges() {
      // Community challenges
    },

    initLeaderboards() {
      // Leaderboards
    }
  };

  // Initialize all features
  function init() {
    // Initialize accessibility FIRST so it's always visible
    try {
      accessibility.init();
    } catch (e) {
      console.error('Accessibility init failed:', e);
      // Try to create panel anyway
      if (typeof accessibility !== 'undefined' && accessibility.createAccessibilityPanel) {
        accessibility.createAccessibilityPanel();
      }
    }
    darkMode.init();
    i18n.init();
    pwaEnhancements.init();
    socialMedia.init();
    performance.init();
    advancedSearch.init();
    personalization.init();
    analytics.init();
    community.init();
  }

  // Initialize immediately if DOM is ready, otherwise wait
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Fallback: Ensure accessibility panel exists after a short delay
  setTimeout(() => {
    if (!document.querySelector('.accessibility-panel')) {
      console.warn('Accessibility panel not found, creating fallback...');
      if (typeof accessibility !== 'undefined' && accessibility.createAccessibilityPanel) {
        accessibility.createAccessibilityPanel();
      }
    }
  }, 1000);

})();

