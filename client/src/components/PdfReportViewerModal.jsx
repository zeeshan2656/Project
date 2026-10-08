import React, { useState, useEffect, useRef } from 'react';
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
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { reportApi } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

/**
 * Mobile-First In-App PDF Report Viewer with Native Canvas Rendering (PDF.js)
 * 
 * Solves the critical mobile issues:
 * 1. Mobile Android Chrome does NOT support inline PDFs in iframes, causing Chrome 
 *    to display an external "pdf [Open]" button which then navigates away with no back button.
 * 2. By rendering PDF pages directly to HTML5 <canvas> elements:
 *    - The user IMMEDIATELY sees the actual inspection report table & photo evidence in-app.
 *    - No "Open" button is ever shown!
 *    - The header with "[ ← Back to App ]" remains permanently pinned at the top.
 *    - Mobile bottom bar with "[ ← Exit PDF & Return to App ]" allows instant return anytime.
 *    - Full gesture / hardware back button support via window.history popstate.
 *    - Pinch-to-zoom and +/- scale controls.
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
  const [loadError, setLoadError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0); // 1.0 = auto-fit width
  const [renderingPages, setRenderingPages] = useState(false);

  const containerRef = useRef(null);
  const canvasRefs = useRef([]);

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

  // Load PDF Document via ArrayBuffer when modal opens
  useEffect(() => {
    if (!isOpen || !inspectionId) return;

    let isMounted = true;
    setLoading(true);
    setLoadError('');
    setPdfDoc(null);
    setNumPages(0);
    setZoomScale(1.0);

    const loadPdfData = async () => {
      try {
        const token = localStorage.getItem('apex_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const fetchUrl = `/api/reports/inspection/${inspectionId}/pdf`;
        
        const response = await fetch(fetchUrl, { headers });
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}: Failed to load inspection certificate`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (!isMounted) return;

        const typedArray = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({
          data: typedArray,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        console.error('[PdfReportViewer] Error loading PDF:', err);
        if (isMounted) {
          setLoadError(err.message || 'Failed to render PDF document');
          setLoading(false);
        }
      }
    };

    loadPdfData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, inspectionId]);

  // Render all PDF pages onto HTML5 canvas elements
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isCancelled = false;
    setRenderingPages(true);

    const renderAllPages = async () => {
      // Calculate available width inside container
      const containerWidth = containerRef.current 
        ? containerRef.current.clientWidth 
        : (window.innerWidth || 360);
      
      // On mobile, use containerWidth - 16px padding. Max width 850px on desktop
      const maxDocWidth = Math.min(containerWidth - 20, 850);
      const availableWidth = Math.max(maxDocWidth, 280);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (isCancelled) break;
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) continue;

        try {
          const page = await pdfDoc.getPage(pageNum);
          if (isCancelled) break;

          const baseViewport = page.getViewport({ scale: 1.0 });
          // Base fit-to-width scale multiplied by user zoom
          const fitScale = (availableWidth / baseViewport.width) * zoomScale;
          const viewport = page.getViewport({ scale: fitScale });

          // Support High-DPI / Retina mobile screens for crisp vector rendering
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const ctx = canvas.getContext('2d');
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
          ctx.scale(pixelRatio, pixelRatio);

          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
        } catch (err) {
          console.warn(`[PdfReportViewer] Error rendering page ${pageNum}:`, err);
        }
      }

      if (!isCancelled) {
        setRenderingPages(false);
      }
    };

    renderAllPages();

    const handleResize = () => {
      renderAllPages();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
    };
  }, [pdfDoc, numPages, zoomScale]);

  if (!isOpen || !inspectionId) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const filename = `Inspection_${inspectionId}_Report.pdf`;
      await reportApi.downloadPdf(inspectionId, filename);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Direct window download fallback
      const a = document.createElement('a');
      a.href = `${pdfUrl}&download=true`;
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
    window.open(pdfUrl, '_blank');
  };

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(prev - 0.25, 0.6));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
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
          {/* Zoom Controls */}
          {numPages > 0 && !loading && (
            <div className="pdf-zoom-bar">
              <button 
                type="button" 
                onClick={handleZoomOut} 
                className="pdf-zoom-btn" 
                title="Zoom Out"
                disabled={zoomScale <= 0.6}
              >
                <ZoomOut size={15} />
              </button>
              <button 
                type="button" 
                onClick={handleResetZoom} 
                className="pdf-zoom-label-btn" 
                title="Reset to Fit Width"
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button 
                type="button" 
                onClick={handleZoomIn} 
                className="pdf-zoom-btn" 
                title="Zoom In"
                disabled={zoomScale >= 2.5}
              >
                <ZoomIn size={15} />
              </button>
            </div>
          )}

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

      {/* 2. VIEWER BODY CONTAINER (Scrollable HTML5 Canvas Container) */}
      <div className="pdf-viewer-body" ref={containerRef}>
        {loading && (
          <div className="pdf-viewer-loading">
            <div className="pdf-spinner" />
            <div style={{ marginTop: '1rem', fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>
              Loading Official Inspection Certificate...
            </div>
            <div style={{ marginTop: '0.35rem', color: '#94A3B8', fontSize: '0.8rem' }}>
              Rendering high-resolution vector report in-app
            </div>
          </div>
        )}

        {loadError && (
          <div className="pdf-viewer-error">
            <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 800, color: '#FFFFFF', fontSize: '1rem' }}>
              Unable to load document preview
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', maxWidth: '360px', margin: '0.5rem auto 1.25rem auto' }}>
              {loadError}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={handleDownload} className="btn btn-primary btn-sm">
                <Download size={15} /> Download PDF File
              </button>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm" style={{ color: '#FFFFFF', borderColor: '#475569' }}>
                <ExternalLink size={15} /> Open in New Tab
              </a>
            </div>
          </div>
        )}

        {/* In-App Direct Canvas Rendered Pages */}
        {!loading && !loadError && numPages > 0 && (
          <div className="pdf-pages-scroll-container">
            {Array.from({ length: numPages }).map((_, idx) => (
              <div key={idx} className="pdf-page-wrapper">
                <div className="pdf-page-indicator">
                  Page {idx + 1} of {numPages}
                </div>
                <canvas 
                  ref={el => { canvasRefs.current[idx] = el; }} 
                  className="pdf-page-canvas" 
                />
              </div>
            ))}
          </div>
        )}
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
