import React from 'react';
import { useSite } from '../context/SiteContext';
import { HeroSlider } from '../components/HeroSlider';
import { 
  CheckCircle, 
  Layers, 
  Eye, 
  FileCheck, 
  Factory, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  MessageCircle, 
  ArrowRight, 
  Sparkles,
  BarChart3,
  Cpu,
  Smartphone,
  LogIn,
  UserPlus
} from 'lucide-react';

export function LandingPage({ onNavigate }) {
  const { settings, slides, whatsappLink, companyName } = useSite();

  const handleCtaClick = (link) => {
    if (link === '/register') {
      onNavigate('register');
    } else if (link === '/login') {
      onNavigate('login');
    } else if (link && link.startsWith('#')) {
      const el = document.querySelector(link);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavigate('register');
    }
  };

  const parseArray = (val, fallback = []) => {
    if (!val) return fallback;
    if (Array.isArray(val) && val.length > 0) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
      } catch (_) {
        return fallback;
      }
    }
    return fallback;
  };

  const defaultStats = [
    { value: '14,800+', label: 'Inspections Completed' },
    { value: '99.4%', label: 'On-Time Mill Arrival' },
    { value: '65+', label: 'Certified Field Auditors' },
    { value: '100%', label: 'Independent & Conflict-Free' }
  ];

  const defaultServices = [
    {
      id: 1,
      title: 'Raw Greige & Finished Fabric Inspection',
      description: '4-Point and 10-Point system grading on illuminated perch tables. Comprehensive defect tagging, tensile tests, GSM verification, and width uniformity.'
    },
    {
      id: 2,
      title: 'In-Line & During Production (DUPRO) Audits',
      description: 'Active line monitoring across cutting, sewing, and assembly to identify systemic defects before bulk lots are finished.'
    },
    {
      id: 3,
      title: 'Final Random Inspection (FRI / Pre-Shipment)',
      description: 'Rigorous statistical pre-shipment sign-off. Measurement conformity, packaging integrity, barcode scanning, and carton drop checks.'
    },
    {
      id: 4,
      title: 'Mill Capability & Technical Audit',
      description: 'Independent assessment of spinning, weaving, and dyeing facility capacities, machinery calibration, and labor compliance.'
    }
  ];

  const defaultProcessSteps = [
    {
      step: '01',
      title: 'Order & PO Onboarding',
      desc: 'Customer or Admin submits purchase order details, factory coordinates in Pakistan, and required AQL inspection standard.'
    },
    {
      step: '02',
      title: 'Dynamic Template Assignment',
      desc: 'Admin pairs the order with a specialized product template and assigns a certified field inspector closest to the mill.'
    },
    {
      step: '03',
      title: 'On-Site Live Telemetry',
      desc: 'Inspector checks into the mill; admin dashboard activates \'In Progress\' status. Defects and photos are synchronized live.'
    },
    {
      step: '04',
      title: 'QA Sign-Off & Instant Export',
      desc: 'Admin conducts senior QA review, approves or flags for re-inspection, and issues cryptographic PDF/Excel audit certificates.'
    }
  ];

  const defaultAboutBullets = [
    'Zero financial ties to Pakistani manufacturing mills or supplier brokers',
    'Certified auditors conforming to ISO 17020 and ASQ quality standards',
    'Real-time GPS check-in verification preventing ghost audit reports',
    'Defect severity tracking with high-resolution photographic evidence'
  ];

  const services = parseArray(settings?.services_content, defaultServices);
  const processSteps = parseArray(settings?.process_content, defaultProcessSteps);
  const stats = parseArray(settings?.trust_stats, defaultStats);
  const aboutBullets = parseArray(settings?.about_bullets, defaultAboutBullets);

  return (
    <div style={{ backgroundColor: '#F8FAFC' }}>
      {/* 1. Hero Product & Inspection Slider */}
      <HeroSlider slides={slides} onCtaClick={handleCtaClick} />

      {/* 2. Trust Metrics Bar */}
      <section style={{ backgroundColor: '#0F172A', color: '#FFFFFF', borderBottom: '1px solid #1E293B', padding: '2.5rem 0' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            {stats.map((st, i) => (
              <div key={i} style={{ borderRight: i < stats.length - 1 ? '1px solid #1E293B' : 'none' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#38BDF8', fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>
                  {st.value}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94A3B8', fontWeight: 600, marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Core Fabrication Services */}
      <section id="services" className="landing-lazy-section" style={{ padding: '5.5rem 0', backgroundColor: '#FFFFFF' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Precision Scope &amp; Methodology
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0F172A', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              Third-Party Quality Services Offered Across Pakistan
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', marginTop: '1rem', lineHeight: 1.6 }}>
              Rigorous, conflict-free audit execution conforming to ASTM, ISO 2859-1 (AQL), and ANSI/ASQ standards.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
            {services.map((srv, idx) => (
              <div 
                key={srv.id || idx}
                className="card"
                style={{
                  padding: '2rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)'
                }}
              >
                <div>
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1.25rem'
                    }}
                  >
                    {idx === 0 ? <Layers size={24} /> : idx === 1 ? <Eye size={24} /> : idx === 2 ? <FileCheck size={24} /> : <Factory size={24} />}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                    {srv.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {srv.description}
                  </p>
                </div>

                <button 
                  onClick={() => onNavigate('register')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#2563EB',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Book This Audit <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Real-Time Inspection Process Workflow */}
      <section id="process" className="landing-lazy-section" style={{ padding: '5.5rem 0', backgroundColor: '#F1F5F9', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Transparent Architecture
            </span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0F172A', marginTop: '0.5rem', letterSpacing: '-0.02em' }}>
              How Our Live Audit Platform Works
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', marginTop: '1rem', lineHeight: 1.6 }}>
              From USA buyer order submission to live on-site inspection telemetry at Pakistan textile mills.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {processSteps.map((step, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '2rem 1.5rem',
                  border: '1px solid #E2E8F0',
                  borderRadius: 'var(--radius-sm)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '10px',
                    fontSize: '4.5rem',
                    fontWeight: 900,
                    fontFamily: 'var(--font-mono)',
                    color: '#F1F5F9',
                    zIndex: 0
                  }}
                >
                  {step.step}
                </div>

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'inline-block', backgroundColor: '#3B82F6', color: '#FFFFFF', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: '1rem' }}>
                    STEP {step.step}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.6 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us & Conflict-Free QA */}
      <section id="about" className="landing-lazy-section" style={{ padding: '5.5rem 0', backgroundColor: '#FFFFFF' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-xs)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>
                <Sparkles size={14} /> Zero Conflict of Interest
              </div>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0F172A', lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
                {settings.about_title || 'Independent Quality Assurance You Can Trust'}
              </h2>
              <p style={{ fontSize: '1.05rem', color: '#475569', lineHeight: 1.7, marginBottom: '2rem' }}>
                {settings.about_content}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                {aboutBullets.map((bullet, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ marginTop: '3px', color: '#16A34A' }}>
                      <CheckCircle size={18} />
                    </div>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B' }}>
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => onNavigate('register')} className="btn btn-primary btn-lg" aria-label="Register as Buyer (USA)">
                  Register as Buyer (USA)
                </button>
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-lg">
                  <MessageCircle size={18} /> Chat with QA Lead
                </a>
              </div>
            </div>

            {/* Industrial Real-Time Telemetry Visual */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  padding: '2rem',
                  border: '1px solid #1E293B',
                  boxShadow: 'var(--shadow-xl)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span className="live-pulse" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', color: '#38BDF8' }}>LIVE FIELD TELEMETRY</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>WS://ACTIVE</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: '#1E293B', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #10B981' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Recent Site Approval</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', marginTop: '2px' }}>Artistic Milliners Unit 4 • Karachi</div>
                    <div style={{ fontSize: '0.8rem', color: '#6EE7B7', marginTop: '4px' }}>Passed AQL 2.5 (1.27% Defect Rate, 315 samples)</div>
                  </div>

                  <div style={{ backgroundColor: '#1E293B', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #38BDF8' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Active In-Progress Audit</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', marginTop: '2px' }}>Interloop Limited • Faisalabad</div>
                    <div style={{ fontSize: '0.8rem', color: '#7DD3FC', marginTop: '4px' }}>Inspector Kashif (EMP-1001) logged on site</div>
                  </div>

                  <div style={{ backgroundColor: '#1E293B', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid #F59E0B' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>QA Approval Queue</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF', marginTop: '2px' }}>Nishat Mills Spinning Unit 2 • Lahore</div>
                    <div style={{ fontSize: '0.8rem', color: '#FCD34D', marginTop: '4px' }}>Submitted with high-res macro defect photos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Contact & Direct Mill Booking Section */}
      <section id="contact" className="landing-lazy-section" style={{ padding: '5.5rem 0', backgroundColor: '#0F172A', color: '#FFFFFF' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Pakistan Field Operations
              </span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, marginTop: '0.5rem', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                Schedule a Third-Party Mill Inspection Today
              </h2>
              <p style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: 1.6, marginBottom: '2rem' }}>
                Have an urgent shipment departing from Karachi port or an in-line lot in Faisalabad? Contact our operations dispatch desk directly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: '#38BDF8' }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Direct Operations Line</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{settings.contact_phone}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: '#38BDF8' }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Inquiries &amp; PO Forwarding</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{settings.contact_email}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', backgroundColor: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-sm)', color: '#25D366' }}>
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Instant WhatsApp Support</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{settings.whatsapp_number}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Card */}
            <div style={{ backgroundColor: '#1E293B', padding: '2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem', color: '#FFFFFF' }}>
                Client Portal Onboarding
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginBottom: '1.75rem', lineHeight: 1.5 }}>
                USA and international brands can register for an account to create purchase orders, monitor inspection telemetry in real time, and export verified PDF/Excel certificates.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <button
                  onClick={() => onNavigate('register')}
                  className="btn btn-accent btn-lg"
                  aria-label="Create Client Account (USA)"
                  style={{ width: '100%', justifyContent: 'center', gap: '0.6rem' }}
                >
                  <UserPlus size={18} />
                  <span>Create Client Account (USA)</span>
                </button>

                <button
                  onClick={() => onNavigate('login')}
                  className="btn btn-outline btn-lg"
                  aria-label="Sign In to Portal"
                  style={{ width: '100%', justifyContent: 'center', color: '#FFFFFF', borderColor: '#475569', backgroundColor: '#0F172A', gap: '0.6rem' }}
                >
                  <LogIn size={18} />
                  <span>Sign In to Portal</span>
                </button>

                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-lg"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  <MessageCircle size={18} /> Click to Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
