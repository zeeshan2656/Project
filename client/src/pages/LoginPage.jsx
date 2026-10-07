import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { ShieldCheck, LogIn, UserCheck, HardHat, Shield, ArrowRight, AlertCircle } from 'lucide-react';

export function LoginPage({ onNavigate }) {
  const { login, loading } = useAuth();
  const { companyName, logoUrl } = useSite();

  const [activeTab, setActiveTab] = useState('employee'); // 'employee', 'customer', 'admin'
  const [identifier, setIdentifier] = useState('EMP-1001');
  const [password, setPassword] = useState('emp123');
  const [error, setError] = useState('');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    if (tab === 'employee') {
      setIdentifier('EMP-1001');
      setPassword('emp123');
    } else if (tab === 'customer') {
      setIdentifier('john@usafashionbrands.com');
      setPassword('customer123');
    } else if (tab === 'admin') {
      setIdentifier('admin@apexfabric.com');
      setPassword('admin123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res = await login(identifier, password, activeTab);
    if (res.success) {
      onNavigate(res.user.role);
    } else {
      setError(res.message || 'Invalid credentials. Please verify your details.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', backgroundColor: '#F1F5F9' }}>
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid #CBD5E1',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {/* Card Header with Dynamic Company Name */}
        <div style={{ padding: '2rem 2rem 1.25rem 2rem', textAlign: 'center', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ height: '42px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: '42px', height: '42px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <ShieldCheck size={26} color="#FFFFFF" />
              </div>
            )}
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            {companyName}
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Unified Role-Based Authentication Gateway
          </p>

          {/* Role Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem', marginTop: '1.25rem', backgroundColor: '#1E293B', padding: '4px', borderRadius: 'var(--radius-xs)' }}>
            <button
              type="button"
              onClick={() => handleTabChange('employee')}
              style={{
                background: activeTab === 'employee' ? '#059669' : 'transparent',
                color: activeTab === 'employee' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 150ms ease'
              }}
            >
              <HardHat size={14} /> Inspector
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('customer')}
              style={{
                background: activeTab === 'customer' ? '#0284C7' : 'transparent',
                color: activeTab === 'customer' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 150ms ease'
              }}
            >
              <UserCheck size={14} /> Client (USA)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('admin')}
              style={{
                background: activeTab === 'admin' ? '#3B82F6' : 'transparent',
                color: activeTab === 'admin' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-xs)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                transition: 'all 150ms ease'
              }}
            >
              <Shield size={14} /> Director
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                {activeTab === 'employee' ? 'Employee Code (e.g. EMP-1001)' : 'Email Address'}
              </label>
              <input
                type={activeTab === 'employee' ? 'text' : 'email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={activeTab === 'employee' ? 'EMP-1001' : 'user@example.com'}
                required
                className="form-input"
              />
              {activeTab === 'employee' && (
                <span className="form-help">Enter your unique company-issued badge code.</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn btn-lg ${
                activeTab === 'employee' ? 'btn-success' : activeTab === 'customer' ? 'btn-accent' : 'btn-primary'
              }`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <LogIn size={18} />
              <span>{loading ? 'Authenticating...' : `Sign In as ${activeTab === 'employee' ? 'Field Inspector' : activeTab === 'customer' ? 'USA Client' : 'Admin Director'}`}</span>
            </button>
          </form>

          {/* Quick Demo Pre-sets */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B' }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Demo Credentials Ready:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              <span>• Inspector: EMP-1001 / emp123</span>
              <span>• Client (USA): john@usafashionbrands.com / customer123</span>
              <span>• Admin: admin@apexfabric.com / admin123</span>
            </div>
          </div>

          {activeTab === 'customer' && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                style={{ background: 'transparent', border: 'none', color: '#2563EB', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Need an account? Register as Buyer &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
