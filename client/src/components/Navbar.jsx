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
  Globe
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
            style={{ 
              background: 'rgba(30, 41, 59, 0.6)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '6px', 
              color: '#FFFFFF', 
              padding: '7px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Toggle navigation menu"
          >
            {isDrawerOpen ? <X size={22} /> : <Menu size={22} />}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {user?.role === 'admin' ? (
                      <>
                        <Shield size={18} color="#38BDF8" />
                        <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem' }}>Admin Control Menu</span>
                      </>
                    ) : user?.role === 'customer' ? (
                      <>
                        <Building size={18} color="#38BDF8" />
                        <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem' }}>Client Portal Menu</span>
                      </>
                    ) : (
                      <>
                        <HardHat size={18} color="#10B981" />
                        <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem' }}>Field Inspector Menu</span>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={handleClose} 
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="dashboard-mobile-drawer-nav">
                  {/* ADMIN NAVIGATION */}
                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleAdminNav('inspections')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'inspections' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <ClipboardCheck size={18} />
                          <span>Inspection Telemetry</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAdminNav('orders')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'orders' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <FileText size={18} />
                          <span>Purchase Orders</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAdminNav('templates')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'templates' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <Layers size={18} />
                          <span>Inspection Templates</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAdminNav('customers')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'customers' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <Users size={18} />
                          <span>USA Clients &amp; Brands</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAdminNav('employees')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'employees' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <HardHat size={18} />
                          <span>Field Inspectors</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleAdminNav('cms')}
                        className={`sidebar-nav-item ${currentView === 'admin' && currentAdminTab === 'cms' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <Settings size={18} />
                          <span>Website CMS &amp; Branding</span>
                        </div>
                      </button>
                    </>
                  )}

                  {/* CUSTOMER NAVIGATION */}
                  {user?.role === 'customer' && (
                    <>
                      <button
                        onClick={() => handleCustomerNav('all')}
                        className={`sidebar-nav-item ${currentView === 'customer' && currentCustomerMenu === 'all' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <FileText size={18} />
                          <span>All Purchase Orders</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleCustomerNav('active')}
                        className={`sidebar-nav-item ${currentView === 'customer' && currentCustomerMenu === 'active' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <Clock size={18} />
                          <span>Under Inspection</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleCustomerNav('approved')}
                        className={`sidebar-nav-item ${currentView === 'customer' && currentCustomerMenu === 'approved' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <CheckCircle size={18} />
                          <span>Certified &amp; Approved</span>
                        </div>
                      </button>

                      <div style={{ marginTop: '0.65rem' }}>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-success btn-sm"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <MessageCircle size={14} />
                          <span>Chat QA Lead</span>
                        </a>
                      </div>
                    </>
                  )}

                  {/* EMPLOYEE NAVIGATION */}
                  {user?.role === 'employee' && (
                    <>
                      <button
                        onClick={() => handleEmployeeNav('active')}
                        className={`sidebar-nav-item ${currentView === 'employee' && currentEmployeeFilter === 'active' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <ListTodo size={18} />
                          <span>Active Field Tasks</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleEmployeeNav('reinspection')}
                        className={`sidebar-nav-item ${currentView === 'employee' && currentEmployeeFilter === 'reinspection' ? 'active' : ''}`}
                        style={{ width: '100%', color: currentEmployeeFilter === 'reinspection' ? '#F87171' : '#EF4444' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <AlertTriangle size={18} />
                          <span>Re-Inspections</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleEmployeeNav('submitted')}
                        className={`sidebar-nav-item ${currentView === 'employee' && currentEmployeeFilter === 'submitted' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <Clock size={18} />
                          <span>Submitted / In Review</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleEmployeeNav('approved')}
                        className={`sidebar-nav-item ${currentView === 'employee' && currentEmployeeFilter === 'approved' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <CheckCircle size={18} />
                          <span>Approved Audits</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleEmployeeNav('all')}
                        className={`sidebar-nav-item ${currentView === 'employee' && currentEmployeeFilter === 'all' ? 'active' : ''}`}
                        style={{ width: '100%' }}
                      >
                        <div className="sidebar-nav-item-left">
                          <FileCheck size={18} />
                          <span>All Task History</span>
                        </div>
                      </button>
                    </>
                  )}

                  {/* Public Site View Link / Back to Dashboard */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1E293B' }}>
                    {currentView !== 'landing' ? (
                      <button
                        onClick={handlePublicWebNav}
                        className="btn btn-outline btn-sm"
                        style={{ width: '100%', justifyContent: 'center', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.35)', gap: '6px' }}
                      >
                        <Globe size={15} />
                        <span>Visit Public Website</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleClose();
                          onNavigate(user?.role || 'admin');
                        }}
                        className="btn btn-accent btn-sm"
                        style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                      >
                        <LayoutDashboard size={15} />
                        <span>Back to {getDashboardLabel()}</span>
                      </button>
                    )}
                  </div>
                </nav>

                {/* Logged in User Card Footer */}
                <div style={{ padding: '1rem', borderTop: '1px solid #1E293B', marginTop: 'auto', backgroundColor: '#090D16' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ minWidth: 0, paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user?.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                        {user?.role === 'admin' ? 'Senior QA Director' : user?.role === 'customer' ? (user?.company_name || 'USA Buyer') : (user?.employee_code || 'QA Inspector')}
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout} 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: '#EF4444', gap: '4px', whiteSpace: 'nowrap' }}
                      title="Sign Out"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* 2. If Visitor / Logged Out: Marketing & Landing Drawer */
              <>
                <div className="dashboard-mobile-drawer-header">
                  <span style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '0.95rem' }}>Navigation</span>
                  <button 
                    onClick={handleClose} 
                    style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="dashboard-mobile-drawer-nav">
                  <button 
                    onClick={() => handleNavClick('landing')}
                    className={`sidebar-nav-item ${currentView === 'landing' ? 'active' : ''}`}
                    style={{ width: '100%' }}
                  >
                    <div className="sidebar-nav-item-left">
                      <Home size={18} />
                      <span>Home</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleNavClick('#services')}
                    className="sidebar-nav-item"
                    style={{ width: '100%' }}
                  >
                    <div className="sidebar-nav-item-left">
                      <Layers size={18} />
                      <span>Services</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleNavClick('#process')}
                    className="sidebar-nav-item"
                    style={{ width: '100%' }}
                  >
                    <div className="sidebar-nav-item-left">
                      <FileCheck size={18} />
                      <span>Audit Workflow</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleNavClick('#about')}
                    className="sidebar-nav-item"
                    style={{ width: '100%' }}
                  >
                    <div className="sidebar-nav-item-left">
                      <ShieldCheck size={18} />
                      <span>Why Choose Us</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => handleNavClick('#contact')}
                    className="sidebar-nav-item"
                    style={{ width: '100%' }}
                  >
                    <div className="sidebar-nav-item-left">
                      <PhoneCall size={18} />
                      <span>Contact &amp; Mills</span>
                    </div>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#1E293B', margin: '0.5rem 0' }} />

                  <button
                    onClick={() => { onNavigate('login'); handleClose(); }}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', color: '#FFFFFF', borderColor: '#334155', gap: '0.5rem' }}
                  >
                    <LogIn size={16} />
                    <span>Sign In</span>
                  </button>

                  <button
                    onClick={() => { onNavigate('register'); handleClose(); }}
                    className="btn btn-accent"
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <UserPlus size={16} />
                    <span>Register (USA)</span>
                  </button>

                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success"
                    style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', marginTop: '0.25rem' }}
                  >
                    <MessageCircle size={16} />
                    <span>WhatsApp QA Desk</span>
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
