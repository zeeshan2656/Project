import React, { useState, useEffect } from 'react';
import { useSite } from '../../context/SiteContext';
import { siteApi } from '../../services/api';
import { 
  Settings, 
  Image, 
  Upload, 
  Trash2, 
  Plus, 
  Check, 
  Save, 
  Phone, 
  Mail, 
  MessageCircle, 
  Layers, 
  FileText,
  AlertCircle,
  BarChart3,
  Sparkles,
  RefreshCw,
  X,
  Eye,
  CheckCircle2,
  Edit3
} from 'lucide-react';

export function SiteSettingsCMS() {
  const { settings, fetchSiteData } = useSite();
  const [activeTab, setActiveTab] = useState('branding'); // 'branding', 'content', 'stats', 'slider', 'contact'

  // 1. Branding State
  const [companyName, setCompanyName] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const [logoPreview, setLogoPreview] = useState('');

  // 2. Hero & About State
  const [heroBadge, setHeroBadge] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [aboutTitle, setAboutTitle] = useState('');
  const [aboutContent, setAboutContent] = useState('');
  const [aboutBullets, setAboutBullets] = useState([]);
  const [newBulletText, setNewBulletText] = useState('');

  // 3. Stats State (Trust Bar)
  const [trustStats, setTrustStats] = useState([
    { value: '14,800+', label: 'Inspections Completed' },
    { value: '99.4%', label: 'On-Time Mill Arrival' },
    { value: '65+', label: 'Certified Field Auditors' },
    { value: '100%', label: 'Independent & Conflict-Free' }
  ]);

  // 4. Services State
  const [servicesContent, setServicesContent] = useState([
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
  ]);

  // 5. Workflow State
  const [processContent, setProcessContent] = useState([
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
      desc: 'Inspector checks into the mill; admin dashboard activates "In Progress" status. Defects and photos are synchronized live.'
    },
    {
      step: '04',
      title: 'QA Sign-Off & Instant Export',
      desc: 'Admin conducts senior QA review, approves or flags for re-inspection, and issues cryptographic PDF/Excel audit certificates.'
    }
  ]);

  // 6. Contact State
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // 7. Slider State
  const [adminSlides, setAdminSlides] = useState([]);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [newSlide, setNewSlide] = useState({
    title: '',
    subtitle: '',
    badge: 'Fabrication Audit',
    button_text: 'Schedule Audit',
    button_link: '#services'
  });
  const [slideFile, setSlideFile] = useState(null);
  const [addSlidePreview, setAddSlidePreview] = useState('');

  // Edit Slide State
  const [editingSlide, setEditingSlide] = useState(null);
  const [editSlideFile, setEditSlideFile] = useState(null);
  const [editSlidePreview, setEditSlidePreview] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || 'ApexFabric Quality Audits');
      setTagline(settings.tagline || '');
      setLogoUrlInput(settings.logo_url || '/media/branding/logo.svg');
      setLogoPreview(settings.logo_url || '/media/branding/logo.svg');

      setHeroBadge(settings.hero_badge || 'ISO 9001:2015 Accredited Quality Audits');
      setHeroTitle(settings.hero_title || 'Precision Fabrication Inspection & Mill Quality Auditing Across Pakistan');
      setHeroSubtitle(settings.hero_subtitle || 'Empowering USA & international apparel buyers with uncompromised on-site quality assurance, real-time defect telemetry, and rigorous third-party fabrication verifications.');
      setAboutTitle(settings.about_title || 'Independent Quality Assurance You Can Trust');
      setAboutContent(settings.about_content || 'We serve as your dedicated boots-on-the-ground in Pakistan textile and industrial manufacturing hubs.');
      
      if (Array.isArray(settings.about_bullets) && settings.about_bullets.length > 0) {
        setAboutBullets(settings.about_bullets);
      } else {
        setAboutBullets([
          'Zero-Conflict Independent Third-Party Auditing Across Pakistan',
          'Real-Time Telemetry & Instant Defect Percentages',
          'Covering Key Textile Hubs: Karachi, Faisalabad, Lahore, Sialkot, Multan',
          'Standardized AQL 2.5 / 4.0 ISO 2859-1 Sampling Methodology'
        ]);
      }

      if (Array.isArray(settings.trust_stats) && settings.trust_stats.length > 0) {
        setTrustStats(settings.trust_stats);
      }

      if (Array.isArray(settings.services_content) && settings.services_content.length > 0) {
        setServicesContent(settings.services_content);
      }

      if (Array.isArray(settings.process_content) && settings.process_content.length > 0) {
        setProcessContent(settings.process_content);
      }

      setContactEmail(settings.contact_email || 'operations@apexfabric-audit.com');
      setContactPhone(settings.contact_phone || '+92 300 8472910');
      setWhatsappNumber(settings.whatsapp_number || '+92 300 8472910');
      setWhatsappMessage(settings.whatsapp_message || 'Hello, I would like to book a third-party fabrication audit.');
    }
    fetchSlides();
  }, [settings]);

  const fetchSlides = async () => {
    try {
      const res = await siteApi.getAdminSlides();
      if (res.success) {
        setAdminSlides(res.slides);
      }
    } catch (err) {
      console.error('Error fetching admin slides:', err);
    }
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setLogoUrlInput(''); // clear custom url when file is picked
    }
  };

  const handleAddBullet = () => {
    if (newBulletText.trim()) {
      setAboutBullets([...aboutBullets, newBulletText.trim()]);
      setNewBulletText('');
    }
  };

  const handleRemoveBullet = (index) => {
    setAboutBullets(aboutBullets.filter((_, i) => i !== index));
  };

  const handleSaveAllSettings = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('company_name', companyName);
      formData.append('tagline', tagline);
      formData.append('contact_email', contactEmail);
      formData.append('contact_phone', contactPhone);
      formData.append('whatsapp_number', whatsappNumber);
      formData.append('whatsapp_message', whatsappMessage);
      formData.append('hero_badge', heroBadge);
      formData.append('hero_title', heroTitle);
      formData.append('hero_subtitle', heroSubtitle);
      formData.append('about_title', aboutTitle);
      formData.append('about_content', aboutContent);
      formData.append('about_bullets', JSON.stringify(aboutBullets));
      formData.append('services_content', JSON.stringify(servicesContent));
      formData.append('process_content', JSON.stringify(processContent));
      formData.append('trust_stats', JSON.stringify(trustStats));

      if (logoFile) {
        formData.append('logo', logoFile);
      } else if (logoUrlInput) {
        formData.append('logo_url', logoUrlInput);
      }

      const res = await siteApi.updateSettings(formData);
      if (res.success) {
        setMessage('Website Branding & Content updated dynamically across the entire platform!');
        setLogoFile(null);
        await fetchSiteData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update website settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlide = async (e) => {
    e.preventDefault();
    if (!slideFile || !newSlide.title) {
      setError('Slide title and image photo are required.');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', newSlide.title);
      formData.append('subtitle', newSlide.subtitle);
      formData.append('badge', newSlide.badge);
      formData.append('button_text', newSlide.button_text);
      formData.append('button_link', newSlide.button_link);
      formData.append('image', slideFile);

      const res = await siteApi.createSlide(formData);
      if (res.success) {
        setShowAddSlide(false);
        setSlideFile(null);
        setAddSlidePreview('');
        setNewSlide({
          title: '',
          subtitle: '',
          badge: 'Fabrication Audit',
          button_text: 'Schedule Audit',
          button_link: '#services'
        });
        fetchSlides();
        fetchSiteData();
        setMessage('Homepage slider photo uploaded and published successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload slide.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditSlide = (slide) => {
    setEditingSlide({
      id: slide.id,
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      badge: slide.badge || 'Fabrication Audit',
      button_text: slide.button_text || 'Schedule Audit',
      button_link: slide.button_link || '#services',
      image_url: slide.image_url || '',
      is_active: slide.is_active !== 0
    });
    setEditSlideFile(null);
    setEditSlidePreview(slide.image_url || '');
    setError('');
  };

  const handleUpdateSlide = async (e) => {
    e.preventDefault();
    if (!editingSlide || !editingSlide.title) {
      setError('Slide title is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', editingSlide.title);
      formData.append('subtitle', editingSlide.subtitle);
      formData.append('badge', editingSlide.badge);
      formData.append('button_text', editingSlide.button_text);
      formData.append('button_link', editingSlide.button_link);
      formData.append('is_active', editingSlide.is_active ? 1 : 0);
      if (editSlideFile) {
        formData.append('image', editSlideFile);
      } else if (editingSlide.image_url) {
        formData.append('image_url', editingSlide.image_url);
      }

      const res = await siteApi.updateSlide(editingSlide.id, formData);
      if (res.success) {
        setEditingSlide(null);
        setEditSlideFile(null);
        setEditSlidePreview('');
        fetchSlides();
        fetchSiteData();
        setMessage('Slider slide updated and published successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to update slide.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (!confirm('Are you sure you want to remove this slide from the homepage slider?')) return;
    try {
      const res = await siteApi.deleteSlide(id);
      if (res.success) {
        fetchSlides();
        fetchSiteData();
        setMessage('Slide removed from homepage.');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete slide.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* CMS Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="mobile-hide-heading">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={22} color="#0284C7" /> Website Content &amp; Branding CMS
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
            Add logos, modify homepage slider photos, and customize landing page copy, stats, and services in real time.
          </p>
        </div>

        <div className="order-header-actions mobile-actions-row">
          <button 
            onClick={handleSaveAllSettings} 
            disabled={saving} 
            className="btn btn-primary"
            style={{ fontWeight: 700 }}
          >
            <Save size={16} />
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div style={{ backgroundColor: '#DCFCE7', borderLeft: '4px solid #16A34A', color: '#15803D', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-xs)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.65rem', boxShadow: 'var(--shadow-sm)' }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-xs)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.65rem', boxShadow: 'var(--shadow-sm)' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* CMS Module Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('branding')}
          className={`btn ${activeTab === 'branding' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Sparkles size={15} /> Logo &amp; Identity
        </button>
        <button
          onClick={() => setActiveTab('slider')}
          className={`btn ${activeTab === 'slider' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Image size={15} /> Hero Slider ({adminSlides.length})
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`btn ${activeTab === 'content' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <FileText size={15} /> Landing Page Content
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <BarChart3 size={15} /> Trust Stats Bar
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`btn ${activeTab === 'contact' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ fontSize: '0.85rem' }}
        >
          <Phone size={15} /> Operations &amp; WhatsApp
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: LOGO & IDENTITY                                   */}
      {/* ========================================================= */}
      {activeTab === 'branding' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0F172A' }}>
            Corporate Logo &amp; Platform Identity
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Upload a custom corporate logo file (SVG, PNG, WEBP, JPG) or specify a logo URL. The logo will immediately update in the main navigation header, inspector apps, and export reports.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Platform / Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. ApexFabric Quality Audits"
                required
                className="form-input"
              />
              <span className="form-help">
                Rendered across the website, header, and official inspection certificates.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Corporate Tagline / Slogan</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Premier Third-Party Fabrication, Apparel & Mill Inspection Services in Pakistan"
                className="form-input"
              />
            </div>
          </div>

          {/* Logo Upload & Dual-Theme Live Preview */}
          <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Upload size={16} /> Logo File Upload &amp; Preview
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600 }}>Choose Logo File to Upload</label>
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  onChange={handleLogoFileChange}
                  style={{ display: 'block', width: '100%', padding: '0.5rem', fontSize: '0.85rem', border: '1px dashed #94A3B8', borderRadius: 'var(--radius-sm)', backgroundColor: '#FFFFFF' }}
                />
                <span className="form-help" style={{ marginTop: '0.5rem' }}>
                  Supports transparent PNG, SVG, WEBP, or JPG. Files will be saved into <code>media/branding/</code>.
                </span>

                <div style={{ marginTop: '1rem' }}>
                  <label className="form-label">Or Custom Logo Image Path / URL</label>
                  <input
                    type="text"
                    value={logoUrlInput}
                    onChange={(e) => {
                      setLogoUrlInput(e.target.value);
                      setLogoPreview(e.target.value);
                      setLogoFile(null);
                    }}
                    placeholder="/media/branding/logo.svg"
                    className="form-input"
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoUrlInput('/media/branding/logo.svg');
                        setLogoPreview('/media/branding/logo.svg');
                        setLogoFile(null);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', color: '#0284C7' }}
                    >
                      Reset to Official ApexFabric Logo
                    </button>
                  </div>
                </div>
              </div>

              {/* Dual-Theme Live Visual Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Live Visual Appearance Previews
                </div>

                {/* 1. Dark Header Theme Preview */}
                <div style={{ backgroundColor: '#0B1120', padding: '1rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #1E293B', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>Header View (Dark Background #0B1120):</span>
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Dark Preview" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#64748B', fontSize: '0.85rem' }}>No logo loaded</span>
                    )}
                  </div>
                </div>

                {/* 2. Light Certificate Theme Preview */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '1rem 1.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Certificate &amp; Export View (Light Background #FFFFFF):</span>
                  <div style={{ height: '48px', display: 'flex', alignItems: 'center' }}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo Light Preview" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>No logo loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveAllSettings} disabled={saving} className="btn btn-primary">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Identity & Logo Updates'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: HERO SLIDER MANAGER                               */}
      {/* ========================================================= */}
      {activeTab === 'slider' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>
                Homepage Hero Slider Photos ({adminSlides.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
                Upload high-resolution photography showcasing Pakistan mills, fabric rolls, and garment inspections.
              </p>
            </div>
            <button onClick={() => setShowAddSlide(true)} className="btn btn-primary btn-sm">
              <Plus size={15} /> Upload New Slide Photo
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {adminSlides.map((slide) => (
              <div key={slide.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ height: '190px', backgroundColor: '#020617', position: 'relative' }}>
                  <img src={slide.image_url} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span className="badge badge-in-progress" style={{ position: 'absolute', top: '10px', left: '10px' }}>
                    {slide.badge}
                  </span>
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', marginBottom: '4px' }}>
                    {slide.title}
                  </h4>
                  <p style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '0.85rem' }}>
                    {slide.subtitle}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>CTA: "{slide.button_text}"</span>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenEditSlide(slide)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#0284C7', borderColor: '#BAE6FD', padding: '0.3rem 0.65rem' }}
                        title="Edit Slide Text & Image"
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSlide(slide.id)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#DC2626', padding: '0.3rem 0.65rem' }}
                        title="Delete Slide"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Slide Modal */}
          {showAddSlide && (
            <div className="modal-overlay" onClick={() => setShowAddSlide(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '92vw' }}>
                <div className="modal-header">
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Upload New Slider Image &amp; Copy</h3>
                  <button onClick={() => setShowAddSlide(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddSlide}>
                  <div className="modal-body">
                    {addSlidePreview && (
                      <div style={{ height: '170px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#020617', marginBottom: '1rem', border: '1px solid #CBD5E1' }}>
                        <img src={addSlidePreview} alt="Slide Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Slide Image Photo *</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setSlideFile(file);
                          if (file) {
                            setAddSlidePreview(URL.createObjectURL(file));
                          }
                        }}
                        required
                        style={{ fontSize: '0.85rem' }}
                      />
                      <span className="form-help">Uploaded photo will be saved into <code>media/slider/</code>.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Headline / Title *</label>
                      <input
                        type="text"
                        value={newSlide.title}
                        onChange={(e) => setNewSlide({ ...newSlide, title: e.target.value })}
                        placeholder="e.g. Denim Fabric 4-Point Quality Inspection"
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subheading / Description</label>
                      <textarea
                        rows={2}
                        value={newSlide.subtitle}
                        onChange={(e) => setNewSlide({ ...newSlide, subtitle: e.target.value })}
                        placeholder="e.g. Verified by certified textile engineers at Karachi mills."
                        className="form-textarea"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Badge Label</label>
                        <input
                          type="text"
                          value={newSlide.badge}
                          onChange={(e) => setNewSlide({ ...newSlide, badge: e.target.value })}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Button Text</label>
                        <input
                          type="text"
                          value={newSlide.button_text}
                          onChange={(e) => setNewSlide({ ...newSlide, button_text: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Button Link / Target</label>
                      <input
                        type="text"
                        value={newSlide.button_link}
                        onChange={(e) => setNewSlide({ ...newSlide, button_link: e.target.value })}
                        placeholder="#services, #process, etc."
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={() => setShowAddSlide(false)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? 'Uploading...' : 'Upload & Publish'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Slide Modal */}
          {editingSlide && (
            <div className="modal-overlay" onClick={() => setEditingSlide(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '92vw' }}>
                <div className="modal-header">
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Edit Homepage Slider Slide</h3>
                  <button onClick={() => setEditingSlide(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleUpdateSlide}>
                  <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                    {/* Current Image Preview & Replacement */}
                    <div className="form-group">
                      <label className="form-label">Slide Image Photo</label>
                      {editSlidePreview && (
                        <div style={{ height: '180px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#020617', marginBottom: '0.65rem', border: '1px solid #CBD5E1' }}>
                          <img src={editSlidePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <label className="form-label" style={{ fontSize: '0.8rem', color: '#475569' }}>
                        Replace Image Photo (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setEditSlideFile(file);
                          if (file) {
                            setEditSlidePreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <span className="form-help">Leave empty to keep current photo, or choose a new file to replace it.</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Headline / Title *</label>
                      <input
                        type="text"
                        value={editingSlide.title}
                        onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                        placeholder="e.g. Denim Fabric 4-Point Quality Inspection"
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subheading / Description</label>
                      <textarea
                        rows={2}
                        value={editingSlide.subtitle}
                        onChange={(e) => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                        placeholder="e.g. Verified by certified textile engineers at Karachi mills."
                        className="form-textarea"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Badge Label</label>
                        <input
                          type="text"
                          value={editingSlide.badge}
                          onChange={(e) => setEditingSlide({ ...editingSlide, badge: e.target.value })}
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Button Text</label>
                        <input
                          type="text"
                          value={editingSlide.button_text}
                          onChange={(e) => setEditingSlide({ ...editingSlide, button_text: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">Button Link / Target</label>
                        <input
                          type="text"
                          value={editingSlide.button_link}
                          onChange={(e) => setEditingSlide({ ...editingSlide, button_link: e.target.value })}
                          placeholder="#services, #process, etc."
                          className="form-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Visibility Status</label>
                        <select
                          value={editingSlide.is_active ? '1' : '0'}
                          onChange={(e) => setEditingSlide({ ...editingSlide, is_active: e.target.value === '1' })}
                          className="form-select"
                        >
                          <option value="1">Active (Visible)</option>
                          <option value="0">Draft (Hidden)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" onClick={() => setEditingSlide(null)} className="btn btn-outline">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                      {saving ? 'Saving...' : 'Save & Update Slide'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: LANDING PAGE CONTENT (Hero, Services, Workflow)   */}
      {/* ========================================================= */}
      {activeTab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section A: Hero & Main Tagline */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0F172A' }}>
              1. Hero Section Copy
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Hero Accreditation Badge</label>
                <input
                  type="text"
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  className="form-input"
                  placeholder="e.g. ISO 9001:2015 Accredited Quality Audits"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Hero Main Headline</label>
                <input
                  type="text"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Precision Fabrication Inspection & Mill Quality Auditing"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Hero Subtitle Paragraph</label>
              <textarea
                rows={3}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="form-textarea"
                placeholder="Empowering USA & international apparel buyers with uncompromised on-site quality assurance..."
              />
            </div>
          </div>

          {/* Section B: Core Services Offerings */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0F172A' }}>
              2. Fabrication Services Cards
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
              Customize the titles and descriptions of the 4 core audit services displayed on the homepage.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {servicesContent.map((srv, idx) => (
                <div key={srv.id || idx} style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0284C7', marginBottom: '0.5rem' }}>
                    SERVICE #{idx + 1}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Service Title</label>
                    <input
                      type="text"
                      value={srv.title}
                      onChange={(e) => {
                        const updated = [...servicesContent];
                        updated[idx].title = e.target.value;
                        setServicesContent(updated);
                      }}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea
                      rows={3}
                      value={srv.description}
                      onChange={(e) => {
                        const updated = [...servicesContent];
                        updated[idx].description = e.target.value;
                        setServicesContent(updated);
                      }}
                      className="form-textarea"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section C: Audit Process Workflow Steps */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0F172A' }}>
              3. Inspection Workflow Process (4 Steps)
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
              Define the 4-step workflow explaining how orders transition from USA booking to Pakistan field execution.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
              {processContent.map((step, idx) => (
                <div key={idx} style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#2563EB', marginBottom: '0.5rem' }}>
                    STEP {step.step || `0${idx + 1}`}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Step Headline</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => {
                        const updated = [...processContent];
                        updated[idx].title = e.target.value;
                        setProcessContent(updated);
                      }}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Step Explanation</label>
                    <textarea
                      rows={3}
                      value={step.desc}
                      onChange={(e) => {
                        const updated = [...processContent];
                        updated[idx].desc = e.target.value;
                        setProcessContent(updated);
                      }}
                      className="form-textarea"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section D: Why Choose Us / Conflict-Free QA */}
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: '#0F172A' }}>
              4. "Why Choose Us" / Independent QA Narrative
            </h3>

            <div className="form-group">
              <label className="form-label">Section Heading</label>
              <input
                type="text"
                value={aboutTitle}
                onChange={(e) => setAboutTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Main Narrative Text</label>
              <textarea
                rows={4}
                value={aboutContent}
                onChange={(e) => setAboutContent(e.target.value)}
                className="form-textarea"
              />
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <label className="form-label">Key Value Bullets (Checkmark Points)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {aboutBullets.map((bullet, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => {
                        const updated = [...aboutBullets];
                        updated[i] = e.target.value;
                        setAboutBullets(updated);
                      }}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(i)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#DC2626' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newBulletText}
                  onChange={(e) => setNewBulletText(e.target.value)}
                  placeholder="Add another key assurance bullet point..."
                  className="form-input"
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBullet();
                    }
                  }}
                />
                <button type="button" onClick={handleAddBullet} className="btn btn-outline btn-sm">
                  <Plus size={15} /> Add Point
                </button>
              </div>
            </div>
          </div>

          <button onClick={handleSaveAllSettings} disabled={saving} className="btn btn-primary">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Publish Content Updates'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: TRUST METRICS / STATS BAR                          */}
      {/* ========================================================= */}
      {activeTab === 'stats' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0F172A' }}>
            Trust Metrics Bar (Displayed Directly Below Hero)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Update the 4 prominent KPI proof points displayed to USA buyers on the homepage.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {trustStats.map((st, i) => (
              <div key={i} style={{ padding: '1.25rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0284C7', marginBottom: '0.5rem' }}>
                  METRIC #{i + 1}
                </div>
                <div className="form-group">
                  <label className="form-label">Stat Value (Number / Percentage)</label>
                  <input
                    type="text"
                    value={st.value}
                    onChange={(e) => {
                      const updated = [...trustStats];
                      updated[i].value = e.target.value;
                      setTrustStats(updated);
                    }}
                    placeholder="e.g. 14,800+"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Stat Label</label>
                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => {
                      const updated = [...trustStats];
                      updated[i].label = e.target.value;
                      setTrustStats(updated);
                    }}
                    placeholder="e.g. Inspections Completed"
                    className="form-input"
                  />
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleSaveAllSettings} disabled={saving} className="btn btn-primary">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Update Trust Metrics'}</span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: OPERATIONS CONTACT & WHATSAPP                     */}
      {/* ========================================================= */}
      {activeTab === 'contact' && (
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#0F172A' }}>
            Pakistan Operations Channels &amp; WhatsApp Desk
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
            Configure the direct phone lines, contact emails, and instant WhatsApp click-to-chat links rendered in the header and footer.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Support &amp; PO Inquiries Email *</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telephone / Mill Dispatch Line *</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">WhatsApp Number *</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+92 300 8472910"
                required
                className="form-input"
              />
              <span className="form-help">Include international country code (e.g. +92 for Pakistan).</span>
            </div>

            <div className="form-group">
              <label className="form-label">Default WhatsApp Click-to-Chat Message</label>
              <input
                type="text"
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                placeholder="Hello, I would like to book a third-party fabrication audit in Pakistan."
                className="form-input"
              />
            </div>
          </div>

          <button onClick={handleSaveAllSettings} disabled={saving} className="btn btn-primary">
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Update Contact Information'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
