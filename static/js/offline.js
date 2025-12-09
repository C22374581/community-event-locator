/**
 * Offline Functionality
 * Handles offline detection, queue management, and offline UI
 */

(function() {
  'use strict';

  let isOnline = navigator.onLine;
  let offlineIndicator = null;

  /**
   * Initialize offline functionality
   */
  function init() {
    createOfflineIndicator();
    setupEventListeners();
    checkOnlineStatus();
  }

  /**
   * Create offline indicator UI
   */
  function createOfflineIndicator() {
    offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-0 w-100 m-0 rounded-0';
    offlineIndicator.style.zIndex = '9999';
    offlineIndicator.style.display = 'none';
    offlineIndicator.innerHTML = `
      <div class="container d-flex align-items-center justify-content-between">
        <div>
          <i class="bi bi-wifi-off"></i>
          <strong>You're offline.</strong> Some features may be limited. Showing cached data.
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
    document.body.insertBefore(offlineIndicator, document.body.firstChild);
  }

  /**
   * Setup online/offline event listeners
   */
  function setupEventListeners() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  /**
   * Handle online event
   */
  function handleOnline() {
    console.log('[Offline] Connection restored');
    isOnline = true;
    updateOfflineIndicator(false);
    
    // Try to sync queued data
    syncQueuedData();
    
    // Show success message
    showToast('Connection restored!', 'success');
  }

  /**
   * Handle offline event
   */
  function handleOffline() {
    console.log('[Offline] Connection lost');
    isOnline = false;
    updateOfflineIndicator(true);
    
    // Show warning message
    showToast('You are now offline. Some features may be limited.', 'warning');
  }

  /**
   * Update offline indicator visibility
   */
  function updateOfflineIndicator(show) {
    if (offlineIndicator) {
      offlineIndicator.style.display = show ? 'block' : 'none';
    }
  }

  /**
   * Check online status
   */
  async function checkOnlineStatus() {
    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch('/health/', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      isOnline = response.ok;
    } catch (error) {
      isOnline = false;
    }
    
    updateOfflineIndicator(!isOnline);
  }

  /**
   * Sync queued data when coming back online
   */
  async function syncQueuedData() {
    // Check if service worker supports background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-events');
        console.log('[Offline] Background sync registered');
      } catch (error) {
        console.error('[Offline] Background sync failed:', error);
      }
    }
  }

  /**
   * Queue action for later sync
   */
  function queueAction(action, data) {
    if (isOnline) {
      // Execute immediately if online
      return executeAction(action, data);
    }

    // Queue for later if offline
    const queue = getQueuedActions();
    queue.push({ action, data, timestamp: Date.now() });
    saveQueuedActions(queue);
    
    console.log('[Offline] Action queued:', action);
    return Promise.resolve({ queued: true });
  }

  /**
   * Get queued actions from localStorage
   */
  function getQueuedActions() {
    try {
      const stored = localStorage.getItem('offline-queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[Offline] Failed to get queued actions:', error);
      return [];
    }
  }

  /**
   * Save queued actions to localStorage
   */
  function saveQueuedActions(queue) {
    try {
      localStorage.setItem('offline-queue', JSON.stringify(queue));
    } catch (error) {
      console.error('[Offline] Failed to save queued actions:', error);
    }
  }

  /**
   * Execute action (placeholder - implement based on your API)
   */
  async function executeAction(action, data) {
    // This would make actual API calls
    // For now, just a placeholder
    console.log('[Offline] Executing action:', action, data);
    return { success: true };
  }

  /**
   * Process queued actions
   */
  async function processQueue() {
    if (!isOnline) {
      return;
    }

    const queue = getQueuedActions();
    if (queue.length === 0) {
      return;
    }

    console.log('[Offline] Processing', queue.length, 'queued actions');

    const results = [];
    for (const item of queue) {
      try {
        const result = await executeAction(item.action, item.data);
        results.push({ ...item, result, success: true });
      } catch (error) {
        results.push({ ...item, error, success: false });
      }
    }

    // Remove successfully processed items
    const failed = results.filter(r => !r.success);
    saveQueuedActions(failed);

    if (results.length > failed.length) {
      showToast(`Synced ${results.length - failed.length} queued actions`, 'success');
    }
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
    }
  }

  /**
   * Check if currently online
   */
  function getOnlineStatus() {
    return isOnline;
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Process queue when coming back online
  window.addEventListener('online', processQueue);

  // Export for external use
  window.Offline = {
    isOnline: getOnlineStatus,
    queueAction: queueAction,
    processQueue: processQueue
  };

})();

