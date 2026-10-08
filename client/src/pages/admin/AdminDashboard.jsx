import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import { ordersApi, inspectionsApi, usersApi, reportApi } from '../../services/api';
import { InspectionManagement } from './InspectionManagement';
import { OrderManagement } from './OrderManagement';
import { TemplateBuilder } from './TemplateBuilder';
import { CustomerManagement } from './CustomerManagement';
import { EmployeeManagement } from './EmployeeManagement';
import { SiteSettingsCMS } from './SiteSettingsCMS';
import { AdminProfileSecurity } from './AdminProfileSecurity';
import { 
  Activity, 
  Layers, 
  ClipboardCheck, 
  Users, 
  HardHat, 
  Settings, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Globe,
  Shield,
  Key
} from 'lucide-react';

export function AdminDashboard({ onOpenPhoto, onNavigate, isMobileDrawerOpen, onCloseMobileDrawer }) {
  const { user, logout } = useAuth();
  const { companyName } = useSite();
  const { liveEvents } = useSocket();

  // Tab persistence: preserve active tab across browser refreshes
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs = ['inspections', 'orders', 'templates', 'customers', 'employees', 'cms', 'security'];
      if (tabParam && validTabs.includes(tabParam)) return tabParam;
      const saved = sessionStorage.getItem('admin_active_tab');
      if (saved && validTabs.includes(saved)) return saved;
    }
    return 'inspections';
  });


  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    activeAudits: 0,
    submittedQueue: 0,
    approvedCount: 0,
    customerCount: 0,
    employeeCount: 0
  });

  // Keep URL query and sessionStorage in sync whenever activeTab changes
  useEffect(() => {
    try {
      sessionStorage.setItem('admin_active_tab', activeTab);
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab') !== activeTab) {
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({ ...window.history.state, tab: activeTab }, '', url.toString());
      }
    } catch (_) {}
  }, [activeTab]);

  // Synchronize activeTab with mobile menu drawer navigation
  useEffect(() => {
    const handleTabSync = (e) => {
      const targetTab = e?.detail || new URLSearchParams(window.location.search).get('tab');
      if (targetTab && ['inspections', 'orders', 'templates', 'customers', 'employees', 'cms', 'security'].includes(targetTab)) {
        setActiveTab(targetTab);
      }
    };
    window.addEventListener('apex:admin_tab_change', handleTabSync);
    window.addEventListener('popstate', handleTabSync);
    return () => {
      window.removeEventListener('apex:admin_tab_change', handleTabSync);
      window.removeEventListener('popstate', handleTabSync);
    };
  }, []);

  // Ultra-fast aggregate metrics fetching (single 1ms query vs 4 full table scans)
  const fetchMetrics = async () => {
    try {
      const res = await reportApi.getDashboardMetrics();
      if (res && res.success && res.metrics) {
        setMetrics(res.metrics);
        return;
      }
    } catch (err) {
      console.warn('Fast metrics endpoint fallback:', err);
    }

    try {
      const [ordersRes, insRes, custRes, empRes] = await Promise.all([
        ordersApi.getOrders(),
        inspectionsApi.getInspections(),
        usersApi.getCustomers(),
        usersApi.getEmployees()
      ]);

      if (ordersRes.success && insRes.success) {
        const ords = ordersRes.orders || [];
        const ins = insRes.inspections || [];

        const active = ins.filter(i => ['In Progress', 'Draft Saved', 'Not Started', 'Needs Re-inspection'].includes(i.status)).length;
        const submitted = ins.filter(i => i.status === 'Submitted').length;
        const approved = ins.filter(i => i.status === 'Approved').length;

        setMetrics({
          totalOrders: ords.length,
          activeAudits: active,
          submittedQueue: submitted,
          approvedCount: approved,
          customerCount: custRes.customers?.length || 0,
          employeeCount: empRes.employees?.length || 0
        });
      }
    } catch (err) {
      console.error('Error fetching metrics fallback:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [liveEvents]);

  const navItems = [
    {
      id: 'inspections',
      label: 'Inspection Telemetry',
      icon: ClipboardCheck,
      badge: metrics.activeAudits + metrics.submittedQueue
    },
    {
      id: 'orders',
      label: 'Purchase Orders',
      icon: FileText,
      badge: metrics.totalOrders
    },
    {
      id: 'templates',
      label: 'Inspection Templates',
      icon: Layers
    },
    {
      id: 'customers',
      label: 'USA Clients & Brands',
      icon: Users,
      badge: metrics.customerCount
    },
    {
      id: 'employees',
      label: 'Field Inspectors',
      icon: HardHat,
      badge: metrics.employeeCount
    },
    {
      id: 'cms',
      label: 'Website CMS & Branding',
      icon: Settings
    },
    {
      id: 'security',
      label: 'Admin User & Password',
      icon: Key
    }
  ];

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'inspections': return 'Live Inspection Telemetry & Approvals';
      case 'orders': return 'Purchase Order Management';
      case 'templates': return 'Dynamic Inspection Protocols & Form Builder';
      case 'customers': return 'USA Client Accounts & Brands';
      case 'employees': return 'Field QA Inspectors & Codes';
      case 'cms': return 'Website Branding & Content Management (CMS)';
      case 'security': return 'Admin User, Password & Security';
      default: return 'QA Administration';
    }
  };

  return (
    <div className="dashboard-container">
      {/* DESKTOP SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8', flexShrink: 0 }}>
                <Shield size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  QA Directorate Control
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                  Operations Command
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Menus */}
          <nav className="dashboard-sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="sidebar-nav-item-left">
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User Card (Quick access to Credentials) */}
        <div>
          <div className="sidebar-user-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <div 
              onClick={() => setActiveTab('security')}
              style={{ minWidth: 0, cursor: 'pointer', flex: 1 }}
              title="Click to view & change Admin user and password"
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <Key size={11} />
                <span>Credentials &amp; Password</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              style={{ color: '#EF4444', padding: '4px' }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {/* MAIN CONTENT AREA */}
      <main className="dashboard-main">
        {/* Top Header & Live Ticker */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            {/* Breadcrumb - hidden on mobile screen */}
            <div className="dashboard-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.25rem' }}>
              <span>Dashboard</span>
              <ChevronRight size={13} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>{getSectionTitle()}</span>
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              {getSectionTitle()}
            </h1>
          </div>

          {/* Live Activity Ticker */}
          {liveEvents.length > 0 && (
            <div style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '0.55rem 0.95rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #38BDF8', maxWidth: '360px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase' }}>
                <span className="live-pulse" style={{ width: '6px', height: '6px' }} />
                Real-Time Telemetry
              </div>
              <div style={{ marginTop: '2px', color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {liveEvents[0].actorName} • {liveEvents[0].action}
              </div>
            </div>
          )}
        </div>

        {/* Top KPI Metrics Overview Cards - Side-by-Side 2x2 on Mobile */}
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card" style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span className="stat-label">Total Orders</span>
              <FileText size={16} color="#0284C7" />
            </div>
            <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {metrics.totalOrders}
            </div>
            <div className="stat-desc" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              USA buyer contracts
            </div>
          </div>

          <div className="dashboard-stat-card" style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span className="stat-label">Active Audits</span>
              <Activity size={16} color="#2563EB" />
            </div>
            <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 900, color: '#2563EB', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {metrics.activeAudits}
            </div>
            <div className="stat-desc" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              In progress / on perch
            </div>
          </div>

          <div className="dashboard-stat-card" style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span className="stat-label">Submitted Queue</span>
              <Clock size={16} color="#D97706" />
            </div>
            <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 900, color: '#D97706', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {metrics.submittedQueue}
            </div>
            <div className="stat-desc" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Awaiting QA sign-off
            </div>
          </div>

          <div className="dashboard-stat-card" style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748B', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <span className="stat-label">Approved Audits</span>
              <CheckCircle size={16} color="#16A34A" />
            </div>
            <div className="stat-number" style={{ fontSize: '2rem', fontWeight: 900, color: '#16A34A', marginTop: '0.35rem', fontFamily: 'var(--font-mono)' }}>
              {metrics.approvedCount}
            </div>
            <div className="stat-desc" style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Certificates released
            </div>
          </div>
        </div>

        {/* Tab View Component */}
        <div>
          {activeTab === 'inspections' && <InspectionManagement onOpenPhoto={onOpenPhoto} />}
          {activeTab === 'orders' && <OrderManagement onOpenPhoto={onOpenPhoto} />}
          {activeTab === 'templates' && <TemplateBuilder />}
          {activeTab === 'customers' && <CustomerManagement onOpenPhoto={onOpenPhoto} />}
          {activeTab === 'employees' && <EmployeeManagement onOpenPhoto={onOpenPhoto} />}
          {activeTab === 'cms' && <SiteSettingsCMS />}
          {activeTab === 'security' && <AdminProfileSecurity />}
        </div>
      </main>
    </div>
  );
}
