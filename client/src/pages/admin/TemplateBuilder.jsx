import React, { useState, useEffect } from 'react';
import { templatesApi, defectsApi } from '../../services/api';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Layers, 
  Hash, 
  Camera, 
  ListFilter, 
  AlignLeft, 
  Check, 
  AlertCircle,
  Settings, 
  ChevronDown,
  X,
  Eye,
  Edit3,
  Copy,
  Search,
  ShieldCheck,
  Ruler,
  Table,
  Sliders,
  CheckSquare,
  Sparkles,
  RefreshCw,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

const DEFAULT_DISPOSITIONS = ['Accepted', 'Rejected', 'Hold', 'Conditional Accepted', 'Pending'];

const DEFAULT_SECTIONS = [
  { id: 'disposition', label: '1. Inspection Disposition', enabled: true },
  { id: 'auditor', label: '2. Auditor & Inspection Team', enabled: true },
  { id: 'order_autofill', label: '3. Purchase Order Information', enabled: true },
  { id: 'sampling_plan', label: '4. Sampling Plan Matrix', enabled: true },
  { id: 'defect_findings', label: '5. Defect Inspection & Findings', enabled: true },
  { id: 'dimensional', label: '6. Dimensional & Tolerance Inspection', enabled: true },
  { id: 'aql', label: '7. AQL Acceptance / Rejection Table', enabled: true },
  { id: 'packaging_remarks', label: '8. Packaging & Inspector Remarks', enabled: true },
  { id: 'signatures', label: '9. Signatures & Digital Sign-off', enabled: true }
];

const DEFAULT_AQL_TABLE = [
  { lot_min: 2, lot_max: 500, sample_size: 13, aql_2_5_ac: 1, aql_2_5_re: 2, aql_4_0_ac: 1, aql_4_0_re: 2 },
  { lot_min: 501, lot_max: 3200, sample_size: 50, aql_2_5_ac: 3, aql_2_5_re: 4, aql_4_0_ac: 5, aql_4_0_re: 6 },
  { lot_min: 3201, lot_max: 10000, sample_size: 80, aql_2_5_ac: 5, aql_2_5_re: 6, aql_4_0_ac: 7, aql_4_0_re: 8 },
  { lot_min: 10001, lot_max: 35000, sample_size: 125, aql_2_5_ac: 7, aql_2_5_re: 8, aql_4_0_ac: 10, aql_4_0_re: 11 }
];

const DEFAULT_DIMENSIONAL_SPECS = [
  { param: 'Width', spec: '72"', min: '71.5"', max: '72.5"', unit: 'inch', samples_count: 13 },
  { param: 'Length', spec: '96"', min: '95.0"', max: '97.0"', unit: 'inch', samples_count: 13 },
  { param: 'Drop', spec: '14"', min: '13.5"', max: '14.5"', unit: 'inch', samples_count: 13 },
  { param: 'SPI (Stitches / Inch)', spec: '10', min: '9', max: '11', unit: 'stitches', samples_count: 13 },
  { param: 'Piece Weight', spec: '850', min: '830', max: '870', unit: 'g', samples_count: 13 },
  { param: 'Bale Weight', spec: '45', min: '44', max: '46', unit: 'kg', samples_count: 13 },
  { param: 'Carton Dimensions', spec: '20 x 15.5 x 12', min: '', max: '', unit: 'inch', samples_count: 13 }
];

