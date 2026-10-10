import React, { useState, useEffect, useRef } from 'react';
import { inspectionsApi, defectsApi, reportApi } from '../../services/api';
import { compressImage } from '../../utils/imageCompressor';
import { openPdfViewer } from '../../components/PdfReportViewerModal';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Camera, 
  MapPin, 
  Phone, 
  Building, 
  Hash, 
  Percent, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Plus, 
  Minus, 
  RefreshCw,
  Image as ImageIcon,
  FileSpreadsheet,
  FileText,
  Search,
  X,
  Check,
  ShieldCheck,
  Trash2,
  Ruler,
  Sliders,
  Eye,
  ChevronDown,
  ChevronUp,
  Edit2
} from 'lucide-react';

export function InspectionSheetRunner({ sheetId, onBack, onOpenPhoto }) {
  const [sheet, setSheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // 1. Disposition
  const [disposition, setDisposition] = useState('Pending');

  // 2. General & Auditor Info
  const [generalInfo, setGeneralInfo] = useState({
    inspector_name: '',
    inspection_date: '',
    inspection_time: '',
    department: 'Quality Assurance',
    factory_rep: '',
    qa_rep: 'Apex Quality Directorate'
  });

  // 3. PO Information
  const [orderInfo, setOrderInfo] = useState({
    vendor_supplier: '',
    po_number: '',
    reference_number: '',
    article: '',
    article_quantity: 0,
    first_ship_qty: 0,
    ready_qty: 0,
    short_qty: 0
  });

  // 4. Sampling Plan
  const [samplingPlan, setSamplingPlan] = useState({
    lot_size: 5000,
    sample_size: 80,
    visual_sample_size_aql_4: 80,
    visual_sample_size_aql_2_5: 80,
    aql_level: 'Level I',
    labeling_sample_size: 13,
    dimensional_sample_size: 13
  });

  // 5. Defect Findings List
  const [defectFindings, setDefectFindings] = useState([]);
  const [availableDefects, setAvailableDefects] = useState([]);
  const [showDefectPicker, setShowDefectPicker] = useState(false);
  const [defectSearch, setDefectSearch] = useState('');
  const [defectCategoryFilter, setDefectCategoryFilter] = useState('All');
  // Mobile Defect Cards expanded index: null means all collapsed, number means active single card
  const [activeDefectCardIdx, setActiveDefectCardIdx] = useState(null);

  // 6. Dimensional Inspection (13 Samples)
  const [dimensionalData, setDimensionalData] = useState([]);

  // 7. Packaging & General Remarks
  const [packagingRemarks, setPackagingRemarks] = useState('');
  const [employeeNotes, setEmployeeNotes] = useState('');

  // 8. Signatures & Digital Sign-off
  const [signatures, setSignatures] = useState({
    auditor_signed: false,
    factory_rep_name: '',
    factory_rep_signed: false,
    qa_rep_signed: false
  });

  // Photo upload state
  const [uploadingFindingPhotoIdx, setUploadingFindingPhotoIdx] = useState(null);
  const [referenceModalImage, setReferenceModalImage] = useState(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const hasStartedRef = useRef(false);

  // Load inspection and defect library
  const loadInspection = async () => {
    setLoading(true);
    try {
      const [res, defectsRes] = await Promise.all([
        inspectionsApi.getInspectionById(sheetId),
        defectsApi.getDefects()
      ]);

      if (defectsRes.success) {
        setAvailableDefects(defectsRes.defects || []);
      }

      if (res.success) {
        const s = res.inspection;
        setSheet(s);
        setDisposition(s.disposition || 'Pending');

        if (s.general_info_data) setGeneralInfo(s.general_info_data);
        if (s.order_autofill_data) setOrderInfo(s.order_autofill_data);
        if (s.sampling_plan_data) setSamplingPlan(s.sampling_plan_data);
        if (s.packaging_remarks) setPackagingRemarks(s.packaging_remarks);
        if (s.employee_notes) setEmployeeNotes(s.employee_notes);
        if (s.signatures_data) setSignatures(s.signatures_data);

        // Load defect findings
        if (Array.isArray(s.defect_findings_data)) {
          setDefectFindings(s.defect_findings_data);
        }

        // Load dimensional data
        if (Array.isArray(s.dimensional_data) && s.dimensional_data.length > 0) {
          setDimensionalData(s.dimensional_data);
        } else if (Array.isArray(s.dimensional_config) && s.dimensional_config.length > 0) {
          setDimensionalData(s.dimensional_config.map(dim => ({
            param: dim.param || '',
            spec: dim.spec || '',
            min: dim.min || '',
            max: dim.max || '',
            unit: dim.unit || 'inch',
            samples: Array(dim.samples_count || 13).fill(''),
            pass_fail: 'Pass',
            remarks: ''
          })));
        }

        // Trigger 'In Progress' status when opened (guard against React double-render / mount)
        if ((s.status === 'Not Started' || s.status === 'Needs Re-inspection') && !hasStartedRef.current) {
          hasStartedRef.current = true;
          await inspectionsApi.startInspection(sheetId);
        }
      }
    } catch (err) {
      setError('Failed to load inspection sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasStartedRef.current = false;
    loadInspection();
  }, [sheetId]);

  // Denominator calculation for percentages
  const getDenominator = () => {
    const aql4 = parseInt(samplingPlan.visual_sample_size_aql_4 || 0, 10);
    const aql25 = parseInt(samplingPlan.visual_sample_size_aql_2_5 || 0, 10);
    if (aql4 + aql25 > 0) return aql4 + aql25;
    return parseInt(samplingPlan.sample_size || 80, 10) || 1;
  };

  // Add Defect Finding from library
  const handleSelectDefectFromLibrary = (defect) => {
    // Check if defect already in findings
    const existsIndex = defectFindings.findIndex(f => f.defect_code === defect.code);
    if (existsIndex !== -1) {
      setActiveDefectCardIdx(existsIndex);
      setShowDefectPicker(false);
      return;
    }

    const denom = getDenominator();
    const newFinding = {
      defect_id: defect.id,
      defect_code: defect.code,
      defect_name: defect.name,
      category: defect.category,
      reference_images: defect.reference_images || [],
      minor_count: 0,
      major_count: defect.severity_default === 'Major' ? 1 : 0,
      critical_count: defect.severity_default === 'Critical' ? 1 : 0,
      total_count: 1,
      percentage: parseFloat(((1 / denom) * 100).toFixed(2)),
      remarks: '',
      images: []
    };

    const newIdx = defectFindings.length;
    setDefectFindings([...defectFindings, newFinding]);
    // Automatically open this newly added defect as the active single card on mobile
    setActiveDefectCardIdx(newIdx);
    setShowDefectPicker(false);
  };

  // Step count by +/-1 for mobile touch buttons
  const handleStepFindingCount = (index, severityKey, delta) => {
    const cur = parseInt(defectFindings[index]?.[severityKey] || 0, 10) || 0;
    const next = Math.max(0, cur + delta);
    handleUpdateFindingCount(index, severityKey, next);
  };

  // Mobile Single Card Accordion controls
  const handleToggleDefectCard = (index) => {
    setActiveDefectCardIdx(prev => (prev === index ? null : index));
  };

  const handleCollapseDefectCard = () => {
    setActiveDefectCardIdx(null);
  };

  const handleRemoveFindingPhoto = (defectIdx, photoIdx) => {
    const finding = defectFindings[defectIdx];
    if (!finding || !Array.isArray(finding.images)) return;
    const removedUrl = finding.images[photoIdx];
    if (removedUrl) {
      inspectionsApi.deletePhotos(sheetId, [removedUrl]).catch(err => {
        console.warn('Failed to delete photo:', err);
      });
    }
    setDefectFindings(prev => prev.map((f, i) =>
      i === defectIdx
        ? { ...f, images: (Array.isArray(f.images) ? f.images : []).filter((_, k) => k !== photoIdx) }
        : f
    ));
  };

  // Update Defect Finding counts
  const handleUpdateFindingCount = (index, severityKey, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    const updated = [...defectFindings];
    updated[index][severityKey] = num;

    const minor = updated[index].minor_count || 0;
    const major = updated[index].major_count || 0;
    const critical = updated[index].critical_count || 0;
    const lineTotal = minor + major + critical;

    const denom = getDenominator();
    updated[index].total_count = lineTotal;
    updated[index].percentage = parseFloat(((lineTotal / denom) * 100).toFixed(2));

    setDefectFindings(updated);
  };

  const handleUpdateFindingRemarks = (index, remarks) => {
    const updated = [...defectFindings];
    updated[index].remarks = remarks;
    setDefectFindings(updated);
  };

  const handleUpdateFindingName = (index, name) => {
    const updated = [...defectFindings];
    updated[index].defect_name = name;
    updated[index].user_input = name;
    setDefectFindings(updated);
  };

  const handleAddCustomFinding = () => {
    const denom = getDenominator();
    const nextCode = String(defectFindings.length + 1);
    const newFinding = {
      defect_id: null,
      defect_code: nextCode,
      defect_name: '',
      user_input: '',
      category: 'General',
      reference_images: [],
      minor_count: 1,
      major_count: 0,
      critical_count: 0,
      total_count: 1,
      percentage: parseFloat(((1 / denom) * 100).toFixed(2)),
      remarks: '',
      images: []
    };
    const newIdx = defectFindings.length;
    setDefectFindings([...defectFindings, newFinding]);
    setActiveDefectCardIdx(newIdx);
  };

  const handleRemoveFinding = (index) => {
    const removed = defectFindings[index];
    const imageUrls = Array.isArray(removed?.images) ? removed.images.filter(Boolean) : [];
    if (imageUrls.length > 0) {
      inspectionsApi.deletePhotos(sheetId, imageUrls).catch(err => {
        console.warn('Failed to delete defect photos:', err);
      });
    }
    setDefectFindings(defectFindings.filter((_, i) => i !== index));
    if (activeDefectCardIdx === index) {
      setActiveDefectCardIdx(null);
    } else if (activeDefectCardIdx > index) {
      setActiveDefectCardIdx(activeDefectCardIdx - 1);
    }
  };

  // Handle Finding Photo Upload (supports single or multiple files with ultra-fast client-side compression)
  const handleUploadFindingPhoto = async (index, filesInput) => {
    if (!filesInput) return;
    const fileList = Array.isArray(filesInput)
      ? filesInput
      : filesInput instanceof FileList
        ? Array.from(filesInput)
        : [filesInput];

    if (fileList.length === 0) return;

    try {
      setUploadingFindingPhotoIdx(index);
      const finding = defectFindings[index];

      for (const rawFile of fileList) {
        if (!rawFile) continue;

        // 1. Client-side ultra-fast compression (drops 10MB camera photo to ~250KB in ~100ms)
        let optimizedFile = rawFile;
        try {
          optimizedFile = await compressImage(rawFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
        } catch (compErr) {
          console.warn('Client compression warning, using original file:', compErr);
        }

        // 2. Upload to server
        const formData = new FormData();
        formData.append('photo', optimizedFile);
        formData.append('defect_code', finding.defect_code);
        formData.append('defect_name', finding.defect_name);
        formData.append('defect_tag', `Defect #${finding.defect_code}: ${finding.defect_name}`);

        const res = await inspectionsApi.uploadPhoto(sheetId, formData);
        if (res.success && res.photo?.photo_url) {
          const newUrl = res.photo.photo_url;
          setDefectFindings(prevFindings => prevFindings.map((f, i) => {
            if (i !== index) return f;
            const existing = Array.isArray(f.images) ? f.images : [];
            if (existing.includes(newUrl)) return f;
            return { ...f, images: [...existing, newUrl] };
          }));
        }
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingFindingPhotoIdx(null);
    }
  };

  // Dimensional Sample matrix change
  const handleDimensionalSampleChange = (paramIdx, sampleIdx, val) => {
    const updated = [...dimensionalData];
    if (!Array.isArray(updated[paramIdx].samples)) {
      updated[paramIdx].samples = Array(13).fill('');
    }
    updated[paramIdx].samples[sampleIdx] = val;

    // Check tolerance
    const minVal = parseFloat(updated[paramIdx].min);
    const maxVal = parseFloat(updated[paramIdx].max);
    let allPass = true;

    if (!isNaN(minVal) && !isNaN(maxVal)) {
      for (const s of updated[paramIdx].samples) {
        if (s !== '' && s !== undefined && s !== null) {
          const numS = parseFloat(s);
          if (!isNaN(numS)) {
            if (numS < minVal || numS > maxVal) {
              allPass = false;
              break;
            }
          }
        }
      }
    }
    updated[paramIdx].pass_fail = allPass ? 'Pass' : 'Out of Tol';
    setDimensionalData(updated);
  };

  // Calculated Defect Totals
  const totalMinor = defectFindings.reduce((sum, f) => sum + (parseInt(f.minor_count || 0, 10) || 0), 0);
  const totalMajor = defectFindings.reduce((sum, f) => sum + (parseInt(f.major_count || 0, 10) || 0), 0);
  const totalCritical = defectFindings.reduce((sum, f) => sum + (parseInt(f.critical_count || 0, 10) || 0), 0);
  const grandTotalDefects = totalMinor + totalMajor + totalCritical;
  const overallDefectPct = parseFloat(((grandTotalDefects / getDenominator()) * 100).toFixed(2));

  // Determine AQL evaluation status
  const currentLotSize = parseInt(samplingPlan.lot_size, 10) || 5000;
  const aqlRules = sheet?.aql_config || [
    { lot_min: 2, lot_max: 500, sample_size: 13, aql_2_5_ac: 1, aql_2_5_re: 2, aql_4_0_ac: 1, aql_4_0_re: 2 },
    { lot_min: 501, lot_max: 3200, sample_size: 50, aql_2_5_ac: 3, aql_2_5_re: 4, aql_4_0_ac: 5, aql_4_0_re: 6 },
    { lot_min: 3201, lot_max: 10000, sample_size: 80, aql_2_5_ac: 5, aql_2_5_re: 6, aql_4_0_ac: 7, aql_4_0_re: 8 },
    { lot_min: 10001, lot_max: 35000, sample_size: 125, aql_2_5_ac: 7, aql_2_5_re: 8, aql_4_0_ac: 10, aql_4_0_re: 11 }
  ];

  const matchedAqlRule = aqlRules.find(r => currentLotSize >= r.lot_min && currentLotSize <= r.lot_max) || aqlRules[2];
  const aqlMajorPassed = matchedAqlRule ? totalMajor <= matchedAqlRule.aql_2_5_ac : true;
  const aqlCriticalPassed = totalCritical === 0;
  const evaluatedPassFail = (aqlMajorPassed && aqlCriticalPassed) ? 'Pass' : 'Fail';

  const isReadOnly = Boolean(
    sheet && 
    ['Submitted', 'Approved', 'Completed'].includes(sheet.status) && 
    sheet.status !== 'Needs Re-inspection'
  );

  // Save In-Progress Draft
  const handleSaveDraft = async () => {
    if (isReadOnly) {
      setError('This inspection sheet has already been submitted and cannot be edited. It is in read-only mode.');
      return;
    }

    setSavingDraft(true);
    setMessage('');
    setError('');

    const payload = {
      inspected_quantity: getDenominator(),
      employee_notes: employeeNotes,
      disposition,
      general_info_data: generalInfo,
      order_autofill_data: orderInfo,
      sampling_plan_data: samplingPlan,
      defect_findings_data: defectFindings,
      dimensional_data: dimensionalData,
      signatures_data: signatures,
      packaging_remarks: packagingRemarks,
      pass_fail_result: evaluatedPassFail
    };

    try {
      const res = await inspectionsApi.saveDraft(sheetId, payload);
      if (res.success) {
        setMessage('Draft saved successfully! Real-time telemetry synchronized.');
        setTimeout(() => setMessage(''), 4000);
      }
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit Completed Inspection
  const handleSubmit = async () => {
    if (isReadOnly) {
      setError('This inspection sheet has already been submitted and cannot be edited. It is in read-only mode.');
      return;
    }

    if (!confirm('Are you ready to submit this completed inspection report for QA Director review?')) return;

    setSubmitting(true);
    setMessage('');
    setError('');

    const payload = {
      inspected_quantity: getDenominator(),
      employee_notes: employeeNotes,
      disposition,
      general_info_data: generalInfo,
      order_autofill_data: orderInfo,
      sampling_plan_data: samplingPlan,
      defect_findings_data: defectFindings,
      dimensional_data: dimensionalData,
      signatures_data: signatures,
      packaging_remarks: packagingRemarks,
      pass_fail_result: evaluatedPassFail
    };

    try {
      const res = await inspectionsApi.submitInspection(sheetId, payload);
      if (res.success) {
        alert('Inspection submitted successfully! Real-time notifications dispatched to Admin.');
        onBack();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748B' }}>
        <RefreshCw size={28} className="live-pulse" style={{ margin: '0 auto 1rem auto' }} />
        <p>Connecting to on-site inspection protocol...</p>
      </div>
    );
  }

  if (!sheet) return null;

  const dispositionOptions = Array.isArray(sheet.disposition_config) && sheet.disposition_config.length > 0
    ? sheet.disposition_config
    : ['Accepted', 'Rejected', 'Hold', 'Conditional Accepted', 'Pending'];

  const orderRules = sheet.order_autofill_config || {};

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '6rem' }}>
      {/* Top Mobile Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={onBack} className="btn btn-outline btn-sm">
          <ArrowLeft size={16} /> Back to Audit Tasks
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a
            href={reportApi.getExcelUrl(sheet.id)}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ color: '#16A34A', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
            title="Download Excel Inspection Report"
          >
            <FileSpreadsheet size={15} />
            <span>Export Excel</span>
          </a>

          <button
            type="button"
            onClick={() => openPdfViewer(sheet.id, {
              title: `Inspection Sheet #${sheet.id} (${sheet.po_number || ''})`,
              poNumber: sheet.po_number,
              status: sheet.status
            })}
            className="btn btn-outline btn-sm"
            style={{ color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
            title="View Official PDF Report (with Return to App)"
          >
            <FileText size={15} />
            <span>View PDF Report</span>
          </button>


          <span className={`badge ${sheet.status === 'Submitted' || sheet.status === 'Approved' ? 'badge-success' : 'badge-in-progress'}`} style={{ fontSize: '0.75rem' }}>
            {sheet.status !== 'Submitted' && sheet.status !== 'Approved' && (
              <span className="live-pulse" style={{ width: '6px', height: '6px', marginRight: '4px' }} />
            )}
            {sheet.status}
          </span>
        </div>
      </div>

      {/* Locked Read-Only Banner */}
      {isReadOnly && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #86EFAC',
          borderRadius: '8px',
          padding: '0.85rem 1.15rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: '0 1px 3px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#166534' }}>
            <ShieldCheck size={22} style={{ color: '#16A34A', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                Inspection Sheet Submitted &amp; Locked (Read-Only Mode)
              </div>
              <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
                This inspection report has been finalized and submitted ({sheet.status}). Once submitted, reports cannot be altered by inspectors.
              </div>
            </div>
          </div>
          <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', fontWeight: 800 }}>
            🔒 {sheet.status}
          </span>
        </div>
      )}

      {message && (
        <div style={{ backgroundColor: '#DCFCE7', borderLeft: '4px solid #16A34A', color: '#15803D', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Re-inspection Remarks Warning (If sent back by admin!) */}
      {sheet.status === 'Needs Re-inspection' && sheet.admin_remarks && (
        <div style={{ backgroundColor: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase' }}>
            <AlertTriangle size={18} />
            <span>Action Required: Returned by QA Directorate</span>
          </div>
          <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#991B1B', lineHeight: 1.5 }}>
            "{sheet.admin_remarks}"
          </p>
        </div>
      )}

      {/* 1. CONFIGURABLE DISPOSITION BAR */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Inspection Disposition Verdict {isReadOnly && <span style={{ color: '#16A34A', fontSize: '0.75rem' }}>(Locked)</span>}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: evaluatedPassFail === 'Pass' ? '#16A34A' : '#DC2626' }}>
            Calculated Standard: {evaluatedPassFail.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {dispositionOptions.map((opt) => {
            const isSelected = disposition === opt;
            let bg = '#F1F5F9';
            let color = '#475569';
            let border = '1px solid #CBD5E1';

            if (isSelected) {
              if (opt.toLowerCase().includes('accept')) {
                bg = '#16A34A'; color = '#FFFFFF'; border = '1px solid #16A34A';
              } else if (opt.toLowerCase().includes('reject')) {
                bg = '#DC2626'; color = '#FFFFFF'; border = '1px solid #DC2626';
              } else if (opt.toLowerCase().includes('hold')) {
                bg = '#D97706'; color = '#FFFFFF'; border = '1px solid #D97706';
              } else if (opt.toLowerCase().includes('conditional')) {
                bg = '#0284C7'; color = '#FFFFFF'; border = '1px solid #0284C7';
              } else {
                bg = '#475569'; color = '#FFFFFF'; border = '1px solid #475569';
              }
            }

            return (
              <button
                key={opt}
                type="button"
                disabled={isReadOnly}
                onClick={() => { if (!isReadOnly) setDisposition(opt); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  backgroundColor: bg,
                  color: color,
                  border: border,
                  cursor: isReadOnly ? 'default' : 'pointer',
                  opacity: isReadOnly && !isSelected ? 0.45 : 1,
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected && '✓ '}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. THREE-COLUMN METADATA CARDS (General | PO | Sampling) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Card 1: General Info */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
            1. GENERAL INFORMATION
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Factory / Mill:</span>
              <strong style={{ color: '#0F172A' }}>{sheet.factory_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Factory City:</span>
              <span>{sheet.factory_city}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Auditor / Code:</span>
              <span style={{ fontWeight: 600 }}>{generalInfo.inspector_name || sheet.assigned_employee_name} ({sheet.assigned_employee_code})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Inspection Date:</span>
              <span>{generalInfo.inspection_date || new Date().toISOString().split('T')[0]}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Factory Rep:</span>
              <input
                type="text"
                disabled={isReadOnly}
                value={generalInfo.factory_rep || ''}
                onChange={(e) => setGeneralInfo({ ...generalInfo, factory_rep: e.target.value })}
                placeholder="Mill Manager Name"
                style={{ width: '130px', padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: isReadOnly ? '#F1F5F9' : '#FFFFFF' }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Purchase Order Info */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
            2. PURCHASE ORDER INFO
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>PO Number:</span>
              <strong style={{ color: '#0284C7' }}>{orderInfo.po_number || sheet.po_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Order Ref:</span>
              <span>{orderInfo.reference_number || sheet.order_number}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Article / Nature:</span>
              <span>{(orderInfo.article || sheet.product_type || '').substring(0, 18)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Ordered Quantity:</span>
              <strong>{(orderInfo.article_quantity || sheet.ordered_quantity || 0).toLocaleString()} pcs</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B' }}>Ready Quantity:</span>
              {orderRules.ready_qty === 'editable' && !isReadOnly ? (
                <input
                  type="number"
                  disabled={isReadOnly}
                  value={orderInfo.ready_qty || ''}
                  onChange={(e) => setOrderInfo({ ...orderInfo, ready_qty: parseInt(e.target.value, 10) || 0 })}
                  style={{ width: '80px', padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', textAlign: 'right' }}
                />
              ) : (
                <span>{(orderInfo.ready_qty || 0).toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Sampling Plan */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.4rem', marginBottom: '0.6rem' }}>
            3. SAMPLING PLAN MATRIX
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Inspection Level:</span>
              <strong>{samplingPlan.aql_level || 'Level I'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Visual Sample (AQL 4.0):</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={samplingPlan.visual_sample_size_aql_4 || ''}
                onChange={(e) => setSamplingPlan({ ...samplingPlan, visual_sample_size_aql_4: parseInt(e.target.value, 10) || 0 })}
                style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', textAlign: 'right', backgroundColor: isReadOnly ? '#F1F5F9' : '#FFFFFF' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Visual Sample (AQL 2.5):</span>
              <input
                type="number"
                disabled={isReadOnly}
                value={samplingPlan.visual_sample_size_aql_2_5 || ''}
                onChange={(e) => setSamplingPlan({ ...samplingPlan, visual_sample_size_aql_2_5: parseInt(e.target.value, 10) || 0 })}
                style={{ width: '60px', padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', textAlign: 'right', backgroundColor: isReadOnly ? '#F1F5F9' : '#FFFFFF' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Total Visual Sample:</span>
              <strong style={{ color: '#0284C7' }}>{getDenominator()} units</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Dimensional Sample:</span>
              <span>{samplingPlan.dimensional_sample_size || 13} pcs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DEFECT INSPECTION & FINDINGS SECTION */}
      <div className="inspection-section-box" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              4. Faults &amp; Defects Found on Site {isReadOnly && <span style={{ color: '#16A34A', fontSize: '0.78rem' }}>(Locked)</span>}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Denominator: {getDenominator()} units | Formula: (Total Defect Count / Denominator) * 100
            </span>
          </div>

          {!isReadOnly ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowDefectPicker(true)}
                className="btn btn-primary btn-sm"
              >
                <Plus size={15} />
                <span>Select Defect from Master</span>
              </button>
              <button
                type="button"
                onClick={handleAddCustomFinding}
                className="btn btn-outline-primary btn-sm"
              >
                <Plus size={15} />
                <span>+ Custom / Manual Defect</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '4px 10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', color: '#166534', fontSize: '0.8rem', fontWeight: 700 }}>
              <ShieldCheck size={16} color="#16A34A" />
              <span>Inspection Submitted (Defects Locked)</span>
            </div>
          )}
        </div>

        {/* Desktop Findings Table */}
        <div className="defect-desktop-view" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', width: '50px' }}>Code</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left', minWidth: '180px' }}>Defect Name / Inspector Input</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '60px' }}>Minor</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '60px' }}>Major</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '60px' }}>Critical</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '60px' }}>Total</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '70px' }}>Defect %</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left' }}>Evidence / Photos</th>
                <th style={{ padding: '0.5rem 0.6rem', textAlign: 'left' }}>Remarks</th>
                <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {defectFindings.length > 0 ? (
                defectFindings.map((finding, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '0.5rem 0.6rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      #{finding.defect_code}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', fontWeight: 600, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={finding.user_input !== undefined ? finding.user_input : (finding.defect_name || '')}
                          onChange={(e) => handleUpdateFindingName(idx, e.target.value)}
                          placeholder="Defect description (e.g. Dust)"
                          title="Inspector input for defect description"
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: '#0F172A',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF'
                          }}
                        />
                        {finding.reference_images && finding.reference_images.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setReferenceModalImage(finding.reference_images[0])}
                            title="View Reference Image from Master"
                            style={{ background: 'transparent', border: 'none', color: '#0284C7', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                          >
                            <Eye size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', color: '#64748B' }}>
                      {finding.category}
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        value={finding.minor_count ?? ''}
                        onChange={(e) => handleUpdateFindingCount(idx, 'minor_count', e.target.value)}
                        style={{ width: '50px', padding: '2px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        value={finding.major_count ?? ''}
                        onChange={(e) => handleUpdateFindingCount(idx, 'major_count', e.target.value)}
                        style={{ width: '50px', padding: '2px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#D97706', fontWeight: 700, backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        disabled={isReadOnly}
                        value={finding.critical_count ?? ''}
                        onChange={(e) => handleUpdateFindingCount(idx, 'critical_count', e.target.value)}
                        style={{ width: '50px', padding: '2px 4px', textAlign: 'center', border: '1px solid #CBD5E1', borderRadius: '4px', color: '#DC2626', fontWeight: 700, backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                      />
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 700 }}>
                      {finding.total_count || 0}
                    </td>
                    <td style={{ padding: '0.5rem 0.4rem', textAlign: 'center', fontWeight: 700, color: (finding.percentage || 0) > 2.5 ? '#DC2626' : '#0F172A' }}>
                      {finding.percentage || 0}%
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {Array.isArray(finding.images) && finding.images.map((imgUrl, imgI) => (
                          <div key={imgI} style={{ position: 'relative', display: 'inline-flex' }}>
                            <img
                              src={imgUrl}
                              alt="Evidence"
                              onClick={() => onOpenPhoto && onOpenPhoto(imgUrl)}
                              style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #CBD5E1' }}
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFindingPhoto(idx, imgI)}
                                title="Remove photo"
                                style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '15px',
                                  height: '15px',
                                  fontSize: '10px',
                                  lineHeight: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        {!isReadOnly && (
                          <>
                            {/* Option 1: Live Camera (Take Photo) */}
                            <label 
                              title="Take Photo with Camera"
                              style={{ 
                                cursor: uploadingFindingPhotoIdx === idx ? 'wait' : 'pointer', 
                                padding: '4px 6px', 
                                borderRadius: '4px', 
                                backgroundColor: '#F0F9FF', 
                                color: '#0284C7',
                                border: '1px solid #BAE6FD',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}
                            >
                              {uploadingFindingPhotoIdx === idx ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={13} />}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                disabled={uploadingFindingPhotoIdx === idx}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handleUploadFindingPhoto(idx, e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>

                            {/* Option 2: Select from Phone Gallery */}
                            <label 
                              title="Choose Photo from Gallery"
                              style={{ 
                                cursor: uploadingFindingPhotoIdx === idx ? 'wait' : 'pointer', 
                                padding: '4px 6px', 
                                borderRadius: '4px', 
                                backgroundColor: '#F8FAFC', 
                                color: '#475569',
                                border: '1px solid #CBD5E1',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.7rem',
                                fontWeight: 600
                              }}
                            >
                              <ImageIcon size={13} />
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={uploadingFindingPhotoIdx === idx}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    handleUploadFindingPhoto(idx, e.target.files);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem' }}>
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={finding.remarks || ''}
                        onChange={(e) => handleUpdateFindingRemarks(idx, e.target.value)}
                        placeholder="Location / details..."
                        style={{ width: '100%', padding: '2px 6px', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                      />
                    </td>
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFinding(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}
                          title="Remove Defect Finding"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '1.75rem', color: '#94A3B8' }}>
                    No defect findings recorded yet. Click "Select Defect from Master" above to log non-conformances.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totals Row */}
            <tfoot>
              <tr style={{ backgroundColor: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
                <td colSpan="3" style={{ padding: '0.6rem', textAlign: 'left', color: '#0F172A' }}>
                  GRAND TOTAL DEFECTS &amp; OVERALL RATE
                </td>
                <td style={{ textAlign: 'center', padding: '0.6rem' }}>{totalMinor}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem', color: '#D97706' }}>{totalMajor}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem', color: '#DC2626' }}>{totalCritical}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem' }}>{grandTotalDefects}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem', color: overallDefectPct > 2.5 ? '#DC2626' : '#16A34A' }}>
                  {overallDefectPct}%
                </td>
                <td colSpan="3" style={{ padding: '0.6rem', textAlign: 'right', color: '#475569' }}>
                  AQL 2.5 Verdict: <strong style={{ color: evaluatedPassFail === 'Pass' ? '#16A34A' : '#DC2626' }}>{evaluatedPassFail.toUpperCase()}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* MOBILE VIEW: Single-Card Accordion Flow for Defects */}
        <div className="defect-mobile-view">
          {defectFindings.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '1.75rem 1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px dashed #CBD5E1',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={28} style={{ color: '#94A3B8', margin: '0 auto 0.5rem auto' }} />
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                No defect findings recorded yet
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                Tap "Select Defect from Master" to log non-conformances.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {defectFindings.map((finding, idx) => {
                const isExpanded = activeDefectCardIdx === idx;

                if (isExpanded) {
                  // --- EXPANDED CARD (Active Single Card Filling Mode) ---
                  return (
                    <div
                      key={idx}
                      className="defect-mobile-card expanded"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '2px solid #3B82F6',
                        borderRadius: '8px',
                        padding: '0.85rem 0.75rem',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.12)',
                        position: 'relative',
                        boxSizing: 'border-box',
                        width: '100%',
                        maxWidth: '100%',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                          <span style={{
                            backgroundColor: '#1E40AF',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            #{finding.defect_code}
                          </span>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={finding.user_input !== undefined ? finding.user_input : (finding.defect_name || '')}
                              onChange={(e) => handleUpdateFindingName(idx, e.target.value)}
                              placeholder="Defect description (e.g. Dust)"
                              style={{
                                width: '100%',
                                padding: '4px 6px',
                                border: '1px solid #CBD5E1',
                                borderRadius: '4px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                color: '#0F172A',
                                backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF',
                                marginBottom: '2px'
                              }}
                            />
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {finding.category}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {finding.reference_images && finding.reference_images.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setReferenceModalImage(finding.reference_images[0])}
                              style={{ background: '#E0F2FE', border: 'none', color: '#0284C7', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 600 }}
                              title="Master Reference Photo"
                            >
                              <Eye size={13} />
                              <span>Ref</span>
                            </button>
                          )}
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFinding(idx)}
                              style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: '5px 7px', borderRadius: '4px', cursor: 'pointer' }}
                              title="Delete Defect"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Severity Counts with Stepper Buttons (Stacked Rows: 100% Mobile Safe) */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                          Defect Severity Counts:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {/* Minor Row */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            backgroundColor: '#F8FAFC', 
                            border: '1px solid #E2E8F0', 
                            borderRadius: '6px', 
                            padding: '0.45rem 0.65rem',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: '#334155', 
                                backgroundColor: '#E2E8F0', 
                                padding: '2px 8px', 
                                borderRadius: '4px' 
                              }}>
                                Minor
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Defect</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'minor_count', -1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                value={finding.minor_count ?? ''}
                                onChange={(e) => handleUpdateFindingCount(idx, 'minor_count', e.target.value)}
                                style={{ width: '46px', height: '32px', textAlign: 'center', fontWeight: 700, border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '0.9rem', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                              />
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'minor_count', 1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Major Row */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            backgroundColor: '#FFFBEB', 
                            border: '1px solid #FDE68A', 
                            borderRadius: '6px', 
                            padding: '0.45rem 0.65rem',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: '#B45309', 
                                backgroundColor: '#FEF3C7', 
                                padding: '2px 8px', 
                                borderRadius: '4px' 
                              }}>
                                Major
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#D97706' }}>Defect</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'major_count', -1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #FCD34D', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                value={finding.major_count ?? ''}
                                onChange={(e) => handleUpdateFindingCount(idx, 'major_count', e.target.value)}
                                style={{ width: '46px', height: '32px', textAlign: 'center', fontWeight: 700, border: '1px solid #FCD34D', borderRadius: '4px', fontSize: '0.9rem', color: '#D97706', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                              />
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'major_count', 1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #FCD34D', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Critical Row */}
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            backgroundColor: '#FEF2F2', 
                            border: '1px solid #FECACA', 
                            borderRadius: '6px', 
                            padding: '0.45rem 0.65rem',
                            boxSizing: 'border-box'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: '#DC2626', 
                                backgroundColor: '#FEE2E2', 
                                padding: '2px 8px', 
                                borderRadius: '4px' 
                              }}>
                                Critical
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#DC2626' }}>Defect</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'critical_count', -1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #FCA5A5', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Minus size={13} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                value={finding.critical_count ?? ''}
                                onChange={(e) => handleUpdateFindingCount(idx, 'critical_count', e.target.value)}
                                style={{ width: '46px', height: '32px', textAlign: 'center', fontWeight: 700, border: '1px solid #FCA5A5', borderRadius: '4px', fontSize: '0.9rem', color: '#DC2626', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                              />
                              <button
                                type="button"
                                disabled={isReadOnly}
                                onClick={() => handleStepFindingCount(idx, 'critical_count', 1)}
                                style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid #FCA5A5', background: '#FFFFFF', cursor: isReadOnly ? 'default' : 'pointer', opacity: isReadOnly ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Live Totals Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '6px',
                        padding: '0.45rem 0.75rem',
                        marginBottom: '0.85rem',
                        fontSize: '0.78rem'
                      }}>
                        <span>Total: <strong style={{ color: '#0F172A' }}>{finding.total_count || 0} pcs</strong></span>
                        <span>Rate: <strong style={{ color: (finding.percentage || 0) > 2.5 ? '#DC2626' : '#16A34A' }}>{finding.percentage || 0}%</strong></span>
                      </div>

                      {/* Evidence / Photos */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Evidence / Defect Photos:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {Array.isArray(finding.images) && finding.images.map((imgUrl, imgI) => (
                            <div key={imgI} style={{ position: 'relative' }}>
                              <img
                                src={imgUrl}
                                alt="Evidence"
                                onClick={() => onOpenPhoto && onOpenPhoto(imgUrl)}
                                style={{ width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover', cursor: 'pointer', border: '1px solid #CBD5E1' }}
                              />
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFindingPhoto(idx, imgI)}
                                  style={{
                                    position: 'absolute',
                                    top: '-5px',
                                    right: '-5px',
                                    backgroundColor: '#DC2626',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    fontSize: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                  title="Remove photo"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          {!isReadOnly && (
                            <>
                              {/* Option 1: Live Camera (Take Photo) */}
                              <label
                                style={{
                                  cursor: uploadingFindingPhotoIdx === idx ? 'wait' : 'pointer',
                                  height: '46px',
                                  padding: '0 0.85rem',
                                  borderRadius: '8px',
                                  backgroundColor: '#F0F9FF',
                                  border: '1px solid #0284C7',
                                  color: '#0284C7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  flex: '1 1 auto',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)'
                                }}
                              >
                                {uploadingFindingPhotoIdx === idx ? (
                                  <>
                                    <RefreshCw size={15} className="animate-spin" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Camera size={16} />
                                    <span>Take Photo</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  disabled={uploadingFindingPhotoIdx === idx}
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      handleUploadFindingPhoto(idx, e.target.files);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </label>

                              {/* Option 2: Gallery / Photo Library */}
                              <label
                                style={{
                                  cursor: uploadingFindingPhotoIdx === idx ? 'wait' : 'pointer',
                                  height: '46px',
                                  padding: '0 0.85rem',
                                  borderRadius: '8px',
                                  backgroundColor: '#F8FAFC',
                                  border: '1px solid #94A3B8',
                                  color: '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  flex: '1 1 auto',
                                  justifyContent: 'center',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                }}
                              >
                                <ImageIcon size={16} />
                                <span>Choose Gallery</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={uploadingFindingPhotoIdx === idx}
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      handleUploadFindingPhoto(idx, e.target.files);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Remarks */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                          Defect Location &amp; Remarks:
                        </div>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          value={finding.remarks || ''}
                          onChange={(e) => handleUpdateFindingRemarks(idx, e.target.value)}
                          placeholder="e.g., Left sleeve seam, pocket hem..."
                          style={{ width: '100%', padding: '0.5rem 0.65rem', fontSize: '0.8rem', border: '1px solid #CBD5E1', borderRadius: '6px', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
                        />
                      </div>

                      {/* Primary Save & Collapse Button */}
                      <button
                        type="button"
                        onClick={handleCollapseDefectCard}
                        style={{
                          width: '100%',
                          padding: '0.65rem',
                          backgroundColor: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        <Check size={16} />
                        <span>{isReadOnly ? 'Close Card' : 'Save & Collapse Card'}</span>
                      </button>
                    </div>
                  );
                }

                // --- COLLAPSED CARD ---
                return (
                  <div
                    key={idx}
                    className="defect-mobile-card collapsed"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      width: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div
                        onClick={() => handleToggleDefectCard(idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}
                      >
                        <span style={{
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          #{finding.defect_code}
                        </span>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }}>
                            {finding.defect_name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                            {finding.category}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Edit and Trash */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleDefectCard(idx)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title={isReadOnly ? 'View Card Details' : 'Edit Card'}
                        >
                          <Edit2 size={12} />
                          <span>{isReadOnly ? 'View' : 'Edit'}</span>
                        </button>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFinding(idx)}
                            style={{
                              background: '#FEE2E2',
                              border: 'none',
                              color: '#DC2626',
                              borderRadius: '4px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove Defect"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary metrics pills */}
                    <div
                      onClick={() => handleToggleDefectCard(idx)}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginTop: '0.65rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px dashed #E2E8F0'
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontWeight: 600 }}>
                        Minor: <strong>{finding.minor_count || 0}</strong>
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600 }}>
                        Major: <strong>{finding.major_count || 0}</strong>
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontWeight: 600 }}>
                        Critical: <strong>{finding.critical_count || 0}</strong>
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#3730A3', fontWeight: 700 }}>
                        Total: {finding.total_count || 0}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: (finding.percentage || 0) > 2.5 ? '#FEE2E2' : '#F0FDF4',
                        color: (finding.percentage || 0) > 2.5 ? '#DC2626' : '#16A34A',
                        fontWeight: 700
                      }}>
                        Rate: {finding.percentage || 0}%
                      </span>
                      {Array.isArray(finding.images) && finding.images.length > 0 && (
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <Camera size={11} /> {finding.images.length}
                        </span>
                      )}
                    </div>
                    {finding.remarks && (
                      <div
                        onClick={() => handleToggleDefectCard(idx)}
                        style={{ fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic', marginTop: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        "{finding.remarks}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Action: Select Defect from Master */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setShowDefectPicker(true)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '1rem'
              }}
            >
              <Plus size={16} />
              <span>Select Defect from Master</span>
            </button>
          )}

          {/* Mobile Grand Total Summary Card */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '2px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.85rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Defects Summary &amp; Rate
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', textAlign: 'center', marginBottom: '0.65rem' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B' }}>Minor</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{totalMinor}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#D97706' }}>Major</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#D97706' }}>{totalMajor}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#DC2626' }}>Critical</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>{totalCritical}</div>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '4px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.65rem', color: '#0F172A' }}>Total</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{grandTotalDefects}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', paddingTop: '0.5rem', borderTop: '1px solid #E2E8F0' }}>
              <span>Overall Rate: <strong style={{ color: overallDefectPct > 2.5 ? '#DC2626' : '#16A34A' }}>{overallDefectPct}%</strong></span>
              <span>AQL 2.5: <strong style={{ color: evaluatedPassFail === 'Pass' ? '#16A34A' : '#DC2626' }}>{evaluatedPassFail.toUpperCase()}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DIMENSIONAL INSPECTION MATRIX (13 SAMPLES) */}
      {dimensionalData.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                5. Dimensional &amp; Tolerance Inspection (13 Samples) {isReadOnly && <span style={{ color: '#16A34A', fontSize: '0.78rem' }}>(Locked)</span>}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Verify physical garment measurements against specified tolerance limits.
              </span>
            </div>
          </div>

          {/* Desktop Dimensional Table */}
          <div className="dimensional-desktop-view" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', minWidth: '110px' }}>Param</th>
                  <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>Spec</th>
                  <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>Min</th>
                  <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>Max</th>
                  <th style={{ padding: '0.4rem 0.3rem', textAlign: 'center' }}>Unit</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(n => (
                    <th key={n} style={{ padding: '0.4rem 0.2rem', textAlign: 'center', width: '38px' }}>S{n}</th>
                  ))}
                  <th style={{ padding: '0.4rem 0.4rem', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dimensionalData.map((dim, pIdx) => (
                  <tr key={pIdx} style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: pIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '0.4rem 0.5rem', fontWeight: 700, color: '#0F172A' }}>
                      {dim.param}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', color: '#64748B' }}>
                      {dim.spec || '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', color: '#64748B' }}>
                      {dim.min || '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', color: '#64748B' }}>
                      {dim.max || '-'}
                    </td>
                    <td style={{ padding: '0.4rem 0.3rem', textAlign: 'center', color: '#64748B' }}>
                      {dim.unit || 'in'}
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sIdx => (
                      <td key={sIdx} style={{ padding: '0.2rem', textAlign: 'center' }}>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.]?[0-9]*"
                          disabled={isReadOnly}
                          value={dim.samples?.[sIdx] ?? ''}
                          onChange={(e) => handleDimensionalSampleChange(pIdx, sIdx, e.target.value)}
                          style={{
                            width: '36px',
                            padding: '2px 0',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            border: '1px solid #CBD5E1',
                            borderRadius: '3px',
                            backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF'
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: dim.pass_fail === 'Pass' ? '#DCFCE7' : '#FEE2E2',
                        color: dim.pass_fail === 'Pass' ? '#16A34A' : '#DC2626'
                      }}>
                        {dim.pass_fail || 'Pass'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Dimensional Parameter Cards */}
          <div className="dimensional-mobile-view">
            {dimensionalData.map((dim, pIdx) => (
              <div
                key={pIdx}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  marginBottom: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{dim.param}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Spec: <strong>{dim.spec || '-'}</strong> | Tol: <strong>{dim.min || '-'}-{dim.max || '-'}</strong> {dim.unit || 'in'}
                    </div>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: dim.pass_fail === 'Pass' ? '#DCFCE7' : '#FEE2E2',
                    color: dim.pass_fail === 'Pass' ? '#16A34A' : '#DC2626'
                  }}>
                    {dim.pass_fail || 'Pass'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  13 Sample Measurements:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: '0.35rem' }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sIdx => (
                    <div key={sIdx} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginBottom: '2px' }}>S{sIdx + 1}</div>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.]?[0-9]*"
                        disabled={isReadOnly}
                        value={dim.samples?.[sIdx] ?? ''}
                        onChange={(e) => handleDimensionalSampleChange(pIdx, sIdx, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '4px 2px',
                          textAlign: 'center',
                          fontSize: '0.78rem',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AQL ACCEPTANCE / REJECTION TABLE OVERVIEW */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              6. AQL Acceptance / Rejection Evaluation
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Level I Standard | Lot Range: {matchedAqlRule?.lot_min} to {matchedAqlRule?.lot_max} units
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#475569' }}>
              Major Defect Limit: <strong>Ac {matchedAqlRule?.aql_2_5_ac} / Re {matchedAqlRule?.aql_2_5_re}</strong>
            </span>
            <span style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 800,
              fontSize: '0.75rem',
              backgroundColor: evaluatedPassFail === 'Pass' ? '#DCFCE7' : '#FEE2E2',
              color: evaluatedPassFail === 'Pass' ? '#16A34A' : '#DC2626'
            }}>
              {evaluatedPassFail === 'Pass' ? 'AQL PASSED' : 'AQL REJECTED'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
          <div style={{ padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
            <span style={{ color: '#64748B' }}>Critical Defects (Zero-Tolerance):</span><br />
            <strong style={{ color: totalCritical === 0 ? '#16A34A' : '#DC2626' }}>
              {totalCritical} Found (Ac: 0 / Re: 1)
            </strong>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
            <span style={{ color: '#64748B' }}>Major Defects (AQL 2.5):</span><br />
            <strong style={{ color: aqlMajorPassed ? '#16A34A' : '#DC2626' }}>
              {totalMajor} Found (Ac: {matchedAqlRule?.aql_2_5_ac} / Re: {matchedAqlRule?.aql_2_5_re})
            </strong>
          </div>
          <div style={{ padding: '0.5rem', backgroundColor: '#F8FAFC', borderRadius: '4px' }}>
            <span style={{ color: '#64748B' }}>Minor Defects (AQL 4.0):</span><br />
            <strong style={{ color: '#0F172A' }}>
              {totalMinor} Found (Ac: {matchedAqlRule?.aql_4_0_ac} / Re: {matchedAqlRule?.aql_4_0_re})
            </strong>
          </div>
        </div>
      </div>

      {/* 6. PACKAGING & INSPECTOR REMARKS */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
          7. Packaging Condition &amp; General Observations {isReadOnly && <span style={{ color: '#16A34A', fontSize: '0.78rem' }}>(Locked)</span>}
        </h3>
        <textarea
          rows={3}
          disabled={isReadOnly}
          value={packagingRemarks}
          onChange={(e) => setPackagingRemarks(e.target.value)}
          placeholder="Enter carton drop test result, barcode scan confirmation, polybag thickness, shipping markings conformance..."
          className="form-textarea"
          style={{ fontSize: '0.85rem', backgroundColor: isReadOnly ? '#F8FAFC' : '#FFFFFF' }}
        />
      </div>

      {/* 7. DIGITAL SIGNATURES & CONFORMANCE SIGN-OFF */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
          8. Conformance Verification &amp; Digital Sign-Off {isReadOnly && <span style={{ color: '#16A34A', fontSize: '0.78rem' }}>(Locked)</span>}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Auditor Sign-off */}
          <div style={{ padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
            <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>Field Inspector Certification</strong>
            <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '4px 0 8px 0' }}>
              {generalInfo.inspector_name || sheet.assigned_employee_name}
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isReadOnly ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={signatures.auditor_signed}
                onChange={(e) => setSignatures({ ...signatures, auditor_signed: e.target.checked })}
              />
              <span style={{ color: signatures.auditor_signed ? '#16A34A' : '#475569' }}>
                {signatures.auditor_signed ? '✓ Digitally Certified' : 'Certify On-Site Audit'}
              </span>
            </label>
          </div>

          {/* Factory Rep Sign-off */}
          <div style={{ padding: '0.75rem', border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
            <strong style={{ fontSize: '0.8rem', color: '#0F172A' }}>Factory Representative</strong>
            <input
              type="text"
              disabled={isReadOnly}
              placeholder="Representative Full Name"
              value={signatures.factory_rep_name || ''}
              onChange={(e) => setSignatures({ ...signatures, factory_rep_name: e.target.value })}
              className="form-input"
              style={{ fontSize: '0.75rem', margin: '4px 0 8px 0', padding: '3px 6px', backgroundColor: isReadOnly ? '#F1F5F9' : '#FFFFFF' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: isReadOnly ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                disabled={isReadOnly}
                checked={signatures.factory_rep_signed}
                onChange={(e) => setSignatures({ ...signatures, factory_rep_signed: e.target.checked })}
              />
              <span style={{ color: signatures.factory_rep_signed ? '#0284C7' : '#475569' }}>
                {signatures.factory_rep_signed ? '✓ Witnessed On Site' : 'Acknowledge Findings'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div 
        className="inspection-sticky-bar"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          zIndex: 50,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.06)'
        }}
      >
        <div className="inspection-sticky-bar-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', flexWrap: 'wrap' }}>
          <span style={{ color: '#64748B' }}>
            Verdict: <strong style={{ color: disposition === 'Pass' ? '#16A34A' : disposition === 'Fail' ? '#DC2626' : '#0F172A' }}>{disposition}</strong>
          </span>
          <span style={{ color: '#64748B' }}>
            Defects: <strong style={{ color: '#0F172A' }}>{grandTotalDefects} ({overallDefectPct}%)</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isReadOnly ? (
            <>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                padding: '0.45rem 0.85rem', 
                borderRadius: '6px', 
                backgroundColor: '#DCFCE7', 
                color: '#15803D', 
                border: '1px solid #86EFAC', 
                fontSize: '0.82rem', 
                fontWeight: 700 
              }}>
                <ShieldCheck size={16} /> Submitted &amp; Finalized (Locked)
              </span>
              <button
                type="button"
                onClick={onBack}
                className="btn btn-outline btn-sm"
                style={{ fontWeight: 600 }}
              >
                <ArrowLeft size={15} />
                <span>Back to Tasks</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || submitting}
                className="btn btn-outline btn-sm"
              >
                <Save size={15} />
                <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={savingDraft || submitting}
                className="btn btn-primary btn-sm"
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting...' : 'Submit Final Report'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Defect Picker Modal from Defect Master */}
      {showDefectPicker && (
        <div className="modal-overlay" onClick={() => setShowDefectPicker(false)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '960px', width: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Select Defect from Master
              </h3>
              <button onClick={() => setShowDefectPicker(false)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94A3B8' }} />
                <input
                  type="text"
                  placeholder="Search defect name or code..."
                  value={defectSearch}
                  onChange={(e) => setDefectSearch(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '32px', fontSize: '0.8rem' }}
                />
              </div>

              <select
                value={defectCategoryFilter}
                onChange={(e) => setDefectCategoryFilter(e.target.value)}
                className="form-select"
                style={{ width: 'auto', minWidth: '130px', fontSize: '0.8rem' }}
              >
                <option value="All">All Categories</option>
                <option value="Fabrication">Fabrication</option>
                <option value="Processing & Trims">Processing &amp; Trims</option>
                <option value="Stitching & Packing">Stitching &amp; Packing</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>
              {(() => {
                const selectedDefectCodes = new Set(
                  defectFindings.map(f => String(f.defect_code || f.code || '').trim()).filter(Boolean)
                );
                const selectedDefectIds = new Set(
                  defectFindings.map(f => f.defect_id).filter(Boolean)
                );

                const unselectedDefects = availableDefects.filter(d => {
                  // Exclude defects that are already present in findings
                  const isAlreadySelected = 
                    selectedDefectCodes.has(String(d.code).trim()) || 
                    (d.id && selectedDefectIds.has(d.id));
                  if (isAlreadySelected) return false;

                  const matchCat = defectCategoryFilter === 'All' || d.category === defectCategoryFilter;
                  const matchSearch = !defectSearch || d.name.toLowerCase().includes(defectSearch.toLowerCase()) || String(d.code).includes(defectSearch);
                  return matchCat && matchSearch;
                });

                if (unselectedDefects.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155', marginBottom: '0.35rem' }}>
                        No defects available to select
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                        {defectSearch || defectCategoryFilter !== 'All'
                          ? 'No defects match your current search/filter, or they have already been added.'
                          : 'All master defects have already been added to your inspection findings.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                    {unselectedDefects.map(d => (
                      <div
                        key={d.id || d.code}
                        onClick={() => handleSelectDefectFromLibrary(d)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.8rem',
                          borderRadius: '6px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0F9FF'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            backgroundColor: '#0F172A', 
                            color: '#FFFFFF', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontFamily: 'var(--font-mono)' 
                          }}>
                            #{d.code}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>
                              {d.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              {d.category}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: d.severity_default === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                            color: d.severity_default === 'Critical' ? '#991B1B' : '#92400E'
                          }}>
                            {d.severity_default || 'Major'}
                          </span>
                          <Plus size={16} color="#0284C7" />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Reference Image Viewer Modal */}
      {referenceModalImage && (
        <div className="modal-overlay" onClick={() => setReferenceModalImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Defect Master Reference Image
              </h3>
              <button onClick={() => setReferenceModalImage(null)} style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <img
                src={referenceModalImage}
                alt="Defect Reference"
                style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '6px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
