import React, { useState, useEffect } from 'react';
import { usersApi, inspectionsApi, reportApi } from '../../services/api';
import { InspectionReviewModal } from './InspectionReviewModal';
import { openPdfViewer } from '../../components/PdfReportViewerModal';
import { 
  HardHat, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Award, 
  X, 
  Check, 
  Eye, 
  EyeOff, 
  Key, 
  Edit2, 
  List, 
  LayoutGrid, 
  CheckCircle, 
  ClipboardCheck, 
  FileText, 
  Download,
  AlertTriangle,
  ExternalLink,
  Filter,
  RefreshCw
} from 'lucide-react';
import { AdvancedFilterModal } from '../../components/AdvancedFilterModal';

export function EmployeeManagement({ onOpenPhoto }) {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

  // Password visibility map: { [empId]: boolean }
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // View Inspections & Profile Modal State
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [employeeInspections, setEmployeeInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  // Drill-down: View Specific Inspection Telemetry & Review Modal
  const [reviewingInspection, setReviewingInspection] = useState(null);

  // Edit Employee & Change Password Modal State
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    employee_code: '',
    city: 'Faisalabad',
    phone: '',
    status: 'active',
    new_password: ''
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Add Employee Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'emp123',
    employee_code: '',
    city: 'Faisalabad',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Global Notification Banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await usersApi.getEmployees();
      if (res.success) {
        setEmployees(res.employees);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const togglePasswordVisibility = (id) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Open Inspections and Profile Modal
  const handleOpenEmployeeInspections = async (employee) => {
    setViewingEmployee(employee);
    setLoadingInspections(true);
    try {
      const res = await usersApi.getEmployeeInspections(employee.id);
      if (res.success) {
        setEmployeeInspections(res.inspections || []);
        if (res.employee) {
          setViewingEmployee(res.employee);
        }
      }
    } catch (err) {
      console.error('Failed to load employee inspections:', err);
      setEmployeeInspections([]);
    } finally {
      setLoadingInspections(false);
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
  const handleOpenEdit = (employee) => {
    setEditingEmployee(employee);
    setEditError('');
    setShowEditPassword(false);
    setEditFormData({
      name: employee.name || '',
      email: employee.email || '',
      employee_code: employee.employee_code || '',
      city: employee.city || 'Faisalabad',
      phone: employee.phone || '',
      status: employee.status || 'active',
      new_password: ''
    });
  };

  // Submit Edit & Password Change
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        employee_code: editFormData.employee_code,
        city: editFormData.city,
        phone: editFormData.phone,
        status: editFormData.status
      };

      if (editFormData.new_password && editFormData.new_password.trim() !== '') {
        payload.password = editFormData.new_password.trim();
      }

      const res = await usersApi.updateUser(editingEmployee.id, payload);
      if (res.success) {
        setActionSuccessMessage(`Auditor credentials for "${editFormData.name}" (${editFormData.employee_code}) updated successfully.`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
        setEditingEmployee(null);
        fetchEmployees();
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update field inspector.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Create Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await usersApi.createEmployee(formData);
      if (res.success) {
        setActionSuccessMessage(`Field Auditor "${formData.name}" onboarded successfully with code "${res.employee?.employee_code || formData.employee_code}".`);
        setTimeout(() => setActionSuccessMessage(''), 5000);
        fetchEmployees();
        setShowModal(false);
        setFormData({
          name: '',
          email: '',
          password: 'emp123',
          employee_code: '',
          city: 'Faisalabad',
          phone: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to create employee.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (employee) => {
    const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await usersApi.toggleStatus(employee.id, nextStatus);
      if (res.success) {
        setEmployees(prev => prev.map(e => e.id === employee.id ? { ...e, status: nextStatus } : e));
        setActionSuccessMessage(`Inspector "${employee.name}" set to ${nextStatus}.`);
        setTimeout(() => setActionSuccessMessage(''), 4000);
      }
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      emp.name.toLowerCase().includes(s) ||
      emp.employee_code?.toLowerCase().includes(s) ||
      emp.city?.toLowerCase().includes(s) ||
      emp.email?.toLowerCase().includes(s) ||
      emp.phone?.toLowerCase().includes(s)
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
            Field QA Inspectors &amp; Stationed Engineers (Pakistan)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', marginBottom: 0 }}>
            Auditors identified by unique Employee Codes who log in on mobile to conduct fabric audits.
          </p>
        </div>

        {/* Action Buttons: Single row on mobile */}
        <div className="order-header-actions mobile-actions-row">
          <button onClick={fetchEmployees} className="btn btn-outline btn-sm">
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontWeight: 700 }}>
            <Plus size={16} />
            <span className="btn-text-full">Add New Field Inspector</span>
            <span className="btn-text-short">Add Auditor</span>
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
            placeholder="Search by Inspector name, Employee Code (e.g. EMP-1001), City, or Phone..."
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
        title="Filter Field Auditors"
        activeCount={searchTerm ? 1 : 0}
        onReset={() => setSearchTerm('')}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
            Search Field Inspector
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Name, Code, City, Phone..."
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
                <th>Employee Code</th>
                <th>Full Name</th>
                <th>Stationed Hub</th>
                <th>Work Email &amp; Phone</th>
                <th>Password</th>
                <th>Active Audits</th>
                <th>Lifetime Audits</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const isPassVisible = showPasswordMap[emp.id];
                  return (
                    <tr key={emp.id}>
                      <td>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#1E293B',
                            color: '#38BDF8',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-xs)',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.825rem'
                          }}
                        >
                          <HardHat size={13} /> {emp.employee_code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          Joined: {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : 'Active'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <MapPin size={13} color="#DC2626" /> {emp.city}, Pakistan
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem' }}>
                          <div style={{ fontWeight: 600 }}>{emp.email}</div>
                          {emp.phone && <div style={{ color: '#64748B' }}>{emp.phone}</div>}
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
                            {isPassVisible ? (emp.plain_password || '••••••••') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(emp.id)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 4px', color: '#64748B' }}
                            title={isPassVisible ? 'Hide Password' : 'Show Password'}
                          >
                            {isPassVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${emp.active_tasks > 0 ? 'badge-in-progress' : 'badge-not-started'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                          {emp.active_tasks || 0} active
                        </span>
                      </td>
                      <td>
                        <span 
                          onClick={() => handleOpenEmployeeInspections(emp)}
                          style={{ 
                            fontWeight: 800, 
                            fontFamily: 'var(--font-mono)', 
                            color: '#0284C7', 
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Click to view all audits"
                        >
                          <ClipboardCheck size={13} />
                          <span>{emp.total_inspections || 0} total</span>
                        </span>
                      </td>
                      <td>
                        <span 
                          onClick={() => handleToggleStatus(emp)}
                          className={`badge ${emp.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}
                          style={{ cursor: 'pointer' }}
                          title="Click to toggle status"
                        >
                          {emp.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEmployeeInspections(emp)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#0284C7', borderColor: '#BAE6FD', fontWeight: 600, padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="View inspector profile and assigned audit sheets"
                          >
                            <Eye size={13} />
                            <span>Audits ({emp.total_inspections || 0})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#475569', fontWeight: 600, padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            title="Edit inspector profile & reset password"
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
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                    {loading ? 'Loading inspectors...' : 'No field inspectors found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* CARDS VIEW (MOBILE-FRIENDLY) */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const isPassVisible = showPasswordMap[emp.id];
              return (
                <div 
                  key={emp.id} 
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
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#1E293B',
                            color: '#38BDF8',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            marginBottom: '4px'
                          }}
                        >
                          <HardHat size={12} /> {emp.employee_code}
                        </span>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                          {emp.name}
                        </div>
                      </div>
                      <span 
                        onClick={() => handleToggleStatus(emp)}
                        className={`badge ${emp.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}
                        style={{ cursor: 'pointer' }}
                        title="Click to toggle status"
                      >
                        {emp.status}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.65rem 0.75rem', borderRadius: '6px', border: '1px solid #F1F5F9', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626', fontWeight: 600 }}>
                        <MapPin size={13} />
                        <span>Stationed Hub: {emp.city}, Pakistan</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155' }}>
                        <Mail size={13} color="#64748B" />
                        <span>{emp.email}</span>
                      </div>
                      {emp.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#64748B' }}>
                          <Phone size={13} />
                          <span>{emp.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Password Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F1F5F9', padding: '0.45rem 0.65rem', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.78rem' }}>
                      <span style={{ color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Key size={13} color="#D97706" /> Login Password:
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0F172A' }}>
                          {isPassVisible ? (emp.plain_password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(emp.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 4px', color: '#64748B' }}
                          title={isPassVisible ? 'Hide' : 'Show'}
                        >
                          {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Workload Stats */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <span>Active Perch Audits:</span>
                      <span className={`badge ${emp.active_tasks > 0 ? 'badge-in-progress' : 'badge-not-started'}`}>
                        {emp.active_tasks || 0} active
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', marginBottom: '0.5rem' }}>
                      <span>Lifetime Audits:</span>
                      <strong style={{ color: '#0284C7', fontFamily: 'var(--font-mono)' }}>{emp.total_inspections || 0} audits</strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '0.45rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEmployeeInspections(emp)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center', fontSize: '0.78rem' }}
                    >
                      <ClipboardCheck size={14} />
                      <span>Audits ({emp.total_inspections || 0})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(emp)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                      title="Edit Inspector & Reset Password"
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
              {loading ? 'Loading inspectors...' : 'No field inspectors found matching your search.'}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: VIEW EMPLOYEE INSPECTIONS & AUDIT ASSIGNMENTS (WIDE RESPONSIVE POPUP) */}
      {viewingEmployee && (
        <div className="modal-overlay" onClick={() => setViewingEmployee(null)}>
          <div 
            className="modal-content modal-content-wide" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1240px', width: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="modal-header review-order-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <ClipboardCheck size={20} color="#38BDF8" />
                <div>
                  <h3 className="review-order-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Auditor Profile &amp; Assigned Audits: {viewingEmployee.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Code: {viewingEmployee.employee_code} • Stationed Hub: {viewingEmployee.city}, Pakistan
                  </span>
                </div>
              </div>
              <button onClick={() => setViewingEmployee(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body review-order-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Overview Card */}
              <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Field Inspector Credentials &amp; Station
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${viewingEmployee.status === 'active' ? 'badge-approved' : 'badge-reinspection'}`}>
                      Account {viewingEmployee.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingEmployee;
                        setViewingEmployee(null);
                        handleOpenEdit(target);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                    >
                      <Edit2 size={12} /> Edit Inspector / Password
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Employee Code:</span>
                    <strong style={{ color: '#0284C7', fontFamily: 'var(--font-mono)' }}>{viewingEmployee.employee_code}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Email Address:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingEmployee.email}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Phone / WhatsApp:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingEmployee.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Stationed Hub City:</span>
                    <strong style={{ color: '#0F172A' }}>{viewingEmployee.city}, Pakistan</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block' }}>Login Password:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <code style={{ backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, color: '#0F172A' }}>
                        {viewingEmployee.plain_password || '••••••••'}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Inspections Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                      Assigned Field Inspections ({employeeInspections.length})
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Click "Audit Details &amp; Photos" on any audit to review checkpoints, defects and evidence
                  </span>
                </div>

                {loadingInspections ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                    Loading audit records...
                  </div>
                ) : employeeInspections.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {employeeInspections.map((ins, idx) => (
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
                        {/* Inspection Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
                              Audit Sheet: {ins.sheet_number}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                              • Order: {ins.order_number} (PO: {ins.po_number})
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

                        {/* Inspection Details Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', backgroundColor: '#F8FAFC', padding: '0.7rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Mill &amp; City:</span>
                            <strong style={{ color: '#0F172A' }}>{ins.factory_name} ({ins.factory_city})</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Buyer Brand:</span>
                            <strong style={{ color: '#0F172A' }}>{ins.customer_name} ({ins.customer_company || 'USA Buyer'})</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Defects Detected:</span>
                            <strong style={{ color: (ins.total_defect_count || 0) > 0 ? '#DC2626' : '#16A34A' }}>
                              {ins.total_defect_count || 0} defects
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Inspected Sample Scope:</span>
                            <span>{ins.inspected_quantity || ins.ordered_quantity} units inspected</span>
                          </div>
                        </div>

                        {/* Action buttons including Audit Details & Photos */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenInspectionReview(ins.id)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', color: '#0284C7', borderColor: '#BAE6FD', fontWeight: 600 }}
                            title="View audit telemetry, defect checkpoints, evidence photos and submit review"
                          >
                            <Eye size={14} />
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
                            <Download size={13} /> Excel
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
                            <FileText size={13} /> PDF Certificate
                          </a>

                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2.5rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', color: '#94A3B8' }}>
                    No audit sheets currently assigned to this inspector.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                className="btn btn-primary btn-sm"
              >
                Close
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
            if (viewingEmployee) {
              handleOpenEmployeeInspections(viewingEmployee);
            }
          }}
          onOpenPhoto={onOpenPhoto}
        />
      )}

      {/* MODAL 2: EDIT EMPLOYEE PROFILE & CHANGE PASSWORD */}
      {editingEmployee && (
        <div className="modal-overlay" onClick={() => setEditingEmployee(null)}>
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
                    Edit Inspector: {editingEmployee.name}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    Update employee code, hub station, and change/reset login password
                  </span>
                </div>
              </div>
              <button onClick={() => setEditingEmployee(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
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

                {/* Row 1: Name and Employee Code */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Inspector Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Employee Code *</label>
                    <input
                      type="text"
                      value={editFormData.employee_code}
                      onChange={(e) => setEditFormData({ ...editFormData, employee_code: e.target.value })}
                      required
                      placeholder="e.g. EMP-1001"
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Row 2: Email and Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
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

                {/* Row 3: City and Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Stationed Hub City (Pakistan) *</label>
                    <select
                      value={editFormData.city}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
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

                  {editingEmployee.plain_password && (
                    <div style={{ fontSize: '0.8rem', color: '#334155', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: '#64748B' }}>Current Saved Password:</span>
                      <code style={{ backgroundColor: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #BAE6FD', fontWeight: 700 }}>
                        {editingEmployee.plain_password}
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
                        placeholder="Type new password for this field inspector..."
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
                      Updating password will allow the inspector to log in on mobile immediately with the new credentials.
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #E2E8F0' }}>
                <button type="button" onClick={() => setEditingEmployee(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="btn btn-primary">
                  <Check size={15} />
                  <span>{editSubmitting ? 'Saving Changes...' : 'Save Inspector Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ONBOARD NEW FIELD INSPECTOR */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92vw' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Onboard New Field Inspector</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body">
                {error && (
                  <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Asad Ullah Khan"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Employee Code (Optional, auto-generated)</label>
                    <input
                      type="text"
                      value={formData.employee_code}
                      onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                      placeholder="e.g. EMP-1004"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Stationed Hub City (Pakistan) *</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-select"
                      required
                    >
                      <option value="Karachi">Karachi (Sindh Mill Zone)</option>
                      <option value="Faisalabad">Faisalabad (Textile Hub)</option>
                      <option value="Lahore">Lahore (Apparel Corridor)</option>
                      <option value="Sialkot">Sialkot (Export Processing)</option>
                      <option value="Multan">Multan (Cotton Belt)</option>
                      <option value="Gujranwala">Gujranwala (Industrial Zone)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Official Work Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. asad@apexfabric.com (or auto-assigned)"
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Login Password *</label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Default: emp123"
                      required
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Phone / WhatsApp (Pakistan)</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+92 300 1234567"
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
                  {submitting ? 'Creating Profile...' : 'Confirm & Assign Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
