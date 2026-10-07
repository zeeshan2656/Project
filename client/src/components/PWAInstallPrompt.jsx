import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ArrowUp, 
  WifiOff, 
  Wifi, 
  RefreshCw 
} from 'lucide-react';
import { useSite } from '../context/SiteContext';

export function PWAInstallPrompt() {
  const { companyName, whatsappLink } = useSite();
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    if (typeof window !== 'undefined' && window.deferredPWAInstallPrompt) {
      return window.deferredPWAInstallPrompt;
    }
    return null;
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [swRegistration, setSwRegistration] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(null);

  useEffect(() => {
    // 1. Detect if running as installed standalone PWA
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://')
      );
    };

    setIsStandalone(checkStandalone());

    // Check if Chrome reports this PWA is already installed on device
    if ('getInstalledRelatedApps' in navigator) {
      navigator.getInstalledRelatedApps().then((apps) => {
        if (apps && apps.length > 0) {
          setIsStandalone(true);
        }
      }).catch(() => {});
    }

    // 2. Monitor scroll position for "Page Top-up" icon
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 3. Capture beforeinstallprompt event for DIRECT installation
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPWAInstallPrompt = e;
      console.log('[ApexFabric PWA] Native install prompt captured directly.');
    };

    const handleCustomInstallable = (e) => {
      setDeferredPrompt(e.detail || window.deferredPWAInstallPrompt);
    };

    // 4. Capture appinstalled event (immediately hide download icon once installed)
    const handleAppInstalled = () => {
      console.log('[ApexFabric PWA] App was installed successfully on this device.');
      setIsStandalone(true);
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null;
    };

    // 5. Network monitoring
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 4000);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // 6. Service Worker update event
    const handleSwUpdate = (event) => {
      setSwRegistration(event.detail);
      setHasUpdate(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('apex:pwa_installable', handleCustomInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('apex:pwa_installed', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('apex:sw_update_available', handleSwUpdate);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('apex:pwa_installable', handleCustomInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('apex:pwa_installed', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('apex:sw_update_available', handleSwUpdate);
    };
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // DIRECT 1-CLICK NATIVE INSTALLATION (NO INSTRUCTIONS MODAL)
  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPWAInstallPrompt : null);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        console.log(`[ApexFabric PWA] Direct install response:`, choice);
        if (choice && choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.deferredPWAInstallPrompt = null;
        }
      } catch (err) {
        console.warn('[ApexFabric PWA] Direct install prompt error:', err);
      }
    }
  };

  const handleApplyUpdate = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {/* Network Offline Alert Bar */}
      {isOffline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'linear-gradient(90deg, #991B1B 0%, #DC2626 100%)',
          color: '#FFFFFF',
          padding: '0.45rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <WifiOff size={16} />
          <span>Offline Mode Active — Running on Cached Inspection Telemetry</span>
        </div>
      )}

      {showReconnected && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'linear-gradient(90deg, #065F46 0%, #059669 100%)',
          color: '#FFFFFF',
          padding: '0.45rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <Wifi size={16} />
          <span>Connection Restored — Live Sync Active</span>
        </div>
      )}

      {/* Service Worker Update Prompt */}
      {hasUpdate && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99998,
          background: '#0F172A',
          border: '1px solid #38BDF8',
          borderRadius: '14px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          maxWidth: '92vw'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <RefreshCw size={18} color="#38BDF8" className="animate-spin" />
            <span style={{ fontSize: '0.9rem', color: '#F1F5F9', fontWeight: 600 }}>
              New version of {companyName || 'ApexFabric'} ready
            </span>
          </div>
          <button 
            onClick={handleApplyUpdate}
            style={{
              background: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Update
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RIGHT BOTTOM CORNER - TOTAL 3 FLOATING CIRCULAR ACTION BUTTONS            */}
      {/* 1 = Page Top-up (Scroll to top on need)                                  */}
      {/* 2 = WhatsApp round/circle icon                                           */}
      {/* 3 = Download App icon (hidden if already installed)                      */}
      {/* ========================================================================= */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99990,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none' // Allow click-through around buttons
        }}
      >
        {/* 1. PAGE TOP-UP ICON (Visible dynamically on scroll) */}
        {showScrollTop && (
          <div 
            style={{ position: 'relative', pointerEvents: 'auto' }}
            onMouseEnter={() => setHoveredIcon('top')}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <button
              onClick={handleScrollToTop}
              aria-label="Scroll to top of page"
              title="Scroll to Top"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#0F172A',
                border: '2px solid #38BDF8',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(56, 189, 248, 0.35)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredIcon === 'top' ? 'translateY(-3px) scale(1.08)' : 'translateY(0) scale(1)'
              }}
            >
              <ArrowUp size={22} strokeWidth={2.5} />
            </button>

            {/* Tooltip to the left */}
            {hoveredIcon === 'top' && (
              <div style={{
                position: 'absolute',
                right: 'calc(100% + 12px)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
                letterSpacing: '0.02em'
              }}>
                Back to Top
              </div>
            )}
          </div>
        )}

        {/* 2. WHATSAPP ICON (ROUND / CIRCLE SHAPE) */}
        <div 
          style={{ position: 'relative', pointerEvents: 'auto' }}
          onMouseEnter={() => setHoveredIcon('whatsapp')}
          onMouseLeave={() => setHoveredIcon(null)}
        >
          <a
            href={whatsappLink || 'https://wa.me/923008472910'}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: '#25D366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(37, 211, 102, 0.5), 0 0 10px rgba(37, 211, 102, 0.3)',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: hoveredIcon === 'whatsapp' ? 'translateY(-3px) scale(1.08)' : 'translateY(0) scale(1)'
            }}
          >
            {/* Authentic Vector WhatsApp Icon */}
            <svg 
              viewBox="0 0 24 24" 
              width="28" 
              height="28" 
              fill="#FFFFFF"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm0 18.15c-1.49 0-2.94-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.16 8.16 0 0 1-1.25-4.38c0-4.51 3.67-8.18 8.18-8.18 2.19 0 4.24.85 5.79 2.4 1.54 1.55 2.39 3.6 2.39 5.79 0 4.51-3.67 8.18-8.18 8.18zm4.49-6.13c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.98-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.12-.22-.19-.47-.31z"/>
            </svg>
          </a>

          {/* Tooltip to the left */}
          {hoveredIcon === 'whatsapp' && (
            <div style={{
              position: 'absolute',
              right: 'calc(100% + 12px)',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#0F172A',
              color: '#FFFFFF',
              border: '1px solid rgba(37, 211, 102, 0.4)',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none',
              letterSpacing: '0.02em'
            }}>
              WhatsApp QA Desk
            </div>
          )}
        </div>

        {/* 3. DOWNLOAD APP ICON (ROUND / CIRCLE SHAPE - ONLY IF NOT ALREADY INSTALLED) */}
        {!isStandalone && (
          <div 
            style={{ position: 'relative', pointerEvents: 'auto' }}
            onMouseEnter={() => setHoveredIcon('download')}
            onMouseLeave={() => setHoveredIcon(null)}
          >
            <button
              onClick={handleInstallClick}
              aria-label="Direct Install App"
              title="Install App"
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(37, 99, 235, 0.5), 0 0 10px rgba(56, 189, 248, 0.3)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoveredIcon === 'download' ? 'translateY(-3px) scale(1.08)' : 'translateY(0) scale(1)'
              }}
            >
              <Download size={24} strokeWidth={2.4} />
            </button>

            {/* Tooltip to the left */}
            {hoveredIcon === 'download' && (
              <div style={{
                position: 'absolute',
                right: 'calc(100% + 12px)',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#0F172A',
                color: '#FFFFFF',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
                pointerEvents: 'none',
                letterSpacing: '0.02em'
              }}>
                Install App
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
