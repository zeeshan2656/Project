import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { 
  ShieldCheck, 
  LogIn, 
  UserCheck, 
  HardHat, 
  Shield, 
  ArrowRight, 
  AlertCircle,
  Fingerprint,
  Check,
  RefreshCw
} from 'lucide-react';
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable } from '../utils/biometricAuth';

export function LoginPage({ onNavigate }) {
  const { 
    login, 
    loginWithBiometrics, 
    enrollUserBiometrics, 
    isBiometricEnrolled, 
    getEnrolledBiometricUser, 
    loading 
  } = useAuth();
  const { companyName, logoUrl } = useSite();

  const [activeTab, setActiveTab] = useState('employee'); // 'employee', 'customer', 'admin'
  const [identifier, setIdentifier] = useState('EMP-1001');
  const [password, setPassword] = useState('emp123');
  const [error, setError] = useState('');
  const [biometricError, setBiometricError] = useState('');
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [enableBiometricOnLogin, setEnableBiometricOnLogin] = useState(true);
  const [hasBiometricSensor, setHasBiometricSensor] = useState(false);

  const enrolledUser = getEnrolledBiometricUser ? getEnrolledBiometricUser() : null;
  const isEnrolled = isBiometricEnrolled ? isBiometricEnrolled() : false;
  const [showPasswordForm, setShowPasswordForm] = useState(!isEnrolled);

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(avail => {
      setHasBiometricSensor(avail || isWebAuthnSupported());
    });
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError('');
    setBiometricError('');
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

  const handleBiometricLogin = async () => {
    setBiometricError('');
    setBiometricBusy(true);
    try {
      const res = await loginWithBiometrics();
      if (res && res.success && res.user) {
        onNavigate(res.user.role);
      } else {
        setBiometricError(res?.message || 'Biometric verification failed. Please sign in with password.');
        setShowPasswordForm(true);
      }
    } catch (err) {
      setBiometricError(err.message || 'Fingerprint sensor error. Please use password.');
      setShowPasswordForm(true);
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBiometricError('');

    const res = await login(identifier, password, activeTab);
    if (res.success && res.user) {
      if (enableBiometricOnLogin && hasBiometricSensor) {
        // Attempt automatic biometric enrollment for next one-touch login
        try {
          await enrollUserBiometrics();
        } catch (bioErr) {
          console.warn('[LoginPage] Auto-enroll biometric note:', bioErr?.message);
        }
      }
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

          {biometricError && (
            <div style={{ backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', color: '#B91C1C', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.82rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{biometricError}</span>
            </div>
          )}

          {/* 1. BIOMETRIC ONE-TOUCH SIGN-IN PROMPT (When enrolled on device) */}
          {isEnrolled && enrolledUser && !showPasswordForm ? (
            <div className="biometric-login-card" style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  backgroundColor: '#EFF6FF', 
                  border: '2px solid #BFDBFE', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 0.75rem auto',
                  color: '#2563EB',
                  fontSize: '1.4rem',
                  fontWeight: 800
                }}
              >
                {enrolledUser.name ? enrolledUser.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A' }}>
                Welcome back, {enrolledUser.name || enrolledUser.email || enrolledUser.employee_code}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.25rem' }}>
                Quick Unlock with Mobile Fingerprint Sensor
              </div>

              {/* Pulsing Fingerprint Scanner Icon */}
              <div 
                onClick={handleBiometricLogin} 
                style={{ 
                  margin: '1.75rem auto 1.25rem auto', 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div className={`biometric-touch-target ${biometricBusy ? 'scanning' : ''}`}>
                  <Fingerprint size={48} className="biometric-fingerprint-svg" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563EB', marginTop: '0.75rem' }}>
                  {biometricBusy ? 'Scanning Fingerprint...' : 'Tap to scan fingerprint'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricBusy}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '0.75rem' }}
              >
                <Fingerprint size={18} />
                <span>{biometricBusy ? 'Verifying Sensor...' : 'Touch Sensor to Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
              >
                <span>Sign in with Password instead</span>
              </button>
            </div>
          ) : (
            /* 2. REGULAR USERNAME/PASSWORD FORM */
            <form onSubmit={handleSubmit}>
              {isEnrolled && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(false); handleBiometricLogin(); }}
                    className="btn btn-outline"
                    style={{ 
                      width: '100%', 
                      justifyContent: 'center', 
                      borderColor: '#3B82F6', 
                      color: '#2563EB', 
                      backgroundColor: '#EFF6FF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      padding: '0.65rem 1rem'
                    }}
                  >
                    <Fingerprint size={17} />
                    <span>Touch Fingerprint to Sign In Quickly</span>
                  </button>
                </div>
              )}

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

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              {/* Biometric Enable Checkbox */}
              {hasBiometricSensor && (
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    margin: '0.5rem 0 1.25rem 0', 
                    cursor: 'pointer', 
                    fontSize: '0.82rem', 
                    color: '#475569',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enableBiometricOnLogin}
                    onChange={(e) => setEnableBiometricOnLogin(e.target.checked)}
                    style={{ accentColor: '#2563EB', width: '16px', height: '16px' }}
                  />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Fingerprint size={16} color="#2563EB" />
                    <span>Enable Fingerprint login on this device</span>
                  </span>
                </label>
              )}

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
          )}

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
