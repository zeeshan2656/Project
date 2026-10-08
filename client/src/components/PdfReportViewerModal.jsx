import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  ExternalLink, 
  X, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Printer
} from 'lucide-react';
import { reportApi } from '../services/api';

/**
 * Mobile-First In-App PDF Report Viewer Modal
 * 
 * Solves the critical mobile/PWA issue where opening a raw PDF navigated the browser 
 * away with NO back button, trapping the user inside the PDF viewer.
 * 
 * Features:
 * - Prominent "← Back to App" top button (guaranteed return path in PWA/mobile view)
 * - Hardware / Gesture back button support (via browser history popstate)
 * - Direct "Download PDF" button without leaving the application
 * - Native Mobile Share (WhatsApp, Email, Drive via navigator.share)
 * - Fallback full-screen iframe viewer with loading spinner
 */
export function PdfReportViewerModal({
  isOpen,
  onClose,
  inspectionId,
  title,
  poNumber,
  status
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const pdfUrl = inspectionId ? reportApi.getPdfUrl(inspectionId) : '';

  // Prevent background scrolling and support phone hardware back button
  useEffect(() => {
    if (!isOpen) return;

    // Lock background scroll
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Push history state so Android / mobile gesture back closes the modal
    const stateId = `pdf-modal-${Date.now()}`;
    window.history.pushState({ modal: stateId }, '');

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !inspectionId) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filename = `Inspection_${inspectionId}_Report.pdf`;
      await reportApi.downloadPdf(inspectionId, filename);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Fallback: direct window download
      const a = document.createElement('a');
      a.href = `${pdfUrl}?download=true`;
      a.download = `Inspection_${inspectionId}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const fullUrl = `${window.location.origin}${pdfUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || `Inspection Report #${inspectionId}`,
          text: `Official Verified Inspection Report (PO: ${poNumber || 'N/A'})`,
          url: fullUrl
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyLinkToClipboard(fullUrl);
        }
      }
    } else {
      copyLinkToClipboard(fullUrl);
    }
  };

  const copyLinkToClipboard = (url) => {
    navigator.clipboard?.writeText(url);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 2500);
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-report-frame');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.print();
      } catch (_) {
        window.open(pdfUrl, '_blank');
      }
    } else {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="pdf-viewer-overlay" role="dialog" aria-modal="true" aria-label="PDF Report Viewer">
      {/* 1. TOP NAVIGATION CONTROLS BAR (STICKY) */}
      <header className="pdf-viewer-header">
        {/* Prominent Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="pdf-viewer-back-btn"
            title="Return to Application"
            aria-label="Return to Application"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
            <span>Back to App</span>
          </button>

          {/* Report Info */}
          <div className="pdf-viewer-meta">
            <div className="pdf-viewer-title">
              {title || `Inspection Report #${inspectionId}`}
            </div>
            <div className="pdf-viewer-sub">
              {poNumber && <span>PO: {poNumber}</span>}
              {status && (
                <span className={`pdf-status-pill ${status === 'Approved' ? 'approved' : status === 'Submitted' ? 'submitted' : ''}`}>
                  {status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="pdf-viewer-actions">
          {/* Native Mobile Share */}
          <button
            type="button"
            onClick={handleShare}
            className="pdf-btn pdf-btn-icon"
            title="Share Report (WhatsApp / Drive)"
            aria-label="Share Report"
          >
            <Share2 size={16} />
            <span className="pdf-btn-label">{shareSuccess ? 'Copied!' : 'Share'}</span>
          </button>

          {/* Download Direct */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="pdf-btn pdf-btn-download"
            title="Download PDF to device"
            aria-label="Download PDF"
          >
            {downloading ? <RefreshCw size={15} className="spin" /> : <Download size={15} />}
            <span className="pdf-btn-label">Download</span>
          </button>

          {/* Print (Desktop) */}
          <button
            type="button"
            onClick={handlePrint}
            className="pdf-btn pdf-btn-icon desktop-only-btn"
            title="Print PDF Certificate"
            aria-label="Print Report"
          >
            <Printer size={16} />
          </button>

          {/* Fallback New Window */}
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pdf-btn pdf-btn-icon desktop-only-btn"
            title="Open in Browser New Tab"
            aria-label="Open in Browser Tab"
          >
            <ExternalLink size={16} />
          </a>

          {/* Close Icon */}
          <button
            type="button"
            onClick={onClose}
            className="pdf-btn pdf-btn-close"
            title="Close Viewer"
            aria-label="Close Viewer"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* 2. VIEWER BODY CONTAINER */}
      <div className="pdf-viewer-body">
        {loading && (
          <div className="pdf-viewer-loading">
            <div className="pdf-spinner" />
            <div style={{ marginTop: '1rem', fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>
              Loading Official Inspection Certificate...
            </div>
            <div style={{ marginTop: '0.35rem', color: '#94A3B8', fontSize: '0.8rem' }}>
              Preparing high-resolution cryptographic document
            </div>
          </div>
        )}

        {loadError && (
          <div className="pdf-viewer-error">
            <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1rem' }}>
              Document Preview Unavailable in Mobile Frame
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', maxWidth: '360px', margin: '0.5rem auto 1.25rem auto' }}>
              Your mobile device can directly download or open this official certificate.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={handleDownload} className="btn btn-primary btn-sm">
                <Download size={15} /> Download PDF File
              </button>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ color: '#FFFFFF', borderColor: '#475569' }}>
                <ExternalLink size={15} /> Open Externally
              </a>
            </div>
          </div>
        )}

        {/* Embedded PDF iframe */}
        <iframe
          id="pdf-report-frame"
          src={`${pdfUrl}#toolbar=0&navpanes=0`}
          title={`Inspection Certificate #${inspectionId}`}
          className="pdf-iframe-element"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setLoadError(true); }}
        />
      </div>

      {/* 3. MOBILE FLOATING RETURN BAR (Appears on small screens for instant return) */}
      <footer className="pdf-viewer-mobile-bottom-bar">
        <button
          type="button"
          onClick={onClose}
          className="pdf-mobile-return-btn"
        >
          <ArrowLeft size={16} />
          <span>Exit PDF &amp; Return to App</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          className="pdf-mobile-download-btn"
        >
          <Download size={16} />
          <span>Save PDF</span>
        </button>
      </footer>
    </div>
  );
}

/**
 * Global helper to trigger the PDF Report Viewer Modal from anywhere in the application
 */
export function openPdfViewer(inspectionId, meta = {}) {
  if (!inspectionId) return;
  window.dispatchEvent(
    new CustomEvent('apex:open_pdf_modal', {
      detail: {
        id: inspectionId,
        title: meta.title || `Inspection Report #${inspectionId}`,
        poNumber: meta.poNumber || meta.po_number || '',
        status: meta.status || ''
      }
    })
  );
}
