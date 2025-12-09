/**
 * PWA Registration and Install Prompt
 * Handles service worker registration and "Add to Home Screen" functionality
 */

(function() {
  'use strict';

  // Check if browser supports service workers
  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service Workers not supported');
    return;
  }

  // Service Worker Registration
  let registration = null;

  /**
   * Register Service Worker
   */
  async function registerServiceWorker() {
    // SERVICE WORKER COMPLETELY DISABLED - DO NOTHING
    // This function is never called, but exists to prevent errors if referenced
    // DO NOT REGISTER - causes scope errors
    // Return immediately without any service worker registration
    return Promise.resolve();
    
    // All code below is disabled
    /*
    try {
      registration = await navigator.serviceWorker.register('/static/service-worker.js', {
        scope: '/static/'
      });
      console.log('[PWA] Service Worker registered:', registration.scope);

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            showUpdateNotification();
          }
        });
      });

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
    */
  }

  /**
   * Show update notification
   */
  function showUpdateNotification() {
    const updateBanner = document.getElementById('pwa-update-banner');
    if (updateBanner) {
      updateBanner.classList.remove('d-none');
    }
  }

  /**
   * Handle service worker update
   */
  function handleUpdate() {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page after update
      window.location.reload();
    }
  }

  /**
   * Install Prompt Handling
   */
  let deferredPrompt = null;
  let installButton = null;

  /**
   * Show install prompt
   */
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] Install prompt available');
    
    // Prevent default browser install prompt
    e.preventDefault();
    
    // Store event for later use
    deferredPrompt = e;
    
    // Show custom install button
    showInstallButton();
  });

  /**
   * Show install button in UI
   */
  function showInstallButton() {
    // Check if button already exists
    installButton = document.getElementById('pwa-install-btn');
    
    if (!installButton) {
      // Create install button
      installButton = document.createElement('button');
      installButton.id = 'pwa-install-btn';
      installButton.className = 'btn btn-info btn-sm position-fixed bottom-0 end-0 m-3';
      installButton.style.zIndex = '1080';
      installButton.innerHTML = '<i class="bi bi-download"></i> Install App';
      installButton.addEventListener('click', installApp);
      
      document.body.appendChild(installButton);
    }
    
    installButton.classList.remove('d-none');
  }

  /**
   * Install app
   */
  async function installApp() {
    if (!deferredPrompt) {
      return;
    }

    // Show install prompt
    deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log('[PWA] Install outcome:', outcome);
    
    // Clear deferred prompt
    deferredPrompt = null;
    
    // Hide install button
    if (installButton) {
      installButton.classList.add('d-none');
    }
  }

  /**
   * Handle app installed event
   */
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    
    // Hide install button
    if (installButton) {
      installButton.classList.add('d-none');
    }
    
    // Show success message
    showToast('App installed successfully!', 'success');
  });

  /**
   * Check if app is already installed
   */
  function checkIfInstalled() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] Running as installed app');
      return true;
    }
    
    // Check if installed on iOS
    if (window.navigator.standalone === true) {
      console.log('[PWA] Running as installed app (iOS)');
      return true;
    }
    
    return false;
  }

  /**
   * Show toast notification
   */
  function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toast');
    const toastBody = document.getElementById('toast-body');
    
    if (toastEl && toastBody) {
      toastEl.className = `toast align-items-center text-bg-${type} border-0 position-fixed top-0 start-50 translate-middle-x mt-3`;
      toastBody.textContent = message;
      const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
      toast.show();
    } else {
      console.log('[PWA]', message);
    }
  }

  /**
   * Initialize PWA
   */
  function init() {
    // Service worker registration COMPLETELY DISABLED
    // Do not call registerServiceWorker at all
    return;
    
    // All code below is disabled
    /*
    // Register service worker
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', registerServiceWorker);
    } else {
      registerServiceWorker();
    }

    // Check if already installed
    if (checkIfInstalled()) {
      console.log('[PWA] App is already installed');
    }

    // Wire up update button if it exists
    const updateButton = document.getElementById('pwa-update-btn');
    if (updateButton) {
      updateButton.addEventListener('click', handleUpdate);
    }
    */
  }

  // PWA initialization COMPLETELY DISABLED
  // init(); // DO NOT CALL - prevents service worker errors

  // Export for external use
  window.PWA = {
    install: installApp,
    update: handleUpdate,
    isInstalled: checkIfInstalled,
    showInstallButton: showInstallButton
  };

  // Show the always-visible install button
  function showAlwaysVisibleInstallButton() {
    // Don't show if already installed
    if (checkIfInstalled()) {
      const btn = document.getElementById('pwa-install-always');
      if (btn) btn.style.display = 'none';
      return;
    }

    // Get the button from HTML (it's already in base.html)
    const alwaysVisibleBtn = document.getElementById('pwa-install-always');
    if (!alwaysVisibleBtn) {
      console.warn('[PWA] Install button not found in HTML');
      return;
    }

    // Wire up click handler (only once) - use direct assignment to ensure it works
    if (!alwaysVisibleBtn.dataset.handlerAttached) {
      alwaysVisibleBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[PWA] Install button clicked');
        console.log('[PWA] deferredPrompt available:', !!deferredPrompt);
        
        if (deferredPrompt) {
          // Use the browser's install prompt if available
          console.log('[PWA] Using browser install prompt');
          installApp();
        } else {
          // Show instructions for manual install
          console.log('[PWA] Showing manual install instructions');
          showInstallInstructions();
        }
        return false;
      };
      alwaysVisibleBtn.dataset.handlerAttached = 'true';
      console.log('[PWA] Click handler attached to install button');
    }

    // Make sure button is visible
    alwaysVisibleBtn.style.display = 'block';
    alwaysVisibleBtn.style.visibility = 'visible';
    alwaysVisibleBtn.style.opacity = '1';
    alwaysVisibleBtn.style.pointerEvents = 'auto';
    alwaysVisibleBtn.style.cursor = 'pointer';
    console.log('[PWA] Always-visible install button shown and ready');
  }

  // Show install instructions for manual install
  function showInstallInstructions() {
    console.log('[PWA] Attempting to show install instructions');
    
    // Simple, reliable method - create a visible overlay div
    const existingOverlay = document.getElementById('pwa-install-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'pwa-install-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;';
    
    // Create content box
    const contentBox = document.createElement('div');
    contentBox.style.cssText = 'background: white; border-radius: 10px; padding: 30px; max-width: 500px; width: 100%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative; color: #000000 !important;';
    
    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = 'position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 28px; cursor: pointer; color: #666; padding: 5px 10px; line-height: 1;';
    closeBtn.onclick = () => overlay.remove();
    
    // Create title
    const title = document.createElement('h4');
    title.textContent = 'Install This App';
    title.style.cssText = 'margin-top: 0; margin-bottom: 20px; color: #0dcaf0; font-size: 24px; font-weight: bold;';
    
    // Create content
    const content = document.createElement('div');
    content.style.cssText = 'line-height: 1.8; color: #000000 !important; font-size: 16px;';
    content.innerHTML = `
      <p style="margin-bottom: 15px;"><strong>Chrome/Edge (Desktop):</strong><br>
      Click the install icon (⊕) in the address bar, or go to Menu (⋮) → "Install app"</p>
      <p style="margin-bottom: 15px;"><strong>Chrome (Android):</strong><br>
      Tap Menu (⋮) → "Add to Home screen"</p>
      <p style="margin-bottom: 15px;"><strong>Safari (iOS):</strong><br>
      Tap Share button (□↑) → "Add to Home Screen"</p>
      <p style="margin-bottom: 15px;"><strong>Firefox (Android):</strong><br>
      Tap Menu (⋮) → "Install"</p>
    `;
    
    // Create note
    const note = document.createElement('p');
    note.textContent = 'Note: The install option may appear automatically in your browser\'s address bar.';
    note.style.cssText = 'font-size: 0.9em; color: #666; margin: 20px 0;';
    
    // Create close button at bottom
    const bottomCloseBtn = document.createElement('button');
    bottomCloseBtn.textContent = 'Close';
    bottomCloseBtn.style.cssText = 'margin-top: 20px; padding: 12px 24px; background: #0dcaf0; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; font-size: 16px;';
    bottomCloseBtn.onclick = () => overlay.remove();
    
    // Assemble
    contentBox.appendChild(closeBtn);
    contentBox.appendChild(title);
    contentBox.appendChild(content);
    contentBox.appendChild(note);
    contentBox.appendChild(bottomCloseBtn);
    overlay.appendChild(contentBox);
    
    // Close on background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
    
    document.body.appendChild(overlay);
    console.log('[PWA] Install instructions overlay shown with content');
  }

  // Show install button when page loads - try multiple times to ensure it works
  function initInstallButton() {
    showAlwaysVisibleInstallButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstallButton);
  } else {
    initInstallButton();
  }

  // Also try after a short delay in case DOM isn't ready
  setTimeout(initInstallButton, 500);
  setTimeout(initInstallButton, 2000);

  // DO NOT CALL init() - completely disabled
  // init(); // DISABLED

  // ABSOLUTELY DO NOT CALL init() - it's completely disabled
  // The IIFE above does NOT auto-run init()
})();

