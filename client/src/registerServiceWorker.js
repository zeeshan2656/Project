/**
 * ApexFabric PWA Service Worker Registration & Lifecycle Management
 */

export function registerSW({ onUpdate, onSuccess } = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('[ApexFabric PWA] Service Worker registered successfully with scope:', registration.scope);

        // Check if there is already an updated worker waiting
        if (registration.waiting) {
          if (onUpdate) onUpdate(registration);
          window.dispatchEvent(new CustomEvent('apex:sw_update_available', { detail: registration }));
        }

        // Listen for new worker installs
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available, please refresh
                console.log('[ApexFabric PWA] New version available!');
                if (onUpdate) onUpdate(registration);
                window.dispatchEvent(new CustomEvent('apex:sw_update_available', { detail: registration }));
              } else {
                // Content cached for offline use
                console.log('[ApexFabric PWA] Content is cached for offline use.');
                if (onSuccess) onSuccess(registration);
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('[ApexFabric PWA] Service Worker registration failed:', error);
      });

    // Do NOT auto-reload the page on controllerchange behind user's back,
    // as it interrupts active logins, form sessions, and websockets.
    // PWA update notices are handled gracefully through 'apex:sw_update_available'.
  });
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
