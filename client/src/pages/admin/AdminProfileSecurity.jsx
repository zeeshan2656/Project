import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersApi, authApi } from '../../services/api';
import { 
  ShieldCheck, 
  Key, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  Edit3, 
  ShieldAlert, 
  X,
  Phone
} from 'lucide-react';

export function AdminProfileSecurity() {
  const { user, updateCurrentUser } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Edit credentials form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  // All admins list
  const [adminsList, setAdminsList] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [visibleAdminPasswords, setVisibleAdminPasswords] = useState({});

  // Add new admin modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdminData, setNewAdminData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Edit other admin modal
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editAdminForm, setEditAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [savingEditAdmin, setSavingEditAdmin] = useState(false);

  // Fetch current user full profile (including plain_password)
  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.getMe();
      if (res && res.success && res.user) {
        setProfile(res.user);
        setFormData({
          name: res.user.name || '',
          email: res.user.email || '',
          password: '',
          confirmPassword: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all administrator accounts
  const loadAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await usersApi.getAdmins();
      if (res && res.success && res.admins) {
        setAdminsList(res.admins);
      }
    } catch (err) {
      console.warn('Failed to fetch admins list:', err.message);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadAdmins();
  }, []);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleToggleAdminPassword = (adminId) => {
    setVisibleAdminPasswords(prev => ({
      ...prev,
      [adminId]: !prev[adminId]
    }));
  };

  // Handle current admin credentials update
  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setError('Admin name cannot be blank.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Admin email / username cannot be blank.');
      return;
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('New password and confirmation password do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim()
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await usersApi.updateUser(user?.id || profile?.id, payload);
      if (res && res.success) {
        setSuccessMsg('Admin credentials updated successfully! New details are active.');
        setProfile(res.user);
        updateCurrentUser(res.user);
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
        loadAdmins();
      }
    } catch (err) {
      setError(err.message || 'Failed to update admin credentials.');
    } finally {
      setSaving(false);
    }
  };

  // Create new admin account
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminData.name || !newAdminData.email || !newAdminData.password) {
      alert('Please fill out Name, Email, and Password.');
      return;
    }
    if (newAdminData.password.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await usersApi.createAdmin(newAdminData);
      if (res && res.success) {
        setShowAddModal(false);
        setNewAdminData({ name: '', email: '', password: '', phone: '' });
        loadAdmins();
        alert('New administrator account created successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to create administrator account.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Save edit for other admin
  const handleSaveEditAdmin = async (e) => {
    e.preventDefault();
    if (!editingAdmin) return;
    setSavingEditAdmin(true);
    try {
      const payload = {
        name: editAdminForm.name.trim(),
        email: editAdminForm.email.trim(),
        phone: editAdminForm.phone.trim()
      };
      if (editAdminForm.password && editAdminForm.password.trim() !== '') {
        payload.password = editAdminForm.password;
      }

      const res = await usersApi.updateUser(editingAdmin.id, payload);
      if (res && res.success) {
        setEditingAdmin(null);
        loadAdmins();
        if (editingAdmin.id === user?.id) {
          loadProfile();
          updateCurrentUser(res.user);
        }
        alert('Administrator account updated successfully!');
      }
    } catch (err) {
      alert(err.message || 'Failed to update administrator account.');
    } finally {
      setSavingEditAdmin(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <RefreshCw size={32} className="animate-spin" color="#0284C7" />
        <div style={{ marginTop: '1rem', color: '#64748B', fontWeight: 600 }}>Loading Admin Credentials...</div>
      </div>
    );
  }

  const currentPass = profile?.plain_password || '••••••••';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* 1. TOP HEADER BANNER */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: '12px',
        padding: '1.5rem 1.75rem',
        color: '#FFFFFF',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
              Admin Credentials &amp; Security Settings
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
              View and manage your administrator login credentials, username, and password.
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '0.55rem 0.95rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <UserPlus size={16} />
          <span>+ Add New Admin</span>
        </button>
      </div>

      {/* ALERT BANNERS */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          color: '#B91C1C',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '8px',
          padding: '0.85rem 1rem',
          color: '#15803D',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. CURRENT ACTIVE CREDENTIALS CARD */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#0284C7" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Your Active Login Credentials
            </h3>
          </div>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '999px',
            backgroundColor: '#DCFCE7',
            color: '#166534',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
            Active Session (Admin #{profile?.id})
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Box 1: Username / Login Email */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Username / Login Identifier
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.email}
              </div>
              <button
                type="button"
                onClick={() => handleCopy(profile?.email, 'username')}
                title="Copy Username"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: copiedField === 'username' ? '#16A34A' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {copiedField === 'username' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedField === 'username' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem' }}>
              Use this email address to log into the Operations Portal.
            </div>
          </div>

          {/* Box 2: Password with Eye Toggle */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
              Current Password
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono, monospace)', letterSpacing: showCurrentPassword ? 'normal' : '0.15em' }}>
                {showCurrentPassword ? currentPass : '••••••••••••'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  title={showCurrentPassword ? 'Hide Password' : 'Show Password'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0284C7',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showCurrentPassword ? 'Hide' : 'Reveal'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(currentPass, 'password')}
                  title="Copy Password"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: copiedField === 'password' ? '#16A34A' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {copiedField === 'password' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === 'password' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem' }}>
              Encrypted with standard bcrypt security hash.
            </div>
          </div>
        </div>
      </div>

      {/* 3. CHANGE USERNAME & PASSWORD FORM */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <Edit3 size={18} color="#0284C7" />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
            Change Admin User &amp; Password
          </h3>
        </div>

        <form onSubmit={handleUpdateCredentials}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            
            {/* Field: Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Full Name / Director Title
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Farhan Qureshi (QA Director)"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                    fontSize: '0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A'
                  }}
                />
                <User size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Field: Login Email */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Login Email (Username)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. admin@apexfabric.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                    fontSize: '0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A'
                  }}
                />
                <Mail size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Field: New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                New Password <span style={{ color: '#94A3B8', fontWeight: 400 }}>(leave empty to keep current)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password (min. 6 chars)"
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.25rem 0.6rem 2.25rem',
                    fontSize: '0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A'
                  }}
                />
                <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Field: Confirm New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-type new password"
                  disabled={!formData.password}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.25rem 0.6rem 2.25rem',
                    fontSize: '0.85rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: formData.password ? '#FFFFFF' : '#F1F5F9',
                    color: '#0F172A'
                  }}
                />
                <Lock size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {formData.password && formData.confirmPassword && (
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  marginTop: '0.25rem',
                  color: formData.password === formData.confirmPassword ? '#16A34A' : '#DC2626'
                }}>
                  {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                </div>
              )}
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0284C7',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.35rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.2)'
              }}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? 'Updating Credentials...' : 'Save & Update Credentials'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. ALL ADMINISTRATOR ACCOUNTS TABLE */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              All System Administrators ({adminsList.length})
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Review all administrator accounts with full dashboard privileges.
            </div>
          </div>
          <button
            onClick={loadAdmins}
            title="Refresh List"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={12} className={loadingAdmins ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B' }}>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>ID</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Administrator Name</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Username / Email</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Password</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.65rem 0.75rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsList.map((adm) => {
                const isPassRevealed = !!visibleAdminPasswords[adm.id];
                const isCurrent = adm.id === (user?.id || profile?.id);
                return (
                  <tr key={adm.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#94A3B8' }}>
                      #{adm.id}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{adm.name}</span>
                        {isCurrent && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: '#E0F2FE', color: '#0369A1', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', color: '#334155', fontFamily: 'var(--font-mono, monospace)' }}>
                      {adm.email}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono, monospace)' }}>
                        <span style={{ fontSize: '0.78rem', color: '#0F172A', fontWeight: 700 }}>
                          {isPassRevealed ? (adm.plain_password || '••••••••') : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleAdminPassword(adm.id)}
                          title={isPassRevealed ? 'Hide Password' : 'Show Password'}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#0284C7', display: 'flex', alignItems: 'center' }}
                        >
                          {isPassRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: adm.status === 'active' ? '#DCFCE7' : '#FEE2E2',
                        color: adm.status === 'active' ? '#166534' : '#991B1B'
                      }}>
                        {adm.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEditingAdmin(adm);
                          setEditAdminForm({
                            name: adm.name || '',
                            email: adm.email || '',
                            password: '',
                            phone: adm.phone || ''
                          });
                        }}
                        style={{
                          backgroundColor: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#0284C7',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Edit / Reset Password
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ADD NEW ADMIN ACCOUNT */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={18} color="#0284C7" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                  Add New Administrator Account
                </h4>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Administrator Full Name *
                  </label>
                  <input
                    type="text"
                    value={newAdminData.name}
                    onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                    placeholder="e.g. Tariq Mehmood (QA Executive)"
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Login Email (Username) *
                  </label>
                  <input
                    type="email"
                    value={newAdminData.email}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                    placeholder="e.g. tariq@apexfabric.com"
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Login Password *
                  </label>
                  <input
                    type="text"
                    value={newAdminData.password}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    placeholder="Create a secure password"
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAdminData.phone}
                    onChange={(e) => setNewAdminData({ ...newAdminData, phone: e.target.value })}
                    placeholder="e.g. +92 300 1234567"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 700, cursor: creatingAdmin ? 'wait' : 'pointer' }}
                >
                  {creatingAdmin ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: EDIT OTHER ADMIN ACCOUNT */}
      {editingAdmin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#0284C7" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                  Edit Admin: {editingAdmin.name}
                </h4>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Administrator Name *
                  </label>
                  <input
                    type="text"
                    value={editAdminForm.name}
                    onChange={(e) => setEditAdminForm({ ...editAdminForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Username / Login Email *
                  </label>
                  <input
                    type="email"
                    value={editAdminForm.email}
                    onChange={(e) => setEditAdminForm({ ...editAdminForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    New Password <span style={{ color: '#94A3B8', fontWeight: 400 }}>(leave blank to keep current)</span>
                  </label>
                  <input
                    type="text"
                    value={editAdminForm.password}
                    onChange={(e) => setEditAdminForm({ ...editAdminForm, password: e.target.value })}
                    placeholder="Enter new password to reset"
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editAdminForm.phone}
                    onChange={(e) => setEditAdminForm({ ...editAdminForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  style={{ padding: '0.55rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditAdmin}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '6px', border: 'none', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 700, cursor: savingEditAdmin ? 'wait' : 'pointer' }}
                >
                  {savingEditAdmin ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
