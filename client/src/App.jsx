import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { PdfReportViewerModal } from './components/PdfReportViewerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';

// URL pathname helper
function getViewFromPathname(pathname) {
  const segment = (pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase().split('/')[0];
  if (['admin', 'customer', 'employee', 'login', 'register'].includes(segment)) {
    return segment;
  }
  return 'landing';
}

function getPathnameForView(view) {
  if (view === 'landing') return '/';
  return `/${view}`;
}

export default function App() {
  const { user, isAuthenticated } = useAuth();

  // Initialize view from URL path and authentication status to preserve page on refresh
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window === 'undefined') return 'landing';

    const pathView = getViewFromPathname(window.location.pathname);
    const token = localStorage.getItem('apex_token');
    let savedUser = null;
    try {
      const u = localStorage.getItem('apex_user');
      if (u) savedUser = JSON.parse(u);
    } catch (_) {}

    const isAuthed = !!(token && savedUser);

    // If accessing a protected route
    if (['admin', 'customer', 'employee'].includes(pathView)) {
      if (isAuthed) {
        // If user's role matches, stay on that dashboard
        if (savedUser.role === pathView) {
          return pathView;
        }
        // If role doesn't match, send to user's authorized dashboard
        return savedUser.role || 'landing';
      }
      // Unauthenticated access to protected route: redirect to login
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', '/login');
      }
      return 'login';
    }

    // If already logged in and visiting login or register, direct to their dashboard
    if (['login', 'register'].includes(pathView) && isAuthed) {
      if (window.history && window.history.replaceState && savedUser.role) {
        window.history.replaceState(null, '', `/${savedUser.role}`);
      }
      return savedUser.role || 'landing';
    }

    return pathView;
  });

  const [activePhoto, setActivePhoto] = useState(null);
  const [activePdfModal, setActivePdfModal] = useState(null);
  const [dashboardDrawerOpen, setDashboardDrawerOpen] = useState(false);

  // Listen for global PDF Report Viewer requests
  useEffect(() => {
    const handleOpenPdf = (e) => {
      if (e.detail) {
        setActivePdfModal(e.detail);
      }
    };
    window.addEventListener('apex:open_pdf_modal', handleOpenPdf);
    return () => window.removeEventListener('apex:open_pdf_modal', handleOpenPdf);
  }, []);

  // Synchronized navigation with HTML5 History API
  const navigate = useCallback((view, search = '') => {
    const isProtected = ['admin', 'customer', 'employee'].includes(view);
    const token = localStorage.getItem('apex_token');

    let targetView = view;
    if (isProtected && !token) {
      targetView = 'login';
    }

    setCurrentView(targetView);
    setDashboardDrawerOpen(false);

    const basePath = getPathnameForView(targetView);
    const searchString = search ? (search.startsWith('?') ? search : `?${search}`) : '';
    const fullPath = `${basePath}${searchString}`;

    if (window.location.pathname + window.location.search !== fullPath) {
      window.history.pushState({ view: targetView }, '', fullPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Sync with browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const pathView = getViewFromPathname(window.location.pathname);
      const token = localStorage.getItem('apex_token');

      // If user tries to re-enter a protected route while logged out, block and redirect
      if (['admin', 'customer', 'employee'].includes(pathView) && !token) {
        window.history.replaceState(null, '', '/login');
        setCurrentView('login');
        return;
      }

      setCurrentView(pathView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for broadcasted logout event
  useEffect(() => {
    const handleLogout = () => {
      window.history.replaceState(null, '', '/');
      setCurrentView('landing');
      setDashboardDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('apex:auth_logout', handleLogout);
    return () => window.removeEventListener('apex:auth_logout', handleLogout);
  }, []);

  // Real-time security guard: if user becomes unauthenticated while on a protected route, eject immediately
  useEffect(() => {
    if (!isAuthenticated && ['admin', 'customer', 'employee'].includes(currentView)) {
      window.history.replaceState(null, '', '/login');
      setCurrentView('login');
    }
  }, [isAuthenticated, currentView]);

  const handleOpenPhoto = (photo) => {
    setActivePhoto(photo);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {/* Real-time Toast Notifications */}
      <ToastContainer />

      {/* PWA Install Prompt & Network Status */}
      <PWAInstallPrompt />

      {/* Global Header */}
      <Navbar 
        onNavigate={navigate} 
        currentView={currentView}
        isDashboardDrawerOpen={dashboardDrawerOpen}
        onToggleDashboardDrawer={() => setDashboardDrawerOpen(prev => !prev)}
        onCloseDashboardDrawer={() => setDashboardDrawerOpen(false)}
      />

      {/* Main View Router - with 72px top offset for sticky fixed header */}
      <main style={{ flex: 1, width: '100%', maxWidth: '100%', overflowX: 'hidden', paddingTop: '72px' }}>
        {currentView === 'landing' && <LandingPage onNavigate={navigate} />}
        {currentView === 'login' && <LoginPage onNavigate={navigate} />}
        {currentView === 'register' && <RegisterPage onNavigate={navigate} />}
        {currentView === 'admin' && isAuthenticated && (
          <AdminDashboard 
            onOpenPhoto={handleOpenPhoto}
            onNavigate={navigate}
            isMobileDrawerOpen={dashboardDrawerOpen}
            onCloseMobileDrawer={() => setDashboardDrawerOpen(false)}
          />
        )}
        {currentView === 'customer' && isAuthenticated && (
          <CustomerDashboard 
            onOpenPhoto={handleOpenPhoto}
            onNavigate={navigate}
            isMobileDrawerOpen={dashboardDrawerOpen}
            onCloseMobileDrawer={() => setDashboardDrawerOpen(false)}
          />
        )}
        {currentView === 'employee' && isAuthenticated && (
          <EmployeeDashboard 
            onOpenPhoto={handleOpenPhoto}
            onNavigate={navigate}
            isMobileDrawerOpen={dashboardDrawerOpen}
            onCloseMobileDrawer={() => setDashboardDrawerOpen(false)}
          />
        )}
      </main>

      {/* Lightbox Photo Viewer Modal */}
      {activePhoto && (
        <PhotoViewerModal photo={activePhoto} onClose={() => setActivePhoto(null)} />
      )}

      {/* Global In-App PDF Report Viewer with prominent Return to App */}
      {activePdfModal && (
        <PdfReportViewerModal
          isOpen={!!activePdfModal}
          onClose={() => setActivePdfModal(null)}
          inspectionId={activePdfModal.id}
          title={activePdfModal.title}
          poNumber={activePdfModal.poNumber}
          status={activePdfModal.status}
        />
      )}

      {/* Global Footer (Visible on landing page only, removed from login) */}
      {currentView === 'landing' && (
        <Footer onNavigate={navigate} />
      )}
    </div>
  );
}
