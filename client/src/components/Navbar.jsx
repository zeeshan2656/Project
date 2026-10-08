import React, { useState, useEffect } from 'react';
import { useSite } from '../context/SiteContext';
import { useAuth } from '../context/AuthContext';
import { 
  Home,
  Layers,
  FileCheck,
  ShieldCheck,
  PhoneCall,
  MessageCircle,
  LayoutDashboard,
  Shield,
  Building,
  HardHat,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ClipboardCheck,
  FileText,
  Users,
  Settings,
  ListTodo,
  Clock,
  CheckCircle,
  AlertTriangle,
  Globe,
  Key,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export function Navbar({ 
  onNavigate, 
  currentView, 
  isDashboardDrawerOpen, 
  onToggleDashboardDrawer,
  onCloseDashboardDrawer 
}) {
  const { companyName, logoUrl, whatsappLink } = useSite();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Unified drawer state
  const isDrawerOpen = isDashboardDrawerOpen !== undefined ? isDashboardDrawerOpen : mobileMenuOpen;

  const handleToggle = () => {
    if (onToggleDashboardDrawer) {
      onToggleDashboardDrawer();
    } else {
      setMobileMenuOpen(prev => !prev);
    }
  };

  const handleClose = () => {
    if (onCloseDashboardDrawer) {
      onCloseDashboardDrawer();
    } else if (onToggleDashboardDrawer && isDashboardDrawerOpen) {
      onToggleDashboardDrawer();
    }
    setMobileMenuOpen(false);
  };

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const getDashboardLabel = () => {
    if (!user) return 'Dashboard';
    if (user.role === 'admin') return 'Admin Console';
    if (user.role === 'customer') return 'Buyer Portal';
    return 'Auditor App';
  };

  const handleNavClick = (target) => {
    if (target.startsWith('#')) {
      if (currentView !== 'landing') {
        onNavigate('landing');
        setTimeout(() => {
          const el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      } else {
        const el = document.querySelector(target);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      onNavigate(target);
    }
    handleClose();
  };

  const handleAdminNav = (tabId) => {
    handleClose();
    sessionStorage.setItem('admin_active_tab', tabId);
    window.dispatchEvent(new CustomEvent('apex:admin_tab_change', { detail: tabId }));
    if (currentView !== 'admin') {
      onNavigate('admin', `tab=${tabId}`);
    }
  };

  const handleCustomerNav = (menuId) => {
    handleClose();
    sessionStorage.setItem('customer_active_menu', menuId);
    window.dispatchEvent(new CustomEvent('apex:customer_menu_change', { detail: menuId }));
    if (currentView !== 'customer') {
      onNavigate('customer', `menu=${menuId}`);
    }
  };

  const handleEmployeeNav = (filterId) => {
    handleClose();
    sessionStorage.setItem('employee_status_filter', filterId);
    sessionStorage.removeItem('employee_active_sheet_id');
    window.dispatchEvent(new CustomEvent('apex:employee_filter_change', { detail: filterId }));
    if (currentView !== 'employee') {
      onNavigate('employee', `filter=${filterId}`);
    }
  };

  const handlePublicWebNav = () => {
    handleClose();
    onNavigate('landing');
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  const currentAdminTab = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab')) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('admin_active_tab') : 'inspections') || 'inspections';
  const currentCustomerMenu = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('menu')) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('customer_active_menu') : 'all') || 'all';
  const currentEmployeeFilter = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('filter')) || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('employee_status_filter') : 'active') || 'active';

  return (
    <header className="main-header">
      <div className="container">
        {/* Brand / Logo Section */}
        <div 
          onClick={() => onNavigate('landing')}
          className="header-logo-container"
          title={`${companyName} - Third-Party Inspection Platform`}
        >
          {logoUrl && !imgError ? (
            <img 
              src={logoUrl} 
              alt={companyName} 
              className="header-logo-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div 
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)'
                }}
              >
                <ShieldCheck size={24} color="#FFFFFF" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {companyName}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Third-Party Inspection Platform
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Nav - Middle Elements with Clear Labels */}
        <nav className="desktop-nav">
          <button 
            onClick={() => handleNavClick('landing')} 
            className={`header-nav-item ${currentView === 'landing' ? 'active' : ''}`}
          >
            <Home size={15} />
            <span>Home</span>
          </button>

          <button 
            onClick={() => handleNavClick('#services')} 
            className="header-nav-item"
          >
            <Layers size={15} />
            <span>Services</span>
          </button>

          <button 
            onClick={() => handleNavClick('#process')} 
            className="header-nav-item"
          >
            <FileCheck size={15} />
            <span>Audit Workflow</span>
          </button>

          <button 
            onClick={() => handleNavClick('#about')} 
            className="header-nav-item"
          >
            <ShieldCheck size={15} />
            <span>Why Choose Us</span>
          </button>

          <button 
            onClick={() => handleNavClick('#contact')} 
            className="header-nav-item"
          >
            <PhoneCall size={15} />
            <span>Contact &amp; Mills</span>
          </button>
        </nav>

        {/* Right CTA Actions - Just Icons with Floating Tooltips */}
        <div className="desktop-actions">
          {/* WhatsApp Direct Chat - Icon only */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-icon"
            data-tooltip="WhatsApp Direct Support"
            aria-label="WhatsApp Direct Support"
            title="WhatsApp Direct Support (+92 300 8472910)"
          >
            <span 
              style={{ 
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '7px', 
                height: '7px', 
                backgroundColor: '#22C55E', 
                borderRadius: '50%', 
                boxShadow: '0 0 6px #22C55E' 
              }} 
            />
            <MessageCircle size={19} />
          </a>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              {/* Dashboard Switcher Icon */}
              <button
                onClick={() => onNavigate(user.role)}
                className="btn-dashboard-icon"
                data-tooltip={getDashboardLabel()}
                aria-label={getDashboardLabel()}
                title={getDashboardLabel()}
              >
                <LayoutDashboard size={19} />
              </button>

              {/* User Role Icon / Profile Avatar (No lengthy names/text) */}
              <div 
                className="btn-user-icon"
                data-tooltip={`${user.name} (${user.role.toUpperCase()})`}
                aria-label={`${user.name} (${user.role})`}
                title={`${user.name} (${user.role.toUpperCase()})`}
              >
                {user.role === 'admin' ? (
                  <Shield size={19} color="#38BDF8" />
                ) : user.role === 'customer' ? (
                  <Building size={19} color="#38BDF8" />
                ) : (
                  <HardHat size={19} color="#34D399" />
                )}
              </div>

              {/* Logout Icon */}
              <button
                onClick={logout}
                className="btn-logout-icon"
                data-tooltip="Sign Out"
                aria-label="Sign Out"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="header-visitor-actions">
              {/* Sign In Button */}
              <button
                onClick={() => onNavigate('login')}
                className="btn-header-login"
                aria-label="Sign In to Portal"
                title="Sign In to Portal"
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>

              {/* Register Button */}
              <button
                onClick={() => onNavigate('register')}
                className="btn-header-register"
                aria-label="Register as Buyer (USA)"
                title="Register as Buyer (USA)"
              >
                <UserPlus size={15} />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button - Only on screens < 992px */}
        <div className="mobile-toggle">
          <button
            onClick={handleToggle}
            className="mobile-hamburger-trigger"
            aria-label="Toggle navigation menu"
          >
            {isDrawerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Slide-out Menu */}
      {isDrawerOpen && (
        <div className="dashboard-mobile-drawer-overlay" onClick={handleClose}>
          <div className="dashboard-mobile-drawer" onClick={(e) => e.stopPropagation()}>
            {/* 1. If Authenticated: Role-Based Dashboard Drawer */}
            {isAuthenticated ? (
              <>
                <div className="dashboard-mobile-drawer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: user?.role === 'employee' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.18)',
                        border: `1px solid ${user?.role === 'employee' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(56, 189, 248, 0.35)'}`,
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                    >
                      {user?.role === 'admin' ? (
                        <Shield size={17} color="#38BDF8" />
                      ) : user?.role === 'customer' ? (
                        <Building size={17} color="#38BDF8" />
                      ) : (
                        <HardHat size={17} color="#10B981" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem', lineHeight: 1.2 }}>
                        {user?.role === 'admin' ? 'Admin Console' : user?.role === 'customer' ? 'Buyer Portal' : 'Auditor Workspace'}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.05em' }}>
                        NAVIGATION MENU
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleClose} 
                    className="mobile-drawer-close-btn"
                    aria-label="Close menu"
                  >
                    <X size={17} />
                  </button>
                </div>

                <nav className="dashboard-mobile-drawer-nav">
                  {/* ADMIN NAVIGATION */}
                  {user?.role === 'admin' && (
                    <>
                      <div className="mobile-menu-section-label">OPERATIONS &amp; AUDITS</div>
                      <button
                        type="button"
                        onClick={() => handleAdminNav('inspections')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'inspections' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'inspections' ? 'linear-gradient(135deg, #0284C7, #2563EB)' : 'rgba(56, 189, 248, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'inspections' ? '#FFFFFF' : '#38BDF8',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'inspections' ? 'transparent' : 'rgba(56, 189, 248, 0.28)'}`
                          }}
                        >
                          <ClipboardCheck size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'inspections' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Inspection Telemetry</span>
                          <span className="mobile-menu-item-subtitle">Live inspection records &amp; field audits</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminNav('orders')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'orders' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'orders' ? 'linear-gradient(135deg, #0284C7, #2563EB)' : 'rgba(59, 130, 246, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'orders' ? '#FFFFFF' : '#60A5FA',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'orders' ? 'transparent' : 'rgba(59, 130, 246, 0.28)'}`
                          }}
                        >
                          <FileText size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'orders' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Purchase Orders</span>
                          <span className="mobile-menu-item-subtitle">PO tracking &amp; client assignments</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminNav('templates')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'templates' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'templates' ? 'linear-gradient(135deg, #8B5CF6, #6D28D9)' : 'rgba(168, 85, 247, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'templates' ? '#FFFFFF' : '#C084FC',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'templates' ? 'transparent' : 'rgba(168, 85, 247, 0.28)'}`
                          }}
                        >
                          <Layers size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'templates' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Inspection Templates</span>
                          <span className="mobile-menu-item-subtitle">AQL criteria, sampling &amp; defect catalogs</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <div className="mobile-menu-section-label">MANAGEMENT &amp; PLATFORM</div>
                      <button
                        type="button"
                        onClick={() => handleAdminNav('customers')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'customers' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'customers' ? 'linear-gradient(135deg, #EC4899, #BE185D)' : 'rgba(244, 114, 182, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'customers' ? '#FFFFFF' : '#F472B6',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'customers' ? 'transparent' : 'rgba(244, 114, 182, 0.28)'}`
                          }}
                        >
                          <Users size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'customers' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">USA Clients &amp; Brands</span>
                          <span className="mobile-menu-item-subtitle">Buyer directory &amp; security access</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminNav('employees')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'employees' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'employees' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(251, 191, 36, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'employees' ? '#FFFFFF' : '#FBBF24',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'employees' ? 'transparent' : 'rgba(251, 191, 36, 0.28)'}`
                          }}
                        >
                          <HardHat size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'employees' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Field Inspectors</span>
                          <span className="mobile-menu-item-subtitle">Auditor roster &amp; GPS credentials</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminNav('cms')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'cms' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'cms' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(52, 211, 153, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'cms' ? '#FFFFFF' : '#34D399',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'cms' ? 'transparent' : 'rgba(52, 211, 153, 0.28)'}`
                          }}
                        >
                          <Settings size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'cms' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Website CMS &amp; Branding</span>
                          <span className="mobile-menu-item-subtitle">Landing page content &amp; public portal</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <div className="mobile-menu-section-label">SECURITY &amp; ACCESS</div>
                      <button
                        type="button"
                        onClick={() => handleAdminNav('security')}
                        className={`mobile-menu-item-btn ${currentView === 'admin' && currentAdminTab === 'security' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'admin' && currentAdminTab === 'security' ? 'linear-gradient(135deg, #EF4444, #B91C1C)' : 'rgba(239, 68, 68, 0.14)',
                            color: currentView === 'admin' && currentAdminTab === 'security' ? '#FFFFFF' : '#F87171',
                            border: `1px solid ${currentView === 'admin' && currentAdminTab === 'security' ? 'transparent' : 'rgba(239, 68, 68, 0.28)'}`
                          }}
                        >
                          <Key size={18} strokeWidth={currentView === 'admin' && currentAdminTab === 'security' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Admin User &amp; Password</span>
                          <span className="mobile-menu-item-subtitle">Master credentials &amp; login security</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>
                    </>
                  )}

                  {/* CUSTOMER NAVIGATION */}
                  {user?.role === 'customer' && (
                    <>
                      <div className="mobile-menu-section-label">PURCHASE ORDERS</div>
                      <button
                        type="button"
                        onClick={() => handleCustomerNav('all')}
                        className={`mobile-menu-item-btn ${currentView === 'customer' && currentCustomerMenu === 'all' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'customer' && currentCustomerMenu === 'all' ? 'linear-gradient(135deg, #0284C7, #2563EB)' : 'rgba(56, 189, 248, 0.14)',
                            color: currentView === 'customer' && currentCustomerMenu === 'all' ? '#FFFFFF' : '#38BDF8',
                            border: `1px solid ${currentView === 'customer' && currentCustomerMenu === 'all' ? 'transparent' : 'rgba(56, 189, 248, 0.28)'}`
                          }}
                        >
                          <FileText size={18} strokeWidth={currentView === 'customer' && currentCustomerMenu === 'all' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">All Purchase Orders</span>
                          <span className="mobile-menu-item-subtitle">Track active &amp; completed buyer POs</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCustomerNav('active')}
                        className={`mobile-menu-item-btn ${currentView === 'customer' && currentCustomerMenu === 'active' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'customer' && currentCustomerMenu === 'active' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(251, 191, 36, 0.14)',
                            color: currentView === 'customer' && currentCustomerMenu === 'active' ? '#FFFFFF' : '#FBBF24',
                            border: `1px solid ${currentView === 'customer' && currentCustomerMenu === 'active' ? 'transparent' : 'rgba(251, 191, 36, 0.28)'}`
                          }}
                        >
                          <Clock size={18} strokeWidth={currentView === 'customer' && currentCustomerMenu === 'active' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Under Inspection</span>
                          <span className="mobile-menu-item-subtitle">Real-time ongoing factory audits</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCustomerNav('approved')}
                        className={`mobile-menu-item-btn ${currentView === 'customer' && currentCustomerMenu === 'approved' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'customer' && currentCustomerMenu === 'approved' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(52, 211, 153, 0.14)',
                            color: currentView === 'customer' && currentCustomerMenu === 'approved' ? '#FFFFFF' : '#34D399',
                            border: `1px solid ${currentView === 'customer' && currentCustomerMenu === 'approved' ? 'transparent' : 'rgba(52, 211, 153, 0.28)'}`
                          }}
                        >
                          <CheckCircle size={18} strokeWidth={currentView === 'customer' && currentCustomerMenu === 'approved' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Certified &amp; Approved</span>
                          <span className="mobile-menu-item-subtitle">Finalized QA sign-off certificates</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <div className="mobile-menu-section-label">DIRECT QA ASSISTANCE</div>
                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mobile-menu-action-btn whatsapp-cta"
                      >
                        <div className="whatsapp-ping-dot" />
                        <MessageCircle size={18} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#FFFFFF' }}>Chat with QA Lead</span>
                          <span style={{ fontSize: '0.7rem', color: '#86EFAC' }}>Direct WhatsApp Assistance (24/7)</span>
                        </div>
                        <ExternalLink size={14} style={{ opacity: 0.7 }} />
                      </a>
                    </>
                  )}

                  {/* EMPLOYEE NAVIGATION */}
                  {user?.role === 'employee' && (
                    <>
                      <div className="mobile-menu-section-label">INSPECTION TASKS</div>
                      <button
                        type="button"
                        onClick={() => handleEmployeeNav('active')}
                        className={`mobile-menu-item-btn ${currentView === 'employee' && currentEmployeeFilter === 'active' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'employee' && currentEmployeeFilter === 'active' ? 'linear-gradient(135deg, #0284C7, #2563EB)' : 'rgba(56, 189, 248, 0.14)',
                            color: currentView === 'employee' && currentEmployeeFilter === 'active' ? '#FFFFFF' : '#38BDF8',
                            border: `1px solid ${currentView === 'employee' && currentEmployeeFilter === 'active' ? 'transparent' : 'rgba(56, 189, 248, 0.28)'}`
                          }}
                        >
                          <ListTodo size={18} strokeWidth={currentView === 'employee' && currentEmployeeFilter === 'active' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Active Field Tasks</span>
                          <span className="mobile-menu-item-subtitle">Assigned &amp; in-progress audits</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEmployeeNav('reinspection')}
                        className={`mobile-menu-item-btn danger-state ${currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? 'linear-gradient(135deg, #EF4444, #B91C1C)' : 'rgba(239, 68, 68, 0.14)',
                            color: currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? '#FFFFFF' : '#F87171',
                            border: `1px solid ${currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? 'transparent' : 'rgba(239, 68, 68, 0.28)'}`
                          }}
                        >
                          <AlertTriangle size={18} strokeWidth={currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title" style={{ color: currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? '#F87171' : '#F87171' }}>
                            Needs Re-Inspection
                          </span>
                          <span className="mobile-menu-item-subtitle">Returned by QA Director for rework</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEmployeeNav('submitted')}
                        className={`mobile-menu-item-btn ${currentView === 'employee' && currentEmployeeFilter === 'submitted' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'employee' && currentEmployeeFilter === 'submitted' ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'rgba(251, 191, 36, 0.14)',
                            color: currentView === 'employee' && currentEmployeeFilter === 'submitted' ? '#FFFFFF' : '#FBBF24',
                            border: `1px solid ${currentView === 'employee' && currentEmployeeFilter === 'submitted' ? 'transparent' : 'rgba(251, 191, 36, 0.28)'}`
                          }}
                        >
                          <Clock size={18} strokeWidth={currentView === 'employee' && currentEmployeeFilter === 'submitted' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Submitted / In Review</span>
                          <span className="mobile-menu-item-subtitle">Finalized audits awaiting sign-off (Locked)</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEmployeeNav('approved')}
                        className={`mobile-menu-item-btn ${currentView === 'employee' && currentEmployeeFilter === 'approved' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'employee' && currentEmployeeFilter === 'approved' ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(52, 211, 153, 0.14)',
                            color: currentView === 'employee' && currentEmployeeFilter === 'approved' ? '#FFFFFF' : '#34D399',
                            border: `1px solid ${currentView === 'employee' && currentEmployeeFilter === 'approved' ? 'transparent' : 'rgba(52, 211, 153, 0.28)'}`
                          }}
                        >
                          <CheckCircle size={18} strokeWidth={currentView === 'employee' && currentEmployeeFilter === 'approved' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">Approved Audits</span>
                          <span className="mobile-menu-item-subtitle">Certified pass inspections</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEmployeeNav('all')}
                        className={`mobile-menu-item-btn ${currentView === 'employee' && currentEmployeeFilter === 'all' ? 'active' : ''}`}
                      >
                        <div 
                          className="mobile-menu-item-icon-box"
                          style={{
                            background: currentView === 'employee' && currentEmployeeFilter === 'all' ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'rgba(99, 102, 241, 0.14)',
                            color: currentView === 'employee' && currentEmployeeFilter === 'all' ? '#FFFFFF' : '#818CF8',
                            border: `1px solid ${currentView === 'employee' && currentEmployeeFilter === 'all' ? 'transparent' : 'rgba(99, 102, 241, 0.28)'}`
                          }}
                        >
                          <FileCheck size={18} strokeWidth={currentView === 'employee' && currentEmployeeFilter === 'all' ? 2.5 : 2} />
                        </div>
                        <div className="mobile-menu-item-content">
                          <span className="mobile-menu-item-title">All Task History</span>
                          <span className="mobile-menu-item-subtitle">Complete log of your assigned audits</span>
                        </div>
                        <ChevronRight size={16} className="mobile-menu-item-chevron" />
                      </button>
                    </>
                  )}

                  {/* Public Site View Link / Back to Dashboard */}
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    {currentView !== 'landing' ? (
                      <button
                        type="button"
                        onClick={handlePublicWebNav}
                        className="mobile-menu-action-btn public-web"
                      >
                        <Globe size={16} />
                        <span style={{ flex: 1 }}>Visit Public Website</span>
                        <ExternalLink size={14} style={{ opacity: 0.6 }} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleClose();
                          onNavigate(user?.role || 'admin');
                        }}
                        className="mobile-menu-action-btn back-dashboard"
                      >
                        <LayoutDashboard size={16} />
                        <span style={{ flex: 1 }}>Back to {getDashboardLabel()}</span>
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </nav>

                {/* Logged in User Card Footer */}
                <div className="mobile-drawer-user-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
                    <div className="mobile-drawer-user-avatar">
                      {user?.role === 'admin' ? (
                        <Shield size={18} color="#38BDF8" />
                      ) : user?.role === 'customer' ? (
                        <Building size={18} color="#38BDF8" />
                      ) : (
                        <HardHat size={18} color="#10B981" />
                      )}
                      <div className="mobile-drawer-user-online-dot" />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.name}
                      </div>
                      <div style={{ fontSize: '0.71rem', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.role === 'admin' ? 'Senior QA Director' : user?.role === 'customer' ? (user?.company_name || 'USA Buyer') : (user?.employee_code || 'QA Inspector')}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout} 
                    className="mobile-menu-logout-btn"
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              </>
            ) : (
              /* 2. If Visitor / Logged Out: Marketing & Landing Drawer */
              <>
                <div className="dashboard-mobile-drawer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
                      }}
                    >
                      <ShieldCheck size={18} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.9rem', lineHeight: 1.2 }}>
                        {companyName}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.05em' }}>
                        INSPECTION PLATFORM
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={handleClose} 
                    className="mobile-drawer-close-btn"
                    aria-label="Close menu"
                  >
                    <X size={17} />
                  </button>
                </div>

                <nav className="dashboard-mobile-drawer-nav">
                  <div className="mobile-menu-section-label">EXPLORE PLATFORM</div>
                  <button 
                    type="button"
                    onClick={() => handleNavClick('landing')}
                    className={`mobile-menu-item-btn ${currentView === 'landing' ? 'active' : ''}`}
                  >
                    <div 
                      className="mobile-menu-item-icon-box"
                      style={{
                        background: currentView === 'landing' ? 'linear-gradient(135deg, #0284C7, #2563EB)' : 'rgba(56, 189, 248, 0.14)',
                        color: currentView === 'landing' ? '#FFFFFF' : '#38BDF8',
                        border: `1px solid ${currentView === 'landing' ? 'transparent' : 'rgba(56, 189, 248, 0.28)'}`
                      }}
                    >
                      <Home size={18} strokeWidth={currentView === 'landing' ? 2.5 : 2} />
                    </div>
                    <div className="mobile-menu-item-content">
                      <span className="mobile-menu-item-title">Home</span>
                      <span className="mobile-menu-item-subtitle">Platform overview &amp; standards</span>
                    </div>
                    <ChevronRight size={16} className="mobile-menu-item-chevron" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleNavClick('#services')}
                    className="mobile-menu-item-btn"
                  >
                    <div 
                      className="mobile-menu-item-icon-box"
                      style={{
                        background: 'rgba(99, 102, 241, 0.14)',
                        color: '#818CF8',
                        border: '1px solid rgba(99, 102, 241, 0.28)'
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div className="mobile-menu-item-content">
                      <span className="mobile-menu-item-title">Inspection Services</span>
                      <span className="mobile-menu-item-subtitle">Pre-shipment, inline &amp; container loading</span>
                    </div>
                    <ChevronRight size={16} className="mobile-menu-item-chevron" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleNavClick('#process')}
                    className="mobile-menu-item-btn"
                  >
                    <div 
                      className="mobile-menu-item-icon-box"
                      style={{
                        background: 'rgba(52, 211, 153, 0.14)',
                        color: '#34D399',
                        border: '1px solid rgba(52, 211, 153, 0.28)'
                      }}
                    >
                      <FileCheck size={18} />
                    </div>
                    <div className="mobile-menu-item-content">
                      <span className="mobile-menu-item-title">Audit Workflow</span>
                      <span className="mobile-menu-item-subtitle">4-stage ISO 17020 quality framework</span>
                    </div>
                    <ChevronRight size={16} className="mobile-menu-item-chevron" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleNavClick('#about')}
                    className="mobile-menu-item-btn"
                  >
                    <div 
                      className="mobile-menu-item-icon-box"
                      style={{
                        background: 'rgba(251, 191, 36, 0.14)',
                        color: '#FBBF24',
                        border: '1px solid rgba(251, 191, 36, 0.28)'
                      }}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div className="mobile-menu-item-content">
                      <span className="mobile-menu-item-title">Why Choose Us</span>
                      <span className="mobile-menu-item-subtitle">Conflict-free third-party verification</span>
                    </div>
                    <ChevronRight size={16} className="mobile-menu-item-chevron" />
                  </button>

                  <button 
                    type="button"
                    onClick={() => handleNavClick('#contact')}
                    className="mobile-menu-item-btn"
                  >
                    <div 
                      className="mobile-menu-item-icon-box"
                      style={{
                        background: 'rgba(244, 114, 182, 0.14)',
                        color: '#F472B6',
                        border: '1px solid rgba(244, 114, 182, 0.28)'
                      }}
                    >
                      <PhoneCall size={18} />
                    </div>
                    <div className="mobile-menu-item-content">
                      <span className="mobile-menu-item-title">Contact &amp; Mills</span>
                      <span className="mobile-menu-item-subtitle">Direct hub in Punjab textile cluster</span>
                    </div>
                    <ChevronRight size={16} className="mobile-menu-item-chevron" />
                  </button>

                  <div className="mobile-menu-section-label">PORTAL ACCESS</div>
                  <button
                    type="button"
                    onClick={() => { onNavigate('login'); handleClose(); }}
                    className="mobile-menu-action-btn sign-in"
                  >
                    <LogIn size={16} style={{ color: '#38BDF8' }} />
                    <span style={{ fontWeight: 700 }}>Sign In to Portal</span>
                    <ChevronRight size={16} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                  </button>

                  <button
                    type="button"
                    onClick={() => { onNavigate('register'); handleClose(); }}
                    className="mobile-menu-action-btn register-cta"
                  >
                    <UserPlus size={16} />
                    <span>Register Buyer Account (USA)</span>
                    <ChevronRight size={16} style={{ marginLeft: 'auto' }} />
                  </button>

                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-menu-action-btn whatsapp-cta"
                  >
                    <div className="whatsapp-ping-dot" />
                    <MessageCircle size={18} />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#FFFFFF' }}>WhatsApp QA Desk</span>
                      <span style={{ fontSize: '0.7rem', color: '#86EFAC' }}>Direct Buyer Inquiries (+92 300 8472910)</span>
                    </div>
                    <ExternalLink size={14} style={{ opacity: 0.7 }} />
                  </a>
                </nav>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
