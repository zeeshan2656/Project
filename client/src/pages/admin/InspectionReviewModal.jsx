import React, { useState } from 'react';
import { inspectionsApi, reportApi } from '../../services/api';
import { 
  X, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Download, 
  MapPin, 
  User, 
  Building, 
  Clock, 
  Percent, 
  Camera, 
  History,
  ExternalLink
} from 'lucide-react';

export function InspectionReviewModal({ inspection, onClose, onRefresh, onOpenPhoto }) {
  const [decision, setDecision] = useState('');
  const [remarks, setRemarks] = useState(inspection.admin_remarks || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!inspection) return null;

  const handleReviewSubmit = async (selectedDecision) => {
    if (selectedDecision === 'Needs Re-inspection' && (!remarks || remarks.trim() === '')) {
      setError('Remarks are mandatory when returning an inspection for re-inspection so the field inspector knows what to correct.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await inspectionsApi.reviewInspection(inspection.id, {
        decision: selectedDecision,
        remarks
      });
      if (res.success) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Not Started': 'badge-not-started',
      'In Progress': 'badge-in-progress',
      'Draft Saved': 'badge-draft-saved',
      'Submitted': 'badge-submitted',
      'Approved': 'badge-approved',
      'Needs Re-inspection': 'badge-reinspection'
    };
    return map[status] || 'badge-not-started';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '1200px', width: '94vw' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>
                Inspection Review: {inspection.sheet_number}
              </h2>
              <span className={`badge ${getStatusBadge(inspection.status)}`}>
                {inspection.status}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
              Order: {inspection.order_number} ({inspection.po_number}) • Mill: {inspection.factory_name} ({inspection.factory_city})
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #DC2626', color: '#991B1B', padding: '0.75rem 1rem', borderRadius: 'var(--radius-xs)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {/* Quick Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', backgroundColor: '#F8FAFC', padding: '1.25rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Inspector</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={15} color="#2563EB" />
                <span>{inspection.assigned_employee_name} ({inspection.assigned_employee_code})</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Factory Location</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} color="#DC2626" />
                <span>{inspection.factory_city}, Pakistan</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Client (USA)</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building size={15} color="#059669" />
                <span>{inspection.customer_name}</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Pass / Fail Decision</span>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: inspection.pass_fail_result === 'Pass' ? '#16A34A' : '#DC2626', marginTop: '2px' }}>
                {inspection.pass_fail_result || 'Pending'}
              </div>
            </div>
          </div>

          {/* Quantity & Defect Telemetry Box */}
          <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Percent size={16} /> Quantity &amp; Automated Defect Calculation
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#475569' }}>Total Ordered Qty:</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>
                  {inspection.ordered_quantity?.toLocaleString()} units
                </div>
              </div>

              <div>
                <span style={{ color: '#475569' }}>Actual Inspected Qty (Denominator):</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0F172A' }}>
                  {inspection.inspected_quantity ? `${inspection.inspected_quantity.toLocaleString()} units` : 'Not recorded yet'}
                </div>
              </div>

              <div>
                <span style={{ color: '#475569' }}>Total Defect Count:</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#DC2626' }}>
                  {inspection.total_defect_count || 0} defects
                </div>
              </div>

              <div>
                <span style={{ color: '#475569' }}>Overall Defect %:</span>
                <div style={{ fontWeight: 800, fontSize: '1.25rem', color: inspection.overall_defect_percentage > 2.5 ? '#DC2626' : '#16A34A' }}>
                  {inspection.overall_defect_percentage || 0.00}%
                </div>
              </div>
            </div>
          </div>

          {/* Defect Master Findings Table (If Available) */}
          {Array.isArray(inspection.defect_findings_data) && inspection.defect_findings_data.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                Defect Master Findings ({inspection.defect_findings_data.length})
              </h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Defect Name</th>
                      <th>Category</th>
                      <th>Minor</th>
                      <th>Major</th>
                      <th>Critical</th>
                      <th>Total</th>
                      <th>Defect %</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.defect_findings_data.map((df, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>#{df.defect_code}</td>
                        <td style={{ fontWeight: 600 }}>{df.user_input || df.defect_name}</td>
                        <td style={{ color: '#64748B' }}>{df.category}</td>
                        <td style={{ textAlign: 'center' }}>{df.minor_count || 0}</td>
                        <td style={{ textAlign: 'center', color: '#D97706', fontWeight: 700 }}>{df.major_count || 0}</td>
                        <td style={{ textAlign: 'center', color: '#DC2626', fontWeight: 700 }}>{df.critical_count || 0}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{df.total_count || 0}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: (df.percentage || 0) > 2.5 ? '#DC2626' : '#16A34A' }}>
                          {df.percentage || 0}%
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.8rem' }}>{df.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Dimensional Inspection Matrix (If Available) */}
          {Array.isArray(inspection.dimensional_data) && inspection.dimensional_data.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                Dimensional Inspection Matrix (13 Samples)
              </h4>
              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Target Spec</th>
                      <th>Tolerance</th>
                      <th>Samples 1..13</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.dimensional_data.map((dim, idx) => {
                      const sampleStr = Array.isArray(dim.samples) ? dim.samples.filter(Boolean).join(', ') : '-';
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700 }}>{dim.param}</td>
                          <td>{dim.spec} {dim.unit}</td>
                          <td>{dim.min} - {dim.max}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{sampleStr || 'No readings'}</td>
                          <td>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '3px',
                              fontWeight: 700,
                              backgroundColor: dim.pass_fail === 'Pass' ? '#DCFCE7' : '#FEE2E2',
                              color: dim.pass_fail === 'Pass' ? '#16A34A' : '#DC2626'
                            }}>
                              {dim.pass_fail || 'Pass'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Template Field Values Table */}
          {inspection.fields && inspection.fields.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                Additional Checkpoints &amp; Field Telemetry
              </h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Checkpoint / Field</th>
                      <th>Type</th>
                      <th>Entered Value / Count</th>
                      <th>Defect % (On-Site)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspection.fields?.map((f) => {
                      let displayVal = '-';
                      if (f.value_number !== null && f.value_number !== undefined) {
                        displayVal = `${f.value_number} ${f.unit || ''}`.trim();
                      } else if (f.value_text) {
                        displayVal = f.value_text;
                      }

                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.field_label}</td>
                          <td style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase' }}>
                            {f.field_type.replace('_', ' ')}
                          </td>
                          <td style={{ fontFamily: f.field_type === 'numeric_defect' ? 'var(--font-mono)' : 'inherit', fontWeight: 600 }}>
                            {displayVal}
                          </td>
                          <td>
                            {f.calculated_percentage !== null ? (
                              <span style={{
                                fontWeight: 700,
                                color: f.calculated_percentage > 2.5 ? '#DC2626' : '#16A34A',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                {f.calculated_percentage}%
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Uploaded Inspection Photos Gallery */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Camera size={16} /> Uploaded Inspection Photos ({inspection.photos?.length || 0})
              </h4>
            </div>

            {inspection.photos && inspection.photos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                {inspection.photos.map((photo) => (
                  <div 
                    key={photo.id}
                    onClick={() => onOpenPhoto(photo)}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform var(--transition-fast)'
                    }}
                  >
                    <div style={{ height: '130px', backgroundColor: '#0F172A', overflow: 'hidden' }}>
                      <img 
                        src={photo.photo_url} 
                        alt={photo.caption || 'Inspection photo'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ padding: '0.5rem 0.65rem' }}>
                      <span className="badge badge-in-progress" style={{ fontSize: '0.65rem', marginBottom: '4px' }}>
                        {photo.defect_tag || 'Evidence'}
                      </span>
                      <p style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {photo.caption || 'No caption'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                No photos attached yet.
              </div>
            )}
          </div>

          {/* Inspector Field Remarks */}
          {inspection.employee_notes && (
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Inspector Field Remarks:</span>
              <p style={{ fontSize: '0.9rem', color: '#1E293B', marginTop: '4px', fontStyle: 'italic' }}>
                "{inspection.employee_notes}"
              </p>
            </div>
          )}

          {/* Re-inspection Remarks / Feedback Section */}
          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1.25rem', borderRadius: 'var(--radius-sm)' }}>
            <label className="form-label" style={{ color: '#92400E' }}>
              QA Director Remarks &amp; Corrective Instructions (Required for Re-inspection)
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Please re-sample lot B, re-measure waistband on 50 additional pieces, and upload clearer macro photo of the stain under white light."
              className="form-textarea"
              style={{ borderColor: '#FCD34D' }}
            />
          </div>

          {/* Audit Trail Timeline */}
          {inspection.auditLogs && inspection.auditLogs.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={16} /> Audit Trail &amp; Status Logs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {inspection.auditLogs.map((log) => (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.8rem', borderLeft: '2px solid #CBD5E1', paddingLeft: '0.85rem' }}>
                    <div style={{ minWidth: '130px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      {log.created_at}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{log.actor_name}</span>
                      <span style={{ color: '#64748B', margin: '0 4px' }}>changed status to</span>
                      <span className={`badge ${getStatusBadge(log.new_status)}`} style={{ fontSize: '0.65rem' }}>
                        {log.new_status}
                      </span>
                      {log.remarks && (
                        <div style={{ color: '#475569', marginTop: '2px' }}>{log.remarks}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: Actions & PDF/Excel Download */}
        <div className="modal-footer inspection-review-footer">
          {/* Download Buttons */}
          <div className="inspection-review-download-btns">
            <a
              href={reportApi.getPdfUrl(inspection.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ fontWeight: 600 }}
              title="View PDF Report in 2nd tab (with choice to download)"
            >
              <FileText size={14} color="#DC2626" />
              <span>View PDF Report</span>
            </a>

            <a
              href={reportApi.getExcelUrl(inspection.id)}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ fontWeight: 600 }}
            >
              <Download size={14} color="#16A34A" />
              <span>Excel Report</span>
            </a>
          </div>


          {/* Review Decision Buttons */}
          <div className="inspection-review-action-btns">
            <button
              onClick={() => handleReviewSubmit('Needs Re-inspection')}
              disabled={loading}
              className="btn btn-danger btn-sm"
              style={{ fontWeight: 700 }}
            >
              <AlertTriangle size={15} />
              <span>Re-inspect</span>
            </button>

            <button
              onClick={() => handleReviewSubmit('Approved')}
              disabled={loading}
              className="btn btn-success btn-sm"
              style={{ fontWeight: 700 }}
            >
              <CheckCircle size={15} />
              <span>Approve</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
