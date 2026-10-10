import React, { useState, useEffect, useCallback } from 'react';
import { inspectionsApi, ordersApi, templatesApi, usersApi, reportApi } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { InspectionReviewModal } from './InspectionReviewModal';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';
import { openPdfViewer } from '../../components/PdfReportViewerModal';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  User, 
  MapPin, 
  Percent, 
  Camera, 
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Trash2,
  X
} from 'lucide-react';

export function InspectionManagement({ onOpenPhoto }) {
  const { subscribe } = useSocket();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected inspection for review modal
  const [selectedInspection, setSelectedInspection] = useState(null);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingDependencies, setLoadingDependencies] = useState(false);
  const [assignForm, setAssignForm] = useState({
    order_id: '',
    template_id: '',
    assigned_employee_id: ''
  });
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchInspections = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (cityFilter) params.append('city', cityFilter);
      const res = await inspectionsApi.getInspections(params.toString());
      if (res.success) {
        setInspections(res.inspections);
      }
    } catch (err) {
      console.error('Error fetching inspections:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cityFilter]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Real-time synchronization via WebSockets!
  useEffect(() => {
    const unsubscribe = subscribe('inspection:status_changed', (data) => {
      console.log('Real-time event: refreshing inspections list');
      fetchInspections();
    });
    return unsubscribe;
  }, [subscribe, fetchInspections]);

  // Open drill-down review modal
  const handleOpenReview = async (id) => {
    try {
      const res = await inspectionsApi.getInspectionById(id);
      if (res.success) {
        setSelectedInspection(res.inspection);
      }
    } catch (err) {
      alert('Failed to load inspection details.');
    }
  };

  // Delete inspection sheet
  const handleDeleteInspection = async (ins) => {
    const confirmMsg = `Are you sure you want to delete inspection sheet #${ins.sheet_number} (Order: ${ins.order_number})?\n\nDeleting this inspection will not disturb the parent order (order status will be cleanly reset to Unassigned or updated to other active audits).`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await inspectionsApi.deleteInspection(ins.id);
      if (res && res.success) {
        setSelectedInspection(null);
        fetchInspections();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete inspection sheet.');
    }
  };

  // Open Assignment modal & load dependencies
  const handleOpenAssignModal = async () => {
    setAssignError('');
    setShowAssignModal(true);
    setLoadingDependencies(true);
    try {
      const [ordersRes, tmplRes, empRes] = await Promise.all([
        ordersApi.getOrders(),
        templatesApi.getTemplates(),
        usersApi.getEmployees()
      ]);

      const fetchedOrders = (ordersRes?.success && Array.isArray(ordersRes.orders)) ? ordersRes.orders : [];
      const fetchedTemplates = (tmplRes?.success && Array.isArray(tmplRes.templates)) ? tmplRes.templates : [];
      const fetchedEmployees = (empRes?.success && Array.isArray(empRes.employees)) ? empRes.employees : [];

      setOrders(fetchedOrders);
      setTemplates(fetchedTemplates);
      setEmployees(fetchedEmployees);

      setAssignForm(prev => ({
        order_id: prev.order_id || (fetchedOrders[0]?.id ? String(fetchedOrders[0].id) : ''),
        template_id: prev.template_id || (fetchedTemplates[0]?.id ? String(fetchedTemplates[0].id) : ''),
        assigned_employee_id: prev.assigned_employee_id || (fetchedEmployees[0]?.id ? String(fetchedEmployees[0].id) : '')
      }));
    } catch (err) {
      console.error('Failed to load assign dependencies:', err);
      setAssignError('Failed to load order, template, or inspector options. Please try again.');
    } finally {
      setLoadingDependencies(false);
    }
  };

  const handleCreateInspection = async (e) => {
    e.preventDefault();
    if (!assignForm.order_id || !assignForm.template_id || !assignForm.assigned_employee_id) {
      setAssignError('Please select Order, Protocol Template, and Assigned Field Inspector.');
      return;
    }

    setAssigning(true);
    setAssignError('');
    try {
      const res = await inspectionsApi.createInspection(assignForm);
      if (res.success) {
        setShowAssignModal(false);
        setAssignForm({ order_id: '', template_id: '', assigned_employee_id: '' });
        fetchInspections();
      } else {
        setAssignError(res.message || 'Failed to assign inspection.');
      }
    } catch (err) {
      setAssignError(err.message || 'Failed to assign inspection.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredInspections = inspections.filter(ins => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      ins.sheet_number.toLowerCase().includes(s) ||
      ins.order_number.toLowerCase().includes(s) ||
      ins.factory_name.toLowerCase().includes(s) ||
      ins.assigned_employee_name.toLowerCase().includes(s)
    );
  });

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

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const activeFilterCount = (searchTerm ? 1 : 0) + (statusFilter ? 1 : 0) + (cityFilter ? 1 : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div className="mobile-hide-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              Live Inspection Telemetry &amp; Approval Queue
            </h2>
            <span className="live-pulse" title="WebSocket Live Connected" />
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Real-time status updates from mill inspection perches across Pakistan.
          </p>
        </div>

        {/* Action Buttons: Single row on mobile */}
        <div className="order-header-actions mobile-actions-row">
          <button onClick={fetchInspections} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleOpenAssignModal} className="btn btn-primary">
            <Plus size={16} />
            <span className="btn-text-full">Assign Inspection Sheet</span>
            <span className="btn-text-short">Assign Sheet</span>
          </button>
          <button 
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className={`btn btn-outline btn-sm mobile-filter-btn ${activeFilterCount > 0 ? 'btn-primary' : ''}`}
            title="Advanced Filters"
          >
            <Filter size={14} />
            <span>Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Desktop Inline Filter Bar (Hidden on Mobile) */}
      <div className="order-filter-bar desktop-inline-filter">
        <div className="order-search-box">
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by Sheet #, PO #, Factory mill, or Inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '170px' }}
        >
          <option value="">All Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress (Live)</option>
          <option value="Draft Saved">Draft Saved</option>
          <option value="Submitted">Submitted (Approval Queue)</option>
          <option value="Approved">Approved</option>
          <option value="Needs Re-inspection">Needs Re-inspection</option>
        </select>

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
        >
          <option value="">All Pakistan Cities</option>
          <option value="Karachi">Karachi</option>
          <option value="Faisalabad">Faisalabad</option>
          <option value="Lahore">Lahore</option>
          <option value="Sialkot">Sialkot</option>
          <option value="Multan">Multan</option>
        </select>
      </div>

      {/* Mobile Advanced Filter Popup Modal */}
      <AdvancedFilterModal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Inspections"
        activeCount={activeFilterCount}
        onReset={() => {
          setSearchTerm('');
          setStatusFilter('');
          setCityFilter('');
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Search Keyword
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search by Sheet #, PO #, Mill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Inspection Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: '100%' }}
          >
            <option value="">All Statuses</option>
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress (Live)</option>
            <option value="Draft Saved">Draft Saved</option>
            <option value="Submitted">Submitted (Approval Queue)</option>
            <option value="Approved">Approved</option>
            <option value="Needs Re-inspection">Needs Re-inspection</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Factory Location / City
          </label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="form-select"
            style={{ width: '100%' }}
          >
            <option value="">All Pakistan Cities</option>
            <option value="Karachi">Karachi</option>
            <option value="Faisalabad">Faisalabad</option>
            <option value="Lahore">Lahore</option>
            <option value="Sialkot">Sialkot</option>
            <option value="Multan">Multan</option>
          </select>
        </div>
      </AdvancedFilterModal>

      {/* Inspections Master Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sheet #</th>
              <th>Order / PO</th>
              <th>Factory &amp; City</th>
              <th>Assigned Inspector</th>
              <th>Status (Real-Time)</th>
              <th>Inspected / Ordered Qty</th>
              <th>Defect % (On-Site)</th>
              <th>Photos</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInspections.length > 0 ? (
              filteredInspections.map((ins) => (
                <tr key={ins.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {ins.sheet_number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ins.order_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{ins.po_number}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ins.factory_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} color="#DC2626" /> {ins.factory_city}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{ins.assigned_employee_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      {ins.assigned_employee_code}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(ins.status)}`}>
                      {ins.status === 'In Progress' && <span className="live-pulse" style={{ width: '6px', height: '6px', marginRight: '4px' }} />}
                      {ins.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {ins.inspected_quantity ? ins.inspected_quantity.toLocaleString() : '-'}
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 400 }}> / {ins.ordered_quantity.toLocaleString()}</span>
                    </div>
                  </td>
                  <td>
                    {ins.overall_defect_percentage !== null && ins.overall_defect_percentage !== undefined ? (
                      <span style={{
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: ins.overall_defect_percentage > 2.5 ? '#DC2626' : '#16A34A'
                      }}>
                        {ins.overall_defect_percentage}%
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: ins.photo_count > 0 ? '#0284C7' : '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Camera size={14} /> {ins.photo_count || 0}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenReview(ins.id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#0F172A', fontWeight: 600 }}
                        title="Review details, photos and sign-off"
                      >
                        <Eye size={14} /> Review
                      </button>

                      <a
                        href={reportApi.getExcelUrl(ins.id)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#16A34A', padding: '4px' }}
                        title="Download Excel Report"
                      >
                        <Download size={16} />
                      </a>

                      <button
                        type="button"
                        onClick={() => openPdfViewer(ins.id, {
                          title: `Inspection Report #${ins.id} (${ins.po_number || ''})`,
                          poNumber: ins.po_number,
                          status: ins.status
                        })}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#DC2626', padding: '4px' }}
                        title="View Official PDF Report (with Return to App)"
                      >
                        <FileText size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteInspection(ins)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#DC2626', padding: '4px' }}
                        title="Delete Inspection Sheet"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                  {loading ? 'Loading live inspections...' : 'No inspection sheets match your current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Sheet from Template Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={20} color="#0284C7" />
                  Generate &amp; Assign Inspection Sheet
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Select target Purchase Order, Inspection Protocol Template, and Pakistan Field Inspector.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAssignModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInspection} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {assignError && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                    {assignError}
                  </div>
                )}

                {loadingDependencies ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
                    <RefreshCw size={24} className="live-pulse" style={{ margin: '0 auto 0.75rem auto' }} />
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading available Orders, Templates, and Field Inspectors...</p>
                  </div>
                ) : (
                  <>
                    {/* 1. Target Order / PO */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>1. Target Purchase Order / Contract *</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>({orders.length} available)</span>
                      </label>
                      <select
                        value={assignForm.order_id}
                        onChange={(e) => setAssignForm({ ...assignForm, order_id: e.target.value })}
                        className="form-select"
                        required
                        style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                      >
                        <option value="">-- Choose Target Order / PO --</option>
                        {orders.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.order_number} (PO: {o.po_number}) — {o.factory_name} ({o.factory_city}) [{o.total_quantity?.toLocaleString()} {o.unit}] • {o.product_type}
                          </option>
                        ))}
                      </select>
                      {orders.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                          No orders found. Please create a purchase order first.
                        </p>
                      )}
                    </div>

                    {/* 2. Inspection Protocol Template */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>2. Inspection Protocol &amp; AQL Template *</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>({templates.length} protocols)</span>
                      </label>
                      <select
                        value={assignForm.template_id}
                        onChange={(e) => setAssignForm({ ...assignForm, template_id: e.target.value })}
                        className="form-select"
                        required
                        style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                      >
                        <option value="">-- Choose Protocol Template --</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} — Category: {t.product_type}
                          </option>
                        ))}
                      </select>
                      {templates.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                          No inspection templates found. Please create a template in Template Management.
                        </p>
                      )}
                    </div>

                    {/* 3. Stationed Field Inspector */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', display: 'flex', justifyContent: 'space-between' }}>
                        <span>3. Stationed Field Inspector (Pakistan) *</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>({employees.length} field auditors)</span>
                      </label>
                      <select
                        value={assignForm.assigned_employee_id}
                        onChange={(e) => setAssignForm({ ...assignForm, assigned_employee_id: e.target.value })}
                        className="form-select"
                        required
                        style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                      >
                        <option value="">-- Choose Field Auditor --</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_code}) — Stationed in {emp.city} [{emp.active_tasks || 0} active audits]
                          </option>
                        ))}
                      </select>
                      {employees.length === 0 && (
                        <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                          No field inspectors registered. Please create an inspector in User Management.
                        </p>
                      )}
                    </div>

                    {/* Live Assignment Summary Card */}
                    {assignForm.order_id && assignForm.template_id && assignForm.assigned_employee_id && (
                      <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#0369A1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <CheckCircle size={14} color="#0284C7" /> Verified Assignment Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: '#64748B', display: 'block' }}>Target Mill / Location:</span>
                            <strong style={{ color: '#0F172A' }}>
                              {orders.find(o => String(o.id) === String(assignForm.order_id))?.factory_name || 'Selected Order'}
                              {' '}({orders.find(o => String(o.id) === String(assignForm.order_id))?.factory_city || ''})
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block' }}>Inspection Protocol:</span>
                            <strong style={{ color: '#0F172A' }}>
                              {templates.find(t => String(t.id) === String(assignForm.template_id))?.title || 'Selected Protocol'}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block' }}>Assigned Inspector:</span>
                            <strong style={{ color: '#0F172A' }}>
                              {employees.find(e => String(e.id) === String(assignForm.assigned_employee_id))?.name || 'Selected Auditor'}
                              {' '}({employees.find(e => String(e.id) === String(assignForm.assigned_employee_id))?.employee_code || ''})
                            </strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={assigning || loadingDependencies || !assignForm.order_id || !assignForm.template_id || !assignForm.assigned_employee_id} 
                  className="btn btn-primary"
                  style={{ fontWeight: 700, minWidth: '180px', justifyContent: 'center' }}
                >
                  {assigning ? (
                    <>
                      <RefreshCw size={15} className="live-pulse" />
                      <span>Generating Sheet...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Generate Sheet &amp; Dispatch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedInspection && (
        <InspectionReviewModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
          onRefresh={fetchInspections}
          onOpenPhoto={onOpenPhoto}
        />
      )}
    </div>
  );
}
