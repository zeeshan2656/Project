import React from 'react';
import { reportApi } from '../services/api';

/**
 * Universal PDF Handler for the Entire Application:
 * - Desktop Screen (width > 768px): Opens PDF in next tab (window.open(url, '_blank'))
 * - Mobile Screen (width <= 768px): Directly downloads the PDF file to device storage
 */
export function openPdfViewer(inspectionId, meta = {}) {
  if (!inspectionId) return;

  const isMobile = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  const filename = meta.filename || `Inspection_${inspectionId}_Report.pdf`;

  if (isMobile) {
    // 📱 MOBILE SCREEN: Directly download the PDF file
    const downloadUrl = reportApi.getPdfUrl(inspectionId, true);
    
    // Direct link click triggers native mobile browser download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    link.download = filename;
    link.target = '_self';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also trigger blob download fallback to ensure file is saved on device
    reportApi.downloadPdf(inspectionId, filename).catch(() => {});
  } else {
    // 🖥️ DESKTOP SCREEN: Open PDF in next tab
    const viewUrl = reportApi.getPdfUrl(inspectionId, false);
    window.open(viewUrl, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Legacy modal component export (no-op since viewer is replaced by direct download/next-tab)
 */
export function PdfReportViewerModal() {
  return null;
}
