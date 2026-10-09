import React, { useState, useEffect } from 'react';
import { usersApi, ordersApi, inspectionsApi, reportApi } from '../../services/api';
import { InspectionReviewModal } from './InspectionReviewModal';
import { openPdfViewer } from '../../components/PdfReportViewerModal';
import { 
  UserPlus, 
  Search, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  X, 
  Eye, 
  EyeOff, 
  Key, 
  Edit2, 
  ShoppingBag, 
  List, 
  LayoutGrid, 
  Check, 
  ExternalLink,
  ShieldCheck,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Download,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';

export function CustomerManagement({ onOpenPhoto }) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

  // Password visibility map: { [userId]: boolean }
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // View Customer Orders Modal State
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Drill-down: View Specific Order with its full inspections
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);

  // Drill-down: View Specific Inspection Telemetry & Photos Modal
  const [reviewingInspection, setReviewingInspection] = useState(null);

  // Edit Customer & Change Password Modal State
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    company_name: '',
    city: '',
    country: '',
    phone: '',
    status: 'active',
    new_password: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Add Customer Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    city: 'New York, NY',
    country: 'USA',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Global Notification Banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getCustomers();
      if (res.success) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const togglePasswordVisibility = (id) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Open Orders and Profile Modal
  const handleOpenCustomerOrders = async (customer) => {
    setViewingCustomer(customer);
    setLoadingOrders(true);
    try {
      const res = await usersApi.getCustomerOrders(customer.id);
      if (res.success) {
        setCustomerOrders(res.orders || []);
        if (res.customer) {
          setViewingCustomer(res.customer);
        }
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
      setCustomerOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Drill-down to open single order details and its list of inspections
  const handleOpenOrderDetail = async (orderId) => {
    setLoadingOrderDetail(true);
    try {
      const res = await ordersApi.getOrderById(orderId);
      if (res.success && res.order) {
        setSelectedOrderDetail(res.order);
      }
    } catch (err) {
      alert('Failed to load full order details.');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  // Drill-down to open individual inspection review modal
  const handleOpenInspectionReview = async (sheetId) => {
    try {
      const res = await inspectionsApi.getInspectionById(sheetId);
      if (res.success && res.inspection) {
        setReviewingInspection(res.inspection);
      }
    } catch (err) {
      alert('Failed to load inspection details.');
    }
  };

  // Open Edit Profile & Password Modal
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setEditError('');
    setShowEditPassword(false);
    setEditFormData({
      name: customer.name || '',
      email: customer.email || '',
      company_name: customer.company_name || '',
      city: customer.city || 'New York, NY',
      country: customer.country || 'USA',
      phone: customer.phone || '',
      status: customer.status || 'active',
      new_password: ''
    });
  };

  // Submit Edit & Password Change
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        company_name: editFormData.company_name,
        city: editFormData.city,
        country: editFormData.country,
        phone: editFormData.phone,
        status: editFormData.status
      };

      if (editFormData.new_password && editFormData.new_password.trim() !== '') {
        payload.password = editFormData.new_password.trim();
      }

      const res = await usersApi.updateUser(editingCustomer.id, payload);
      if (res.success) {
        setActionSuccessMessage(`Customer profile and credentials for "${editFormData.name}" updated successfully.`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update customer profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Customer Account
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await usersApi.createCustomer(formData);
      if (res.success) {
        setActionSuccessMessage(`Client account for "${formData.name}" created successfully with temporary password.`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
        fetchCustomers();
        setShowModal(false);
        setFormData({
          name: '',
          email: '',
          password: '',
          company_name: '',
          city: 'New York, NY',
          country: 'USA',
          phone: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to create customer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (customer) => {
    const nextStatus = customer.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await usersApi.toggleStatus(customer.id, nextStatus);
      if (res.success) {
        setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, status: nextStatus } : c));
        setActionSuccessMessage(`Customer account "${customer.name}" set to ${nextStatus}.`);
        setTimeout(() => setActionSuccessMessage(''), 4000);
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      c.company_name?.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.city?.toLowerCase().includes(s) ||
      c.phone?.toLowerCase().includes(s)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* SUCCESS NOTIFICATION BANNER */}
      {actionSuccessMessage && (
        <div style={{ 
          backgroundColor: '#F0FDF4', 
          border: '1px solid #BBF7D0', 
          color: '#166534', 
          padding: '0.85rem 1.25rem', 
          borderRadius: '6px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          fontSize: '0.875rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <CheckCircle size={17} color="#16A34A" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div className="mobile-hide-heading">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Registered Buyers &amp; USA Client Accounts
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
            Manage USA buyer credentials, view real-time purchase orders, change passwords &amp; update contacts.
          </p>
        </div>

        {/* Action Buttons: Single row on mobile */}
        <div className="order-header-actions mobile-actions-row">
          <button onClick={fetchCustomers} className="btn btn-outline btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontWeight: 700 }}>
            <UserPlus size={16} />
            <span className="btn-text-full">Add New Client</span>
            <span className="btn-text-short">Add Client</span>
          </button>

          <button 
            type="button"
            onClick={() => setMobileFilterOpen(true)}
            className={`btn btn-outline btn-sm mobile-filter-btn ${searchTerm ? 'btn-primary' : ''}`}
            title="Advanced Filters"
          >
            <Filter size={14} />
            <span>Filter{searchTerm ? ' (1)' : ''}</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND VIEW TOGGLE BAR (Hidden on Mobile) */}
      <div className="order-filter-bar desktop-inline-filter" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Search by Buyer name, company, email, city, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '2rem' }}
          />
        </div>

        {/* View mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '0.75rem' }}>
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
            title="Mobile Cards View"
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
        title="Filter Clients"
        activeCount={searchTerm ? 1 : 0}
        onReset={() => setSearchTerm('')}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Search Client / Brand
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Name, company, email, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', width: '100%' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Layout Mode
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
      </AdvancedFilterModal>

      {/* TABLE VIEW */}
      {viewMode === 'table' ? (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Buyer / Contact</th>
                <th>Company / Brand</th>
                <th>Location</th>
                <th>Work Email &amp; Phone</th>
                <th>Password</th>
                <th>Orders Placed</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((c) => {
                  const isPassVisible = showPasswordMap[c.id];
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Registered: {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'Active'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={14} color="#0284C7" /> {c.company_name || 'Independent Sourcing'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#DC2626" /> {c.city || 'USA'}, {c.country}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600 }}>{c.email}</div>
                          {c.phone && <div style={{ color: '#64748B' }}>{c.phone}</div>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '0.8rem', 
                            backgroundColor: '#F1F5F9', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            color: '#334155'
                          }}>
                            {isPassVisible ? (c.plain_password || '••••••••') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(c.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px', color: '#64748B' }}
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span 
                          onClick={() => handleOpenCustomerOrders(c)}
                          style={{ 
                            fontWeight: 800, 
                            fontFamily: 'var(--font-mono)', 
                            color: '#0284C7', 
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Click to view purchase orders"
                        >
                          <ShoppingBag size={13} />
                          <span>{c.total_orders || 0} orders</span>
                        </span>
                      </td>
                      <td>
                        <span 
                          onClick={() => handleToggleStatus(c)}
                          className={`badge ${c.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}
                          style={{ cursor: 'pointer' }}
                          title="Click to toggle status"
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCustomerOrders(c)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#0284C7', borderColor: '#BAE6FD', fontWeight: 600, padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="View customer profile and purchase orders"
                          >
                            <Eye size={13} />
                            <span>Orders ({c.total_orders || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#475569', fontWeight: 600, padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="Edit profile & reset password"
                          >
                            <Edit2 size={13} />
                            <span>Edit / Key</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                    {loading ? 'Loading buyers...' : 'No buyers found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS VIEW (MOBILE-FRIENDLY) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((c) => {
              const isPassVisible = showPasswordMap[c.id];
              return (
                <div 
                  key={c.id} 
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
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', paddingBottom: '0.65rem', borderBottom: '1px solid #F1F5F9' }}>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building size={12} /> {c.company_name || 'Independent Sourcing'}
                        </div>
                      </div>
                      <span 
                        onClick={() => handleToggleStatus(c)}
                        className={`badge ${c.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}
                        style={{ cursor: 'pointer' }}
                        title="Click to toggle status"
                      >
                        {c.status}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #F1F5F9', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                        <Mail size={13} color="#64748B" />
                        <span style={{ fontWeight: 600 }}>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                          <Phone size={13} />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                        <MapPin size={13} color="#DC2626" />
                        <span>{c.city || 'USA'}, {c.country}</span>
                      </div>
                    </div>

                    {/* Password Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: '0.45rem 0.65rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={13} color="#D97706" /> Login Password:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                          {isPassVisible ? (c.plain_password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(c.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 4px', color: '#64748B' }}
                          title={isPassVisible ? 'Hide' : 'Show'}
                        >
                          {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Total Orders Metric */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <span>Recorded Purchase Orders:</span>
                      <strong style={{ color: '#0284C7', fontFamily: 'var(--font-mono)' }}>{c.total_orders || 0} orders</strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenCustomerOrders(c)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}
                    >
                      <ShoppingBag size={14} />
                      <span>Orders ({c.total_orders || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      title="Edit Profile & Reset Password"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', color: '#94A3B8' }}>
              {loading ? 'Loading buyers...' : 'No buyers found matching your search.'}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW CUSTOMER ORDERS & DETAILS (WIDE RESPONSIVE POPUP) */}
      {viewingCustomer && (
        <div className="modal-overlay" onClick={() => setViewingCustomer(null)}>
          <div 
            className="modal-content modal-content-wide" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1240px', width: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="modal-header review-order-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ShoppingBag size={20} color="#38BDF8" />
                <div>
                  <h3 className="review-order-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Client Profile &amp; Purchase Orders: {viewingCustomer.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Company: {viewingCustomer.company_name || 'Independent Sourcing'} • {viewingCustomer.city || 'USA'}, {viewingCustomer.country}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingCustomer(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body review-order-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Overview Card */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Client Account Overview
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${viewingCustomer.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}>
                      Account {viewingCustomer.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingCustomer;
                        setViewingCustomer(null);
                        handleOpenEdit(target);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      <Edit2 size={12} /> Edit Profile / Password
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Email Address:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingCustomer.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Phone / WhatsApp:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingCustomer.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Location:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingCustomer.city || 'USA'}, {viewingCustomer.country}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Current Login Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <code style={{ backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: '#0F172A' }}>
                        {viewingCustomer.plain_password || '••••••••'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Orders Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                      Purchase Orders on Record ({customerOrders.length})
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Click "View Order &amp; Inspections" on any order to view all linked audits
                  </span>
                </div>

                {loadingOrders ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                    Loading purchase orders...
                  </div>
                ) : customerOrders.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Order Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                              PO: {ord.po_number}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                              • Order #{ord.order_number}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              • {ord.order_date || ord.created_at?.split(' ')[0]}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="badge badge-draft-saved" style={{ fontSize: '0.7rem' }}>
                              <ClipboardCheck size={12} style={{ marginRight: '3px' }} />
                              {ord.inspections_count || 0} Audit(s)
                            </span>
                            <span className={`badge ${
                              ord.inspection_status === 'Approved' ? 'badge-approved' :
                              ord.inspection_status === 'In Progress' ? 'badge-in-progress' :
                              ord.inspection_status === 'Assigned' ? 'badge-not-started' :
                              'badge-not-started'
                            }`} style={{ fontSize: '0.7rem' }}>
                              {ord.inspection_status}
                            </span>
                          </div>
                        </div>

                        {/* Order Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', backgroundColor: '#F8FAFC', padding: '0.7rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Product Nature:</span>
                            <strong style={{ color: '#0F172A' }}>{ord.product_type}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Pakistan Mill / City:</span>
                            <strong style={{ color: '#0F172A' }}>{ord.factory_name} ({ord.factory_city})</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Ordered Quantity:</span>
                            <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                              {ord.total_quantity?.toLocaleString()} {ord.unit}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Latest Audit:</span>
                            <span>{ord.latest_sheet_number || 'Awaiting Inspector'} {ord.latest_auditor_name ? `(${ord.latest_auditor_name})` : ''}</span>
                          </div>
                        </div>

                        {/* Direct Button to View Order & list of all inspections */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenOrderDetail(ord.id)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#0284C7', borderColor: '#BAE6FD', fontWeight: 700, fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                          >
                            <Eye size={14} />
                            <span>View Order &amp; {ord.inspections_count || 0} Inspections</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', color: '#94A3B8' }}>
                    No purchase orders recorded for this client yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="btn btn-primary btn-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILL-DOWN MODAL: ORDER DETAILS & LIST OF ALL INSPECTIONS */}
      {selectedOrderDetail && (
        <div className="modal-overlay" onClick={() => setSelectedOrderDetail(null)} style={{ zIndex: 1040 }}>
          <div 
            className="modal-content modal-content-wide" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1240px', width: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="modal-header review-order-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ClipboardList size={20} color="#38BDF8" />
                <div>
                  <h3 className="review-order-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Order Details: {selectedOrderDetail.order_number} (PO: {selectedOrderDetail.po_number})
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Buyer: {viewingCustomer?.name} ({viewingCustomer?.company_name}) • Status: {selectedOrderDetail.inspection_status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrderDetail(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body review-order-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Top Summary: Specs & Mill Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Specs Box */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    Purchase Order Specs
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>PO Reference:</span> <strong>{selectedOrderDetail.po_number}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Product Nature:</span> <strong>{selectedOrderDetail.product_type}</strong>
                    </div>
                    {selectedOrderDetail.product_description && (
                      <div>
                        <span style={{ color: '#64748B' }}>Tech Description:</span> <span>{selectedOrderDetail.product_description}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#64748B' }}>Ordered Quantity:</span> <strong style={{ color: '#0284C7', fontFamily: 'var(--font-mono)' }}>{selectedOrderDetail.total_quantity?.toLocaleString()} {selectedOrderDetail.unit}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Order Date:</span> <span>{selectedOrderDetail.order_date || 'Active'}</span>
                    </div>
                  </div>
                </div>

                {/* Mill Box */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                    Pakistan Manufacturing Mill
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.825rem' }}>
                    <div>
                      <span style={{ color: '#64748B' }}>Mill Name:</span> <strong>{selectedOrderDetail.factory_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B' }}>Factory City:</span> <strong style={{ color: '#DC2626' }}>{selectedOrderDetail.factory_city}, Pakistan</strong>
                    </div>
                    {selectedOrderDetail.factory_address && (
                      <div>
                        <span style={{ color: '#64748B' }}>Physical Address:</span> <span>{selectedOrderDetail.factory_address}</span>
                      </div>
                    )}
                    {selectedOrderDetail.factory_contact_name && (
                      <div>
                        <span style={{ color: '#64748B' }}>Mill Contact:</span> <span>{selectedOrderDetail.factory_contact_name} ({selectedOrderDetail.factory_contact_phone})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inspections of This Order Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                      Inspections of This Order ({selectedOrderDetail.inspections?.length || 0})
                    </h4>
                    <span className="badge badge-in-progress" style={{ fontSize: '0.7rem' }}>
                      Live Status: {selectedOrderDetail.inspection_status}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Audit sheets created for this purchase order
                  </span>
                </div>

                {selectedOrderDetail.inspections && selectedOrderDetail.inspections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {selectedOrderDetail.inspections.map((ins, idx) => (
                      <div
                        key={ins.id}
                        style={{
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '1rem',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Inspection Item Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                              Audit #{selectedOrderDetail.inspections.length - idx}: {ins.sheet_number}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                              • {ins.created_at ? new Date(ins.created_at).toLocaleDateString() : 'Active'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {ins.pass_fail_result && ins.pass_fail_result !== 'Pending' && (
                              <span className={`badge ${ins.pass_fail_result === 'Pass' ? 'badge-approved' : 'badge-reinspection'}`} style={{ fontSize: '0.68rem' }}>
                                {ins.pass_fail_result}
                              </span>
                            )}
                            <span className={`badge ${
                              ins.status === 'Approved' ? 'badge-approved' :
                              ins.status === 'In Progress' ? 'badge-in-progress' :
                              ins.status === 'Submitted' ? 'badge-submitted' :
                              ins.status === 'Needs Re-inspection' ? 'badge-reinspection' :
                              'badge-not-started'
                            }`} style={{ fontSize: '0.68rem' }}>
                              {ins.status}
                            </span>
                          </div>
                        </div>

                        {/* Inspection Item Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', backgroundColor: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Field Auditor:</span>
                            <strong style={{ color: '#0F172A' }}>{ins.assigned_employee_name} ({ins.assigned_employee_code})</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Protocol Template:</span>
                            <span style={{ color: '#0F172A' }}>{ins.template_title || ins.template_product_type || 'QA Protocol'}</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Defects Detected:</span>
                            <strong style={{ color: (ins.total_defect_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                              {ins.total_defect_count || 0} defects
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Audit Sample Scope:</span>
                            <span>{ins.inspected_quantity || ins.ordered_quantity || selectedOrderDetail.total_quantity} {selectedOrderDetail.unit}</span>
                          </div>
                        </div>

                        {/* Action buttons for this inspection */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenInspectionReview(ins.id)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', color: '#0284C7', borderColor: '#BAE6FD', fontWeight: 600 }}
                            title="View audit telemetry, photos and approval status"
                          >
                            <Eye size={13} />
                            <span>Audit Details &amp; Photos</span>
                          </button>
                          <a
                            href={reportApi.getExcelUrl(ins.id)}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', color: '#16A34A' }}
                          >
                            <Download size={13} />
                            <span>Excel Report</span>
                          </a>
                          <a
                            href={reportApi.getPdfUrl(ins.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem', color: '#DC2626' }}
                            title="View / Download PDF Certificate"
                            onClick={(e) => {
                              e.preventDefault();
                              openPdfViewer(ins.id);
                            }}
                          >
                            <FileText size={13} />
                            <span>PDF Certificate</span>
                          </a>

                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', color: '#94A3B8' }}>
                    No inspection sheets created for this order yet.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Order #{selectedOrderDetail.order_number} • Total {selectedOrderDetail.inspections?.length || 0} inspection protocols recorded
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrderDetail(null)}
                className="btn btn-primary btn-sm"
              >
                Back to Client Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRILL-DOWN MODAL: INSPECTION REVIEW & TELEMETRY */}
      {reviewingInspection && (
        <InspectionReviewModal
          inspection={reviewingInspection}
          onClose={() => setReviewingInspection(null)}
          onRefresh={async () => {
            if (selectedOrderDetail) {
              handleOpenOrderDetail(selectedOrderDetail.id);
            }
          }}
          onOpenPhoto={onOpenPhoto}
        />
      )}

      {/* MODAL 2: EDIT CUSTOMER PROFILE & CHANGE PASSWORD */}
      {editingCustomer && (
        <div className="modal-overlay" onClick={() => setEditingCustomer(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '680px', width: '92vw' }}
          >
            <div className="modal-header review-order-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit2 size={18} color="#38BDF8" />
                <div>
                  <h3 className="review-order-title" style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    Edit Client: {editingCustomer.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Update contact profile and change/reset portal password
                  </span>
                </div>
              </div>
              <button onClick={() => setEditingCustomer(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {editError && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', fontSize: '0.85rem' }}>
                    {editError}
                  </div>
                )}

                {/* Row 1: Name and Email */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Contact Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Work Email *</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Row 2: Company and Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company / Brand Name</label>
                    <input
                      type="text"
                      value={editFormData.company_name}
                      onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Row 3: City, Country & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      value={editFormData.country}
                      onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Account Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="form-select"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                </div>

                {/* PASSWORD MANAGEMENT BOX */}
                <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '1rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369A1', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <Key size={15} />
                    <span>Password Management</span>
                  </div>

                  {editingCustomer.plain_password && (
                    <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#64748B' }}>Current Saved Password:</span>
                      <code style={{ backgroundColor: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BAE6FD', fontWeight: 700 }}>
                        {editingCustomer.plain_password}
                      </code>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                      Change / Reset Password (Leave blank to keep unchanged)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editFormData.new_password}
                        onChange={(e) => setEditFormData({ ...editFormData, new_password: e.target.value })}
                        placeholder="Type new password for this customer..."
                        className="form-input"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                        title={showEditPassword ? 'Hide' : 'Show'}
                      >
                        {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '3px', display: 'block' }}>
                      Updating password will allow the customer to log in immediately with the new credentials.
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0' }}>
                <button type="button" onClick={() => setEditingCustomer(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="btn btn-primary">
                  <Check size={15} />
                  <span>{editSubmitting ? 'Saving Changes...' : 'Save Profile & Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE NEW CLIENT ACCOUNT */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92vw' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Add New Client Account</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {error && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Person Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Robert King"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Client Work Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. robert@usabrand.com"
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Password *</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="e.g. Pass@123"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company / Brand Name</label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g. Manhattan Garments LLC"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2831"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Creating Account...' : 'Confirm & Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
