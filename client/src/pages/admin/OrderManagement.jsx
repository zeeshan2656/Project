import React, { useState, useEffect } from 'react';
import { ordersApi, usersApi, templatesApi, inspectionsApi, reportApi } from '../../services/api';
import { 
  Plus, 
  Search, 
  Download, 
  Building, 
  MapPin, 
  Phone, 
  Calendar, 
  User, 
  ExternalLink,
  X,
  Eye,
  UserPlus,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Check,
  FileText,
  Layers,
  Sparkles,
  List,
  LayoutGrid,
  ClipboardList,
  ClipboardCheck,
  AlertCircle,
  Trash2,
  Filter,
  RefreshCw
} from 'lucide-react';
import { InspectionReviewModal } from './InspectionReviewModal';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';
import { openPdfViewer } from '../../components/PdfReportViewerModal';

export function OrderManagement({ onOpenPhoto }) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

  // Review Order Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewingInspection, setReviewingInspection] = useState(null);

  // Assign Auditor Modal state
  const [assigningOrder, setAssigningOrder] = useState(null);
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Global notification banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  // New Order Form
  const [formData, setFormData] = useState({
    customer_id: '',
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.getOrders();
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [custRes, tmplRes, empRes] = await Promise.all([
        usersApi.getCustomers(),
        templatesApi.getTemplates(),
        usersApi.getEmployees()
      ]);

      if (custRes.success) {
        setCustomers(custRes.customers || []);
        if (custRes.customers?.length > 0) {
          setFormData(prev => ({ ...prev, customer_id: custRes.customers[0].id }));
        }
      }

      if (tmplRes.success) {
        setTemplates(tmplRes.templates || []);
      }

      if (empRes.success) {
        setEmployees(empRes.employees || []);
      }
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchDependencies();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await ordersApi.createOrder(formData);
      if (res.success) {
        await fetchOrders();
        setShowModal(false);
        setActionSuccessMessage(`Order #${res.order?.order_number || 'New'} created successfully! You can now review it or assign an auditor.`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
      }
    } catch (err) {
      setError(err.message || 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Review Order Modal
  const handleOpenReview = async (order) => {
    try {
      const res = await ordersApi.getOrderById(order.id);
      if (res.success) {
        setSelectedOrder(res.order);
      } else {
        setSelectedOrder(order);
      }
    } catch (e) {
      setSelectedOrder(order);
    }
  };

  // Open Inspection Review & Telemetry Modal
  const handleOpenInspectionReview = async (sheetId) => {
    try {
      const res = await inspectionsApi.getInspectionById(sheetId);
      if (res.success) {
        setReviewingInspection(res.inspection);
      }
    } catch (err) {
      alert('Failed to load inspection details.');
    }
  };

  // Open Assign Auditor Modal
  const handleOpenAssignModal = (order) => {
    setAssigningOrder(order);
    setAssignError('');

    // Pre-select template that matches order's product_type if available
    const matchedTmpl = templates.find(t => t.product_type === order.product_type) || templates[0];
    if (matchedTmpl) {
      setAssignTemplateId(matchedTmpl.id);
    }

    // Pre-select employee stationed in the same city if available
    const matchedEmp = employees.find(e => e.city === order.factory_city) || employees[0];
    if (matchedEmp) {
      setAssignEmployeeId(matchedEmp.id);
    }
  };

  // Submit Auditor Assignment
  const handleConfirmAssignment = async (e) => {
    e.preventDefault();
    if (!assigningOrder || !assignTemplateId || !assignEmployeeId) {
      setAssignError('Please select both an inspection protocol template and a field auditor.');
      return;
    }

    setAssigning(true);
    setAssignError('');

    try {
      const res = await inspectionsApi.createInspection({
        order_id: assigningOrder.id,
        template_id: parseInt(assignTemplateId, 10),
        assigned_employee_id: parseInt(assignEmployeeId, 10)
      });

      if (res.success) {
        const assignedEmp = employees.find(e => e.id === parseInt(assignEmployeeId, 10));
        const sheetRef = res.sheetNumber || res.sheetId;
        setActionSuccessMessage(`Order #${assigningOrder.order_number}: Inspection Protocol #${sheetRef} generated and assigned to ${assignedEmp?.name || 'auditor'}!`);
        setTimeout(() => setActionSuccessMessage(''), 6000);

        const targetOrderId = assigningOrder.id;
        setAssigningOrder(null);

        // If Review Order modal was open for this order, refresh its inspections immediately!
        if (selectedOrder && selectedOrder.id === targetOrderId) {
          const updatedRes = await ordersApi.getOrderById(targetOrderId);
          if (updatedRes.success) {
            setSelectedOrder(updatedRes.order);
          }
        }

        await fetchOrders();
      }
    } catch (err) {
      setAssignError(err.message || 'Failed to assign auditor.');
    } finally {
      setAssigning(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (order) => {
    const confirmMsg = `Are you sure you want to delete order #${order.order_number} (PO: ${order.po_number})?\n\n` +
      ((order.inspections_count > 0 || order.sheet_id)
        ? `Warning: This order has associated inspection audit(s). All related inspection sheets, defect findings, and photos for this order will also be deleted.`
        : `This order will be permanently deleted.`);
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await ordersApi.deleteOrder(order.id);
      if (res && res.success) {
        setActionSuccessMessage(res.message || `Order #${order.order_number} deleted successfully.`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete order.');
    }
  };

  const filteredOrders = orders.filter(o => {
    if (cityFilter && o.factory_city !== cityFilter) return false;
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(s) ||
      o.po_number.toLowerCase().includes(s) ||
      o.factory_name.toLowerCase().includes(s) ||
      o.customer_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div className="order-management-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.85rem' }}>
        <div className="mobile-hide-heading">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            Purchase Order Master Directory
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
            Review fabrication contracts, inspect details, and assign certified field auditors across Pakistan.
          </p>
        </div>

        {/* Action Buttons: Single row on mobile */}
        <div className="order-header-actions mobile-actions-row">
          <button onClick={fetchOrders} className="btn btn-outline btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span className="btn-text-full">Create Order (for Client)</span>
            <span className="btn-text-short">Create PO</span>
          </button>

          <button 
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className={`btn btn-outline btn-sm mobile-filter-btn ${(searchTerm ? 1 : 0) + (cityFilter ? 1 : 0) > 0 ? 'btn-primary' : ''}`}
            title="Advanced Filters"
          >
            <Filter size={14} />
            <span>Filter{(searchTerm ? 1 : 0) + (cityFilter ? 1 : 0) > 0 ? ` (${(searchTerm ? 1 : 0) + (cityFilter ? 1 : 0)})` : ''}</span>
          </button>

          <a
            href={reportApi.getOrdersExcelUrl()}
            download
            className="btn btn-outline desktop-only-btn"
          >
            <Download size={15} color="#16A34A" />
            <span className="btn-text-full">Export Orders (Excel)</span>
          </a>
        </div>
      </div>

      {actionSuccessMessage && (
        <div style={{ backgroundColor: '#DCFCE7', borderLeft: '4px solid #16A34A', color: '#15803D', padding: '0.85rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Desktop Filters Bar (Hidden on Mobile) */}
      <div className="order-filter-bar desktop-inline-filter">
        <div className="order-search-box">
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by Order #, PO #, Mill name, or Buyer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        <div className="order-filter-subgroup">
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
            <option value="Gujranwala">Gujranwala</option>
            <option value="Rawalpindi">Rawalpindi</option>
          </select>

          {/* View Mode Switcher: Cards vs Table */}
          <div className="order-view-switcher">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'table' ? '#0F172A' : '#64748B',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
              title="Display as data table"
            >
              <List size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'cards' ? '#0F172A' : '#64748B',
                boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
              title="Display as responsive cards"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Advanced Filter Popup Modal */}
      <AdvancedFilterModal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Orders"
        activeCount={(searchTerm ? 1 : 0) + (cityFilter ? 1 : 0)}
        onReset={() => {
          setSearchTerm('');
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
              placeholder="Order #, PO #, Mill, Buyer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', width: '100%' }}
            />
          </div>
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
            <option value="Gujranwala">Gujranwala</option>
            <option value="Rawalpindi">Rawalpindi</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            View Layout
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : 'btn-outline'}`}
              style={{ justifyContent: 'center' }}
            >
              <LayoutGrid size={14} /> Cards View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
              style={{ justifyContent: 'center' }}
            >
              <List size={14} /> Table View
            </button>
          </div>
        </div>

        <div style={{ paddingTop: '0.5rem' }}>
          <a
            href={reportApi.getOrdersExcelUrl()}
            download
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
          >
            <Download size={14} color="#16A34A" /> Export Orders to Excel
          </a>
        </div>
      </AdvancedFilterModal>

      {/* Orders Table or Cards View */}
      {viewMode === 'table' ? (
        <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>PO Number</th>
              <th>USA Buyer &amp; Brand</th>
              <th>Product Nature</th>
              <th>Mill / Factory &amp; City</th>
              <th>Factory Contact / Map</th>
              <th>Total Qty</th>
              <th>Inspection Status</th>
              <th style={{ textAlign: 'center', minWidth: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((o) => (
                <tr key={o.id}>
                  {/* Order Number (Clickable for Review) */}
                  <td>
                    <button
                      onClick={() => handleOpenReview(o)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#0284C7',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        textDecoration: 'underline'
                      }}
                      title="Click to review full order details"
                    >
                      {o.order_number}
                    </button>
                  </td>

                  <td style={{ fontWeight: 600 }}>{o.po_number}</td>

                  <td>
                    <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{o.customer_company}</div>
                  </td>

                  <td>
                    <span className="badge badge-in-progress" style={{ fontSize: '0.7rem' }}>
                      {o.product_type}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600 }}>{o.factory_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={11} color="#DC2626" /> {o.factory_city}
                    </div>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.8rem' }}>
                      {o.factory_contact_name ? (
                        <div>{o.factory_contact_name} ({o.factory_contact_phone})</div>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>Not provided</span>
                      )}
                      {o.factory_map_url && (
                        <a
                          href={o.factory_map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563EB', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}
                        >
                          Map Pin <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {o.total_quantity?.toLocaleString()} {o.unit}
                  </td>

                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span className={`badge ${
                        o.inspection_status === 'Approved' ? 'badge-approved' :
                        o.inspection_status === 'In Progress' ? 'badge-in-progress' :
                        o.inspection_status === 'Submitted' ? 'badge-submitted' :
                        o.inspection_status === 'Needs Re-inspection' ? 'badge-reinspection' :
                        o.inspection_status === 'Assigned' ? 'badge-in-progress' :
                        'badge-not-started'
                      }`}>
                        {o.inspection_status}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ClipboardList size={11} color="#0284C7" />
                        {o.inspections_count || (o.sheet_id ? 1 : 0)} {(o.inspections_count === 1 || (!o.inspections_count && o.sheet_id)) ? 'Audit' : 'Audits'}
                      </span>
                    </div>
                  </td>

                  {/* ACTION COLUMN: Review Order & Assign Auditor / Create Inspection */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'nowrap' }}>
                      {/* Review Order Button */}
                      <button
                        onClick={() => handleOpenReview(o)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#0F172A', fontWeight: 600, padding: '0.3rem 0.6rem' }}
                        title="Open and review full order details & inspections"
                      >
                        <Eye size={13} color="#0284C7" />
                        <span>Review</span>
                      </button>

                      {/* Add Inspection / Assign Auditor Button */}
                      <button
                        onClick={() => handleOpenAssignModal(o)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', whiteSpace: 'nowrap' }}
                        title={o.inspections_count > 0 ? "Create another inspection protocol for this order" : "Assign inspector to order"}
                      >
                        <Plus size={13} />
                        <span>{o.inspections_count > 0 ? '+ Audit' : 'Assign'}</span>
                      </button>

                      {/* Delete Order Button */}
                      <button
                        onClick={() => handleDeleteOrder(o)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#DC2626', borderColor: '#FECACA', padding: '0.3rem 0.55rem' }}
                        title="Delete order"
                      >
                        <Trash2 size={13} color="#DC2626" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                  {loading ? 'Loading orders...' : 'No orders found matching criteria.'}
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
                  {/* Card Header: Order #, PO # & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <button
                        onClick={() => handleOpenReview(o)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#0284C7',
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                          textDecoration: 'underline'
                        }}
                        title="Click to review full order details"
                      >
                        {o.order_number}
                      </button>
                      <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                        PO: <span style={{ fontFamily: 'var(--font-mono)' }}>{o.po_number}</span>
                      </div>
                    </div>
                    <span className={`badge ${
                      o.inspection_status === 'Approved' ? 'badge-approved' :
                      o.inspection_status === 'In Progress' ? 'badge-in-progress' :
                      o.inspection_status === 'Submitted' ? 'badge-submitted' :
                      'badge-not-started'
                    }`}>
                      {o.inspection_status === 'In Progress' && <span className="live-pulse" style={{ width: '6px', height: '6px', marginRight: '4px' }} />}
                      {o.inspection_status}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>USA Buyer &amp; Brand</div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{o.customer_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{o.customer_company || 'USA Buyer'}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
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

                    {/* Assigned Inspector & Inspections Count */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', backgroundColor: (o.inspections_count > 0 || o.sheet_id) ? '#ECFDF5' : '#FFFBEB', borderRadius: '4px', fontSize: '0.75rem', border: (o.inspections_count > 0 || o.sheet_id) ? '1px solid #A7F3D0' : '1px solid #FDE68A' }}>
                      <span style={{ color: '#475569', fontWeight: 600 }}>Inspections:</span>
                      <span style={{ color: (o.inspections_count > 0 || o.sheet_id) ? '#059669' : '#D97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <ClipboardCheck size={13} /> {o.inspections_count || (o.sheet_id ? 1 : 0)} {(o.inspections_count === 1 || (!o.inspections_count && o.sheet_id)) ? 'Audit on Record' : 'Audits on Record'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ marginTop: '0.9rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenReview(o)}
                    className="btn btn-outline btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Eye size={13} color="#0284C7" />
                    <span>Review ({o.inspections_count || (o.sheet_id ? 1 : 0)})</span>
                  </button>
                  <button
                    onClick={() => handleOpenAssignModal(o)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={13} />
                    <span>{(o.inspections_count > 0 || o.sheet_id) ? '+ Inspection' : 'Assign'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(o)}
                    className="btn btn-outline btn-sm"
                    style={{ padding: '0.3rem 0.55rem', color: '#DC2626', borderColor: '#FECACA' }}
                    title="Delete order"
                  >
                    <Trash2 size={13} color="#DC2626" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2.5rem', color: '#94A3B8', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              {loading ? 'Loading orders...' : 'No orders found matching criteria.'}
            </div>
          )}
        </div>
      )}

      {/* REVIEW ORDER MODAL */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div 
            className="modal-content review-order-modal" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1120px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Compact Header: Low height, Order # and Status only */}
            <div className="modal-header review-order-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
                <h3 className="review-order-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Order: {selectedOrder.order_number}
                </h3>
                <span className={`badge ${
                  selectedOrder.inspection_status === 'Approved' ? 'badge-approved' :
                  selectedOrder.inspection_status === 'In Progress' ? 'badge-in-progress' :
                  selectedOrder.inspection_status === 'Submitted' ? 'badge-submitted' :
                  'badge-not-started'
                }`} style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                  {selectedOrder.inspection_status}
                </span>
              </div>

              <button 
                onClick={() => setSelectedOrder(null)} 
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body review-order-body">
              {/* 1. Client / USA Buyer Account Card */}
              <div className="review-order-card">
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                  USA Buyer &amp; Client Account
                </span>
                <div className="review-order-grid">
                  <div>
                    <span className="review-field-label">Client Name:</span>
                    <div className="review-field-value" style={{ fontWeight: 700 }}>{selectedOrder.customer_name}</div>
                  </div>
                  <div>
                    <span className="review-field-label">Company / Brand:</span>
                    <div className="review-field-value">{selectedOrder.customer_company || 'USA Apparel Buyer'}</div>
                  </div>
                  <div>
                    <span className="review-field-label">Contact Email:</span>
                    <div className="review-field-value" style={{ wordBreak: 'break-all' }}>{selectedOrder.customer_email || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="review-field-label">Client Phone:</span>
                    <div className="review-field-value">{selectedOrder.customer_phone || selectedOrder.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* 2. Product & Fabrication Specs Card */}
              <div className="review-order-card">
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                  Product &amp; Fabrication Specifications
                </span>
                <div className="review-order-grid">
                  <div>
                    <span className="review-field-label">Product Nature:</span>
                    <div className="review-field-value" style={{ fontWeight: 700, color: '#0284C7' }}>{selectedOrder.product_type}</div>
                  </div>
                  <div>
                    <span className="review-field-label">Total Quantity:</span>
                    <div className="review-field-value" style={{ fontWeight: 800 }}>
                      {selectedOrder.total_quantity?.toLocaleString()} {selectedOrder.unit}
                    </div>
                  </div>
                  <div>
                    <span className="review-field-label">PO Number:</span>
                    <div className="review-field-value">{selectedOrder.po_number}</div>
                  </div>
                  <div>
                    <span className="review-field-label">Order Lodged Date:</span>
                    <div className="review-field-value">{selectedOrder.order_date || 'N/A'}</div>
                  </div>
                </div>

                {selectedOrder.product_description && (
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed #CBD5E1', fontSize: '0.8rem' }}>
                    <span className="review-field-label" style={{ fontWeight: 600 }}>Fabrication Description:</span>
                    <p style={{ margin: '3px 0 0 0', color: '#334155', lineHeight: 1.45, fontSize: '0.82rem' }}>
                      {selectedOrder.product_description}
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Mill / Factory in Pakistan Card */}
              <div className="review-order-card">
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem' }}>
                  Manufacturing Mill &amp; Factory Coordinates
                </span>
                <div className="review-order-grid">
                  <div>
                    <span className="review-field-label">Mill / Facility:</span>
                    <div className="review-field-value" style={{ fontWeight: 700 }}>{selectedOrder.factory_name}</div>
                  </div>
                  <div>
                    <span className="review-field-label">City / Hub:</span>
                    <div className="review-field-value" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <MapPin size={12} color="#DC2626" /> {selectedOrder.factory_city}, Pakistan
                    </div>
                  </div>
                  <div>
                    <span className="review-field-label">Site Contact:</span>
                    <div className="review-field-value">{selectedOrder.factory_contact_name || 'N/A'} ({selectedOrder.factory_contact_phone || 'N/A'})</div>
                  </div>
                  <div>
                    <span className="review-field-label">GPS Pin:</span>
                    <div className="review-field-value">
                      {selectedOrder.factory_map_url ? (
                        <a href={selectedOrder.factory_map_url} target="_blank" rel="noreferrer" style={{ color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          Open Map <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>No map pin</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569', wordBreak: 'break-word' }}>
                  <span className="review-field-label">Site Address:</span> {selectedOrder.factory_address || 'Pakistan'}
                </div>
              </div>

              {/* 4. Linked Inspections Directory & Multi-Inspection List */}
              <div className="review-order-card" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ClipboardCheck size={16} color="#0284C7" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Inspections of This Order ({selectedOrder.inspections?.length || (selectedOrder.sheet_id ? 1 : 0)})
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenAssignModal(selectedOrder)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', gap: '4px' }}
                    title="Generate a new inspection protocol for this order"
                  >
                    <Plus size={13} />
                    <span>Create New Inspection</span>
                  </button>
                </div>

                {selectedOrder.inspections && selectedOrder.inspections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {selectedOrder.inspections.map((ins, index) => (
                      <div
                        key={ins.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '0.75rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Inspection Item Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                              #{selectedOrder.inspections.length - index}
                            </span>
                            <span style={{ fontWeight: 800, color: '#0284C7', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                              {ins.sheet_number}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              • {ins.created_at ? new Date(ins.created_at).toLocaleDateString() : 'Active'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {ins.pass_fail_result && ins.pass_fail_result !== 'Pending' && (
                              <span className={`badge ${ins.pass_fail_result === 'Pass' ? 'badge-approved' : 'badge-reinspection'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                                {ins.pass_fail_result}
                              </span>
                            )}
                            <span className={`badge ${
                              ins.status === 'Approved' ? 'badge-approved' :
                              ins.status === 'In Progress' ? 'badge-in-progress' :
                              ins.status === 'Submitted' ? 'badge-submitted' :
                              ins.status === 'Needs Re-inspection' ? 'badge-reinspection' :
                              'badge-not-started'
                            }`} style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                              {ins.status}
                            </span>
                          </div>
                        </div>

                        {/* Details grid */}
                        <div className="review-order-grid" style={{ backgroundColor: '#F8FAFC', padding: '0.55rem 0.65rem', borderRadius: '4px' }}>
                          <div>
                            <span className="review-field-label">Field Auditor:</span>
                            <div className="review-field-value" style={{ fontWeight: 700 }}>
                              {ins.assigned_employee_name} ({ins.assigned_employee_code})
                            </div>
                          </div>
                          <div>
                            <span className="review-field-label">Protocol Template:</span>
                            <div className="review-field-value" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ins.template_title || ins.template_product_type || 'Inspection Protocol'}
                            </div>
                          </div>
                          <div>
                            <span className="review-field-label">Defects Detected:</span>
                            <div className="review-field-value" style={{ fontWeight: 700, color: (ins.total_defect_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                              {ins.total_defect_count || 0} defects
                            </div>
                          </div>
                          <div>
                            <span className="review-field-label">Audit Scope / Sample:</span>
                            <div className="review-field-value">
                              {ins.inspected_quantity || ins.ordered_quantity || selectedOrder.total_quantity} {selectedOrder.unit}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons for this individual inspection */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.15rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenInspectionReview(ins.id)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#0284C7', borderColor: '#BAE6FD' }}
                            title="View audit details, defects, photos and review status"
                          >
                            <Eye size={13} />
                            <span>Audit Details</span>
                          </button>
                          <a
                            href={reportApi.getExcelUrl(ins.id)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#16A34A' }}
                            title="Export Excel Report for this inspection"
                          >
                            <Download size={13} />
                            <span>Excel</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => openPdfViewer(ins.id, {
                              title: `Inspection Certificate #${ins.id}`,
                              status: ins.status
                            })}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#DC2626' }}
                            title="View Official PDF Report (with Return to App)"
                          >
                            <FileText size={13} />
                            <span>PDF</span>
                          </button>

                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="unassigned-order-box" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.85rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.4 }}>
                      No inspections have been created for this order yet. Create the first inspection to dispatch a certified auditor across Pakistan.
                    </div>
                    <button
                      onClick={() => handleOpenAssignModal(selectedOrder)}
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap', justifyContent: 'center' }}
                    >
                      <Plus size={14} /> Create First Inspection
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Responsive Footer with 100% Mobile Contained Buttons */}
            <div className="modal-footer review-order-footer">
              <button
                type="button"
                onClick={() => handleOpenAssignModal(selectedOrder)}
                className="btn btn-outline btn-sm review-footer-assign-btn"
                style={{ color: '#0284C7', borderColor: '#BAE6FD' }}
              >
                <Plus size={14} />
                <span>Create New Inspection for Order</span>
              </button>

              <div className="review-order-footer-actions">
                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  className="btn btn-outline btn-sm"
                  style={{ color: '#DC2626', borderColor: '#FECACA' }}
                  title="Delete Order and all child inspection records"
                >
                  <Trash2 size={14} color="#DC2626" />
                  <span>Delete Order</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-primary btn-sm review-footer-close-btn"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN AUDITOR MODAL */}
      {assigningOrder && (
        <div className="modal-overlay" onClick={() => setAssigningOrder(null)} style={{ zIndex: 1050 }}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '780px', width: '92vw' }}
          >
            <div className="modal-header review-order-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="#38BDF8" />
                <div>
                  <h3 className="review-order-title" style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Create Inspection: {assigningOrder.order_number}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Generate inspection protocol and dispatch auditor across Pakistan
                  </span>
                </div>
              </div>
              <button onClick={() => setAssigningOrder(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmAssignment}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {assignError && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', fontSize: '0.85rem' }}>
                    {assignError}
                  </div>
                )}

                {/* Target Order Summary Box */}
                <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#0369A1', fontWeight: 700 }}>Order: {assigningOrder.order_number}</span>
                    <span style={{ color: '#0369A1', fontWeight: 600 }}>PO: {assigningOrder.po_number}</span>
                  </div>
                  <div style={{ color: '#334155' }}>
                    <strong>Mill:</strong> {assigningOrder.factory_name} ({assigningOrder.factory_city}) • <strong>Nature:</strong> {assigningOrder.product_type}
                  </div>
                  <div style={{ color: '#334155', marginTop: '2px' }}>
                    <strong>Quantity:</strong> {assigningOrder.total_quantity?.toLocaleString()} {assigningOrder.unit} • <strong>Client:</strong> {assigningOrder.customer_name}
                  </div>
                  {(assigningOrder.inspections_count > 0 || assigningOrder.inspections?.length > 0) && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #BAE6FD', color: '#0284C7', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ClipboardCheck size={13} color="#0284C7" />
                      <span>{assigningOrder.inspections_count || assigningOrder.inspections?.length} inspection(s) already recorded for this order. Creating additional inspection protocol.</span>
                    </div>
                  )}
                </div>

                {/* Select Protocol Template */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Select Inspection Protocol Template *
                  </label>
                  <select
                    value={assignTemplateId}
                    onChange={(e) => setAssignTemplateId(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Choose Protocol Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.product_type})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    Defines sampling size, defect master checkpoints, and dimensional tolerances.
                  </span>
                </div>

                {/* Select Field Auditor */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Assign Field Auditor / Inspector (Pakistan) *
                  </label>
                  <select
                    value={assignEmployeeId}
                    onChange={(e) => setAssignEmployeeId(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Choose Field Inspector --</option>
                    {employees.map(emp => {
                      const isCityMatch = emp.city === assigningOrder.factory_city;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.employee_code}) - Stationed in {emp.city} {isCityMatch ? '★ (Local City Match)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                    Selected inspector will receive the task on mobile device and check into mill.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setAssigningOrder(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={assigning} className="btn btn-primary">
                  <UserPlus size={15} />
                  <span className="btn-text-full">{assigning ? 'Assigning Inspector...' : 'Confirm & Dispatch to Auditor'}</span>
                  <span className="btn-text-short">{assigning ? 'Assigning...' : 'Confirm & Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1060px', width: '94vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                  Create Order on Behalf of Client
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  Enter USA buyer purchase order and Pakistan mill fabrication specifications
                </span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {error && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                {/* ROW 1: Client / Buyer (USA) & PO Number & Product Type in 3 cols */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Client / Buyer (USA) *</label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="">-- Choose Buyer Account --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {c.company_name} ({c.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Purchase Order (PO) Number *</label>
                    <input
                      type="text"
                      value={formData.po_number}
                      onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                      placeholder="e.g. PO-USA-89420"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Type / Nature *</label>
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

                {/* ROW 2: Product Description & Mill Name & Mill City */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Product Specification / Description</label>
                    <input
                      type="text"
                      value={formData.product_description}
                      onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                      placeholder="e.g. 5-pocket denim jeans, 13.5 oz, indigo wash with antique brass zipper..."
                      className="form-input"
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Factory / Mill Name *</label>
                      <input
                        type="text"
                        value={formData.factory_name}
                        onChange={(e) => setFormData({ ...formData, factory_name: e.target.value })}
                        placeholder="e.g. Artistic Milliners Unit 4"
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Factory City *</label>
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
                        <option value="Rawalpindi">Rawalpindi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Factory Address & Map Link */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Factory Mill Detailed Address *</label>
                    <input
                      type="text"
                      value={formData.factory_address}
                      onChange={(e) => setFormData({ ...formData, factory_address: e.target.value })}
                      placeholder="e.g. Plot 19/2, Sector 23, Korangi Industrial Area, Karachi"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Google Maps Pin Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://maps.google.com/?q=..."
                      value={formData.factory_map_url}
                      onChange={(e) => setFormData({ ...formData, factory_map_url: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* ROW 4: Site Contact Person, Contact Phone & Quantity, Unit, Order Date */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', backgroundColor: '#F8FAFC', padding: '0.85rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Site Contact Person</label>
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={formData.factory_contact_name}
                        onChange={(e) => setFormData({ ...formData, factory_contact_name: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Site Contact Phone</label>
                      <input
                        type="text"
                        placeholder="Contact Phone"
                        value={formData.factory_contact_phone}
                        onChange={(e) => setFormData({ ...formData, factory_contact_phone: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.9fr 1.1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Total Quantity *</label>
                      <input
                        type="number"
                        value={formData.total_quantity}
                        onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                        placeholder="e.g. 5000"
                        required
                        min="1"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="form-select"
                      >
                        <option value="pieces">pieces</option>
                        <option value="yards">yards</option>
                        <option value="meters">meters</option>
                        <option value="cones">cones</option>
                        <option value="rolls">rolls</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Order Date</label>
                      <input
                        type="date"
                        value={formData.order_date}
                        onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  <span className="btn-text-full">{submitting ? 'Creating Order...' : 'Confirm & Save Order'}</span>
                  <span className="btn-text-short">{submitting ? 'Saving...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION REVIEW & TELEMETRY MODAL */}
      {reviewingInspection && (
        <InspectionReviewModal
          inspection={reviewingInspection}
          onClose={() => setReviewingInspection(null)}
          onRefresh={async () => {
            if (selectedOrder) {
              const updatedRes = await ordersApi.getOrderById(selectedOrder.id);
              if (updatedRes.success) setSelectedOrder(updatedRes.order);
            }
            fetchOrders();
          }}
          onOpenPhoto={onOpenPhoto}
        />
      )}
    </div>
  );
}