export function TemplateBuilder() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // Defect Master State
  const [availableDefects, setAvailableDefects] = useState([]);
  const [defectSearch, setDefectSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [showNewDefectModal, setShowNewDefectModal] = useState(false);

  // New Defect Master Modal state
  const [newDefectCode, setNewDefectCode] = useState('');
  const [newDefectName, setNewDefectName] = useState('');
  const [newDefectCategory, setNewDefectCategory] = useState('Fabrication');
  const [newDefectDesc, setNewDefectDesc] = useState('');
  const [newDefectSeverity, setNewDefectSeverity] = useState('Major');

  // Template Form Configuration States
  const [title, setTitle] = useState('');
  const [productType, setProductType] = useState('Woven Denim Fabric & Apparel');
  const [description, setDescription] = useState('');

  // 1. Disposition Config
  const [dispositions, setDispositions] = useState(DEFAULT_DISPOSITIONS);
  const [newDispositionInput, setNewDispositionInput] = useState('');

  // 2. Sections Config
  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  // 3. Auditor & Team Config
  const [auditorFields, setAuditorFields] = useState({
    inspector_name: true,
    inspection_date: true,
    inspection_time: true,
    department: true,
    factory_rep: true,
    qa_rep: true
  });

  // 4. Order Auto-Fill Config (auto | editable | hidden)
  const [orderAutofillRules, setOrderAutofillRules] = useState({
    vendor_supplier: 'auto',
    po_number: 'auto',
    reference_number: 'auto',
    article: 'auto',
    article_quantity: 'auto',
    first_ship_qty: 'auto',
    ready_qty: 'editable',
    short_qty: 'editable',
    factory_name: 'auto',
    factory_city: 'auto'
  });

  // 5. Sampling Plan Config
  const [samplingPlanConfig, setSamplingPlanConfig] = useState({
    lot_size_default: 5000,
    sample_size_default: 80,
    visual_sample_size_aql_4_default: 80,
    visual_sample_size_aql_2_5_default: 80,
    level_default: 'Level I',
    labeling_sample_size_formula: 'sqrt(lot_size) + 1',
    dimensional_sample_size_default: 13
  });

  // 6. Selected Defect Master Codes for this template
  const [selectedDefectCodes, setSelectedDefectCodes] = useState([]);

  // 7. Severity Levels Config
  const [severityLevels, setSeverityLevels] = useState([
    { name: 'Minor', weight: 1, limit: 10, desc: 'Minor visual imperfection' },
    { name: 'Major', weight: 1, limit: 5, desc: 'Functional or noticeable defect' },
    { name: 'Critical', weight: 1, limit: 0, desc: 'Safety or zero-tolerance flaw' }
  ]);

  // 8. Dimensional Inspection Matrix Specs
  const [dimensionalSpecs, setDimensionalSpecs] = useState(DEFAULT_DIMENSIONAL_SPECS);

  // 9. AQL Rules Table
  const [aqlRules, setAqlRules] = useState(DEFAULT_AQL_TABLE);

  // 10. Calculations & Acceptance Engine
  const [calculationRules, setCalculationRules] = useState({
    defect_pct_formula: '(minor + major + critical) / (visual_sample_size_aql_4 + visual_sample_size_aql_2_5) * 100',
    pass_criteria: 'critical === 0 && major <= 5',
    max_acceptable_rate: 2.5
  });

  // 11. Custom Checkpoint Fields (Legacy & flexible fields)
  const [customFields, setCustomFields] = useState([
    {
      field_name: 'broken_stitch_defect',
      field_label: 'Broken / Skipped Stitching Count',
      field_type: 'numeric_defect',
      unit: 'defects',
      is_required: true,
      options: [],
      help_text: 'Count of broken or loose stitches'
    },
    {
      field_name: 'sample_photo',
      field_label: 'Full Garment / Weave Photo',
      field_type: 'image_upload',
      unit: '',
      is_required: true,
      options: [],
      help_text: 'Clear photo on perch table'
    }
  ]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load Templates & Defect Master
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await templatesApi.getTemplates();
      if (res.success) {
        setTemplates(res.templates);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefects = async () => {
    try {
      const res = await defectsApi.getDefects();
      if (res.success) {
        setAvailableDefects(res.defects);
      }
    } catch (err) {
      console.error('Error fetching defect master:', err);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchDefects();
  }, []);

  const resetForm = () => {
    setEditingTemplateId(null);
    setTitle('');
    setProductType('Woven Denim Fabric & Apparel');
    setDescription('');
    setDispositions(DEFAULT_DISPOSITIONS);
    setSections(DEFAULT_SECTIONS);
    setAuditorFields({
      inspector_name: true,
      inspection_date: true,
      inspection_time: true,
      department: true,
      factory_rep: true,
      qa_rep: true
    });
    setOrderAutofillRules({
      vendor_supplier: 'auto',
      po_number: 'auto',
      reference_number: 'auto',
      article: 'auto',
      article_quantity: 'auto',
      first_ship_qty: 'auto',
      ready_qty: 'editable',
      short_qty: 'editable',
      factory_name: 'auto',
      factory_city: 'auto'
    });
    setSamplingPlanConfig({
      lot_size_default: 5000,
      sample_size_default: 80,
      visual_sample_size_aql_4_default: 80,
      visual_sample_size_aql_2_5_default: 80,
      level_default: 'Level I',
      labeling_sample_size_formula: 'sqrt(lot_size) + 1',
      dimensional_sample_size_default: 13
    });
    setSelectedDefectCodes(availableDefects.map(d => d.code));
    setDimensionalSpecs(DEFAULT_DIMENSIONAL_SPECS);
    setAqlRules(DEFAULT_AQL_TABLE);
    setCalculationRules({
      defect_pct_formula: '(minor + major + critical) / (visual_sample_size_aql_4 + visual_sample_size_aql_2_5) * 100',
      pass_criteria: 'critical === 0 && major <= 5',
      max_acceptable_rate: 2.5
    });
    setCustomFields([
      {
        field_name: 'sample_photo',
        field_label: 'Inspection Evidence Photo',
        field_type: 'image_upload',
        unit: '',
        is_required: true,
        options: [],
        help_text: 'Attach clear reference photo'
      }
    ]);
    setActiveTab('general');
    setError('');
  };

  const handleEditTemplate = (tmpl) => {
    setEditingTemplateId(tmpl.id);
    setTitle(tmpl.title || '');
    setProductType(tmpl.product_type || 'Woven Denim Fabric & Apparel');
    setDescription(tmpl.description || '');

    if (Array.isArray(tmpl.disposition_config) && tmpl.disposition_config.length > 0) {
      setDispositions(tmpl.disposition_config);
    } else {
      setDispositions(DEFAULT_DISPOSITIONS);
    }

    if (Array.isArray(tmpl.sections_config) && tmpl.sections_config.length > 0) {
      setSections(tmpl.sections_config);
    } else {
      setSections(DEFAULT_SECTIONS);
    }

    if (tmpl.auditor_config) {
      setAuditorFields(tmpl.auditor_config);
    }

    if (tmpl.order_autofill_config) {
      setOrderAutofillRules(tmpl.order_autofill_config);
    }

    if (tmpl.sampling_plan_config) {
      setSamplingPlanConfig(tmpl.sampling_plan_config);
    }

    if (Array.isArray(tmpl.defect_master_config) && tmpl.defect_master_config.length > 0) {
      setSelectedDefectCodes(tmpl.defect_master_config);
    } else {
      setSelectedDefectCodes(availableDefects.map(d => d.code));
    }

    if (Array.isArray(tmpl.severity_config) && tmpl.severity_config.length > 0) {
      setSeverityLevels(tmpl.severity_config);
    }

    if (Array.isArray(tmpl.dimensional_config) && tmpl.dimensional_config.length > 0) {
      setDimensionalSpecs(tmpl.dimensional_config);
    }

    if (Array.isArray(tmpl.aql_config) && tmpl.aql_config.length > 0) {
      setAqlRules(tmpl.aql_config);
    }

    if (tmpl.calculations_config) {
      setCalculationRules(tmpl.calculations_config);
    }

    if (Array.isArray(tmpl.fields) && tmpl.fields.length > 0) {
      setCustomFields(tmpl.fields);
    }

    setActiveTab('general');
    setShowModal(true);
  };

  // Add new disposition option
  const handleAddDisposition = () => {
    if (!newDispositionInput.trim()) return;
    if (!dispositions.includes(newDispositionInput.trim())) {
      setDispositions([...dispositions, newDispositionInput.trim()]);
    }
    setNewDispositionInput('');
  };

  const handleRemoveDisposition = (disp) => {
    if (dispositions.length <= 1) return;
    setDispositions(dispositions.filter(d => d !== disp));
  };

  // Dimensional specs handler
  const handleAddDimensionalSpec = () => {
    setDimensionalSpecs([
      ...dimensionalSpecs,
      { param: 'New Measurement', spec: '', min: '', max: '', unit: 'inch', samples_count: 13 }
    ]);
  };

  const handleRemoveDimensionalSpec = (idx) => {
    setDimensionalSpecs(dimensionalSpecs.filter((_, i) => i !== idx));
  };

  // AQL rules handler
  const handleAddAQLRule = () => {
    setAqlRules([
      ...aqlRules,
      { lot_min: 35001, lot_max: 150000, sample_size: 200, aql_2_5_ac: 10, aql_2_5_re: 11, aql_4_0_ac: 14, aql_4_0_re: 15 }
    ]);
  };

  const handleRemoveAQLRule = (idx) => {
    setAqlRules(aqlRules.filter((_, i) => i !== idx));
  };

  // Defect Master Creation
  const handleCreateNewDefect = async (e) => {
    e.preventDefault();
    if (!newDefectCode || !newDefectName) return;

    try {
      const res = await defectsApi.createDefect({
        code: parseInt(newDefectCode, 10),
        name: newDefectName,
        category: newDefectCategory,
        description: newDefectDesc,
        severity_default: newDefectSeverity
      });
      if (res.success) {
        await fetchDefects();
        setSelectedDefectCodes(prev => [...prev, parseInt(newDefectCode, 10)]);
        setShowNewDefectModal(false);
        setNewDefectCode('');
        setNewDefectName('');
        setNewDefectDesc('');
      }
    } catch (err) {
      alert(err.message || 'Failed to create defect');
    }
  };

  // Save / Update Template
  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!title) {
      setError('Template title is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      title,
      product_type: productType,
      description,
      disposition_config: dispositions,
      sections_config: sections,
      auditor_config: auditorFields,
      order_autofill_config: orderAutofillRules,
      sampling_plan_config: samplingPlanConfig,
      defect_master_config: selectedDefectCodes,
      severity_config: severityLevels,
      calculations_config: calculationRules,
      aql_config: aqlRules,
      dimensional_config: dimensionalSpecs,
      fields: customFields.map((f, idx) => ({ ...f, sort_order: idx + 1 }))
    };

    try {
      let res;
      if (editingTemplateId) {
        res = await templatesApi.updateTemplate(editingTemplateId, payload);
      } else {
        res = await templatesApi.createTemplate(payload);
      }

      if (res.success) {
        fetchTemplates();
        setShowModal(false);
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Failed to save template.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tmpl) => {
    const confirmMsg = `Are you sure you want to delete template "${tmpl.title}"?\n\n${
      tmpl.usage_count > 0 
        ? `Note: This template is referenced in ${tmpl.usage_count} past inspection sheet(s). It will be archived safely to preserve historical audit reports.` 
        : 'This template will be permanently removed from the system.'
    }`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      const res = await templatesApi.deleteTemplate(tmpl.id);
      if (res && res.success) {
        await fetchTemplates();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete template.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDefects = availableDefects.filter(d => {
    const matchesCategory = selectedCategoryFilter === 'All' || d.category === selectedCategoryFilter;
    const matchesSearch = !defectSearch || 
      d.name.toLowerCase().includes(defectSearch.toLowerCase()) || 
      String(d.code).includes(defectSearch);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div className="mobile-hide-heading">
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
            Inspection Template Builder
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#64748B' }}>
            Build highly configurable audit forms capable of producing comprehensive reports with PO auto-fill, Defect Master, Sampling Plans &amp; Dimensional matrices.
          </p>
        </div>

        <div className="order-header-actions mobile-actions-row">
          <button onClick={fetchTemplates} className="btn btn-outline btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span className="btn-text-full">Create New Template</span>
            <span className="btn-text-short">New Template</span>
          </button>
        </div>
      </div>

      {/* Templates List Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="card-header" style={{ backgroundColor: '#F8FAFC' }}>
                <div>
                  <span className="badge badge-in-progress" style={{ marginBottom: '4px' }}>
                    {tmpl.product_type}
                  </span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
                    {tmpl.title}
                  </h3>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                  v{tmpl.version}.0
                </span>
              </div>

              <div className="card-body">
                {tmpl.description && (
                  <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {tmpl.description}
                  </p>
                )}

                {/* Key Configuration Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#EFF6FF', color: '#1E40AF', borderRadius: '4px', fontWeight: 600 }}>
                    🏷️ {Array.isArray(tmpl.disposition_config) ? tmpl.disposition_config.length : 5} Dispositions
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '4px', fontWeight: 600 }}>
                    🐛 {Array.isArray(tmpl.defect_master_config) && tmpl.defect_master_config.length > 0 ? tmpl.defect_master_config.length : 55} Defect Codes
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: '4px', fontWeight: 600 }}>
                    📏 {Array.isArray(tmpl.dimensional_config) ? tmpl.dimensional_config.length : 7} Measurements
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#F3E8FF', color: '#6B21A8', borderRadius: '4px', fontWeight: 600 }}>
                    📊 AQL 2.5 / 4.0 Tables
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', backgroundColor: '#F8FAFC', padding: '0.6rem 0.75rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>PO Auto-Fill:</span>
                    <strong style={{ color: '#16A34A' }}>Enabled (Vendor, PO, Art, Qty)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sampling Plan:</span>
                    <strong>Level I (AQL 4.0 &amp; 2.5)</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #F1F5F9', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Used in {tmpl.usage_count || 0} inspections
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleEditTemplate(tmpl)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                >
                  <Edit3 size={13} />
                  <span>Configure</span>
                </button>
                <button
                  onClick={() => handleDeleteTemplate(tmpl)}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#DC2626', borderColor: '#FECACA' }}
                  title="Delete template"
                >
                  <Trash2 size={13} color="#DC2626" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Full-Screen Template Builder Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '1380px', width: '96vw', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}
          >
            {/* Modal Header */}
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #E2E8F0', backgroundColor: '#0F172A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(2, 132, 199, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} color="#38BDF8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                    {editingTemplateId ? 'Configure Inspection Template' : 'Create Advanced Inspection Template'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Functional Engine matching industrial inspection reporting standards
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '0.35rem 1rem' }}>
              {[
                { id: 'general', label: 'General & Sections', icon: FileText },
                { id: 'disposition', label: '1. Disposition', icon: ShieldCheck },
                { id: 'autofill', label: '2. PO Auto-Fill', icon: CheckSquare },
                { id: 'sampling', label: '3. Sampling Plan', icon: Table },
                { id: 'defects', label: '4. Defect Master', icon: AlertCircle },
                { id: 'dimensional', label: '5. Dimensions', icon: Ruler },
                { id: 'aql', label: '6. AQL & Calc', icon: Sliders },
                { id: 'custom_fields', label: '7. Custom Fields', icon: ListFilter },
                { id: 'preview', label: 'Live Preview', icon: Eye }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.75rem 0.9rem',
                      border: 'none',
                      backgroundColor: 'transparent',
                      borderBottom: isActive ? '3px solid #0284C7' : '3px solid transparent',
                      color: isActive ? '#0284C7' : '#64748B',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Tabs Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, backgroundColor: '#FFFFFF' }}>
              {error && (
                <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              {/* TAB 1: General & Sections */}
              {activeTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Template Title *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fabric & Garment Inspection Standard (Excel Reference)"
                        required
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Product Category *</label>
                      <select
                        value={productType}
                        onChange={(e) => setProductType(e.target.value)}
                        className="form-select"
                      >
                        <option value="Woven Denim Fabric & Apparel">Woven Denim Fabric &amp; Apparel</option>
                        <option value="Knitwear & Combed Cotton Apparel">Knitwear &amp; Combed Cotton Apparel</option>
                        <option value="Greige Yarn & Mill Cones">Greige Yarn &amp; Mill Cones</option>
                        <option value="Home Textile & Terry Towels">Home Textile &amp; Terry Towels</option>
                        <option value="Industrial Woven Duck & Canvas">Industrial Woven Duck &amp; Canvas</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Protocol Description / Methodology</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Comprehensive inspection methodology covering visual defect sampling, dimensional verification, and digital sign-off..."
                      className="form-textarea"
                    />
                  </div>

                  {/* Section Toggles */}
                  <div style={{ marginTop: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                      Template Report Sections (Enable / Order)
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                      {sections.map((sec, i) => (
                        <div 
                          key={sec.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            fontSize: '0.8rem'
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#1E293B' }}>{sec.label}</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={sec.enabled}
                              onChange={(e) => {
                                const updated = [...sections];
                                updated[i].enabled = e.target.checked;
                                setSections(updated);
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', color: sec.enabled ? '#16A34A' : '#94A3B8' }}>
                              {sec.enabled ? 'Active' : 'Hidden'}
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Disposition Config */}
              {activeTab === 'disposition' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '0.85rem', borderRadius: '6px', fontSize: '0.8rem', color: '#0369A1' }}>
                    <strong>Configurable Disposition Banner:</strong> At the top of every inspection, auditors select the final verdict. Customize the available status badges below:
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Add custom status (e.g. Conditional Accepted, Lab Pending, Rework Required)..."
                      value={newDispositionInput}
                      onChange={(e) => setNewDispositionInput(e.target.value)}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDisposition}
                      className="btn btn-primary"
                    >
                      <Plus size={16} /> Add Status
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {dispositions.map((disp) => {
                      let bg = '#64748B';
                      if (disp.toLowerCase().includes('accept')) bg = '#16A34A';
                      if (disp.toLowerCase().includes('reject')) bg = '#DC2626';
                      if (disp.toLowerCase().includes('hold')) bg = '#D97706';
                      if (disp.toLowerCase().includes('conditional')) bg = '#0284C7';

                      return (
                        <div 
                          key={disp}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: bg,
                            color: '#FFFFFF',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          <span>{disp}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDisposition(disp)}
                            style={{ background: 'transparent', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: PO Auto-Fill & Auditor */}
              {activeTab === 'autofill' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.85rem', borderRadius: '6px', fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Order &amp; PO Auto-Fill Rules:</strong> When an inspection is conducted against a purchase order, specify which fields are automatically loaded from the database:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                    {Object.entries(orderAutofillRules).map(([fieldKey, rule]) => (
                      <div 
                        key={fieldKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.75rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px'
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B', textTransform: 'capitalize' }}>
                          {fieldKey.replace(/_/g, ' ')}
                        </span>
                        <select
                          value={rule}
                          onChange={(e) => {
                            setOrderAutofillRules({
                              ...orderAutofillRules,
                              [fieldKey]: e.target.value
                            });
                          }}
                          className="form-select"
                          style={{ width: '130px', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <option value="auto">Auto-Fetched</option>
                          <option value="editable">Editable</option>
                          <option value="hidden">Hidden</option>
                        </select>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                      Auditor &amp; Team Fields
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem' }}>
                      {Object.entries(auditorFields).map(([k, val]) => (
                        <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => {
                              setAuditorFields({ ...auditorFields, [k]: e.target.checked });
                            }}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Sampling Plan Builder */}
              {activeTab === 'sampling' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.85rem', borderRadius: '6px', fontSize: '0.8rem', color: '#166534' }}>
                    <strong>Sampling Plan Configuration:</strong> Configurable parameters for AQL 2.5 and AQL 4.0 visual inspections, labeling square root checks, and dimensional matrix sizes:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Visual Sample Size (AQL 4.0)</label>
                      <input
                        type="number"
                        value={samplingPlanConfig.visual_sample_size_aql_4_default}
                        onChange={(e) => setSamplingPlanConfig({ ...samplingPlanConfig, visual_sample_size_aql_4_default: parseInt(e.target.value, 10) || 0 })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Visual Sample Size (AQL 2.5)</label>
                      <input
                        type="number"
                        value={samplingPlanConfig.visual_sample_size_aql_2_5_default}
                        onChange={(e) => setSamplingPlanConfig({ ...samplingPlanConfig, visual_sample_size_aql_2_5_default: parseInt(e.target.value, 10) || 0 })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Inspection Level</label>
                      <select
                        value={samplingPlanConfig.level_default}
                        onChange={(e) => setSamplingPlanConfig({ ...samplingPlanConfig, level_default: e.target.value })}
                        className="form-select"
                      >
                        <option value="Level I">Level I (Normal Inspection)</option>
                        <option value="Level II">Level II (General Standard)</option>
                        <option value="Level III">Level III (Tightened)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dimensional Sample Count (Matrix)</label>
                      <input
                        type="number"
                        value={samplingPlanConfig.dimensional_sample_size_default}
                        onChange={(e) => setSamplingPlanConfig({ ...samplingPlanConfig, dimensional_sample_size_default: parseInt(e.target.value, 10) || 0 })}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Defect Master Builder */}
              {activeTab === 'defects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                        Defect Master Library ({availableDefects.length} Seeded Industrial Codes)
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                        Select which defect codes are active in this template or add new customized defect definitions.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedDefectCodes(availableDefects.map(d => d.code))}
                        className="btn btn-outline btn-sm"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewDefectModal(true)}
                        className="btn btn-primary btn-sm"
                      >
                        <Plus size={14} /> Add New Defect Code
                      </button>
                    </div>
                  </div>

                  {/* Search & Category Filter */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
                      <input
                        type="text"
                        placeholder="Search defect code or name (e.g. Broken Yarn, Needle Damage, Lot to Lot)..."
                        value={defectSearch}
                        onChange={(e) => setDefectSearch(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
                      />
                    </div>

                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="form-select"
                      style={{ width: '180px', fontSize: '0.8rem' }}
                    >
                      <option value="All">All Categories</option>
                      <option value="Fabrication">Fabrication</option>
                      <option value="Processing & Trims">Processing &amp; Trims</option>
                      <option value="Stitching & Packing">Stitching &amp; Packing</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  {/* Defect Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredDefects.map(defect => {
                      const isSelected = selectedDefectCodes.includes(defect.code);
                      return (
                        <div
                          key={defect.id || defect.code}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDefectCodes(selectedDefectCodes.filter(c => c !== defect.code));
                            } else {
                              setSelectedDefectCodes([...selectedDefectCodes, defect.code]);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            border: isSelected ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
                            backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              backgroundColor: '#0F172A', 
                              color: '#FFFFFF', 
                              padding: '2px 6px', 
                              borderRadius: '4px',
                              fontFamily: 'var(--font-mono)' 
                            }}>
                              #{defect.code}
                            </span>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
                                {defect.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                {defect.category}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 5px',
                              borderRadius: '4px',
                              backgroundColor: defect.severity_default === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                              color: defect.severity_default === 'Critical' ? '#991B1B' : '#92400E'
                            }}>
                              {defect.severity_default || 'Major'}
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: Dimensional Specs */}
              {activeTab === 'dimensional' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                        Dimensional &amp; Tolerance Inspection Matrix
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                        Configure the parameters measured across 13 sample garments/fabric rolls (e.g. Width, Length, SPI, Bale Weight).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddDimensionalSpec}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={14} /> Add Parameter
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {dimensionalSpecs.map((spec, idx) => (
                      <div 
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                          gap: '0.5rem',
                          alignItems: 'center',
                          backgroundColor: '#F8FAFC',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <input
                          type="text"
                          value={spec.param}
                          onChange={(e) => {
                            const updated = [...dimensionalSpecs];
                            updated[idx].param = e.target.value;
                            setDimensionalSpecs(updated);
                          }}
                          placeholder="Parameter Name (e.g. Width)"
                          className="form-input"
                          style={{ fontSize: '0.8rem', fontWeight: 600 }}
                        />

                        <input
                          type="text"
                          value={spec.spec}
                          onChange={(e) => {
                            const updated = [...dimensionalSpecs];
                            updated[idx].spec = e.target.value;
                            setDimensionalSpecs(updated);
                          }}
                          placeholder="Spec (e.g. 72 inch)"
                          className="form-input"
                          style={{ fontSize: '0.8rem' }}
                        />

                        <input
                          type="text"
                          value={spec.min}
                          onChange={(e) => {
                            const updated = [...dimensionalSpecs];
                            updated[idx].min = e.target.value;
                            setDimensionalSpecs(updated);
                          }}
                          placeholder="Min Tol"
                          className="form-input"
                          style={{ fontSize: '0.8rem' }}
                        />

                        <input
                          type="text"
                          value={spec.max}
                          onChange={(e) => {
                            const updated = [...dimensionalSpecs];
                            updated[idx].max = e.target.value;
                            setDimensionalSpecs(updated);
                          }}
                          placeholder="Max Tol"
                          className="form-input"
                          style={{ fontSize: '0.8rem' }}
                        />

                        <input
                          type="text"
                          value={spec.unit}
                          onChange={(e) => {
                            const updated = [...dimensionalSpecs];
                            updated[idx].unit = e.target.value;
                            setDimensionalSpecs(updated);
                          }}
                          placeholder="Unit"
                          className="form-input"
                          style={{ fontSize: '0.8rem' }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveDimensionalSpec(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: AQL & Calculations */}
              {activeTab === 'aql' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                        Configurable AQL Acceptance / Rejection Table
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                        Defines lot size ranges, required sample size, and Accept (Ac) / Reject (Re) criteria.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAQLRule}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={14} /> Add Lot Range
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                          <th style={{ padding: '0.5rem' }}>Lot Min</th>
                          <th style={{ padding: '0.5rem' }}>Lot Max</th>
                          <th style={{ padding: '0.5rem' }}>Sample Size</th>
                          <th style={{ padding: '0.5rem' }}>AQL 2.5 (Ac)</th>
                          <th style={{ padding: '0.5rem' }}>AQL 2.5 (Re)</th>
                          <th style={{ padding: '0.5rem' }}>AQL 4.0 (Ac)</th>
                          <th style={{ padding: '0.5rem' }}>AQL 4.0 (Re)</th>
                          <th style={{ padding: '0.5rem' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aqlRules.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'center' }}>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.lot_min}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].lot_min = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '80px', padding: '0.2rem', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.lot_max}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].lot_max = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '80px', padding: '0.2rem', textAlign: 'center' }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.sample_size}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].sample_size = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '70px', padding: '0.2rem', textAlign: 'center', fontWeight: 700 }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.aql_2_5_ac}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].aql_2_5_ac = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '60px', padding: '0.2rem', textAlign: 'center', color: '#16A34A', fontWeight: 700 }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.aql_2_5_re}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].aql_2_5_re = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '60px', padding: '0.2rem', textAlign: 'center', color: '#DC2626', fontWeight: 700 }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.aql_4_0_ac}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].aql_4_0_ac = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '60px', padding: '0.2rem', textAlign: 'center', color: '#16A34A', fontWeight: 700 }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <input
                                type="number"
                                value={row.aql_4_0_re}
                                onChange={(e) => {
                                  const updated = [...aqlRules];
                                  updated[idx].aql_4_0_re = parseInt(e.target.value, 10);
                                  setAqlRules(updated);
                                }}
                                className="form-input"
                                style={{ width: '60px', padding: '0.2rem', textAlign: 'center', color: '#DC2626', fontWeight: 700 }}
                              />
                            </td>
                            <td style={{ padding: '0.4rem' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveAQLRule(idx)}
                                style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 8: Custom Fields */}
              {activeTab === 'custom_fields' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                        Custom Checkpoints &amp; Attachments
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                        Add ad-hoc inspection fields such as photo uploads, packaging checks, or custom textareas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomFields([
                          ...customFields,
                          {
                            field_name: `field_${customFields.length + 1}`,
                            field_label: `New Checkpoint ${customFields.length + 1}`,
                            field_type: 'image_upload',
                            unit: '',
                            is_required: false,
                            options: [],
                            help_text: ''
                          }
                        ]);
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus size={14} /> Add Field
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {customFields.map((f, idx) => (
                      <div 
                        key={idx}
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={f.field_label}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[idx].field_label = e.target.value;
                              setCustomFields(updated);
                            }}
                            placeholder="Field Label"
                            className="form-input"
                            style={{ fontSize: '0.85rem', fontWeight: 600 }}
                          />

                          <select
                            value={f.field_type}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[idx].field_type = e.target.value;
                              setCustomFields(updated);
                            }}
                            className="form-select"
                            style={{ fontSize: '0.85rem' }}
                          >
                            <option value="image_upload">Photo / Evidence Upload</option>
                            <option value="numeric_defect">Numeric Defect (Auto %)</option>
                            <option value="measurement_text">Measurement / Text</option>
                            <option value="dropdown_defect">Dropdown Selection</option>
                            <option value="textarea">Inspector Textarea</option>
                          </select>

                          <input
                            type="text"
                            value={f.unit || ''}
                            onChange={(e) => {
                              const updated = [...customFields];
                              updated[idx].unit = e.target.value;
                              setCustomFields(updated);
                            }}
                            placeholder="Unit (e.g. in, cm)"
                            className="form-input"
                            style={{ fontSize: '0.85rem' }}
                          />

                          <button
                            type="button"
                            onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 9: Live Interactive Preview */}
              {activeTab === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  {/* Title & Banner Preview */}
                  <div style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '1rem', borderRadius: '6px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                      {title || 'Untitled Inspection Template'}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                      {productType} | Third-Party Conformance Protocol
                    </p>
                  </div>

                  {/* Disposition Bar Preview */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Disposition:</span>
                    {dispositions.map((d, i) => (
                      <span key={d} style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: i === 0 ? '#16A34A' : '#F1F5F9',
                        color: i === 0 ? '#FFFFFF' : '#475569',
                        border: '1px solid #CBD5E1'
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>

                  {/* 3-Column Preview Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>1. General Information</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.4rem', lineHeight: 1.6 }}>
                        Factory: [Auto-Fetched]<br />
                        Auditor: [Auto-Assigned Inspector]<br />
                        Date: [Today's Timestamp]
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>2. Purchase Order Info</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.4rem', lineHeight: 1.6 }}>
                        PO #: [Auto-Fetched from Order]<br />
                        Article: [Auto-Fetched from Order]<br />
                        Quantity: [Auto-Fetched from Order]
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>3. Sampling Plan</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.4rem', lineHeight: 1.6 }}>
                        Visual AQL 4.0: {samplingPlanConfig.visual_sample_size_aql_4_default} pcs<br />
                        Visual AQL 2.5: {samplingPlanConfig.visual_sample_size_aql_2_5_default} pcs<br />
                        Level: {samplingPlanConfig.level_default}
                      </div>
                    </div>
                  </div>

                  {/* Defect Master Codes Summary */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>4. Defect Findings Section</strong>
                      <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 600 }}>
                        {selectedDefectCodes.length} Defect Codes Configured
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Inspectors will select any configured defect code from the master lookup, log Minor/Major/Critical counts, auto-compute defect %, upload photos, and compare with reference standards.
                    </div>
                  </div>

                  {/* Dimensional Preview */}
                  <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>5. Dimensional Matrix (13 Samples)</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {dimensionalSpecs.map((d, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#F1F5F9', borderRadius: '4px', color: '#334155' }}>
                          {d.param} ({d.spec || 'spec'})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={() => {
                      const curTmpl = templates.find(t => t.id === editingTemplateId);
                      if (curTmpl) {
                        handleDeleteTemplate(curTmpl);
                        setShowModal(false);
                      }
                    }}
                    className="btn btn-outline"
                    style={{ color: '#DC2626', borderColor: '#FECACA' }}
                    title="Delete template"
                  >
                    <Trash2 size={15} color="#DC2626" />
                    <span>Delete Template</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={submitting}
                className="btn btn-primary"
              >
                <Check size={16} />
                <span>{submitting ? 'Saving Template...' : (editingTemplateId ? 'Update Template' : 'Save Reusable Template')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Defect Master Creation Modal */}
      {showNewDefectModal && (
        <div className="modal-overlay" onClick={() => setShowNewDefectModal(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '480px' }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Add New Defect to Master Library
              </h3>
              <button 
                onClick={() => setShowNewDefectModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewDefect}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Code # *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 56"
                      value={newDefectCode}
                      onChange={(e) => setNewDefectCode(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Defect Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Selvage Curling"
                      value={newDefectName}
                      onChange={(e) => setNewDefectName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      value={newDefectCategory}
                      onChange={(e) => setNewDefectCategory(e.target.value)}
                      className="form-select"
                    >
                      <option value="Fabrication">Fabrication</option>
                      <option value="Processing & Trims">Processing &amp; Trims</option>
                      <option value="Stitching & Packing">Stitching &amp; Packing</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Severity</label>
                    <select
                      value={newDefectSeverity}
                      onChange={(e) => setNewDefectSeverity(e.target.value)}
                      className="form-select"
                    >
                      <option value="Minor">Minor</option>
                      <option value="Major">Major</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Instructions / Description</label>
                  <textarea
                    rows={2}
                    value={newDefectDesc}
                    onChange={(e) => setNewDefectDesc(e.target.value)}
                    placeholder="Instructions for field auditors when identifying this flaw..."
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowNewDefectModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Check size={16} /> Save Defect Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
