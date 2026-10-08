import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import { inspectionsApi } from '../../services/api';
import { InspectionSheetRunner } from './InspectionSheetRunner';
import { 
  HardHat, 
  MapPin, 
  Clock, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Calendar,
  ExternalLink,
  Phone,
  FileCheck,
  ListTodo,
  LogOut,
  Menu,
  X,
  Globe,
  Filter,
  Table,
  LayoutGrid,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';

export function EmployeeDashboard({ onOpenPhoto, onNavigate, isMobileDrawerOpen, onCloseMobileDrawer }) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const { user, logout } = useAuth();
  const { companyName, whatsappLink } = useSite();
  const { subscribe } = useSocket();

  const [desktopViewMode, setDesktopViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('employee_view_mode') || 'table';
    }
    return 'table';
  });

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSheetId, setActiveSheetId] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sheet = params.get('sheetId');
      if (sheet) return parseInt(sheet, 10) || null;
      const saved = sessionStorage.getItem('employee_active_sheet_id');
      if (saved) return parseInt(saved, 10) || null;
    }
    return null;
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const filter = params.get('filter');
      if (filter && ['active', 'reinspection', 'submitted', 'approved', 'all'].includes(filter)) return filter;
      const saved = sessionStorage.getItem('employee_status_filter');
      if (saved && ['active', 'reinspection', 'submitted', 'approved', 'all'].includes(saved)) return saved;
    }
    return 'active';
  }); // 'active', 'reinspection', 'submitted', 'approved', 'all'

  // Sync state with URL params and sessionStorage
  useEffect(() => {
    try {
      if (activeSheetId) {
        sessionStorage.setItem('employee_active_sheet_id', String(activeSheetId));
      } else {
        sessionStorage.removeItem('employee_active_sheet_id');
      }
      sessionStorage.setItem('employee_status_filter', statusFilter);
      const url = new URL(window.location.href);
      if (activeSheetId) {
        url.searchParams.set('sheetId', String(activeSheetId));
      } else {
        url.searchParams.delete('sheetId');
      }
      url.searchParams.set('filter', statusFilter);
      window.history.replaceState({ ...window.history.state, sheetId: activeSheetId, filter: statusFilter }, '', url.toString());
    } catch (_) {}
  }, [activeSheetId, statusFilter]);

  // Synchronize statusFilter and sheet view with mobile menu drawer navigation
  useEffect(() => {
    const handleFilterSync = (e) => {
      const targetFilter = e?.detail || new URLSearchParams(window.location.search).get('filter');
      if (targetFilter && ['active', 'reinspection', 'submitted', 'approved', 'all'].includes(targetFilter)) {
        setActiveSheetId(null);
        setStatusFilter(targetFilter);
      }
    };
    window.addEventListener('apex:employee_filter_change', handleFilterSync);
    window.addEventListener('popstate', handleFilterSync);
    return () => {
      window.removeEventListener('apex:employee_filter_change', handleFilterSync);
      window.removeEventListener('popstate', handleFilterSync);
    };
  }, []);

  const fetchMyInspections = useCallback(async () => {
    try {
      const res = await inspectionsApi.getInspections();
      if (res.success) {
        setInspections(res.inspections);
      }
    } catch (err) {
      console.error('Error fetching assigned inspections:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyInspections();
  }, [fetchMyInspections]);

  // Real-time synchronization
  useEffect(() => {
    const unsub = subscribe('employee:notification', () => {
      fetchMyInspections();
    });
    return unsub;
  }, [subscribe, fetchMyInspections]);

  if (activeSheetId) {
    return (
      <div style={{ width: '100%', padding: '1.25rem 2rem 5rem 2rem' }}>
        <InspectionSheetRunner
          sheetId={activeSheetId}
          onBack={() => {
            setActiveSheetId(null);
            fetchMyInspections();
          }}
          onOpenPhoto={onOpenPhoto}
        />
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const map = {
      'Not Started': 'badge-not-started',
      'In Progress': 'badge-in-progress',
      'Draft Saved': 'badge-draft-saved',
      'Submitted': 'badge-submitted',
      'Approved': 'badge-approved',
      'Needs Re-inspection': 'badge-reinspection'
    };
    return map[status] || 'badge-not-started';
  };

  const activeCount = inspections.filter(i => ['Not Started', 'In Progress', 'Draft Saved', 'Needs Re-inspection'].includes(i.status)).length;
  const reInspectCount = inspections.filter(i => i.status === 'Needs Re-inspection').length;
  const submittedCount = inspections.filter(i => i.status === 'Submitted').length;
  const approvedCount = inspections.filter(i => i.status === 'Approved').length;

  const filteredTasks = inspections.filter(ins => {
    if (statusFilter === 'active') {
      return ['Not Started', 'In Progress', 'Draft Saved', 'Needs Re-inspection'].includes(ins.status);
    }
    if (statusFilter === 'reinspection') {
      return ins.status === 'Needs Re-inspection';
    }
    if (statusFilter === 'submitted') {
      return ins.status === 'Submitted';
    }
    if (statusFilter === 'approved') {
      return ins.status === 'Approved';
    }
    return true; // all
  });

  return (
    <div className="dashboard-container">
      {/* DESKTOP SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div>
          <div className="dashboard-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
                <HardHat size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Field Inspector App
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                  Mill Checkpoints
                </div>
              </div>
            </div>
          </div>

          <nav className="dashboard-sidebar-nav">
            <button
              onClick={() => setStatusFilter('active')}
              className={`sidebar-nav-item ${statusFilter === 'active' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <ListTodo size={18} />
                <span>Active Field Tasks</span>
              </div>
              <span className="sidebar-badge">{activeCount}</span>
            </button>

            {reInspectCount > 0 && (
              <button
                onClick={() => setStatusFilter('reinspection')}
                className={`sidebar-nav-item ${statusFilter === 'reinspection' ? 'active' : ''}`}
                style={{ color: statusFilter === 'reinspection' ? '#F87171' : '#EF4444' }}
              >
                <div className="sidebar-nav-item-left">
                  <AlertTriangle size={18} />
                  <span>Re-Inspections</span>
                </div>
                <span className="sidebar-badge" style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}>{reInspectCount}</span>
              </button>
            )}

            <button
              onClick={() => setStatusFilter('submitted')}
              className={`sidebar-nav-item ${statusFilter === 'submitted' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <Clock size={18} />
                <span>Submitted / In Review</span>
              </div>
              <span className="sidebar-badge">{submittedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`sidebar-nav-item ${statusFilter === 'approved' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <CheckCircle size={18} />
                <span>Approved Audits</span>
              </div>
              <span className="sidebar-badge">{approvedCount}</span>
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`sidebar-nav-item ${statusFilter === 'all' ? 'active' : ''}`}
            >
              <div className="sidebar-nav-item-left">
                <FileCheck size={18} />
                <span>All Task History</span>
              </div>
              <span className="sidebar-badge">{inspections.length}</span>
            </button>
          </nav>
        </div>

        <div>
          <div className="sidebar-user-card">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                {user?.employee_code}
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
        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E2E8F0' }}>
          <div>
            {/* Breadcrumb - hidden on mobile screens */}
            <div className="dashboard-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748B', marginBottom: '0.25rem' }}>
              <span>Inspector App</span>
              <ChevronRight size={13} />
              <span style={{ color: '#0F172A', fontWeight: 600 }}>Assigned Mill Checkpoints</span>
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              On-Site Task Queue ({filteredTasks.length})
            </h1>
          </div>

          {/* Action Buttons: Single row on mobile */}
          <div className="order-header-actions mobile-actions-row">
            {/* Desktop View Switcher: Table View vs Cards in Rows */}
            <div className="employee-view-toggle">
              <button
                type="button"
                onClick={() => { setDesktopViewMode('table'); localStorage.setItem('employee_view_mode', 'table'); }}
                className={`btn btn-sm ${desktopViewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '5px 11px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                title="Desktop Table of Inspection List"
              >
                <Table size={14} />
                <span>Table View</span>
              </button>
              <button
                type="button"
                onClick={() => { setDesktopViewMode('cards'); localStorage.setItem('employee_view_mode', 'cards'); }}
                className={`btn btn-sm ${desktopViewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '5px 11px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                title="Desktop Cards in Rows"
              >
                <LayoutGrid size={14} />
                <span>Cards in Rows</span>
              </button>
            </div>

            <button onClick={fetchMyInspections} className="btn btn-outline btn-sm">
              <RefreshCw size={14} /> <span>Refresh Tasks</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className={`btn btn-outline btn-sm mobile-filter-btn ${statusFilter !== 'active' ? 'btn-primary' : ''}`}
              title="Filter Tasks"
            >
              <Filter size={14} />
              <span>Filter{statusFilter !== 'active' ? ` (${statusFilter})` : ''}</span>
            </button>
          </div>
        </div>

        {/* Mobile Advanced Filter Popup Modal */}
        <AdvancedFilterModal
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          title="Filter Task Queue"
          activeCount={statusFilter !== 'active' ? 1 : 0}
          onReset={() => setStatusFilter('active')}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Select Status View
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => { setStatusFilter('active'); setMobileFilterOpen(false); }}
                className={`mobile-filter-option-btn ${statusFilter === 'active' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: statusFilter === 'active' ? '#3B82F6' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ListTodo size={16} color={statusFilter === 'active' ? '#FFFFFF' : '#2563EB'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusFilter === 'active' ? '#1E40AF' : '#1E293B' }}>
                      Active Field Tasks
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>In-progress audits</span>
                  </div>
                </div>
                <span className={`badge ${statusFilter === 'active' ? 'badge-primary' : 'badge-neutral'}`}>{activeCount}</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatusFilter('reinspection'); setMobileFilterOpen(false); }}
                className={`mobile-filter-option-btn danger-filter ${statusFilter === 'reinspection' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: statusFilter === 'reinspection' ? '#EF4444' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} color={statusFilter === 'reinspection' ? '#FFFFFF' : '#DC2626'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusFilter === 'reinspection' ? '#991B1B' : '#DC2626' }}>
                      Re-Inspections Required
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#EF4444' }}>Returned for revision</span>
                  </div>
                </div>
                <span className="badge badge-danger">{reInspectCount}</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatusFilter('submitted'); setMobileFilterOpen(false); }}
                className={`mobile-filter-option-btn ${statusFilter === 'submitted' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: statusFilter === 'submitted' ? '#F59E0B' : '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color={statusFilter === 'submitted' ? '#FFFFFF' : '#D97706'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusFilter === 'submitted' ? '#92400E' : '#1E293B' }}>
                      Submitted Audits (Locked)
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Awaiting Director sign-off</span>
                  </div>
                </div>
                <span className="badge badge-neutral">{submittedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatusFilter('approved'); setMobileFilterOpen(false); }}
                className={`mobile-filter-option-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: statusFilter === 'approved' ? '#10B981' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={16} color={statusFilter === 'approved' ? '#FFFFFF' : '#059669'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusFilter === 'approved' ? '#065F46' : '#1E293B' }}>
                      Approved &amp; Certified
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Completed audits</span>
                  </div>
                </div>
                <span className="badge badge-success">{approvedCount}</span>
              </button>

              <button
                type="button"
                onClick={() => { setStatusFilter('all'); setMobileFilterOpen(false); }}
                className={`mobile-filter-option-btn ${statusFilter === 'all' ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: statusFilter === 'all' ? '#6366F1' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileCheck size={16} color={statusFilter === 'all' ? '#FFFFFF' : '#4F46E5'} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: statusFilter === 'all' ? '#3730A3' : '#1E293B' }}>
                      All Task History
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Full inspection ledger</span>
                  </div>
                </div>
                <span className="badge badge-neutral">{inspections.length}</span>
              </button>
            </div>
          </div>
        </AdvancedFilterModal>

        {/* Task List / Cards Display Area */}
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0' }}>
            <CheckCircle size={36} color="#10B981" style={{ margin: '0 auto 0.75rem auto' }} />
            <p style={{ fontWeight: 600, color: '#334155' }}>All caught up!</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>No inspections matching this tab filter.</p>
          </div>
        ) : desktopViewMode === 'table' ? (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="employee-table-desktop card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #CBD5E1', boxShadow: 'var(--shadow-sm)', borderRadius: 'var(--radius-sm)' }}>
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC' }}>
                      <th style={{ minWidth: '140px', padding: '0.85rem 1rem' }}>Sheet # &amp; PO</th>
                      <th style={{ minWidth: '170px', padding: '0.85rem 1rem' }}>Factory / Mill</th>
                      <th style={{ minWidth: '140px', padding: '0.85rem 1rem' }}>Location</th>
                      <th style={{ minWidth: '140px', padding: '0.85rem 1rem' }}>Product Type</th>
                      <th style={{ textAlign: 'right', minWidth: '100px', padding: '0.85rem 1rem' }}>Lot Size</th>
                      <th style={{ textAlign: 'center', minWidth: '120px', padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ textAlign: 'right', minWidth: '160px', padding: '0.85rem 1rem' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((ins) => (
                      <tr 
                        key={ins.id} 
                        style={{ 
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: ins.status === 'Needs Re-inspection' ? '#FEF2F2' : '#FFFFFF'
                        }}
                      >
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#0F172A' }}>
                            {ins.sheet_number}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            PO: <strong style={{ color: '#0284C7' }}>{ins.po_number || 'N/A'}</strong>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <strong style={{ color: '#0F172A', display: 'block' }}>{ins.factory_name}</strong>
                          {ins.status === 'Needs Re-inspection' && ins.admin_remarks && (
                            <span style={{ fontSize: '0.72rem', color: '#DC2626', fontStyle: 'italic' }}>
                              ⚠️ "{ins.admin_remarks}"
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                            <MapPin size={13} color="#DC2626" />
                            <span>{ins.factory_city}</span>
                            {ins.factory_map_url && (
                              <a href={ins.factory_map_url} target="_blank" rel="noopener noreferrer" title="View Google Maps" style={{ color: '#0284C7', marginLeft: '3px' }}>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{ins.product_type}</span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {ins.ordered_quantity?.toLocaleString()} pcs
                        </td>
                        <td style={{ textAlign: 'center', padding: '0.85rem 1rem' }}>
                          <span className={`badge ${getStatusBadge(ins.status)}`}>
                            {ins.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '0.85rem 1rem' }}>
                          {['Submitted', 'Approved'].includes(ins.status) ? (
                            <button
                              onClick={() => setActiveSheetId(ins.id)}
                              className="btn btn-outline btn-sm"
                              style={{ color: '#166534', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4', fontWeight: 700, fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Inspection sheet finalized. Open in Read-Only mode."
                            >
                              <Eye size={13} />
                              <span>View Sheet (Read-Only)</span>
                            </button>
                          ) : ins.status === 'Needs Re-inspection' ? (
                            <button
                              onClick={() => setActiveSheetId(ins.id)}
                              className="btn btn-danger btn-sm"
                              style={{ fontWeight: 700, fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <AlertTriangle size={13} />
                              <span>Re-Inspect</span>
                            </button>
                          ) : ins.status === 'Not Started' ? (
                            <button
                              onClick={() => setActiveSheetId(ins.id)}
                              className="btn btn-success btn-sm"
                              style={{ fontWeight: 700, fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Start Audit</span>
                              <ChevronRight size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => setActiveSheetId(ins.id)}
                              className="btn btn-primary btn-sm"
                              style={{ fontWeight: 700, fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Resume Audit</span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARDS VIEW (Fallback for Mobile Screens) */}
            <div className="employee-cards-mobile" style={{ display: 'none', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              {filteredTasks.map((ins) => (
                <div 
                  key={ins.id}
                  className="card"
                  style={{
                    border: ins.status === 'Needs Re-inspection' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                    boxShadow: 'var(--shadow-sm)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div className="card-header" style={{ backgroundColor: ins.status === 'Needs Re-inspection' ? '#FEF2F2' : '#F8FAFC', padding: '0.85rem 1.15rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F172A' }}>
                        {ins.sheet_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px' }}>
                        (PO: {ins.po_number})
                      </span>
                    </div>
                    <span className={`badge ${getStatusBadge(ins.status)}`}>
                      {ins.status}
                    </span>
                  </div>

                  <div className="card-body" style={{ padding: '1.15rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                      {ins.factory_name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem' }}>
                      <MapPin size={14} color="#DC2626" />
                      <span>{ins.factory_address} ({ins.factory_city})</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Product:</span>
                        <div style={{ fontWeight: 600 }}>{ins.product_type}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Total Lot Qty:</span>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{ins.ordered_quantity?.toLocaleString()} units</div>
                      </div>
                    </div>

                    {/* If Re-inspection requested by admin */}
                    {ins.status === 'Needs Re-inspection' && ins.admin_remarks && (
                      <div style={{ backgroundColor: '#FEE2E2', borderLeft: '3px solid #DC2626', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#991B1B', marginBottom: '1rem' }}>
                        <strong>Director Remarks:</strong> "{ins.admin_remarks}"
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', justifyContent: 'space-between' }}>
                      {ins.factory_map_url && (
                        <a
                          href={ins.factory_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <MapPin size={13} /> GPS Pin
                        </a>
                      )}

                      <button
                        onClick={() => setActiveSheetId(ins.id)}
                        className={`btn ${
                          ['Submitted', 'Approved'].includes(ins.status) ? 'btn-outline' :
                          ins.status === 'Needs Re-inspection' ? 'btn-danger' : 
                          ins.status === 'Not Started' ? 'btn-success' : 'btn-primary'
                        }`}
                        style={{ 
                          flex: 1, 
                          justifyContent: 'center', 
                          fontWeight: 700,
                          color: ['Submitted', 'Approved'].includes(ins.status) ? '#166534' : undefined,
                          borderColor: ['Submitted', 'Approved'].includes(ins.status) ? '#BBF7D0' : undefined,
                          backgroundColor: ['Submitted', 'Approved'].includes(ins.status) ? '#F0FDF4' : undefined
                        }}
                      >
                        <span>
                          {ins.status === 'Not Started' ? 'Open & Start Audit' :
                           ins.status === 'In Progress' || ins.status === 'Draft Saved' ? 'Resume Field Audit' :
                           ins.status === 'Needs Re-inspection' ? 'Re-Inspect Sheet' :
                           'View Sheet (Read-Only)'}
                        </span>
                        {['Submitted', 'Approved'].includes(ins.status) ? <Eye size={15} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* CARDS IN ROWS (MULTI-COLUMN GRID) VIEW */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem', width: '100%' }}>
            {filteredTasks.map((ins) => (
              <div 
                key={ins.id}
                className="card"
                style={{
                  border: ins.status === 'Needs Re-inspection' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                  boxShadow: 'var(--shadow-sm)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="card-header" style={{ backgroundColor: ins.status === 'Needs Re-inspection' ? '#FEF2F2' : '#F8FAFC', padding: '0.85rem 1.15rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#0F172A' }}>
                        {ins.sheet_number}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', marginLeft: '6px' }}>
                        (PO: {ins.po_number})
                      </span>
                    </div>
                    <span className={`badge ${getStatusBadge(ins.status)}`}>
                      {ins.status}
                    </span>
                  </div>

                  <div className="card-body" style={{ padding: '1.15rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                      {ins.factory_name}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem' }}>
                      <MapPin size={14} color="#DC2626" />
                      <span>{ins.factory_address} ({ins.factory_city})</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-xs)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ color: '#64748B' }}>Product:</span>
                        <div style={{ fontWeight: 600 }}>{ins.product_type}</div>
                      </div>
                      <div>
                        <span style={{ color: '#64748B' }}>Total Lot Qty:</span>
                        <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{ins.ordered_quantity?.toLocaleString()} units</div>
                      </div>
                    </div>

                    {/* If Re-inspection requested by admin */}
                    {ins.status === 'Needs Re-inspection' && ins.admin_remarks && (
                      <div style={{ backgroundColor: '#FEE2E2', borderLeft: '3px solid #DC2626', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#991B1B', marginBottom: '1rem' }}>
                        <strong>Director Remarks:</strong> "{ins.admin_remarks}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div style={{ padding: '0 1.15rem 1.15rem 1.15rem', display: 'flex', gap: '0.65rem', alignItems: 'center', justifyContent: 'space-between' }}>
                  {ins.factory_map_url && (
                    <a
                      href={ins.factory_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <MapPin size={13} /> GPS Pin
                    </a>
                  )}

                  <button
                    onClick={() => setActiveSheetId(ins.id)}
                    className={`btn ${
                      ['Submitted', 'Approved'].includes(ins.status) ? 'btn-outline' :
                      ins.status === 'Needs Re-inspection' ? 'btn-danger' : 
                      ins.status === 'Not Started' ? 'btn-success' : 'btn-primary'
                    }`}
                    style={{ 
                      flex: 1, 
                      justifyContent: 'center', 
                      fontWeight: 700,
                      color: ['Submitted', 'Approved'].includes(ins.status) ? '#166534' : undefined,
                      borderColor: ['Submitted', 'Approved'].includes(ins.status) ? '#BBF7D0' : undefined,
                      backgroundColor: ['Submitted', 'Approved'].includes(ins.status) ? '#F0FDF4' : undefined
                    }}
                  >
                    <span>
                      {ins.status === 'Not Started' ? 'Open & Start Audit' :
                       ins.status === 'In Progress' || ins.status === 'Draft Saved' ? 'Resume Field Audit' :
                       ins.status === 'Needs Re-inspection' ? 'Re-Inspect Sheet' :
                       'View Sheet (Read-Only)'}
                    </span>
                    {['Submitted', 'Approved'].includes(ins.status) ? <Eye size={15} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
