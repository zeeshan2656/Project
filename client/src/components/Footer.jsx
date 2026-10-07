import React from 'react';
import { useSite } from '../context/SiteContext';
import { ShieldCheck, Mail, Phone, MessageCircle, MapPin, ExternalLink, Check } from 'lucide-react';

export function Footer({ onNavigate }) {
  const { companyName, tagline, contactEmail, contactPhone, whatsappNumber, whatsappLink, logoUrl } = useSite();

  return (
    <footer style={{ backgroundColor: '#090D16', color: '#CBD5E1', borderTop: '1px solid #1E293B', paddingTop: '4rem', paddingBottom: '2.5rem' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem', marginBottom: '3.5rem' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} style={{ height: '36px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
              ) : (
                <div style={{ width: '36px', height: '36px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)' }}>
                  <ShieldCheck size={20} color="#FFFFFF" />
                </div>
              )}
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{companyName}</span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#94A3B8', marginBottom: '1.5rem' }}>
              {tagline}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1E293B', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', color: '#38BDF8', fontWeight: 600 }}>
              <Check size={14} /> ISO 9001:2015 Accredited Quality Agency
            </div>
          </div>

          {/* Quick Nav */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Platform Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><a href="#services" style={{ color: '#94A3B8', hover: { color: '#FFFFFF' } }}>Fabrication Inspection Services</a></li>
              <li><a href="#process" style={{ color: '#94A3B8' }}>4-Step Audit Workflow</a></li>
              <li><a href="#about" style={{ color: '#94A3B8' }}>Why Choose Third-Party QA</a></li>
              <li><button onClick={() => onNavigate('login')} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 600 }}>Client &amp; Inspector Sign-In</button></li>
              <li><button onClick={() => onNavigate('register')} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer', textAlign: 'left', font: 'inherit', fontWeight: 600 }}>USA Importer Registration</button></li>
            </ul>
          </div>

          {/* Textile Hub Coverage */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pakistan Mill Hubs
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem', color: '#94A3B8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={15} color="#38BDF8" /> Faisalabad (Spinning &amp; Weaving Hub)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={15} color="#38BDF8" /> Karachi (Denim &amp; Export Processing)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={15} color="#38BDF8" /> Lahore (Knitwear &amp; Finishing)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={15} color="#38BDF8" /> Sialkot &amp; Multan (Apparel &amp; Terry)</div>
            </div>
          </div>

          {/* Contact & WhatsApp */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.95rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direct Audit Desk
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
              <a href={`mailto:${contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94A3B8' }}>
                <Mail size={16} color="#38BDF8" />
                <span>{contactEmail}</span>
              </a>
              <a href={`tel:${contactPhone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#94A3B8' }}>
                <Phone size={16} color="#38BDF8" />
                <span>{contactPhone}</span>
              </a>
              <a 
                href={whatsappLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-success"
                style={{ marginTop: '0.5rem', width: 'fit-content' }}
              >
                <MessageCircle size={16} />
                <span>Chat via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid #1E293B', paddingTop: '2rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: '#64748B' }}>
          <div>
            &copy; {new Date().getFullYear()} {companyName}. All rights reserved. Zero-conflict third-party quality audits.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>AQL 2.5 / 4.0 Standard</span>
            <span>ISO 2859-1 Sampling</span>
            <span>Real-time Telemetry</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
