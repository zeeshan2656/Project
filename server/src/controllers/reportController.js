const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { query } = require('../config/db');

function parseJSON(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

const sharp = require('sharp');

function formatDate(dateStr) {
  if (!dateStr) return '24, AUG, 2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${d.getDate()}, ${months[d.getMonth()]}, ${d.getFullYear()}`;
  } catch (_) {
    return dateStr;
  }
}

function getLocalMediaPath(urlPath) {
  if (!urlPath) return null;
  const clean = urlPath.replace(/^\/media\//, '').replace(/^media\//, '');
  const candidate1 = path.resolve(__dirname, '../../../../media', clean);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(__dirname, '../../../media', clean);
  if (fs.existsSync(candidate2)) return candidate2;
  const candidate3 = path.resolve(process.cwd(), '../media', clean);
  if (fs.existsSync(candidate3)) return candidate3;
  return null;
}

async function resolveImageBuffer(imgUrl) {
  try {
    if (!imgUrl) return null;
    const localPath = getLocalMediaPath(imgUrl);
    if (!localPath || !fs.existsSync(localPath)) return null;

    const buffer = await sharp(localPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return buffer;
  } catch (err) {
    console.warn('Failed to resolve image buffer for PDF report:', imgUrl, err.message);
    return null;
  }
}

/**
 * Generate & Stream Official Single-Page Inspection Report PDF
 * Matching the exact industry standard certificate format:
 * - Page 1: Single-page complete report with Disposition, General & PO info,
 *   Sampling, Defect Codes Grid, Faults & Defects Found table with Code No,
 *   Dimensional Matrix (13 samples), AQL 2.5 / 4.0 Tables, Remarks & Signatures.
 * - Page 2+: Photo Evidence Gallery with Code No for all attached inspection photos.
 */
async function exportInspectionPDF(req, res) {
  try {
    const { id } = req.params;

    // 1. Fetch site settings
    const settingsRows = await query('SELECT company_name, tagline, contact_email, contact_phone FROM site_settings LIMIT 1');
    const branding = settingsRows[0] || {
      company_name: 'ApexFabric Quality Audits',
      tagline: 'Independent Third-Party Quality Inspection Platform',
      contact_email: 'operations@apexfabric-audit.com',
      contact_phone: '+92 300 8472910'
    };

    // 2. Fetch full inspection details
    const inspectionRows = await query(`
      SELECT ins.*,
             o.order_number, o.po_number, o.product_type, o.product_description,
             o.total_quantity AS order_total_quantity,
             o.factory_name, o.factory_city, o.factory_address, o.factory_contact_name, o.factory_contact_phone,
             cust.name AS customer_name, cust.company_name AS customer_company,
             tmpl.title AS template_title, tmpl.product_type AS template_product_type,
             tmpl.defect_master_config, tmpl.aql_config, tmpl.dimensional_config,
             emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code, emp.phone AS employee_phone,
             reviewer.name AS reviewer_name
      FROM inspection_sheets ins
      JOIN orders o ON ins.order_id = o.id
      JOIN users cust ON o.customer_id = cust.id
      JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
      JOIN users emp ON ins.assigned_employee_id = emp.id
      LEFT JOIN users reviewer ON ins.reviewed_by = reviewer.id
      WHERE ins.id = ? OR ins.sheet_number = ?
    `, [id, id]);

    if (inspectionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection sheet not found.' });
    }


    const ins = inspectionRows[0];

    // Fetch master defect catalog
    const catalogRows = await query(`
      SELECT code, name, category, sort_order 
      FROM defect_masters 
      ORDER BY CAST(code AS UNSIGNED) ASC, id ASC
    `);

    // Build lookup maps for robust code/name resolution
    const catalogByCode = {};
    const catalogByName = {};
    catalogRows.forEach(c => {
      catalogByCode[String(c.code)] = c;
      if (c.name) catalogByName[c.name.trim().toLowerCase()] = c;
    });

    const templateCodes = parseJSON(ins.defect_master_config, null);
    const activeCodeFilter = Array.isArray(templateCodes) && templateCodes.length > 0 && templateCodes.length < 55
      ? new Set(templateCodes.map(String))
      : null;

    // Parse structured JSON fields
    const genInfo = parseJSON(ins.general_info_data, {
      inspector_name: ins.assigned_employee_name,
      inspection_date: new Date().toISOString().split('T')[0],
      department: 'Quality Assurance / Fabric Inspection',
      factory_rep: ins.factory_contact_name || '',
      qa_rep: 'Apex Directorate'
    });

    const poInfo = parseJSON(ins.order_autofill_data, {
      vendor_supplier: ins.factory_name,
      po_number: ins.po_number,
      reference_number: ins.order_number,
      article: ins.product_type,
      article_quantity: ins.ordered_quantity || 0,
      first_ship_qty: ins.ordered_quantity || 0,
      ready_qty: ins.ordered_quantity || 0,
      short_qty: 0
    });

    const samplingPlan = parseJSON(ins.sampling_plan_data, {
      lot_size: ins.ordered_quantity || 5000,
      sample_size: 80,
      visual_sample_size_aql_4: 80,
      visual_sample_size_aql_2_5: 0,
      aql_level: 'Level I',
      labeling_sample_size: 30,
      dimensional_sample_size: 13
    });

    const defectFindings = parseJSON(ins.defect_findings_data, []);
    const dimensionalData = parseJSON(ins.dimensional_data, []);

    // Fetch uploaded photos from database
    const dbPhotos = await query(`
      SELECT * FROM inspection_photos WHERE sheet_id = ? ORDER BY id ASC
    `, [ins.id]);

    // Consolidate all photos with Code Numbers
    const photosWithCodes = [];

    // From defect findings
    defectFindings.forEach(df => {
      let codeNum = df.defect_code || df.code || (df.defect_id ? String(df.defect_id) : '');
      let defectName = df.defect_name || df.name;
      if (!codeNum && defectName) {
        const match = catalogByName[defectName.trim().toLowerCase()];
        if (match) codeNum = match.code;
      }
      if (!defectName && codeNum) {
        const match = catalogByCode[String(codeNum)];
        if (match) defectName = match.name;
      }

      if (Array.isArray(df.images)) {
        df.images.forEach(img => {
          if (img && !photosWithCodes.some(p => p.url === img)) {
            photosWithCodes.push({
              url: img,
              code: codeNum || '',
              defectName: defectName || 'Defect Evidence',
              category: df.category || 'Visual Defect',
              severity: (df.major_count > 0 ? 'MAJOR' : (df.critical_count > 0 ? 'CRITICAL' : 'MINOR')),
              caption: df.remarks || `Defect evidence for ${defectName || 'defect'}`
            });
          }
        });
      }
    });

    // From dbPhotos
    dbPhotos.forEach(p => {
      if (p.photo_url && !photosWithCodes.some(pw => pw.url === p.photo_url)) {
        let codeNum = null;
        let name = p.caption || 'Field Inspection Evidence';
        if (p.defect_tag) {
          const match = p.defect_tag.match(/\d+/);
          if (match) codeNum = match[0];
        }
        if (!codeNum) {
          const matchDf = defectFindings.find(df => 
            (df.defect_name && p.caption && p.caption.includes(df.defect_name)) ||
            (df.defect_code && p.defect_tag && p.defect_tag.includes(df.defect_code))
          );
          if (matchDf) {
            codeNum = matchDf.defect_code || matchDf.code;
            name = matchDf.defect_name || matchDf.name;
          }
        }
        if (!codeNum && name) {
          const matchCat = catalogByName[name.trim().toLowerCase()];
          if (matchCat) codeNum = matchCat.code;
        }
        photosWithCodes.push({
          url: p.photo_url,
          code: codeNum || '',
          defectName: name,
          category: p.defect_tag || 'Inspection Evidence',
          severity: 'EVIDENCE',
          caption: p.caption || 'On-site audit photo'
        });
      }
    });

    // 3. Initialize PDFDocument (Exact A4 size: 595.28 x 841.89 pt)
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 12, bottom: 10, left: 14, right: 14 },
      bufferPages: true,
      autoFirstPage: true
    });

    const isDownload = req.query.download === 'true' || req.query.download === '1';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${ins.sheet_number}_Report.pdf"`);

    doc.pipe(res);

    const pageWidth = 595.28;
    const leftX = 14;
    const tableWidth = pageWidth - (leftX * 2); // 567.28 pt

    // Colors matching example report
    const COLOR_TITLE_BG = '#C5D9F1';
    const COLOR_HEADER_DARK = '#4F6272';
    const COLOR_HEADER_GRAY = '#D9D9D9';
    const COLOR_HEADER_DIM = '#52525B';
    const COLOR_FAULT_HEADER = '#D9E1F2';
    const COLOR_CELL_GREEN = '#C6EFCE';
    const COLOR_CELL_ORANGE = '#FFEB9C';
    const COLOR_CELL_RED = '#FFC7CE';
    const COLOR_TOTAL_BLUE = '#BDD7EE';
    const COLOR_BORDER = '#000000';
    const BORDER_WIDTH = 0.5;

    let curY = 12;

    function drawBox(x, y, w, h, fill = null, border = true) {
      if (fill) {
        doc.rect(x, y, w, h).fillColor(fill).fill();
      }
      if (border) {
        doc.rect(x, y, w, h).lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER).stroke();
      }
    }

    function drawText(text, x, y, w, h, options = {}) {
      const {
        font = 'Helvetica',
        size = 7,
        color = '#000000',
        align = 'left',
        bold = false,
        baseline = 'middle'
      } = options;

      const fontName = bold ? 'Helvetica-Bold' : font;
      doc.font(fontName).fontSize(size).fillColor(color);

      const str = String(text !== undefined && text !== null ? text : '');
      if (!str) return;

      // Handle multi-line strings if explicit \n
      if (str.includes('\n')) {
        const lines = str.split('\n');
        const lineHeight = size + 1.8;
        const totalTextHeight = lines.length * lineHeight;
        const startY = y + Math.max(0, (h - totalTextHeight) / 2) + 0.4;
        lines.forEach((line, lIdx) => {
          doc.text(line.trim(), x, startY + (lIdx * lineHeight), {
            width: w,
            align: align,
            lineBreak: false,
            ellipsis: true
          });
        });
        return;
      }

      // Single line text: vertically centered between upper line (y) and lower line (y + h)
      let textY = y;
      if (baseline === 'middle') {
        const offset = h < 8 ? 0.2 : 0.5;
        textY = y + Math.max(0, (h - size) / 2) - offset;
      } else if (baseline === 'top') {
        textY = y + 1.2;
      }
      doc.text(str, x, textY, {
        width: w,
        align: align,
        lineBreak: false,
        ellipsis: true
      });
    }

    // ==========================================
    // ADAPTIVE LAYOUT ENGINE FOR DEFECTS & SECTIONS
    // ==========================================
    const numDefects = defectFindings.length;

    // Baseline: defects table lines should be at least 10 in report (filled with data, or empty rows).
    // If defect list increases from 10 to 50+, the system dynamically analyzes the count
    // and adaptively compresses section heights and font sizes across the whole report.
    const comp = numDefects <= 10 ? 0 : Math.min(1.0, (numDefects - 10) / 40);
    const lerp = (minVal, maxVal) => maxVal - ((maxVal - minVal) * comp);

    curY = lerp(8, 12);

    // ==========================================
    // SECTION 1: TOP HEADER "INSPECTION REPORT"
    // ==========================================
    const titleHeight = lerp(18, 26);
    drawBox(leftX, curY, tableWidth, titleHeight, COLOR_TITLE_BG, true);
    drawText('INSPECTION REPORT', leftX, curY, tableWidth, titleHeight, {
      bold: true,
      size: lerp(9.5, 11.5),
      color: '#0F172A',
      align: 'center',
      baseline: 'middle'
    });
    curY += titleHeight;

    // ==========================================
    // SECTION 2: DISPOSITION & AUDITED BY / DATE
    // ==========================================
    const row1Height = lerp(22, 34);
    const dispWidth = 320;
    const auditWidth = tableWidth - dispWidth;

    // Left: Disposition Box
    drawBox(leftX, curY, dispWidth, row1Height, '#FFFFFF', true);
    drawText('Disposition', leftX + 5, curY + lerp(1, 2), 100, lerp(7, 10), { bold: true, size: lerp(6.5, 7.5) });

    const currentDisp = (ins.disposition || 'Accepted').toLowerCase();
    const isAccepted = currentDisp.includes('accept') && !currentDisp.includes('rework');
    const isRejected = currentDisp.includes('reject');
    const isAcceptRework = currentDisp.includes('rework') && currentDisp.includes('accept');
    const isRework = (currentDisp.includes('rework') && !currentDisp.includes('accept')) || currentDisp.includes('hold');

    const dispLine1Y = curY + lerp(7.5, 12);
    const dispLine2Y = curY + lerp(14, 22);
    const dispFont = lerp(5.8, 7.0);

    drawText(`${isAccepted ? '[X]' : '[  ]'} Accepted`, leftX + 10, dispLine1Y, 130, lerp(6.5, 10), { bold: isAccepted, size: dispFont, baseline: 'middle' });
    drawText(`${isRejected ? '[X]' : '[  ]'} Rejected`, leftX + 155, dispLine1Y, 130, lerp(6.5, 10), { bold: isRejected, size: dispFont, baseline: 'middle' });
    drawText(`${isAcceptRework ? '[X]' : '[  ]'} Accepted After Rework`, leftX + 10, dispLine2Y, 140, lerp(6.5, 10), { bold: isAcceptRework, size: dispFont, baseline: 'middle' });
    drawText(`${isRework ? '[X]' : '[  ]'} Rework`, leftX + 155, dispLine2Y, 130, lerp(6.5, 10), { bold: isRework, size: dispFont, baseline: 'middle' });

    // Right: Audited By / Date Box
    const auditX = leftX + dispWidth;
    const auditSubHeaderW = 86;
    drawBox(auditX, curY, auditSubHeaderW, row1Height, COLOR_HEADER_DIM, true);
    drawText('Audited By / Date:', auditX + 2, curY, auditSubHeaderW - 4, row1Height, {
      bold: true,
      size: lerp(6.5, 7.5),
      color: '#FFFFFF',
      align: 'center',
      baseline: 'middle'
    });

    drawBox(auditX + auditSubHeaderW, curY, auditWidth - auditSubHeaderW, row1Height, '#FFFFFF', true);
    const inspectorName = genInfo.inspector_name || ins.assigned_employee_name || 'Kashif Mahmood';
    const insDate = formatDate(genInfo.inspection_date || ins.created_at);
    const auditFont = lerp(6.2, 7.5);
    const auditHalfH = row1Height / 2;
    drawText(`NAME:-  ${inspectorName},`, auditX + auditSubHeaderW + 6, curY, auditWidth - auditSubHeaderW - 12, auditHalfH, { bold: true, size: auditFont, baseline: 'middle' });
    drawText(`DATED:-   ${insDate}`, auditX + auditSubHeaderW + 6, curY + auditHalfH, auditWidth - auditSubHeaderW - 12, auditHalfH, { bold: true, size: auditFont, baseline: 'middle' });
    curY += row1Height;

    // ==========================================
    // SECTION 3: LAB REPORT & FINISHED GOODS STATUS
    // ==========================================
    const row2Height = lerp(12, 18);
    const sec3Font = lerp(5.8, 7.0);
    drawBox(leftX, curY, dispWidth, row2Height, '#FFFFFF', true);
    drawText('Lab report perform date', leftX + 5, curY, 110, row2Height, { bold: true, size: sec3Font, baseline: 'middle' });
    drawText('[  ] Accept      [  ] Reject      [X] No report', leftX + 118, curY, dispWidth - 122, row2Height, { size: sec3Font, baseline: 'middle' });

    drawBox(auditX, curY, auditWidth, row2Height, '#FFFFFF', true);
    drawText('[X] Finished Goods             [  ] In Process', auditX + 14, curY, auditWidth - 20, row2Height, { bold: true, size: sec3Font, baseline: 'middle' });
    curY += row2Height;

    // ==========================================
    // SECTION 4: GENERAL & P.O INFORMATION & SAMPLING PLANS
    // ==========================================
    const infoCol1W = 185;
    const infoCol2W = 165;
    const infoCol3W = tableWidth - infoCol1W - infoCol2W;

    const infoHeaderH = lerp(10.0, 15.0);
    const infoHdrFont = lerp(5.5, 7.0);
    drawBox(leftX, curY, infoCol1W, infoHeaderH, COLOR_HEADER_GRAY, true);
    drawText('General Information', leftX + 5, curY, infoCol1W - 10, infoHeaderH, { bold: true, size: infoHdrFont, baseline: 'middle' });

    drawBox(leftX + infoCol1W, curY, infoCol2W, infoHeaderH, COLOR_HEADER_GRAY, true);
    drawText('P.O Information', leftX + infoCol1W + 5, curY, infoCol2W - 10, infoHeaderH, { bold: true, size: infoHdrFont, baseline: 'middle' });

    drawBox(leftX + infoCol1W + infoCol2W, curY, infoCol3W, infoHeaderH, COLOR_HEADER_GRAY, true);
    drawText('Sampling plans', leftX + infoCol1W + infoCol2W + 5, curY, infoCol3W - 10, infoHeaderH, { bold: true, size: infoHdrFont, baseline: 'middle' });
    curY += infoHeaderH;

    const rowH = lerp(9.2, 14.2);
    const infoDataFont = lerp(5.2, 6.5);
    const generalRows = [
      {
        c1Label: 'Vendor name:',
        c1Val: poInfo.vendor_supplier || ins.factory_name || 'Supplier Name',
        c2Label: 'PO #:',
        c2Val: String(poInfo.po_number || ins.po_number || '0'),
        c3Label: 'Labeling Sample Size (square root):',
        c3Val: String(samplingPlan.labeling_sample_size || 30)
      },
      {
        c1Label: 'Reference Number:',
        c1Val: String(poInfo.reference_number || ins.order_number || '1122'),
        c2Label: 'Quantity Ready (case or bale/La):',
        c2Val: String(poInfo.ready_cases || 0),
        c3Label: 'Visual Sample Size/AQL 4 Level I:',
        c3Val: `${samplingPlan.visual_sample_size_aql_4 || 80} Pcs`
      },
      {
        c1Label: 'Article Quantity:',
        c1Val: `${(poInfo.article_quantity || ins.ordered_quantity || 0).toLocaleString()}`,
        c2Label: 'Ready Quantity:',
        c2Val: `${(poInfo.ready_qty || ins.ordered_quantity || 0).toLocaleString()} Pcs`,
        c3Label: 'Visual Sample Size/AQL 2.5:',
        c3Val: `${samplingPlan.visual_sample_size_aql_2_5 || 0} Pcs`
      },
      {
        c1Label: 'First Ship Quantity:',
        c1Val: poInfo.first_ship_qty ? String(poInfo.first_ship_qty) : '',
        c2Label: 'Short Quantity:',
        c2Val: String(poInfo.short_qty || 0),
        c3Label: 'Dimensional &Weight Sample Size:',
        c3Val: `${samplingPlan.dimensional_sample_size || 13} pcs`
      }
    ];

    generalRows.forEach(gr => {
      // Col 1
      drawBox(leftX, curY, infoCol1W, rowH, '#FFFFFF', true);
      drawText(gr.c1Label, leftX + 4, curY, 78, rowH, { bold: true, size: infoDataFont, baseline: 'middle' });
      drawText(gr.c1Val, leftX + 82, curY, infoCol1W - 86, rowH, { size: infoDataFont, baseline: 'middle' });

      // Col 2
      const c2X = leftX + infoCol1W;
      drawBox(c2X, curY, infoCol2W, rowH, '#FFFFFF', true);
      drawText(gr.c2Label, c2X + 4, curY, 110, rowH, { bold: true, size: infoDataFont, baseline: 'middle' });
      drawText(gr.c2Val, c2X + 115, curY, infoCol2W - 119, rowH, { size: infoDataFont, baseline: 'middle' });

      // Col 3
      const c3X = c2X + infoCol2W;
      drawBox(c3X, curY, infoCol3W, rowH, '#FFFFFF', true);
      drawText(gr.c3Label, c3X + 4, curY, 155, rowH, { bold: true, size: infoDataFont, baseline: 'middle' });
      drawText(gr.c3Val, c3X + 155, curY, infoCol3W - 159, rowH, { bold: true, size: infoDataFont, align: 'right', baseline: 'middle' });

      curY += rowH;
    });

    // ==========================================
    // SECTION 5: NOTICE BAR "Defected picture is attached for you reference"
    // ==========================================
    const noticeH = lerp(8.5, 13.5);
    drawBox(leftX, curY, tableWidth, noticeH, '#FFFFFF', true);
    drawText('Defected picture is attached for you reference', leftX + 5, curY, tableWidth - 10, noticeH, {
      bold: true,
      font: 'Helvetica-BoldOblique',
      size: lerp(5.2, 6.5),
      baseline: 'middle'
    });
    curY += noticeH;

    // ==========================================
    // SECTION 6: DEFECT CODES GRID
    // Shows the defect codes evaluated/available during audit
    // ==========================================
    const numCols = 5;
    const colGroupW = tableWidth / numCols;
    const codeW = 20;
    const descW = colGroupW - codeW;

    const colHeaders = [
      'FABRICATION',
      'PROCESSING / TRIMS',
      'STITCHING / PACKING',
      'OTHERS',
      'OTHERS'
    ];

    const masterHeaderH = lerp(9.0, 12.5);
    const masterHdrFont = lerp(4.8, 5.5);
    for (let c = 0; c < numCols; c++) {
      const cgX = leftX + (c * colGroupW);
      drawBox(cgX, curY, codeW, masterHeaderH, COLOR_HEADER_DARK, true);
      drawText('CODE', cgX, curY, codeW, masterHeaderH, { bold: true, size: masterHdrFont, color: '#FFFFFF', align: 'center', baseline: 'middle' });

      drawBox(cgX + codeW, curY, descW, masterHeaderH, COLOR_HEADER_DARK, true);
      drawText(colHeaders[c], cgX + codeW + 2, curY, descW - 4, masterHeaderH, { bold: true, size: masterHdrFont, color: '#FFFFFF', align: 'center', baseline: 'middle' });
    }
    curY += masterHeaderH;

    // Organize into 5 columns of 11 rows = 55 codes matching master defect reference
    const totalMasterRows = 11;
    const masterGridRowH = lerp(7.0, 10.2);
    const masterCodeFont = lerp(4.8, 5.5);
    const masterDescFont = lerp(4.5, 5.2);

    const col1 = catalogRows.slice(0, 11);
    const col2 = catalogRows.slice(11, 22);
    const col3 = catalogRows.slice(22, 33);
    const col4 = catalogRows.slice(33, 44);
    const col5 = catalogRows.slice(44, 55);
    const columnsData = [col1, col2, col3, col4, col5];

    for (let r = 0; r < totalMasterRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const cgX = leftX + (c * colGroupW);
        const item = columnsData[c][r] || null;
        const isItemActive = item && (!activeCodeFilter || activeCodeFilter.has(String(item.code)));

        drawBox(cgX, curY, codeW, masterGridRowH, '#FFFFFF', true);
        if (item && isItemActive) {
          drawText(String(item.code || ''), cgX, curY, codeW, masterGridRowH, {
            bold: true,
            size: masterCodeFont,
            align: 'center',
            baseline: 'middle'
          });
        }

        drawBox(cgX + codeW, curY, descW, masterGridRowH, '#FFFFFF', true);
        if (item && isItemActive) {
          drawText(item.name || '', cgX + codeW + 3, curY, descW - 6, masterGridRowH, {
            size: masterDescFont,
            baseline: 'middle'
          });
        }
      }
      curY += masterGridRowH;
    }

    // ==========================================
    // SECTION 7: FAULTS AND DEFECTS FOUND TABLE
    // Columns: Code | FAULTS AND DEFECTS FOUND | MINOR | MAJOR | CRITICAL | MIN % | MAJ % | CRI % | Remarks
    // Displays user inputs entered during inspection (e.g. "Dust")
    // ==========================================
    const faultsHeaderH = lerp(10.5, 14.5);
    const faultsHdrFont = lerp(5.0, 6.0);
    const fColCode = 26;
    const fColName = 205;
    const fColMin = 44;
    const fColMaj = 44;
    const fColCri = 44;
    const fColMinPct = 38;
    const fColMajPct = 38;
    const fColCriPct = 38;
    const fColRemarks = tableWidth - (fColCode + fColName + fColMin + fColMaj + fColCri + fColMinPct + fColMajPct + fColCriPct);

    const faultCols = [
      { name: 'Code', w: fColCode },
      { name: 'FAULTS AND DEFECTS FOUND', w: fColName },
      { name: 'MINOR', w: fColMin },
      { name: 'MAJOR', w: fColMaj },
      { name: 'CRITICAL', w: fColCri },
      { name: 'MIN %', w: fColMinPct },
      { name: 'MAJ %', w: fColMajPct },
      { name: 'CRI %', w: fColCriPct },
      { name: 'Remarks', w: fColRemarks }
    ];

    let currentFaultX = leftX;
    faultCols.forEach(fc => {
      drawBox(currentFaultX, curY, fc.w, faultsHeaderH, COLOR_FAULT_HEADER, true);
      drawText(fc.name, currentFaultX, curY, fc.w, faultsHeaderH, {
        bold: true,
        size: faultsHdrFont,
        color: '#000000',
        align: 'center',
        baseline: 'middle'
      });
      currentFaultX += fc.w;
    });
    curY += faultsHeaderH;

    // Remaining height calculation for Section 7:
    const totalRowH = lerp(10.0, 14.0);
    const notice2H = lerp(8.5, 13.5);
    const dimHeaderH = lerp(9.0, 13.0);
    const dimSubH = lerp(8.0, 12.0);
    const dimRowH = lerp(6.2, 9.8);
    const dimDefectsH = lerp(8.0, 12.0);
    const aqlHdrH = lerp(8.5, 12.5);
    const aqlSubH = lerp(7.5, 11.0);
    const aqlRowH = lerp(6.5, 10.0);
    const remarksH = lerp(13.0, 24.0);
    const sigSpacerH = lerp(2.0, 6.0);
    const sigH = lerp(18.0, 34.0);

    const nonFaultBelowSection7 = totalRowH + notice2H + dimHeaderH + (dimSubH * 2) + 
      (dimRowH * 16) + dimDefectsH + aqlHdrH + aqlSubH + (aqlRowH * 5) + 
      remarksH + sigSpacerH + sigH;

    const targetPageBottom = 828.0;
    const availableForFaultRows = targetPageBottom - curY - nonFaultBelowSection7;

    const minReadableFaultRowH = 6.4;
    const maxPage1FaultRows = Math.floor(availableForFaultRows / minReadableFaultRowH);

    // Base requirement: always at least 10 rows in report. If defects > 10, display up to maxPage1FaultRows
    const page1FaultCount = numDefects <= 10 
      ? 10 
      : Math.min(numDefects, maxPage1FaultRows);

    const faultRowH = availableForFaultRows / page1FaultCount;
    const faultFont = Math.max(4.5, Math.min(6.5, faultRowH * 0.52));
    const faultCodeFont = Math.max(4.6, Math.min(6.5, faultRowH * 0.54));
    const faultNumFont = Math.max(4.6, Math.min(7.0, faultRowH * 0.55));
    const faultPctFont = Math.max(4.3, Math.min(6.0, faultRowH * 0.48));
    const faultRemarksFont = Math.max(4.2, Math.min(6.0, faultRowH * 0.48));

    const sampleDenominator = parseInt(samplingPlan.visual_sample_size_aql_4 || samplingPlan.sample_size || 80, 10) || 80;

    let totalMinor = 0;
    let totalMajor = 0;
    let totalCritical = 0;

    for (let i = 0; i < page1FaultCount; i++) {
      const df = defectFindings[i] || null;
      let fx = leftX;

      const m = df ? (parseInt(df.minor_count || 0, 10) || 0) : 0;
      const maj = df ? (parseInt(df.major_count || 0, 10) || 0) : 0;
      const c = df ? (parseInt(df.critical_count || 0, 10) || 0) : 0;

      totalMinor += m;
      totalMajor += maj;
      totalCritical += c;

      const mPct = df ? ((m / sampleDenominator) * 100).toFixed(2) + '%' : '';
      const majPct = df ? ((maj / sampleDenominator) * 100).toFixed(2) + '%' : '';
      const cPct = df ? ((c / sampleDenominator) * 100).toFixed(2) + '%' : '';

      let codeNum = df ? (df.defect_code || df.code || (df.defect_id ? String(df.defect_id) : '')) : '';

      // User input takes top precedence for the defect found (e.g. "Dust")
      let defectName = df ? (df.user_input || df.custom_defect_name || df.defect_description || df.defect_name || df.name || '') : '';
      if (!defectName && df && df.remarks && df.remarks.trim().length > 0) {
        defectName = df.remarks.trim();
      }
      if (!codeNum && defectName) {
        const match = catalogByName[defectName.trim().toLowerCase()];
        if (match) codeNum = match.code;
      }
      if (!defectName && codeNum) {
        const match = catalogByCode[String(codeNum)];
        if (match) defectName = match.name;
      }

      // Code
      drawBox(fx, curY, fColCode, faultRowH, '#FFFFFF', true);
      if (codeNum) {
        drawText(String(codeNum), fx, curY, fColCode, faultRowH, { bold: true, size: faultCodeFont, align: 'center', baseline: 'middle' });
      }
      fx += fColCode;

      // Defect Name (User input)
      drawBox(fx, curY, fColName, faultRowH, '#FFFFFF', true);
      if (defectName) {
        drawText(defectName, fx + 4, curY, fColName - 8, faultRowH, { bold: true, size: faultFont, align: 'center', baseline: 'middle' });
      }
      fx += fColName;

      // MINOR (soft green cell if > 0)
      drawBox(fx, curY, fColMin, faultRowH, m > 0 ? COLOR_CELL_GREEN : '#FFFFFF', true);
      if (m > 0) {
        drawText(String(m), fx, curY, fColMin, faultRowH, { bold: true, size: faultNumFont, color: '#006100', align: 'center', baseline: 'middle' });
      }
      fx += fColMin;

      // MAJOR (soft orange cell if > 0)
      drawBox(fx, curY, fColMaj, faultRowH, maj > 0 ? COLOR_CELL_ORANGE : '#FFFFFF', true);
      if (maj > 0) {
        drawText(String(maj), fx, curY, fColMaj, faultRowH, { bold: true, size: faultNumFont, color: '#9C6500', align: 'center', baseline: 'middle' });
      }
      fx += fColMaj;

      // CRITICAL (soft red cell if > 0)
      drawBox(fx, curY, fColCri, faultRowH, c > 0 ? COLOR_CELL_RED : '#FFFFFF', true);
      if (c > 0) {
        drawText(String(c), fx, curY, fColCri, faultRowH, { bold: true, size: faultNumFont, color: '#9C0006', align: 'center', baseline: 'middle' });
      }
      fx += fColCri;

      // MIN %
      drawBox(fx, curY, fColMinPct, faultRowH, '#FFFFFF', true);
      if (mPct) {
        drawText(mPct, fx, curY, fColMinPct, faultRowH, { size: faultPctFont, align: 'center', baseline: 'middle' });
      }
      fx += fColMinPct;

      // MAJ %
      drawBox(fx, curY, fColMajPct, faultRowH, '#FFFFFF', true);
      if (majPct) {
        drawText(majPct, fx, curY, fColMajPct, faultRowH, { size: faultPctFont, align: 'center', baseline: 'middle' });
      }
      fx += fColMajPct;

      // CRI %
      drawBox(fx, curY, fColCriPct, faultRowH, '#FFFFFF', true);
      if (cPct) {
        drawText(cPct, fx, curY, fColCriPct, faultRowH, { size: faultPctFont, align: 'center', baseline: 'middle' });
      }
      fx += fColCriPct;

      // Remarks
      drawBox(fx, curY, fColRemarks, faultRowH, '#FFFFFF', true);
      if (df && df.remarks && df.remarks !== defectName) {
        drawText(df.remarks, fx + 4, curY, fColRemarks - 8, faultRowH, { size: faultRemarksFont, baseline: 'middle' });
      }
      fx += fColRemarks;

      curY += faultRowH;
    }

    // Accumulate overflow defects into total
    if (numDefects > page1FaultCount) {
      for (let i = page1FaultCount; i < numDefects; i++) {
        const df = defectFindings[i];
        if (df) {
          totalMinor += (parseInt(df.minor_count || 0, 10) || 0);
          totalMajor += (parseInt(df.major_count || 0, 10) || 0);
          totalCritical += (parseInt(df.critical_count || 0, 10) || 0);
        }
      }
    }

    // TOTAL Row
    let fx = leftX;
    const totalLabelW = fColCode + fColName;
    const totFont = lerp(5.5, 7.0);
    const totNumFont = lerp(6.0, 7.5);
    const totPctFont = lerp(5.0, 6.0);

    drawBox(fx, curY, totalLabelW, totalRowH, '#FFFFFF', true);
    drawText(numDefects > page1FaultCount ? 'PAGE 1 TOTAL' : 'TOTAL', fx, curY, totalLabelW, totalRowH, { bold: true, size: totFont, align: 'center', baseline: 'middle' });
    fx += totalLabelW;

    drawBox(fx, curY, fColMin, totalRowH, COLOR_TOTAL_BLUE, true);
    drawText(String(totalMinor), fx, curY, fColMin, totalRowH, { bold: true, size: totNumFont, align: 'center', baseline: 'middle' });
    fx += fColMin;

    drawBox(fx, curY, fColMaj, totalRowH, COLOR_TOTAL_BLUE, true);
    drawText(String(totalMajor), fx, curY, fColMaj, totalRowH, { bold: true, size: totNumFont, align: 'center', baseline: 'middle' });
    fx += fColMaj;

    drawBox(fx, curY, fColCri, totalRowH, COLOR_TOTAL_BLUE, true);
    drawText(String(totalCritical), fx, curY, fColCri, totalRowH, { bold: true, size: totNumFont, align: 'center', baseline: 'middle' });
    fx += fColCri;

    const totMinPct = ((totalMinor / sampleDenominator) * 100).toFixed(2) + '%';
    drawBox(fx, curY, fColMinPct, totalRowH, '#FFFFFF', true);
    drawText(totMinPct, fx, curY, fColMinPct, totalRowH, { bold: true, size: totPctFont, align: 'center', baseline: 'middle' });
    fx += fColMinPct;

    const totMajPct = ((totalMajor / sampleDenominator) * 100).toFixed(2) + '%';
    drawBox(fx, curY, fColMajPct, totalRowH, '#FFFFFF', true);
    drawText(totMajPct, fx, curY, fColMajPct, totalRowH, { bold: true, size: totPctFont, align: 'center', baseline: 'middle' });
    fx += fColMajPct;

    const totCriPct = ((totalCritical / sampleDenominator) * 100).toFixed(2) + '%';
    drawBox(fx, curY, fColCriPct, totalRowH, '#FFFFFF', true);
    drawText(totCriPct, fx, curY, fColCriPct, totalRowH, { bold: true, size: totPctFont, align: 'center', baseline: 'middle' });
    fx += fColCriPct;

    drawBox(fx, curY, fColRemarks, totalRowH, '#FFFFFF', true);
    if (numDefects > page1FaultCount) {
      drawText('* Cont. on p.2', fx + 2, curY, fColRemarks - 4, totalRowH, { size: totPctFont, align: 'center', baseline: 'middle' });
    }
    curY += totalRowH;

    // ==========================================
    // SECTION 8: NOTICE BAR "Measurement picture is attached for reference"
    // ==========================================
    drawBox(leftX, curY, tableWidth, notice2H, '#FFFFFF', true);
    drawText('Measurement picture is attached for reference', leftX + 5, curY, tableWidth - 10, notice2H, {
      bold: true,
      font: 'Helvetica-BoldOblique',
      size: lerp(5.2, 6.5),
      baseline: 'middle'
    });
    curY += notice2H;

    // ==========================================
    // SECTION 9: DIMENSIONAL INSPECTION (Size & Weight & SPI)
    // ==========================================
    const dimHdrFont = lerp(5.2, 6.5);
    drawBox(leftX, curY, tableWidth, dimHeaderH, COLOR_HEADER_DIM, true);
    drawText('Dimensional Inspection (Size & Weight & SPI)', leftX, curY, tableWidth, dimHeaderH, {
      bold: true,
      size: dimHdrFont,
      color: '#FFFFFF',
      align: 'center',
      baseline: 'middle'
    });
    curY += dimHeaderH;

    const dColWidth = 52;
    const dColLength = 52;
    const dColDrop = 55;
    const dColSPI = 45;
    const dColPieceWt = 65;
    const dColBaleWt = 65;
    const dColCartonTotal = tableWidth - (dColWidth + dColLength + dColDrop + dColSPI + dColPieceWt + dColBaleWt);
    const dColCartonSingle = dColCartonTotal / 3;

    const dimSubFont = lerp(4.8, 6.0);
    let dx = leftX;

    drawBox(dx, curY, dColWidth, dimSubH * 2, '#FFFFFF', true);
    drawText('Width\n(Inch)', dx, curY, dColWidth, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColWidth;

    drawBox(dx, curY, dColLength, dimSubH * 2, '#FFFFFF', true);
    drawText('Length\n(Inch)', dx, curY, dColLength, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColLength;

    drawBox(dx, curY, dColDrop, dimSubH * 2, '#FFFFFF', true);
    drawText('Drop (Size)', dx, curY, dColDrop, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColDrop;

    drawBox(dx, curY, dColSPI, dimSubH * 2, '#FFFFFF', true);
    drawText('SPI', dx, curY, dColSPI, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColSPI;

    drawBox(dx, curY, dColPieceWt, dimSubH * 2, '#FFFFFF', true);
    drawText('Piece Weight\n(gms)', dx, curY, dColPieceWt, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColPieceWt;

    drawBox(dx, curY, dColBaleWt, dimSubH * 2, '#FFFFFF', true);
    drawText('Bale Weight\n(Kgs)', dx, curY, dColBaleWt, dimSubH * 2, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });
    dx += dColBaleWt;

    drawBox(dx, curY, dColCartonTotal, dimSubH, '#52525B', true);
    drawText('CARTON / BALE DIMENTION', dx, curY, dColCartonTotal, dimSubH, { bold: true, size: dimSubFont, color: '#FFFFFF', align: 'center', baseline: 'middle' });

    drawBox(dx, curY + dimSubH, dColCartonSingle, dimSubH, '#FFFFFF', true);
    drawText('Length', dx, curY + dimSubH, dColCartonSingle, dimSubH, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });

    drawBox(dx + dColCartonSingle, curY + dimSubH, dColCartonSingle, dimSubH, '#FFFFFF', true);
    drawText('Width', dx + dColCartonSingle, curY + dimSubH, dColCartonSingle, dimSubH, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });

    drawBox(dx + dColCartonSingle * 2, curY + dimSubH, dColCartonSingle, dimSubH, '#FFFFFF', true);
    drawText('Height', dx + dColCartonSingle * 2, curY + dimSubH, dColCartonSingle, dimSubH, { bold: true, size: dimSubFont, align: 'center', baseline: 'middle' });

    curY += dimSubH * 2;

    const widthParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('width')) || { spec: '72', min: '71', max: '73', samples: ['72.25', '72.5', '72.25', '72.25', '72', '73', '73', '72.5', '72.5', '73', '72.25', '73', '72.25'] };
    const lengthParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('length')) || { spec: '96', min: '95', max: '97', samples: ['96.25', '96.25', '97', '97', '96', '96.25', '96', '96.5', '96.25', '96.25', '96.5', '97', '97'] };
    const spiParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('spi')) || { spec: '', min: '', max: '', samples: [] };
    const pieceWtParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('piece weight')) || { spec: '', min: '', max: '', samples: [] };
    const cartonParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('carton')) || { spec: '20" x 15.5" x 12"', l: '20"', w: '15.5"', h: '12"' };

    const dimDataFont = lerp(4.8, 6.0);

    function drawDimRow(label, wVal, lVal, dropVal, spiVal, pwVal, bwVal, cLVal, cWVal, cHVal, isBold = false) {
      let rx = leftX;
      drawBox(rx, curY, dColWidth, dimRowH, '#FFFFFF', true);
      drawText(wVal || '', rx, curY, dColWidth, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColWidth;

      drawBox(rx, curY, dColLength, dimRowH, '#FFFFFF', true);
      drawText(lVal || '', rx, curY, dColLength, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColLength;

      drawBox(rx, curY, dColDrop, dimRowH, '#FFFFFF', true);
      drawText(dropVal || '', rx, curY, dColDrop, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColDrop;

      drawBox(rx, curY, dColSPI, dimRowH, '#FFFFFF', true);
      drawText(spiVal || '', rx, curY, dColSPI, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColSPI;

      drawBox(rx, curY, dColPieceWt, dimRowH, '#FFFFFF', true);
      drawText(pwVal || '', rx, curY, dColPieceWt, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColPieceWt;

      drawBox(rx, curY, dColBaleWt, dimRowH, '#FFFFFF', true);
      drawText(bwVal || '', rx, curY, dColBaleWt, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColBaleWt;

      drawBox(rx, curY, dColCartonSingle, dimRowH, '#FFFFFF', true);
      drawText(cLVal || '', rx, curY, dColCartonSingle, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColCartonSingle;

      drawBox(rx, curY, dColCartonSingle, dimRowH, '#FFFFFF', true);
      drawText(cWVal || '', rx, curY, dColCartonSingle, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });
      rx += dColCartonSingle;

      drawBox(rx, curY, dColCartonSingle, dimRowH, '#FFFFFF', true);
      drawText(cHVal || '', rx, curY, dColCartonSingle, dimRowH, { bold: isBold, size: dimDataFont, align: 'center', baseline: 'middle' });

      curY += dimRowH;
    }

    drawDimRow('Spec', `Spec: ${widthParam.spec || '72'}`, `${lengthParam.spec || '96'}`, '', spiParam.spec || '', pieceWtParam.spec || '', '', cartonParam.l || '20"', cartonParam.w || '15.5"', cartonParam.h || '12"', true);
    drawDimRow('Min', `Min: ${widthParam.min || '71'}`, `${lengthParam.min || '95'}`, '', spiParam.min || '', pieceWtParam.min || '', '', '', '', '', false);
    drawDimRow('Max', `Max: ${widthParam.max || '73'}`, `${lengthParam.max || '97'}`, '', spiParam.max || '', pieceWtParam.max || '', '', '', '', '', false);

    for (let s = 1; s <= 13; s++) {
      const sIdx = s - 1;
      const wS = Array.isArray(widthParam.samples) ? (widthParam.samples[sIdx] || '') : '';
      const lS = Array.isArray(lengthParam.samples) ? (lengthParam.samples[sIdx] || '') : '';
      const spiS = Array.isArray(spiParam.samples) ? (spiParam.samples[sIdx] || '') : '';
      const pwS = Array.isArray(pieceWtParam.samples) ? (pieceWtParam.samples[sIdx] || '') : '';

      drawDimRow(String(s), `${s}.  ${wS}`, lS, '', spiS, pwS, '', '', '', '', false);
    }

    drawBox(leftX, curY, tableWidth, dimDefectsH, '#FFFFFF', true);
    drawText('# of Defects:  0', leftX + 5, curY, tableWidth - 10, dimDefectsH, { bold: true, size: lerp(5.2, 6.5), baseline: 'middle' });
    curY += dimDefectsH;

    // ==========================================
    // SECTION 10: A.Q.L. 2.5 (Level I) & A.Q.L. 4.0 (Level I)
    // ==========================================
    const aqlTableW = (tableWidth - 8) / 2;
    const aqlX1 = leftX;
    const aqlX2 = leftX + aqlTableW + 8;

    drawBox(aqlX1, curY, aqlTableW, aqlHdrH, '#FFFFFF', true);
    drawText('A.Q.L. 2.5 (Level I)', aqlX1, curY, aqlTableW, aqlHdrH, { bold: true, size: lerp(5.2, 6.5), align: 'center', baseline: 'middle' });

    drawBox(aqlX2, curY, aqlTableW, aqlHdrH, '#FFFFFF', true);
    drawText('A.Q.L. 4.0 (Level I)', aqlX2, curY, aqlTableW, aqlHdrH, { bold: true, size: lerp(5.2, 6.5), align: 'center', baseline: 'middle' });
    curY += aqlHdrH;

    const subCols = [
      { name: 'Lot Size', w: aqlTableW * 0.17 },
      { name: 'Sample Size', w: aqlTableW * 0.16 },
      { name: 'Acept', w: aqlTableW * 0.08 },
      { name: 'Reject', w: aqlTableW * 0.09 },
      { name: 'Lot Size', w: aqlTableW * 0.18 },
      { name: 'Sample Size', w: aqlTableW * 0.16 },
      { name: 'Acept', w: aqlTableW * 0.08 },
      { name: 'Reject', w: aqlTableW * 0.08 }
    ];

    const aqlSubFont = lerp(4.6, 5.5);
    function drawAqlSubheaders(baseX) {
      let ax = baseX;
      subCols.forEach(sc => {
        drawBox(ax, curY, sc.w, aqlSubH, '#FFFFFF', true);
        drawText(sc.name, ax, curY, sc.w, aqlSubH, { bold: true, size: aqlSubFont, align: 'center', baseline: 'middle' });
        ax += sc.w;
      });
    }

    drawAqlSubheaders(aqlX1);
    drawAqlSubheaders(aqlX2);
    curY += aqlSubH;

    const aql25Rows = [
      ['51 - 90', '13', '1', '2', '1,201 - 3,200', '125', '7', '8'],
      ['91 - 150', '20', '1', '2', '3,201 - 10,000', '200', '10', '11'],
      ['151 - 200', '32', '2', '3', '10,001 - 35,000', '315', '14', '15'],
      ['281 - 500', '50', '3', '4', '35,001 - 150,000', '500', '21', '22'],
      ['501 - 1200', '80', '5', '6', '150,001 - 500,000', '800', '21', '22']
    ];

    const aql40Rows = [
      ['51 - 90', '13', '1', '2', '1,201 - 3,200', '125', '10', '11'],
      ['91 - 150', '20', '2', '3', '3,201 - 10,000', '200', '14', '15'],
      ['151 - 200', '32', '3', '4', '10,001 - 35,000', '315', '21', '22'],
      ['281 - 500', '50', '5', '6', '35,001 - 150,000', '500', '21', '22'],
      ['501 - 1200', '80', '7', '8', '150,001 - 500,000', '800', '21', '22']
    ];

    const aqlDataFont = lerp(4.6, 5.5);

    for (let r = 0; r < 5; r++) {
      let ax = aqlX1;
      const r25 = aql25Rows[r];
      for (let c = 0; c < 8; c++) {
        const sc = subCols[c];
        drawBox(ax, curY, sc.w, aqlRowH, '#FFFFFF', true);
        drawText(r25[c], ax, curY, sc.w, aqlRowH, { size: aqlDataFont, align: 'center', baseline: 'middle' });
        ax += sc.w;
      }

      ax = aqlX2;
      const r40 = aql40Rows[r];
      for (let c = 0; c < 8; c++) {
        const sc = subCols[c];
        const isHighlight = (r === 4 && c === 1);
        drawBox(ax, curY, sc.w, aqlRowH, isHighlight ? COLOR_CELL_RED : '#FFFFFF', true);
        drawText(r40[c], ax, curY, sc.w, aqlRowH, {
          bold: isHighlight,
          color: isHighlight ? '#9C0006' : '#000000',
          size: aqlDataFont,
          align: 'center',
          baseline: 'middle'
        });
        ax += sc.w;
      }

      curY += aqlRowH;
    }

    // ==========================================
    // SECTION 11: REMARKS
    // ==========================================
    const remarksFont = lerp(5.2, 6.5);
    const remarksText = ins.packaging_remarks || ins.employee_notes || 'One pcs in one poly bag and then 06 pcs in a carton.';
    drawBox(leftX, curY, tableWidth, remarksH, '#FFFFFF', true);
    drawText(`Remarks:  ${remarksText}`, leftX + 5, curY, tableWidth - 10, remarksH, {
      bold: true,
      size: remarksFont,
      baseline: 'middle'
    });
    curY += remarksH;

    // ==========================================
    // SECTION 12: SIGNATURES
    // ==========================================
    curY += sigSpacerH;

    const sigFont = lerp(6.2, 7.5);
    const qaRep = genInfo.qa_rep || 'Apex Directorate';
    const factoryRep = genInfo.factory_rep || ins.factory_contact_name || '';

    drawText(`Q.A Representative Name:   ${qaRep}`, leftX + 6, curY, 260, sigH, { bold: true, size: sigFont, baseline: 'middle' });
    drawText(`Factory Representative Name:   ${factoryRep || '_______________________'}`, leftX + 290, curY, 260, sigH, { bold: true, size: sigFont, baseline: 'middle' });

    // ==========================================
    // OPTIONAL: FAULT CONTINUATION PAGE (IF DEFECTS EXCEED PAGE 1 CAPACITY)
    // ==========================================
    let continuationPageAdded = false;
    if (numDefects > page1FaultCount) {
      continuationPageAdded = true;
      doc.addPage();
      let contY = 18;

      drawBox(leftX, contY, tableWidth, 24, COLOR_TITLE_BG, true);
      drawText('INSPECTION REPORT - FAULTS AND DEFECTS FOUND (CONTINUATION)', leftX, contY + 2, tableWidth, 12, {
        bold: true,
        size: 9.5,
        align: 'center'
      });
      drawText(`Sheet: ${ins.sheet_number}   |   Order: ${ins.order_number} (${ins.po_number})   |   Auditor: ${inspectorName}   |   Date: ${insDate}`, leftX, contY + 14, tableWidth, 9, {
        size: 7,
        align: 'center'
      });
      contY += 32;

      let currentContX = leftX;
      faultCols.forEach(fc => {
        drawBox(currentContX, contY, fc.w, 14.5, COLOR_FAULT_HEADER, true);
        drawText(fc.name, currentContX, contY, fc.w, 14.5, {
          bold: true,
          size: 6,
          color: '#000000',
          align: 'center',
          baseline: 'middle'
        });
        currentContX += fc.w;
      });
      contY += 14.5;

      const contRowH = 13.0;
      for (let i = page1FaultCount; i < numDefects; i++) {
        const df = defectFindings[i];
        let cfx = leftX;

        const m = df ? (parseInt(df.minor_count || 0, 10) || 0) : 0;
        const maj = df ? (parseInt(df.major_count || 0, 10) || 0) : 0;
        const c = df ? (parseInt(df.critical_count || 0, 10) || 0) : 0;

        const mPct = ((m / sampleDenominator) * 100).toFixed(2) + '%';
        const majPct = ((maj / sampleDenominator) * 100).toFixed(2) + '%';
        const cPct = ((c / sampleDenominator) * 100).toFixed(2) + '%';

        let codeNum = df ? (df.defect_code || df.code || (df.defect_id ? String(df.defect_id) : '')) : '';
        let defectName = df ? (df.user_input || df.custom_defect_name || df.defect_description || df.defect_name || df.name || '') : '';
        if (!defectName && df && df.remarks && df.remarks.trim().length > 0) {
          defectName = df.remarks.trim();
        }
        if (!codeNum && defectName) {
          const match = catalogByName[defectName.trim().toLowerCase()];
          if (match) codeNum = match.code;
        }
        if (!defectName && codeNum) {
          const match = catalogByCode[String(codeNum)];
          if (match) defectName = match.name;
        }

        // Code
        drawBox(cfx, contY, fColCode, contRowH, '#FFFFFF', true);
        if (codeNum) {
          drawText(String(codeNum), cfx, contY, fColCode, contRowH, { bold: true, size: 6.5, align: 'center', baseline: 'middle' });
        }
        cfx += fColCode;

        // Defect Name
        drawBox(cfx, contY, fColName, contRowH, '#FFFFFF', true);
        if (defectName) {
          drawText(defectName, cfx + 4, contY, fColName - 8, contRowH, { bold: true, size: 6.5, align: 'center', baseline: 'middle' });
        }
        cfx += fColName;

        // MINOR
        drawBox(cfx, contY, fColMin, contRowH, m > 0 ? COLOR_CELL_GREEN : '#FFFFFF', true);
        if (m > 0) {
          drawText(String(m), cfx, contY, fColMin, contRowH, { bold: true, size: 7, color: '#006100', align: 'center', baseline: 'middle' });
        }
        cfx += fColMin;

        // MAJOR
        drawBox(cfx, contY, fColMaj, contRowH, maj > 0 ? COLOR_CELL_ORANGE : '#FFFFFF', true);
        if (maj > 0) {
          drawText(String(maj), cfx, contY, fColMaj, contRowH, { bold: true, size: 7, color: '#9C6500', align: 'center', baseline: 'middle' });
        }
        cfx += fColMaj;

        // CRITICAL
        drawBox(cfx, contY, fColCri, contRowH, c > 0 ? COLOR_CELL_RED : '#FFFFFF', true);
        if (c > 0) {
          drawText(String(c), cfx, contY, fColCri, contRowH, { bold: true, size: 7, color: '#9C0006', align: 'center', baseline: 'middle' });
        }
        cfx += fColCri;

        // MIN %
        drawBox(cfx, contY, fColMinPct, contRowH, '#FFFFFF', true);
        drawText(mPct, cfx, contY, fColMinPct, contRowH, { size: 6, align: 'center', baseline: 'middle' });
        cfx += fColMinPct;

        // MAJ %
        drawBox(cfx, contY, fColMajPct, contRowH, '#FFFFFF', true);
        drawText(majPct, cfx, contY, fColMajPct, contRowH, { size: 6, align: 'center', baseline: 'middle' });
        cfx += fColMajPct;

        // CRI %
        drawBox(cfx, contY, fColCriPct, contRowH, '#FFFFFF', true);
        drawText(cPct, cfx, contY, fColCriPct, contRowH, { size: 6, align: 'center', baseline: 'middle' });
        cfx += fColCriPct;

        // Remarks
        drawBox(cfx, contY, fColRemarks, contRowH, '#FFFFFF', true);
        if (df && df.remarks && df.remarks !== defectName) {
          drawText(df.remarks, cfx + 4, contY, fColRemarks - 8, contRowH, { size: 6, baseline: 'middle' });
        }
        cfx += fColRemarks;

        contY += contRowH;
      }

      // Grand TOTAL Row on Continuation Page
      const grandTotalH = 15;
      let gfx = leftX;
      drawBox(gfx, contY, totalLabelW, grandTotalH, '#FFFFFF', true);
      drawText('GRAND TOTAL', gfx, contY, totalLabelW, grandTotalH, { bold: true, size: 7.5, align: 'center', baseline: 'middle' });
      gfx += totalLabelW;

      drawBox(gfx, contY, fColMin, grandTotalH, COLOR_TOTAL_BLUE, true);
      drawText(String(totalMinor), gfx, contY, fColMin, grandTotalH, { bold: true, size: 8, align: 'center', baseline: 'middle' });
      gfx += fColMin;

      drawBox(gfx, contY, fColMaj, grandTotalH, COLOR_TOTAL_BLUE, true);
      drawText(String(totalMajor), gfx, contY, fColMaj, grandTotalH, { bold: true, size: 8, align: 'center', baseline: 'middle' });
      gfx += fColMaj;

      drawBox(gfx, contY, fColCri, grandTotalH, COLOR_TOTAL_BLUE, true);
      drawText(String(totalCritical), gfx, contY, fColCri, grandTotalH, { bold: true, size: 8, align: 'center', baseline: 'middle' });
      gfx += fColCri;

      drawBox(gfx, contY, fColMinPct, grandTotalH, '#FFFFFF', true);
      drawText(totMinPct, gfx, contY, fColMinPct, grandTotalH, { bold: true, size: 6.5, align: 'center', baseline: 'middle' });
      gfx += fColMinPct;

      drawBox(gfx, contY, fColMajPct, grandTotalH, '#FFFFFF', true);
      drawText(totMajPct, gfx, contY, fColMajPct, grandTotalH, { bold: true, size: 6.5, align: 'center', baseline: 'middle' });
      gfx += fColMajPct;

      drawBox(gfx, contY, fColCriPct, grandTotalH, '#FFFFFF', true);
      drawText(totCriPct, gfx, contY, fColCriPct, grandTotalH, { bold: true, size: 6.5, align: 'center', baseline: 'middle' });
      gfx += fColCriPct;

      drawBox(gfx, contY, fColRemarks, grandTotalH, '#FFFFFF', true);
    }

    // ==========================================
    // SECTION 13: PAGE 2+ PHOTO EVIDENCE GALLERY
    // Only created if images exist in the inspection!
    // Each photo clearly marked with CODE NO & DEFECT NAME
    // ==========================================
    if (photosWithCodes.length > 0) {
      const photosPerPage = 4;
      const numPhotoPages = Math.ceil(photosWithCodes.length / photosPerPage);
      const totalPagesEstimate = (continuationPageAdded ? 2 : 1) + numPhotoPages;

      for (let pIdx = 0; pIdx < numPhotoPages; pIdx++) {
        doc.addPage();
        let photoY = 18;
        const pageNum = (continuationPageAdded ? 2 : 1) + 1 + pIdx;

        drawBox(leftX, photoY, tableWidth, 24, COLOR_TITLE_BG, true);
        drawText('INSPECTION REPORT - DEFECT & MEASUREMENT PHOTO EVIDENCE', leftX, photoY + 2, tableWidth, 12, {
          bold: true,
          size: 10,
          align: 'center'
        });
        drawText(`Sheet: ${ins.sheet_number}   |   Order: ${ins.order_number} (${ins.po_number})   |   Auditor: ${inspectorName}   |   Date: ${insDate}   (Page ${pageNum} of ${totalPagesEstimate})`, leftX, photoY + 14, tableWidth, 9, {
          size: 7,
          align: 'center'
        });
        photoY += 32;

        const cardW = (tableWidth - 14) / 2;
        const cardH = 360;

        const pagePhotos = photosWithCodes.slice(pIdx * photosPerPage, (pIdx + 1) * photosPerPage);

        for (let i = 0; i < pagePhotos.length; i++) {
          const item = pagePhotos[i];
          const col = i % 2;
          const row = Math.floor(i / 2);

          const cardX = leftX + (col * (cardW + 14));
          const cY = photoY + (row * (cardH + 12));

          drawBox(cardX, cY, cardW, cardH, '#F8FAFC', true);

          // Card Header Bar: CODE NO & DEFECT NAME
          const cardHdrH = 22;
          drawBox(cardX, cY, cardW, cardHdrH, '#0F172A', true);
          const codeBadge = item.code ? `CODE #${item.code}` : 'DEFECT EVIDENCE';
          drawText(codeBadge, cardX + 8, cY + 4, 100, 14, { bold: true, size: 8, color: '#38BDF8' });
          drawText(item.defectName || item.category || 'Visual Defect', cardX + 105, cY + 4, cardW - 110, 14, { bold: true, size: 7.5, color: '#FFFFFF', align: 'right' });

          const subBarH = 14;
          drawBox(cardX, cY + cardHdrH, cardW, subBarH, '#1E293B', true);
          const sevColor = item.severity === 'CRITICAL' ? '#EF4444' : (item.severity === 'MAJOR' ? '#F59E0B' : '#10B981');
          drawText(`Severity: ${item.severity || 'Minor'}`, cardX + 8, cY + cardHdrH + 2, 120, 10, { bold: true, size: 6.5, color: sevColor });
          drawText(`Category: ${item.category || 'General'}`, cardX + 130, cY + cardHdrH + 2, cardW - 138, 10, { size: 6.5, color: '#94A3B8', align: 'right' });

          const imgStageY = cY + cardHdrH + subBarH + 6;
          const imgStageW = cardW - 16;
          const imgStageH = 280;

          doc.rect(cardX + 8, imgStageY, imgStageW, imgStageH).fillColor('#0B0F19').fill();
          doc.rect(cardX + 8, imgStageY, imgStageW, imgStageH).lineWidth(0.5).strokeColor('#334155').stroke();

          const imgBuf = await resolveImageBuffer(item.url);
          if (imgBuf) {
            try {
              doc.image(imgBuf, cardX + 10, imgStageY + 2, {
                fit: [imgStageW - 4, imgStageH - 4],
                align: 'center',
                valign: 'center'
              });
            } catch (err) {
              console.error('Error rendering image in PDF:', err);
              drawText('Image format unavailable', cardX + 8, imgStageY + 120, imgStageW, 20, { color: '#94A3B8', align: 'center' });
            }
          } else {
            drawText('Photo not found on server disk', cardX + 8, imgStageY + 120, imgStageW, 20, { color: '#94A3B8', align: 'center' });
          }

          const footerY = imgStageY + imgStageH + 6;
          const footerH = cardH - (cardHdrH + subBarH + imgStageH + 18);
          drawText(item.caption || `Identified during visual quality inspection sampling.`, cardX + 8, footerY, cardW - 16, footerH, {
            size: 6.5,
            color: '#334155'
          });
        }
      }
    }

    doc.end();
  } catch (err) {
    console.error('Error generating PDF report:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to generate PDF report.' });
    }
  }
}

/**
 * Generate & Stream Excel Inspection Report matching the reference Inspection Report.xlsx
 * Includes Disposition Banner, 3-Column Metadata Grid (General | PO | Sampling),
 * Defect Reference Master, Faults & Defects Found with formulas,
 * Dimensional Matrix (13 samples), AQL 2.5/4.0 Tables, and Signatures.
 */
async function exportInspectionExcel(req, res) {
  try {
    const { id } = req.params;

    // 1. Fetch site settings
    const settingsRows = await query('SELECT company_name, contact_email FROM site_settings LIMIT 1');
    const companyName = settingsRows[0]?.company_name || 'ApexFabric Quality Audits';

    // 2. Fetch full inspection details
    const inspectionRows = await query(`
      SELECT ins.*,
             o.order_number, o.po_number, o.product_type, o.product_description,
             o.total_quantity AS order_total_quantity,
             o.factory_name, o.factory_city, o.factory_address, o.factory_contact_name, o.factory_contact_phone,
             cust.name AS customer_name, cust.company_name AS customer_company,
             tmpl.title AS template_title, tmpl.product_type AS template_product_type,
             tmpl.defect_master_config, tmpl.aql_config, tmpl.dimensional_config,
             emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code,
             reviewer.name AS reviewer_name
      FROM inspection_sheets ins
      JOIN orders o ON ins.order_id = o.id
      JOIN users cust ON o.customer_id = cust.id
      JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
      JOIN users emp ON ins.assigned_employee_id = emp.id
      LEFT JOIN users reviewer ON ins.reviewed_by = reviewer.id
      WHERE ins.id = ? OR ins.sheet_number = ?
    `, [id, id]);

    if (inspectionRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection not found.' });
    }


    const ins = inspectionRows[0];

    // Fetch master defect catalog
    const catalogRows = await query(`
      SELECT code, name, category, sort_order 
      FROM defect_masters 
      ORDER BY CAST(code AS UNSIGNED) ASC, id ASC
    `);

    // Build lookup maps for robust code/name resolution
    const catalogByCode = {};
    const catalogByName = {};
    catalogRows.forEach(c => {
      catalogByCode[String(c.code)] = c;
      if (c.name) catalogByName[c.name.trim().toLowerCase()] = c;
    });

    const templateCodes = parseJSON(ins.defect_master_config, null);
    const activeCodeFilter = Array.isArray(templateCodes) && templateCodes.length > 0 && templateCodes.length < 55
      ? new Set(templateCodes.map(String))
      : null;

    // Parse structured JSON fields
    const genInfo = parseJSON(ins.general_info_data, {
      inspector_name: ins.assigned_employee_name,
      inspection_date: new Date().toISOString().split('T')[0],
      department: 'Quality Assurance / Fabric Inspection',
      factory_rep: ins.factory_contact_name || '',
      qa_rep: 'Apex Quality Directorate'
    });

    const poInfo = parseJSON(ins.order_autofill_data, {
      vendor_supplier: ins.factory_name,
      po_number: ins.po_number,
      reference_number: ins.order_number,
      article: ins.product_type,
      article_quantity: ins.ordered_quantity,
      first_ship_qty: ins.ordered_quantity,
      ready_qty: ins.ordered_quantity,
      short_qty: 0
    });

    const samplingPlan = parseJSON(ins.sampling_plan_data, {
      lot_size: ins.ordered_quantity || 5000,
      sample_size: 80,
      visual_sample_size_aql_4: 80,
      visual_sample_size_aql_2_5: 0,
      labeling_sample_size: 30,
      dimensional_sample_size: 13
    });

    const defectFindings = parseJSON(ins.defect_findings_data, []);
    const dimensionalData = parseJSON(ins.dimensional_data, []);

    // Fetch uploaded photos from database
    const dbPhotos = await query(`
      SELECT * FROM inspection_photos WHERE sheet_id = ? ORDER BY id ASC
    `, [ins.id]);

    const photosWithCodes = [];
    defectFindings.forEach(df => {
      let codeNum = df.defect_code || df.code || (df.defect_id ? String(df.defect_id) : '');
      let defectName = df.defect_name || df.name;
      if (!codeNum && defectName) {
        const match = catalogByName[defectName.trim().toLowerCase()];
        if (match) codeNum = match.code;
      }
      if (!defectName && codeNum) {
        const match = catalogByCode[String(codeNum)];
        if (match) defectName = match.name;
      }

      if (Array.isArray(df.images)) {
        df.images.forEach(img => {
          if (img && !photosWithCodes.some(p => p.url === img)) {
            photosWithCodes.push({
              url: img,
              code: codeNum || '',
              defectName: defectName || 'Defect Evidence',
              category: df.category,
              caption: df.remarks || `Defect evidence for ${defectName || 'defect'}`
            });
          }
        });
      }
    });

    dbPhotos.forEach(p => {
      if (p.photo_url && !photosWithCodes.some(pw => pw.url === p.photo_url)) {
        let codeNum = null;
        let name = p.caption || 'Field Inspection Evidence';
        if (p.defect_tag) {
          const match = p.defect_tag.match(/\d+/);
          if (match) codeNum = match[0];
        }
        if (!codeNum) {
          const matchDf = defectFindings.find(df => 
            (df.defect_name && p.caption && p.caption.includes(df.defect_name)) ||
            (df.defect_code && p.defect_tag && p.defect_tag.includes(df.defect_code))
          );
          if (matchDf) {
            codeNum = matchDf.defect_code || matchDf.code;
            name = matchDf.defect_name || matchDf.name;
          }
        }
        if (!codeNum && name) {
          const matchCat = catalogByName[name.trim().toLowerCase()];
          if (matchCat) codeNum = matchCat.code;
        }
        photosWithCodes.push({
          url: p.photo_url,
          code: codeNum || '',
          defectName: name,
          category: p.defect_tag || 'Inspection Evidence',
          caption: p.caption || 'On-site audit photo'
        });
      }
    });

    // 3. Initialize Workbook & Worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = companyName;
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Inspection Report', {
      views: [{ showGridLines: true }]
    });

    // Styling constants
    const fillTitle = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    const fillDarkHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F6272' } };
    const fillGrayHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    const fillFaultHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    const fillDimHeader = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF595959' } };
    const fillTotalBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    const fillOrange = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    const fillRed = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    // Row 1: Title
    sheet.mergeCells('A1:O1');
    const r1 = sheet.getCell('A1');
    r1.value = 'INSPECTION REPORT';
    r1.font = { name: 'Arial', size: 13, bold: true };
    r1.fill = fillTitle;
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    r1.border = thinBorder;
    sheet.getRow(1).height = 28;

    // Row 3: Disposition & Audited by
    sheet.mergeCells('A3:H3');
    const currentDisp = (ins.disposition || 'Accepted').toLowerCase();
    const isAccepted = currentDisp.includes('accept') && !currentDisp.includes('rework');
    const isRejected = currentDisp.includes('reject');
    const isAcceptRework = currentDisp.includes('rework') && currentDisp.includes('accept');
    const isRework = (currentDisp.includes('rework') && !currentDisp.includes('accept')) || currentDisp.includes('hold');

    sheet.getCell('A3').value = `Disposition:   ${isAccepted ? '[X]' : '[  ]'} Accepted     ${isRejected ? '[X]' : '[  ]'} Rejected     ${isAcceptRework ? '[X]' : '[  ]'} Accepted After Rework     ${isRework ? '[X]' : '[  ]'} Rework`;
    sheet.getCell('A3').font = { size: 9, bold: true };
    sheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getCell('A3').border = thinBorder;

    sheet.mergeCells('I3:O3');
    const inspectorName = genInfo.inspector_name || ins.assigned_employee_name || 'Imran';
    const insDate = formatDate(genInfo.inspection_date || ins.created_at);
    sheet.getCell('I3').value = `Audited By / Date:   NAME:- ${inspectorName},     DATED:- ${insDate}`;
    sheet.getCell('I3').font = { size: 9, bold: true };
    sheet.getCell('I3').alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getCell('I3').border = thinBorder;
    sheet.getRow(3).height = 24;

    // Row 4: Lab Report perform date & Finished Goods
    sheet.mergeCells('A4:H4');
    sheet.getCell('A4').value = 'Lab report perform date:   [  ] Accept   [  ] Reject   [X] No report';
    sheet.getCell('A4').font = { size: 8.5 };
    sheet.getCell('A4').border = thinBorder;

    sheet.mergeCells('I4:O4');
    sheet.getCell('I4').value = '[X] Finished Goods             [  ] In Process';
    sheet.getCell('I4').font = { size: 8.5 };
    sheet.getCell('I4').border = thinBorder;
    sheet.getRow(4).height = 18;

    // Row 6: General Info & P.O Info & Sampling plans Headers
    sheet.mergeCells('A6:E6');
    sheet.getCell('A6').value = 'General Information';
    sheet.getCell('A6').font = { bold: true, size: 9 };
    sheet.getCell('A6').fill = fillGrayHeader;
    sheet.getCell('A6').border = thinBorder;
    sheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('F6:I6');
    sheet.getCell('F6').value = 'P.O Information';
    sheet.getCell('F6').font = { bold: true, size: 9 };
    sheet.getCell('F6').fill = fillGrayHeader;
    sheet.getCell('F6').border = thinBorder;
    sheet.getCell('F6').alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.mergeCells('J6:O6');
    sheet.getCell('J6').value = 'Sampling plans';
    sheet.getCell('J6').font = { bold: true, size: 9 };
    sheet.getCell('J6').fill = fillGrayHeader;
    sheet.getCell('J6').border = thinBorder;
    sheet.getCell('J6').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(6).height = 18;

    // Rows 7-10: General & PO info details
    const genRows = [
      ['Vendor name:', poInfo.vendor_supplier || ins.factory_name || 'Supplier Name', '', '', '', 'PO #:', String(poInfo.po_number || ins.po_number || '0'), '', '', 'Labeling Sample Size (square root):', String(samplingPlan.labeling_sample_size || 30), '', '', '', ''],
      ['Reference Number:', String(poInfo.reference_number || ins.order_number || '1122'), '', '', '', 'Quantity Ready (case or bale/La):', String(poInfo.ready_cases || 0), '', '', 'Visual Sample Size / AQL 4 Level I:', `${samplingPlan.visual_sample_size_aql_4 || 80} Pcs`, '', '', '', ''],
      ['Article Quantity:', `${(poInfo.article_quantity || ins.ordered_quantity || 0).toLocaleString()}`, '', '', '', 'Ready Quantity:', `${(poInfo.ready_qty || ins.ordered_quantity || 0).toLocaleString()} Pcs`, '', '', 'Visual Sample Size / AQL 2.5:', `${samplingPlan.visual_sample_size_aql_2_5 || 0} Pcs`, '', '', '', ''],
      ['First Ship Quantity:', poInfo.first_ship_qty ? String(poInfo.first_ship_qty) : '', '', '', '', 'Short Quantity:', String(poInfo.short_qty || 0), '', '', 'Dimensional & Weight Sample Size:', `${samplingPlan.dimensional_sample_size || 13} pcs`, '', '', '', '']
    ];

    genRows.forEach((rowVals, idx) => {
      const rNum = 7 + idx;
      sheet.getRow(rNum).values = rowVals;
      sheet.mergeCells(`B${rNum}:E${rNum}`);
      sheet.mergeCells(`G${rNum}:I${rNum}`);
      sheet.mergeCells(`K${rNum}:O${rNum}`);
      sheet.getRow(rNum).height = 16;
      sheet.getRow(rNum).eachCell(c => {
        c.font = { size: 8 };
        c.border = thinBorder;
      });
    });

    // Row 12: Notice Bar "Defected picture is attached for you reference"
    sheet.mergeCells('A12:O12');
    const nCell = sheet.getCell('A12');
    nCell.value = 'Defected picture is attached for you reference';
    nCell.font = { italic: true, bold: true, size: 8.5 };
    nCell.border = thinBorder;
    sheet.getRow(12).height = 18;

    // Row 14: Master Defect Codes Header
    const catCols = ['FABRICATION', 'PROCESSING / TRIMS', 'STITCHING / PACKING', 'OTHERS', 'OTHERS'];
    const colRanges = [
      { code: 'A14', name: 'B14:C14' },
      { code: 'D14', name: 'E14:F14' },
      { code: 'G14', name: 'H14:I14' },
      { code: 'J14', name: 'K14:L14' },
      { code: 'M14', name: 'N14:O14' }
    ];

    colRanges.forEach((cr, i) => {
      sheet.getCell(cr.code.replace('14', '') + '14').value = 'CODE';
      sheet.getCell(cr.code.replace('14', '') + '14').font = { bold: true, size: 7.5, color: { argb: 'FFFFFFFF' } };
      sheet.getCell(cr.code.replace('14', '') + '14').fill = fillDarkHeader;
      sheet.getCell(cr.code.replace('14', '') + '14').alignment = { horizontal: 'center' };
      sheet.getCell(cr.code.replace('14', '') + '14').border = thinBorder;

      sheet.mergeCells(cr.name);
      const nC = sheet.getCell(cr.name.split(':')[0]);
      nC.value = catCols[i];
      nC.font = { bold: true, size: 7.5, color: { argb: 'FFFFFFFF' } };
      nC.fill = fillDarkHeader;
      nC.alignment = { horizontal: 'center' };
      nC.border = thinBorder;
    });
    sheet.getRow(14).height = 18;

    // Rows 15-25: 11 rows of 55 master codes
    const col1 = catalogRows.slice(0, 11);
    const col2 = catalogRows.slice(11, 22);
    const col3 = catalogRows.slice(22, 33);
    const col4 = catalogRows.slice(33, 44);
    const col5 = catalogRows.slice(44, 55);
    const cols55 = [col1, col2, col3, col4, col5];

    for (let r = 0; r < 11; r++) {
      const rNum = 15 + r;
      colRanges.forEach((cr, cIdx) => {
        const item = cols55[cIdx][r] || null;
        const isItemActive = item && (!activeCodeFilter || activeCodeFilter.has(String(item.code)));

        const codeCell = cr.code.replace('14', '') + rNum;
        sheet.getCell(codeCell).value = (item && isItemActive) ? item.code : '';
        sheet.getCell(codeCell).font = { bold: true, size: 7.5 };
        sheet.getCell(codeCell).alignment = { horizontal: 'center' };
        sheet.getCell(codeCell).border = thinBorder;

        const [startCell, endCell] = cr.name.split(':');
        const startMerge = startCell.replace('14', '') + rNum;
        const endMerge = endCell.replace('14', '') + rNum;
        sheet.mergeCells(`${startMerge}:${endMerge}`);
        const nameCell = sheet.getCell(startMerge);
        nameCell.value = (item && isItemActive) ? item.name : '';
        nameCell.font = { size: 7 };
        nameCell.border = thinBorder;
      });
      sheet.getRow(rNum).height = 14;
    }

    // Row 27: Faults & Defects Found Header
    sheet.getRow(27).values = ['Code', 'FAULTS AND DEFECTS FOUND', '', '', '', 'MINOR', 'MAJOR', 'CRITICAL', 'MIN %', 'MAJ %', 'CRI %', 'Remarks', '', '', ''];
    sheet.mergeCells('B27:E27');
    sheet.mergeCells('L27:O27');
    sheet.getRow(27).eachCell(c => {
      c.font = { bold: true, size: 8 };
      c.fill = fillFaultHeader;
      c.border = thinBorder;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    sheet.getRow(27).height = 18;

    // Rows 28+: Defect findings
    let curExcelR = 28;
    const startFindingsRow = curExcelR;
    const sampleDenom = parseInt(samplingPlan.visual_sample_size_aql_4 || samplingPlan.sample_size || 80, 10) || 80;

    const displayDefects = Math.max(defectFindings.length, 6);
    for (let i = 0; i < displayDefects; i++) {
      const df = defectFindings[i] || null;
      const m = df ? (parseInt(df.minor_count || 0, 10) || 0) : 0;
      const maj = df ? (parseInt(df.major_count || 0, 10) || 0) : 0;
      const c = df ? (parseInt(df.critical_count || 0, 10) || 0) : 0;

      let codeNum = df ? (df.defect_code || df.code || (df.defect_id ? String(df.defect_id) : '')) : '';
      let defectName = df ? (df.user_input || df.custom_defect_name || df.defect_description || df.defect_name || df.name || '') : '';
      if (!defectName && df && df.remarks && df.remarks.trim().length > 0) {
        defectName = df.remarks.trim();
      }
      if (!codeNum && defectName) {
        const match = catalogByName[defectName.trim().toLowerCase()];
        if (match) codeNum = match.code;
      }
      if (!defectName && codeNum) {
        const match = catalogByCode[String(codeNum)];
        if (match) defectName = match.name;
      }

      sheet.getRow(curExcelR).values = [
        codeNum || '',
        defectName || '', '', '', '',
        m || '',
        maj || '',
        c || '',
        df ? ((m / sampleDenom) * 100).toFixed(2) + '%' : '0.00%',
        df ? ((maj / sampleDenom) * 100).toFixed(2) + '%' : '0.00%',
        df ? ((c / sampleDenom) * 100).toFixed(2) + '%' : '0.00%',
        df ? (df.remarks || '') : '', '', '', ''
      ];


      sheet.mergeCells(`B${curExcelR}:E${curExcelR}`);
      sheet.mergeCells(`L${curExcelR}:O${curExcelR}`);
      sheet.getRow(curExcelR).height = 15;

      sheet.getRow(curExcelR).eachCell(cell => {
        cell.font = { size: 7.5 };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      if (m > 0) sheet.getCell(`F${curExcelR}`).fill = fillGreen;
      if (maj > 0) sheet.getCell(`G${curExcelR}`).fill = fillOrange;
      if (c > 0) sheet.getCell(`H${curExcelR}`).fill = fillRed;

      curExcelR++;
    }

    // Totals Row for Faults
    const endFindingsRow = curExcelR - 1;
    sheet.getRow(curExcelR).values = [
      'TOTAL', '', '', '', '',
      { formula: `SUM(F${startFindingsRow}:F${endFindingsRow})` },
      { formula: `SUM(G${startFindingsRow}:G${endFindingsRow})` },
      { formula: `SUM(H${startFindingsRow}:H${endFindingsRow})` },
      `${ins.overall_defect_percentage || 0}%`, '', '', '', '', '', ''
    ];
    sheet.mergeCells(`A${curExcelR}:E${curExcelR}`);
    sheet.mergeCells(`L${curExcelR}:O${curExcelR}`);
    sheet.getRow(curExcelR).height = 18;
    sheet.getRow(curExcelR).eachCell(cell => {
      cell.font = { bold: true, size: 8 };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.getCell(`F${curExcelR}`).fill = fillTotalBlue;
    sheet.getCell(`G${curExcelR}`).fill = fillTotalBlue;
    sheet.getCell(`H${curExcelR}`).fill = fillTotalBlue;
    curExcelR++;

    // Notice Bar "Measurement picture is attached for reference"
    sheet.mergeCells(`A${curExcelR}:O${curExcelR}`);
    const measCell = sheet.getCell(`A${curExcelR}`);
    measCell.value = 'Measurement picture is attached for reference';
    measCell.font = { italic: true, bold: true, size: 8.5 };
    measCell.border = thinBorder;
    sheet.getRow(curExcelR).height = 18;
    curExcelR++;

    // Dimensional Inspection Header
    sheet.mergeCells(`A${curExcelR}:O${curExcelR}`);
    const dimHeaderCell = sheet.getCell(`A${curExcelR}`);
    dimHeaderCell.value = 'Dimensional Inspection (Size & Weight & SPI)';
    dimHeaderCell.font = { bold: true, size: 8.5, color: { argb: 'FFFFFFFF' } };
    dimHeaderCell.fill = fillDimHeader;
    dimHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(curExcelR).height = 18;
    curExcelR++;

    // Dimensional Sub-headers
    sheet.getRow(curExcelR).values = ['Width (Inch)', 'Length (Inch)', 'Drop (Size)', 'SPI', 'Piece Weight (gms)', 'Bale Weight (Kgs)', 'CARTON / BALE DIMENTION', '', '', '', '', '', '', '', ''];
    sheet.mergeCells(`G${curExcelR}:O${curExcelR}`);
    sheet.getRow(curExcelR).height = 16;
    sheet.getRow(curExcelR).eachCell(c => {
      c.font = { bold: true, size: 7.5 };
      c.border = thinBorder;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    curExcelR++;

    // Carton Length, Width, Height sub-row
    sheet.getRow(curExcelR).values = ['', '', '', '', '', '', 'Length', '', '', 'Width', '', '', 'Height', '', ''];
    sheet.mergeCells(`G${curExcelR}:I${curExcelR}`);
    sheet.mergeCells(`J${curExcelR}:L${curExcelR}`);
    sheet.mergeCells(`M${curExcelR}:O${curExcelR}`);
    sheet.getRow(curExcelR).height = 14;
    sheet.getRow(curExcelR).eachCell(c => {
      c.font = { bold: true, size: 7 };
      c.border = thinBorder;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    curExcelR++;

    // Dimensional Spec / Min / Max & 1-13
    const widthParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('width')) || { spec: '72', min: '71', max: '73', samples: ['72.25', '72.5', '72.25', '72.25', '72', '73', '73', '72.5', '72.5', '73', '72.25', '73', '72.25'] };
    const lengthParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('length')) || { spec: '96', min: '95', max: '97', samples: ['96.25', '96.25', '97', '97', '96', '96.25', '96', '96.5', '96.25', '96.25', '96.5', '97', '97'] };
    const cartonParam = dimensionalData.find(d => (d.param || '').toLowerCase().includes('carton')) || { spec: '20" x 15.5" x 12"', l: '20"', w: '15.5"', h: '12"' };

    const dimRows = [
      [`Spec: ${widthParam.spec || '72'}`, `${lengthParam.spec || '96'}`, '', '', '', '', cartonParam.l || '20"', '', '', cartonParam.w || '15.5"', '', '', cartonParam.h || '12"', '', ''],
      [`Min: ${widthParam.min || '71'}`, `${lengthParam.min || '95'}`, '', '', '', '', '', '', '', '', '', '', '', '', ''],
      [`Max: ${widthParam.max || '73'}`, `${lengthParam.max || '97'}`, '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];

    for (let s = 1; s <= 13; s++) {
      const sIdx = s - 1;
      const wVal = Array.isArray(widthParam.samples) ? (widthParam.samples[sIdx] || '') : '';
      const lVal = Array.isArray(lengthParam.samples) ? (lengthParam.samples[sIdx] || '') : '';
      dimRows.push([`${s}.  ${wVal}`, lVal, '', '', '', '', '', '', '', '', '', '', '', '', '']);
    }

    dimRows.forEach(dr => {
      sheet.getRow(curExcelR).values = dr;
      sheet.mergeCells(`G${curExcelR}:I${curExcelR}`);
      sheet.mergeCells(`J${curExcelR}:L${curExcelR}`);
      sheet.mergeCells(`M${curExcelR}:O${curExcelR}`);
      sheet.getRow(curExcelR).height = 14;
      sheet.getRow(curExcelR).eachCell(c => {
        c.font = { size: 7.5 };
        c.border = thinBorder;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      curExcelR++;
    });

    // # of Defects
    sheet.mergeCells(`A${curExcelR}:O${curExcelR}`);
    sheet.getCell(`A${curExcelR}`).value = '# of Defects:  0';
    sheet.getCell(`A${curExcelR}`).font = { bold: true, size: 8 };
    sheet.getCell(`A${curExcelR}`).border = thinBorder;
    sheet.getRow(curExcelR).height = 16;
    curExcelR++;

    // AQL Reference Tables
    sheet.mergeCells(`A${curExcelR}:G${curExcelR}`);
    sheet.getCell(`A${curExcelR}`).value = 'A.Q.L. 2.5 (Level I)';
    sheet.getCell(`A${curExcelR}`).font = { bold: true, size: 8 };
    sheet.getCell(`A${curExcelR}`).alignment = { horizontal: 'center' };
    sheet.getCell(`A${curExcelR}`).border = thinBorder;

    sheet.mergeCells(`I${curExcelR}:O${curExcelR}`);
    sheet.getCell(`I${curExcelR}`).value = 'A.Q.L. 4.0 (Level I)';
    sheet.getCell(`I${curExcelR}`).font = { bold: true, size: 8 };
    sheet.getCell(`I${curExcelR}`).alignment = { horizontal: 'center' };
    sheet.getCell(`I${curExcelR}`).border = thinBorder;
    sheet.getRow(curExcelR).height = 16;
    curExcelR++;

    // AQL Subheaders
    sheet.getRow(curExcelR).values = ['Lot Size', 'Sample Size', 'Acept', 'Reject', 'Lot Size', 'Sample Size', 'Acept', '', 'Lot Size', 'Sample Size', 'Acept', 'Reject', 'Lot Size', 'Sample Size', 'Acept'];
    sheet.getRow(curExcelR).height = 14;
    sheet.getRow(curExcelR).eachCell(c => {
      c.font = { bold: true, size: 6.5 };
      c.border = thinBorder;
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    curExcelR++;

    // AQL 5 rows
    const aql25Rows = [
      ['51 - 90', '13', '1', '2', '1,201 - 3,200', '125', '7'],
      ['91 - 150', '20', '1', '2', '3,201 - 10,000', '200', '10'],
      ['151 - 200', '32', '2', '3', '10,001 - 35,000', '315', '14'],
      ['281 - 500', '50', '3', '4', '35,001 - 150,000', '500', '21'],
      ['501 - 1200', '80', '5', '6', '150,001 - 500,000', '800', '21']
    ];

    const aql40Rows = [
      ['51 - 90', '13', '1', '2', '1,201 - 3,200', '125', '10'],
      ['91 - 150', '20', '2', '3', '3,201 - 10,000', '200', '14'],
      ['151 - 200', '32', '3', '4', '10,001 - 35,000', '315', '21'],
      ['281 - 500', '50', '5', '6', '35,001 - 150,000', '500', '21'],
      ['501 - 1200', '80', '7', '8', '150,001 - 500,000', '800', '21']
    ];

    for (let r = 0; r < 5; r++) {
      const r25 = aql25Rows[r];
      const r40 = aql40Rows[r];
      sheet.getRow(curExcelR).values = [
        r25[0], r25[1], r25[2], r25[3], r25[4], r25[5], r25[6], '',
        r40[0], r40[1], r40[2], r40[3], r40[4], r40[5], r40[6]
      ];
      sheet.getRow(curExcelR).height = 14;
      sheet.getRow(curExcelR).eachCell(c => {
        c.font = { size: 6.5 };
        c.border = thinBorder;
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      if (r === 4) {
        sheet.getCell(`J${curExcelR}`).fill = fillRed;
      }
      curExcelR++;
    }

    // Remarks Row
    sheet.mergeCells(`A${curExcelR}:O${curExcelR}`);
    const remarksCell = sheet.getCell(`A${curExcelR}`);
    remarksCell.value = `Remarks:  ${ins.packaging_remarks || ins.employee_notes || 'One pcs in one poly bag and then 06 pcs in a carton.'}`;
    remarksCell.font = { bold: true, size: 8 };
    remarksCell.border = thinBorder;
    sheet.getRow(curExcelR).height = 20;
    curExcelR += 2;

    // Signatures
    sheet.mergeCells(`A${curExcelR}:G${curExcelR}`);
    sheet.getCell(`A${curExcelR}`).value = `Q.A Representative Name:  ${genInfo.qa_rep || 'Apex Directorate'}`;
    sheet.getCell(`A${curExcelR}`).font = { bold: true, size: 8.5 };

    sheet.mergeCells(`I${curExcelR}:O${curExcelR}`);
    sheet.getCell(`I${curExcelR}`).value = `Factory Representative Name:  ${genInfo.factory_rep || ins.factory_contact_name || '_______________________'}`;
    sheet.getCell(`I${curExcelR}`).font = { bold: true, size: 8.5 };
    sheet.getRow(curExcelR).height = 22;

    // Auto-fit column widths
    sheet.columns = [
      { width: 14 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 14 },
      { width: 12 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }
    ];

    // If photos exist, add Photo Evidence sheet
    if (photosWithCodes.length > 0) {
      const photoSheet = workbook.addWorksheet('Photo Evidence');
      photoSheet.mergeCells('A1:F1');
      photoSheet.getCell('A1').value = `INSPECTION REPORT - PHOTO EVIDENCE GALLERY (${ins.sheet_number})`;
      photoSheet.getCell('A1').font = { bold: true, size: 12 };
      photoSheet.getCell('A1').fill = fillTitle;
      photoSheet.getCell('A1').alignment = { horizontal: 'center' };
      photoSheet.getRow(1).height = 28;

      photoSheet.getRow(3).values = ['Photo #', 'Code No', 'Defect / Evidence Title', 'Category', 'Severity', 'Photo URL / Remarks'];
      photoSheet.getRow(3).eachCell(c => {
        c.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
        c.fill = fillDarkHeader;
      });
      photoSheet.getRow(3).height = 20;

      photosWithCodes.forEach((p, idx) => {
        const pR = 4 + idx;
        photoSheet.getRow(pR).values = [
          idx + 1,
          p.code ? `Code #${p.code}` : 'Evidence',
          p.defectName || p.category,
          p.category || 'General',
          p.severity || 'Minor',
          p.caption || p.url
        ];
        photoSheet.getRow(pR).height = 18;
      });

      photoSheet.columns = [
        { width: 10 }, { width: 14 }, { width: 32 }, { width: 22 }, { width: 16 }, { width: 45 }
      ];
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${ins.sheet_number}_Report.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating Excel report:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to generate Excel report.' });
    }
  }
}

/**
 * Export Orders List to Excel
 */
async function exportOrdersExcel(req, res) {
  try {
    const orders = await query(`
      SELECT o.order_number, o.po_number, o.product_type, o.factory_name, o.factory_city, 
             o.total_quantity, o.unit, o.order_date, o.inspection_status,
             c.name AS customer_name, c.company_name AS customer_company
      FROM orders o
      JOIN users c ON o.customer_id = c.id
      ORDER BY o.id DESC
    `);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Orders Master List');

    const header = sheet.addRow([
      'Order #', 'PO Number', 'Client (USA)', 'Company', 'Product Type',
      'Mill / Factory', 'City', 'Quantity', 'Unit', 'Order Date', 'Inspection Status'
    ]);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };

    orders.forEach(o => {
      sheet.addRow([
        o.order_number,
        o.po_number,
        o.customer_name,
        o.customer_company,
        o.product_type,
        o.factory_name,
        o.factory_city,
        o.total_quantity,
        o.unit,
        o.order_date,
        o.inspection_status
      ]);
    });

    sheet.columns = [
      { width: 16 }, { width: 16 }, { width: 22 }, { width: 26 }, { width: 28 },
      { width: 28 }, { width: 15 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 18 }
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Fabrication_Orders_Summary.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error exporting orders Excel:', err);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to export orders Excel.' });
    }
  }
}

/**
 * Ultra-fast aggregate metrics for Admin Dashboard
 * Returns counts in a single multi-subquery execution (sub-millisecond latency)
 */
async function getDashboardMetrics(req, res) {
  try {
    const rows = await query(`
      SELECT 
        (SELECT COUNT(*) FROM orders) AS totalOrders,
        (SELECT COUNT(*) FROM inspection_sheets WHERE status IN ('In Progress', 'Draft Saved', 'Not Started', 'Needs Re-inspection', 'Draft')) AS activeAudits,
        (SELECT COUNT(*) FROM inspection_sheets WHERE status = 'Submitted') AS submittedQueue,
        (SELECT COUNT(*) FROM inspection_sheets WHERE status = 'Approved') AS approvedCount,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS customerCount,
        (SELECT COUNT(*) FROM users WHERE role = 'employee') AS employeeCount
    `);

    const metrics = rows[0] || {
      totalOrders: 0,
      activeAudits: 0,
      submittedQueue: 0,
      approvedCount: 0,
      customerCount: 0,
      employeeCount: 0
    };

    return res.json({
      success: true,
      metrics: {
        totalOrders: parseInt(metrics.totalOrders || 0, 10),
        activeAudits: parseInt(metrics.activeAudits || 0, 10),
        submittedQueue: parseInt(metrics.submittedQueue || 0, 10),
        approvedCount: parseInt(metrics.approvedCount || 0, 10),
        customerCount: parseInt(metrics.customerCount || 0, 10),
        employeeCount: parseInt(metrics.employeeCount || 0, 10)
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard metrics:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve metrics.' });
  }
}

module.exports = {
  exportInspectionPDF,
  exportInspectionExcel,
  exportOrdersExcel,
  getDashboardMetrics
};
