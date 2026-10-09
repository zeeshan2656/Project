import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import { ordersApi, inspectionsApi, reportApi } from '../../services/api';
import { 
  Plus, 
  Search, 
  Building, 
  MapPin, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  X,
  Camera,
  Percent,
  Sparkles,
  Layers,
  MessageCircle,
  LogOut,
  ChevronRight,
  Menu,
  LayoutGrid,
  List,
  Globe,
  ClipboardList,
  ClipboardCheck,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';
import { openPdfViewer } from '../../components/PdfReportViewerModal';

export function CustomerDashboard({ onOpenPhoto, onNavigate, isMobileDrawerOpen, onCloseMobileDrawer }) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { user, logout } = useAuth();
  const { companyName, whatsappLink } = useSite();
  const { subscribe } = useSocket();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const menu = params.get('menu');
      if (menu && ['all', 'active', 'approved'].includes(menu)) return menu;
      const saved = sessionStorage.getItem('customer_active_menu');
      if (saved && ['all', 'active', 'approved'].includes(saved)) return saved;
    }
    return 'all';
  }); // 'all', 'active', 'approved'

  useEffect(() => {
    try {
      sessionStorage.setItem('customer_active_menu', activeMenu);
      const url = new URL(window.location.href);
      if (url.searchParams.get('menu') !== activeMenu) {
        url.searchParams.set('menu', activeMenu);
        window.history.replaceState({ ...window.history.state, menu: activeMenu }, '', url.toString());
      }
    } catch (_) {}
  }, [activeMenu]);

  // Synchronize activeMenu with mobile menu drawer navigation
  useEffect(() => {
    const handleMenuSync = (e) => {
      const targetMenu = e?.detail || new URLSearchParams(window.location.search).get('menu');
      if (targetMenu && ['all', 'active', 'approved'].includes(targetMenu)) {
        setActiveMenu(targetMenu);
      }
    };
    window.addEventListener('apex:customer_menu_change', handleMenuSync);
    window.addEventListener('popstate', handleMenuSync);
    return () => {
      window.removeEventListener('apex:customer_menu_change', handleMenuSync);
      window.removeEventListener('popstate', handleMenuSync);
    };
  }, []);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedOrderInspections, setSelectedOrderInspections] = useState(null);
  const [loadingOrderInspections, setLoadingOrderInspections] = useState(false);
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? 'cards' : 'table');

  // New Order Form (Self-Service)
  const [formData, setFormData] = useState({
    po_number: '',
    product_type: 'Woven Denim Fabric & Apparel',
    product_description: '',
    factory_name: '',
    factory_city: 'Karachi',
    factory_address: '',
    factory_contact_name: '',
    factory_contact_phone: '',
    factory_map_url: '',
    total_quantity: '',
    unit: 'pieces',
    order_date: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersApi.getOrders();
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Live WebSocket updates
  useEffect(() => {
    const unsub1 = subscribe('inspection:status_changed', () => {
      fetchOrders();
    });
    return unsub1;
  }, [subscribe, fetchOrders]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await ordersApi.createOrder(formData);
      if (res.success) {
        fetchOrders();
        setShowOrderModal(false);
        setFormData({
          po_number: '',
          product_type: 'Woven Denim Fabric & Apparel',
          product_description: '',
          factory_name: '',
          factory_city: 'Karachi',
          factory_address: '',
          factory_contact_name: '',
          factory_contact_phone: '',
          factory_map_url: '',
          total_quantity: '',
          unit: 'pieces',
          order_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to submit order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInspection = async (sheetId) => {
    try {
      const res = await inspectionsApi.getInspectionById(sheetId);
      if (res.success) {
        setSelectedInspection(res.inspection);
      }
    } catch (err) {
      alert('Failed to load inspection results.');
    }
  };

  const handleOpenOrderInspections = async (order) => {
    // If only one inspection exists, directly open inspection details
    if ((order.inspections_count || 1) <= 1 && order.sheet_id) {
      handleViewInspection(order.sheet_id);
      return;
    }

    setLoadingOrderInspections(true);
    try {
      const res = await ordersApi.getOrderById(order.id);
      if (res.success && res.order) {
        setSelectedOrderInspections({
          order: res.order,
          inspections: res.order.inspections || []
        });
      } else if (order.sheet_id) {
        handleViewInspection(order.sheet_id);
      }
    } catch (err) {
      if (order.sheet_id) {
        handleViewInspection(order.sheet_id);
      } else {
        alert('Could not retrieve audits for this order.');
      }
    } finally {
      setLoadingOrderInspections(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Unassigned': 'badge-not-started',
      'Assigned': 'badge-not-started',
      'In Progress': 'badge-in-progress',
      'Draft Saved': 'badge-draft-saved',
      'Submitted': 'badge-submitted',
      'Approved': 'badge-approved',
      'Needs Re-inspection': 'badge-reinspection'
    };
    return map[status] || 'badge-not-started';
  };

  const inProgressCount = orders.filter(o => ['In Progress', 'Submitted', 'Draft Saved', 'Assigned'].includes(o.inspection_status)).length;
  const completedCount = orders.filter(o => o.inspection_status === 'Approved').length;

  const filteredOrders = orders.filter(o => {
    if (activeMenu === 'active' && !['In Progress', 'Submitted', 'Draft Saved', 'Assigned'].includes(o.inspection_status)) {
      return false;
    }
    if (activeMenu === 'approved' && o.inspection_status !== 'Approved') {
      return false;
    }
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.po_number.toLowerCase().includes(s) ||
      o.factory_name.toLowerCase().includes(s) ||
      o.product_type.toLowerCase().includes(s)
    );
  });

  return (
    <div className="dashboard-container customer-dashboard-theme">
      {/* DESKTOP SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8', flexShrink: 0 }}>
                <Building size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Client Portal
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                  USA Buyer PO Center
                </div>
              </div>
            </div>
          </div>

          <nav className="dashboard-sidebar-nav">
            <button
              onClick={() => setActiveMenu('all')}
              className={`sidebar-nav-item ${activeMenu === 'all' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <FileText size={18} />
                <span>All Orders</span>
              </div>
              <span className="sidebar-badge">{orders.length}</span>
            </button>

            <button
              onClick={() => setActiveMenu('active')}
              className={`sidebar-nav-item ${activeMenu === 'active' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <Clock size={18} />
                <span>Under Inspection</span>
              </div>
              <span className="sidebar-badge">{inProgressCount}</span>
            </button>

            <button
              onClick={() => setActiveMenu('approved')}
              className={`sidebar-nav-item ${activeMenu === 'approved' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <CheckCircle size={18} />
                <span>Certified &amp; Approved</span>
              </div>
              <span className="sidebar-badge">{completedCount}</span>
            </button>

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1E293B' }}>
              <button
                onClick={() => setShowOrderModal(true)}
                className="btn btn-accent"
                style={{ width: '100%', justifyContent: 'center', fontWeight: 700 }}
              >
                <Plus size={16} />
                <span>Create New PO</span>
              </button>
            </div>
          </nav>
        </div>

        <div>
          {/* Quick WhatsApp Support Link in Sidebar */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-success btn-sm"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }}
          >
            <MessageCircle size={14} />
            <span>Chat QA Lead</span>
          </a>

          <div className="sidebar-user-card">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                Buyer Account
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
      <main className="dashboard-main customer-dashboard-theme">
        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            {/* Breadcrumb - hidden on mobile screens */}
            <div className="dashboard-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.25rem' }}>
              <span>Client Portal</span>
              <ChevronRight size={13} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Purchase Order Tracking</span>
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Purchase Orders &amp; Real-Time Audit Telemetry
            </h1>
          </div>

          {/* Action Buttons: Single row on mobile */}
          <div className="order-header-actions mobile-actions-row">
            <button onClick={fetchOrders} className="btn btn-outline btn-sm">
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              className="btn btn-accent btn-sm"
              style={{ fontWeight: 700 }}
            >
              <Plus size={16} />
              <span className="btn-text-full">Create New PO Order</span>
              <span className="btn-text-short">Create PO</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className={`btn btn-outline btn-sm mobile-filter-btn ${(searchTerm ? 1 : 0) + (activeMenu !== 'all' ? 1 : 0) > 0 ? 'btn-primary' : ''}`}
              title="Advanced Filters"
            >
              <Filter size={14} />
              <span>Filter{(searchTerm ? 1 : 0) + (activeMenu !== 'all' ? 1 : 0) > 0 ? ` (${(searchTerm ? 1 : 0) + (activeMenu !== 'all' ? 1 : 0)})` : ''}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards - Responsive Side-by-Side on mobile */}
        <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Total Purchase Orders</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', marginTop: '0.25rem', color: '#0F172A' }}>{orders.length}</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Under Active Inspection</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#0284C7', marginTop: '0.25rem' }}>{inProgressCount}</div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Certified &amp; Approved</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#16A34A', marginTop: '0.25rem' }}>{completedCount}</div>
          </div>
        </div>

        {/* Search Bar & View Mode Toggle (Hidden on Mobile) */}
        <div className="order-filter-bar desktop-inline-filter" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by PO #, Order #, or Mill Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem' }}
            />
          </div>

          {/* Table vs Cards View Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
              title="Table View"
              style={{ padding: '6px 10px' }}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
              title="Cards View (Mobile-Friendly)"
              style={{ padding: '6px 10px' }}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>

        {/* Mobile Advanced Filter Popup Modal */}
        <AdvancedFilterModal
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          title="Filter Purchase Orders"
          activeCount={(searchTerm ? 1 : 0) + (activeMenu !== 'all' ? 1 : 0)}
          onReset={() => {
            setSearchTerm('');
            setActiveMenu('all');
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Search PO / Mill
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
              <input
                type="text"
                placeholder="PO #, Order #, Mill Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem', width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
              Select Order Status
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <button
                type="button"
                onClick={() => { setActiveMenu('all'); }}
                className={`mobile-filter-option-btn ${activeMenu === 'all' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: activeMenu === 'all' ? '#3B82F6' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={16} color={activeMenu === 'all' ? '#FFFFFF' : '#2563EB'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: activeMenu === 'all' ? '#1E40AF' : '#1E293B' }}>
                      All Purchase Orders
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Complete PO list</span>
                  </div>
                </div>
                <span className={`badge ${activeMenu === 'all' ? 'badge-primary' : 'badge-neutral'}`}>{orders.length}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMenu('active'); }}
                className={`mobile-filter-option-btn ${activeMenu === 'active' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: activeMenu === 'active' ? '#F59E0B' : '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color={activeMenu === 'active' ? '#FFFFFF' : '#D97706'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: activeMenu === 'active' ? '#92400E' : '#1E293B' }}>
                      Under Active Inspection
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Ongoing factory audits</span>
                  </div>
                </div>
                <span className={`badge ${activeMenu === 'active' ? 'badge-primary' : 'badge-neutral'}`}>{inProgressCount}</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveMenu('approved'); }}
                className={`mobile-filter-option-btn ${activeMenu === 'approved' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: activeMenu === 'approved' ? '#10B981' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={16} color={activeMenu === 'approved' ? '#FFFFFF' : '#059669'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: activeMenu === 'approved' ? '#065F46' : '#1E293B' }}>
                      Certified &amp; Approved
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Finalized QA certificates</span>
                  </div>
                </div>
                <span className={`badge ${activeMenu === 'approved' ? 'badge-primary' : 'badge-neutral'}`}>{completedCount}</span>
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.45rem' }}>
              Display Mode
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.65rem 0.85rem', fontWeight: 700 }}
              >
                <LayoutGrid size={15} /> Cards View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'center', padding: '0.65rem 0.85rem', fontWeight: 700 }}
              >
                <List size={15} /> Table View
              </button>
            </div>
          </div>
        </AdvancedFilterModal>

        {/* Orders Content: Table View vs Cards View */}
        {viewMode === 'table' ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Order Number</th>
                  <th>Product Description</th>
                  <th>Pakistan Mill / City</th>
                  <th>Ordered Qty</th>
                  <th>Live Inspection Status</th>
                  <th>Results &amp; Certificate</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{o.po_number}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', color: '#64748B' }}>{o.order_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.product_type}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.product_description || 'Standard Specs'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.factory_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <MapPin size={11} color="#DC2626" /> {o.factory_city}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {o.total_quantity?.toLocaleString()} {o.unit}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(o.inspection_status)}`}>
                          {o.inspection_status === 'In Progress' && <span className="live-pulse" style={{ width: '6px', height: '6px', marginRight: '4px' }} />}
                          {o.inspection_status}
                        </span>
                      </td>
                      <td>
                        {o.sheet_id || o.inspections_count > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleOpenOrderInspections(o)}
                              className="btn btn-outline btn-sm"
                              style={{ fontWeight: 600 }}
                            >
                              <Eye size={14} /> {o.inspections_count > 1 ? `View Audits (${o.inspections_count})` : 'View Audit'}
                            </button>
                            {o.inspection_status === 'Approved' && o.sheet_id && (
                              <button
                                type="button"
                                onClick={() => openPdfViewer(o.sheet_id, {
                                  title: `Inspection Certificate - PO ${o.po_number || ''}`,
                                  poNumber: o.po_number,
                                  status: o.inspection_status
                                })}
                                className="btn btn-ghost btn-sm"
                                style={{ color: '#DC2626', padding: '4px' }}
                                title="View Official PDF Report (with Return to App)"
                              >
                                <FileText size={16} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Awaiting Assignment</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                      {loading ? 'Loading your orders...' : 'No orders found matching this filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Orders Responsive Cards View */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((o) => (
                <div 
                  key={o.id} 
                  style={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #E2E8F0', 
                    borderRadius: '8px', 
                    padding: '1.15rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Card Header: PO #, Order # & Status Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                          {o.po_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          Order: {o.order_number}
                        </div>
                      </div>
                      <span className={`badge ${getStatusBadge(o.inspection_status)}`}>
                        {o.inspection_status === 'In Progress' && <span className="live-pulse" style={{ width: '6px', height: '6px', marginRight: '4px' }} />}
                        {o.inspection_status}
                      </span>
                    </div>

                    {/* Mill and Quantity block */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #F1F5F9', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Mill / Factory</div>
                        <div style={{ fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.factory_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          <MapPin size={11} /> {o.factory_city}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Total Quantity</div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                          {o.total_quantity?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{o.unit}</div>
                      </div>
                    </div>

                    <div>
                      <span className="badge badge-in-progress" style={{ fontSize: '0.7rem' }}>
                        {o.product_type}
                      </span>
                      {o.product_description && (
                        <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {o.product_description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    {o.sheet_id || o.inspections_count > 0 ? (
                      <>
                        <button
                          onClick={() => handleOpenOrderInspections(o)}
                          className="btn btn-outline btn-sm"
                          style={{ fontWeight: 600, flex: 1, justifyContent: 'center' }}
                        >
                          <Eye size={14} /> {o.inspections_count > 1 ? `View Audits (${o.inspections_count})` : 'View Audit'}
                        </button>
                        {o.inspection_status === 'Approved' && o.sheet_id && (
                          <button
                            type="button"
                            onClick={() => openPdfViewer(o.sheet_id, {
                              title: `Inspection Certificate - PO ${o.po_number || ''}`,
                              poNumber: o.po_number,
                              status: o.inspection_status
                            })}
                            className="btn btn-primary btn-sm"
                            style={{ gap: '4px' }}
                            title="View Official PDF Report (with Return to App)"
                          >
                            <FileText size={14} /> View PDF
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Awaiting Inspector Assignment</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
                {loading ? 'Loading your orders...' : 'No orders found matching this filter.'}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Order Modal - Wide multi-column layout avoiding vertical scrollbars */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1060px', width: '94vw' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create New Purchase Order for Inspection</h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder}>
              <div className="modal-body" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {error && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                {/* Row 1: PO Number & Product Nature */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">PO Reference Number *</label>
                    <input
                      type="text"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="e.g. PO-USA-99214"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Nature *</label>
                    <select
                      value={formData.product_type}
                      onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="Woven Denim Fabric & Apparel">Woven Denim Fabric &amp; Apparel</option>
                      <option value="Knitwear & Combed Cotton Apparel">Knitwear &amp; Combed Cotton Apparel</option>
                      <option value="Greige Yarn & Mill Cones">Greige Yarn &amp; Mill Cones</option>
                      <option value="Home Textile & Terry Towels">Home Textile &amp; Terry Towels</option>
                      <option value="Industrial Canvas & Twill">Industrial Canvas &amp; Twill</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Product Description */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Product Technical Description / Specs</label>
                  <textarea
                    rows={2}
                    value={formData.product_description}
                    onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                    placeholder="e.g. 100% Combed ringspun cotton polo shirts, 220 GSM pique, side split hem, enzyme washed..."
                    className="form-textarea"
                  />
                </div>

                {/* Row 3: Mill Info (Name, City, Full Address) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Factory / Mill Name in Pakistan *</label>
                    <input
                      type="text"
                      value={formData.factory_name}
                      onChange={(e) => setFormData({ ...formData, factory_name: e.target.value })}
                      placeholder="e.g. Interloop Limited Knit Division"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Factory City (Pakistan) *</label>
                    <select
                      value={formData.factory_city}
                      onChange={(e) => setFormData({ ...formData, factory_city: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="Karachi">Karachi</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Lahore">Lahore</option>
                      <option value="Sialkot">Sialkot</option>
                      <option value="Multan">Multan</option>
                      <option value="Gujranwala">Gujranwala</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Factory Full Physical Address *</label>
                    <input
                      type="text"
                      value={formData.factory_address}
                      onChange={(e) => setFormData({ ...formData, factory_address: e.target.value })}
                      placeholder="Street, Industrial Area, Sector, Mill Gate..."
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Row 4: Optional Factory Contact & Map Pin */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem 1rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Factory Site Contact &amp; Navigation Pin (Optional for Inspector)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Site Contact Person Name"
                      value={formData.factory_contact_name}
                      onChange={(e) => setFormData({ ...formData, factory_contact_name: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.825rem' }}
                    />
                    <input
                      type="text"
                      placeholder="Site Contact Phone"
                      value={formData.factory_contact_phone}
                      onChange={(e) => setFormData({ ...formData, factory_contact_phone: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.825rem' }}
                    />
                    <input
                      type="url"
                      placeholder="Google Maps Pin Link (e.g. https://maps.google.com/?q=...)"
                      value={formData.factory_map_url}
                      onChange={(e) => setFormData({ ...formData, factory_map_url: e.target.value })}
                      className="form-input"
                      style={{ fontSize: '0.825rem' }}
                    />
                  </div>
                </div>

                {/* Row 5: Total Qty, Unit, Order Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Total Order Quantity *</label>
                    <input
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                      placeholder="e.g. 10000"
                      required
                      min="1"
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Unit</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="form-select"
                    >
                      <option value="pieces">pieces</option>
                      <option value="yards">yards</option>
                      <option value="meters">meters</option>
                      <option value="cones">cones</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Order Date</label>
                    <input
                      type="date"
                      value={formData.order_date}
                      onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {submitting ? 'Submitting Order...' : 'Confirm & Save Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspection Details Viewer Modal (Customer Read-Only) */}
      {selectedInspection && (
        <div className="modal-overlay" onClick={() => setSelectedInspection(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '95vw' }}>
            <div className="modal-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                    Inspection Report: {selectedInspection.sheet_number}
                  </h3>
                  <span className={`badge ${getStatusBadge(selectedInspection.status)}`}>
                    {selectedInspection.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  PO: {selectedInspection.po_number} • Mill: {selectedInspection.factory_name} ({selectedInspection.factory_city})
                </p>
              </div>
              <button onClick={() => setSelectedInspection(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Telemetry Summary */}
              <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#475569' }}>Total Ordered Qty:</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedInspection.ordered_quantity?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: '#475569' }}>Actual Inspected Qty:</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedInspection.inspected_quantity ? selectedInspection.inspected_quantity.toLocaleString() : 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#475569' }}>Defects Detected:</span>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#DC2626' }}>{selectedInspection.total_defect_count || 0}</div>
                  </div>
                  <div>
                    <span style={{ color: '#475569' }}>Calculated Defect Rate:</span>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem', color: selectedInspection.overall_defect_percentage > 2.5 ? '#DC2626' : '#16A34A' }}>
                      {selectedInspection.overall_defect_percentage || 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {selectedInspection.photos && selectedInspection.photos.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Camera size={16} /> Inspection Photos ({selectedInspection.photos.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
                    {selectedInspection.photos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => onOpenPhoto(photo)}
                        style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--radius-xs)', overflow: 'hidden', cursor: 'pointer' }}
                      >
                        <img src={photo.photo_url} alt="Defect" style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                        <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', color: '#475569' }}>
                          {photo.caption || 'Photo Evidence'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => openPdfViewer(selectedInspection.id, {
                    title: `Inspection Report #${selectedInspection.id}`,
                    status: selectedInspection.status
                  })}
                  className="btn btn-outline btn-sm"
                  title="View Official PDF Report (with Return to App)"
                >
                  <FileText size={15} color="#DC2626" /> View PDF Report
                </button>
                <a href={reportApi.getExcelUrl(selectedInspection.id)} download target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  <Download size={15} color="#16A34A" /> Download Excel
                </a>
              </div>
              <button onClick={() => setSelectedInspection(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Inspections List Modal for Customer */}
      {selectedOrderInspections && (
        <div className="modal-overlay" onClick={() => setSelectedOrderInspections(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '92vw' }}>
            <div className="modal-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ClipboardCheck size={20} color="#38BDF8" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Audits &amp; Inspections: PO #{selectedOrderInspections.order?.po_number}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Order #{selectedOrderInspections.order?.order_number} • Mill: {selectedOrderInspections.order?.factory_name} ({selectedOrderInspections.order?.factory_city})
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrderInspections(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  Total Recorded Audits ({selectedOrderInspections.inspections?.length || 0})
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Ordered Qty: {selectedOrderInspections.order?.total_quantity?.toLocaleString()} {selectedOrderInspections.order?.unit}
                </span>
              </div>

              {selectedOrderInspections.inspections?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {selectedOrderInspections.inspections.map((ins, idx) => (
                    <div
                      key={ins.id}
                      style={{
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '0.85rem 1rem',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
                            Audit #{selectedOrderInspections.inspections.length - idx}: {ins.sheet_number}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            • {ins.created_at ? new Date(ins.created_at).toLocaleDateString() : 'Active'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {ins.pass_fail_result && ins.pass_fail_result !== 'Pending' && (
                            <span className={`badge ${ins.pass_fail_result === 'Pass' ? 'badge-approved' : 'badge-reinspection'}`} style={{ fontSize: '0.65rem' }}>
                              {ins.pass_fail_result}
                            </span>
                          )}
                          <span className={`badge ${getStatusBadge(ins.status)}`} style={{ fontSize: '0.68rem' }}>
                            {ins.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                        <div>
                          <span style={{ color: '#64748B', display: 'block' }}>Field Inspector:</span>
                          <strong>{ins.assigned_employee_name} ({ins.assigned_employee_code})</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', display: 'block' }}>Protocol:</span>
                          <span style={{ color: '#0F172A' }}>{ins.template_title || ins.template_product_type || 'QA Protocol'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', display: 'block' }}>Defects Detected:</span>
                          <strong style={{ color: (ins.total_defect_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                            {ins.total_defect_count || 0} defects
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B', display: 'block' }}>Inspected Qty:</span>
                          <span>{ins.inspected_quantity || ins.ordered_quantity} {selectedOrderInspections.order?.unit}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setSelectedOrderInspections(null);
                            handleViewInspection(ins.id);
                          }}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#0284C7', borderColor: '#BAE6FD' }}
                        >
                          <Eye size={13} /> View Audit Telemetry
                        </button>
                        <a
                          href={reportApi.getExcelUrl(ins.id)}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#16A34A' }}
                        >
                          <Download size={13} /> Excel
                        </a>
                        <button
                          type="button"
                          onClick={() => openPdfViewer(ins.id, {
                            title: `Inspection Report #${ins.id}`,
                            status: ins.status
                          })}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#DC2626' }}
                          title="View Official PDF Report (with Return to App)"
                        >
                          <FileText size={13} /> View PDF
                        </button>

                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                  No inspections recorded for this order yet.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedOrderInspections(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
