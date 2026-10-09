import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { ShieldCheck, UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';

export function RegisterPage({ onNavigate }) {
  const { register, loading } = useAuth();
  const { companyName, logoUrl } = useSite();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company_name: '',
    city: 'New York, NY',
    country: 'USA',
    phone: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res = await register(formData);
    if (res.success) {
      onNavigate('customer');
    } else {
      setError(res.message || 'Registration failed.');
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', backgroundColor: '#F1F5F9' }}>
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '540px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid #CBD5E1',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div style={{ padding: '2rem 2rem 1.25rem 2rem', textAlign: 'center', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} width="160" height="40" style={{ height: '40px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ width: '40px', height: '40px', backgroundColor: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                <ShieldCheck size={24} color="#FFFFFF" />
              </div>
            )}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
            Buyer Registration
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            Onboard your apparel brand with {companyName}
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Contact Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. David Vance"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company / Brand Name *</label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Manhattan Sourcing LLC"
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Work Email Address *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="david@manhattansourcing.com"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="At least 6 characters"
                className="form-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">City, State</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Los Angeles, CA"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone / WhatsApp</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 019-2831"
                  className="form-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
            >
              <UserPlus size={18} />
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              style={{ background: 'transparent', border: 'none', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
