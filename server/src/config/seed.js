const bcrypt = require('bcryptjs');
const { pool, query, transaction } = require('./db');

async function seedDatabase() {
  console.log('--- Starting Database Seeding ---');

  try {
    // 1. Seed Site Settings
    const [existingSettings] = await pool.query('SELECT id FROM site_settings LIMIT 1');
    if (existingSettings.length === 0) {
      const defaultAboutBullets = JSON.stringify([
        "Zero-Conflict Independent Third-Party Auditing Across Pakistan",
        "Real-Time Telemetry & Instant Defect Percentages",
        "Covering Key Textile Hubs: Karachi, Faisalabad, Lahore, Sialkot, Multan",
        "Standardized AQL 2.5 / 4.0 ISO 2859-1 Sampling Methodology"
      ]);

      const defaultServices = JSON.stringify([
        {
          id: 1,
          icon: "FabricIcon",
          title: "Raw Greige & Finished Fabric Inspection",
          description: "4-Point and 10-Point system grading on illuminated perch tables. Comprehensive defect tagging, tensile tests, GSM verification, and width uniformity."
        },
        {
          id: 2,
          icon: "SewingIcon",
          title: "In-Line & During Production (DUPRO) Audits",
          description: "Active line monitoring across cutting, sewing, and assembly to identify systemic defects before bulk lots are finished."
        },
        {
          id: 3,
          icon: "CheckCircleIcon",
          title: "Final Random Inspection (FRI / Pre-Shipment)",
          description: "Rigorous statistical pre-shipment sign-off. Measurement conformity, packaging integrity, barcode scanning, and carton drop checks."
        },
        {
          id: 4,
          icon: "BuildingIcon",
          title: "Mill Capability & Technical Audit",
          description: "Independent assessment of spinning, weaving, and dyeing facility capacities, machinery calibration, and labor compliance."
        }
      ]);

      const defaultProcess = JSON.stringify([
        {
          step: "01",
          title: "Order & PO Onboarding",
          desc: "Customer or Admin submits purchase order details, factory coordinates in Pakistan, and required AQL inspection standard."
        },
        {
          step: "02",
          title: "Dynamic Template Assignment",
          desc: "Admin pairs the order with a specialized product template and assigns a certified field inspector closest to the mill."
        },
        {
          step: "03",
          title: "On-Site Live Telemetry",
          desc: "Inspector checks into the mill; admin dashboard activates 'In Progress' status. Defects and photos are synchronized live."
        },
        {
          step: "04",
          title: "QA Sign-Off & Instant Export",
          desc: "Admin conducts senior QA review, approves or flags for re-inspection, and issues cryptographic PDF/Excel audit certificates."
        }
      ]);

      const defaultTrustStats = JSON.stringify([
        { value: "14,800+", label: "Inspections Completed" },
        { value: "99.4%", label: "On-Time Mill Arrival" },
        { value: "65+", label: "Certified Field Auditors" },
        { value: "100%", label: "Independent & Conflict-Free" }
      ]);

      await pool.query(
        `INSERT INTO site_settings (
          company_name, tagline, logo_url, contact_email, contact_phone, 
          whatsapp_number, whatsapp_message, hero_badge, hero_title, hero_subtitle, 
          about_title, about_content, about_bullets, services_content, process_content, trust_stats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ApexFabric Quality Audits',
          'Premier Third-Party Fabrication, Apparel & Mill Inspection Services in Pakistan',
          '/media/branding/logo.svg',
          'operations@apexfabric-audit.com',
          '+92 300 8472910',
          '+92 300 8472910',
          'Hello ApexFabric, I would like to book a third-party fabrication audit in Pakistan.',
          'ISO 9001:2015 Accredited Quality Audits',
          'Precision Fabrication Inspection & Mill Quality Auditing Across Pakistan',
          'Empowering USA & international apparel buyers with uncompromised on-site quality assurance, real-time defect telemetry, and rigorous third-party fabrication verifications.',
          'Independent Quality Assurance You Can Trust',
          'We serve as your dedicated boots-on-the-ground in Pakistan textile and industrial manufacturing hubs. From yarn mills in Faisalabad to denim processing in Karachi and knitwear finishing in Lahore, our certified inspectors execute thorough audits with zero conflict of interest.',
          defaultAboutBullets,
          defaultServices,
          defaultProcess,
          defaultTrustStats
        ]
      );
      console.log('✓ Seeded Site Settings');
    }

    // 2. Seed Slider Slides
    const [existingSlides] = await pool.query('SELECT id FROM slider_slides LIMIT 1');
    if (existingSlides.length === 0) {
      await pool.query(
        `INSERT INTO slider_slides (title, subtitle, badge, image_url, button_text, button_link, sort_order, is_active)
         VALUES 
         (?, ?, ?, ?, ?, ?, 1, 1),
         (?, ?, ?, ?, ?, ?, 2, 1),
         (?, ?, ?, ?, ?, ?, 3, 1)`,
        [
          'Real-Time Woven Fabric & Mill Audits',
          'Rigorous 4-point fabric inspection on illuminated perch tables directly in Faisalabad & Karachi mills.',
          'Woven & Denim Quality',
          '/media/slider/slide-1.webp',
          'Explore Inspection Scope',
          '#services',

          'Pre-Shipment Garment & Apparel Inspection',
          'Comprehensive measurement checks, defect classification, and AQL standard conformance testing.',
          'Apparel & Garment QA',
          '/media/slider/slide-2.webp',
          'Schedule Audit',
          '#contact',

          'Spinning & Greige Package Certification',
          'Cone density, yarn hairiness, nep counts, and moisture verifications before container dispatch.',
          'Yarn & Greige Audits',
          '/media/slider/slide-3.webp',
          'Request Mill Visit',
          '#contact'
        ]
      );
      console.log('✓ Seeded Slider Slides');
    }

    // 3. Seed Users
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('admin123', salt);
    const customerPass = await bcrypt.hash('customer123', salt);
    const empPass = await bcrypt.hash('emp123', salt);

    // Admin
    const [adminCheck] = await pool.query('SELECT id FROM users WHERE email = ?', ['admin@apexfabric.com']);
    let adminId;
    if (adminCheck.length === 0) {
      const [res] = await pool.query(
        `INSERT INTO users (role, name, email, password_hash, phone, status)
         VALUES ('admin', 'Farhan Qureshi (QA Director)', 'admin@apexfabric.com', ?, '+92 300 8472910', 'active')`,
        [adminPass]
      );
      adminId = res.insertId;
      console.log('✓ Seeded Admin User: admin@apexfabric.com / admin123');
    } else {
      adminId = adminCheck[0].id;
    }

    // Customers (USA Buyers)
    const [cust1Check] = await pool.query('SELECT id FROM users WHERE email = ?', ['john@usafashionbrands.com']);
    let cust1Id;
    if (cust1Check.length === 0) {
      const [res] = await pool.query(
        `INSERT INTO users (role, name, email, password_hash, company_name, city, country, phone, status)
         VALUES ('customer', 'Johnathan Miller', 'john@usafashionbrands.com', ?, 'Pacific Apparel Sourcing LLC', 'Los Angeles, CA', 'USA', '+1 213 555 0194', 'active')`,
        [customerPass]
      );
      cust1Id = res.insertId;
      console.log('✓ Seeded Customer 1: john@usafashionbrands.com / customer123');
    } else {
      cust1Id = cust1Check[0].id;
    }

    const [cust2Check] = await pool.query('SELECT id FROM users WHERE email = ?', ['sarah@manhattangarments.com']);
    let cust2Id;
    if (cust2Check.length === 0) {
      const [res] = await pool.query(
        `INSERT INTO users (role, name, email, password_hash, company_name, city, country, phone, status)
         VALUES ('customer', 'Sarah Jenkins', 'sarah@manhattangarments.com', ?, 'Manhattan Garment Imports Inc.', 'New York, NY', 'USA', '+1 212 555 8392', 'active')`,
        [customerPass]
      );
      cust2Id = res.insertId;
      console.log('✓ Seeded Customer 2: sarah@manhattangarments.com / customer123');
    } else {
      cust2Id = cust2Check[0].id;
    }

    // Employees (Field QA Inspectors in Pakistan)
    const employeesData = [
      {
        name: 'Kashif Mahmood',
        email: 'kashif@apexfabric.com',
        code: 'EMP-1001',
        city: 'Faisalabad',
        phone: '+92 301 7721890'
      },
      {
        name: 'Tariq Zaman',
        email: 'tariq@apexfabric.com',
        code: 'EMP-1002',
        city: 'Karachi',
        phone: '+92 321 8839201'
      },
      {
        name: 'Usman Ali',
        email: 'usman@apexfabric.com',
        code: 'EMP-1003',
        city: 'Lahore',
        phone: '+92 333 4458921'
      }
    ];

    const employeeMap = {};
    for (const emp of employeesData) {
      const [check] = await pool.query('SELECT id FROM users WHERE employee_code = ?', [emp.code]);
      if (check.length === 0) {
        const [res] = await pool.query(
          `INSERT INTO users (role, name, email, password_hash, employee_code, city, country, phone, status)
           VALUES ('employee', ?, ?, ?, ?, ?, 'Pakistan', ?, 'active')`,
          [emp.name, emp.email, empPass, emp.code, emp.city, emp.phone]
        );
        employeeMap[emp.code] = res.insertId;
        console.log(`✓ Seeded Employee: ${emp.name} (${emp.code}) / emp123`);
      } else {
        employeeMap[emp.code] = check[0].id;
      }
    }

    // 4. Seed Inspection Templates
    const [tmplCheck] = await pool.query('SELECT id FROM inspection_templates LIMIT 1');
    let template1Id, template2Id;
    if (tmplCheck.length === 0) {
      // Template 1: Denim & Woven Fabrication
      const [t1Res] = await pool.query(
        `INSERT INTO inspection_templates (title, product_type, description, version, is_active, created_by)
         VALUES (?, ?, ?, 1, 1, ?)`,
        [
          'Standard Woven Denim & Apparel Inspection Protocol',
          'Woven Denim Fabric & Apparel',
          'Comprehensive quality audit protocol covering visual fabric defects, dimensional tolerance, seam strength, and washing defects according to ASTM D5430 4-point system.',
          adminId
        ]
      );
      template1Id = t1Res.insertId;

      // Fields for Template 1
      const t1Fields = [
        {
          name: 'broken_stitching_count',
          label: 'Broken / Skipped Stitching Count',
          type: 'numeric_defect',
          unit: 'defects',
          required: 1,
          sort: 1,
          help: 'Defect count: broken, skipped, or insecure stitching lines.'
        },
        {
          name: 'oil_chemical_stains',
          label: 'Oil / Chemical & Grease Stains',
          type: 'numeric_defect',
          unit: 'spots',
          required: 1,
          sort: 2,
          help: 'Defect count: machine oil splashes or dye spills.'
        },
        {
          name: 'shade_variation_count',
          label: 'Shade / Color Variation Defects',
          type: 'numeric_defect',
          unit: 'pieces',
          required: 1,
          sort: 3,
          help: 'Defect count: roll-to-roll or garment tone mismatch vs approved standard.'
        },
        {
          name: 'fabric_tears_holes',
          label: 'Holes, Cuts & Tears in Weave',
          type: 'numeric_defect',
          unit: 'instances',
          required: 1,
          sort: 4,
          help: 'Defect count: needle chews, slub holes, or cutting snags.'
        },
        {
          name: 'waist_width_measurement',
          label: 'Waist Band Width (Actual Mean)',
          type: 'measurement_text',
          unit: 'inches',
          required: 1,
          sort: 5,
          help: 'Measured across waistband. Spec: 32.0 in +/- 0.5 in'
        },
        {
          name: 'inseam_length_measurement',
          label: 'Inseam Length (Actual Mean)',
          type: 'measurement_text',
          unit: 'inches',
          required: 1,
          sort: 6,
          help: 'Measured crotch to hem. Spec: 30.0 in +/- 0.5 in'
        },
        {
          name: 'fabric_gsm_weight',
          label: 'Fabric GSM Weight (Round Cutter)',
          type: 'measurement_text',
          unit: 'g/m²',
          required: 1,
          sort: 7,
          help: 'Target 385 GSM (+/- 15 GSM)'
        },
        {
          name: 'primary_defect_category',
          label: 'Primary Defect Classification',
          type: 'dropdown_defect',
          options: JSON.stringify([
            'Weaving Imperfection (Slub/Miss-Pick)',
            'Stitching & Construction Fault',
            'Wash Tint / Uneven Bleaching',
            'Hardware & Rivet Attachment',
            'Finishing / Pressing Crease'
          ]),
          required: 1,
          sort: 8,
          help: 'Select dominant category found in sample'
        },
        {
          name: 'defect_severity_level',
          label: 'Overall Defect Severity Level',
          type: 'dropdown_defect',
          options: JSON.stringify([
            'Minor (Cosmetic only, customer acceptable)',
            'Major (Functional / Noticeable flaw)',
            'Critical (Unsaleable / Safety hazard)'
          ]),
          required: 1,
          sort: 9,
          help: 'AQL severity standard classification'
        },
        {
          name: 'photo_full_garment',
          label: 'Full Inspection Lot / Garment Photo',
          type: 'image_upload',
          required: 1,
          sort: 10,
          help: 'Wide view of inspected lot or flat garment layout on perch table.'
        },
        {
          name: 'photo_defect_closeup',
          label: 'Macro Defect Close-Up with Scale',
          type: 'image_upload',
          required: 1,
          sort: 11,
          help: 'Close-up photo of identified defect with ruler/measuring gauge.'
        },
        {
          name: 'inspector_field_notes',
          label: 'Auditor Remarks & Mill Observations',
          type: 'textarea',
          required: 0,
          sort: 12,
          help: 'Factory ambient conditions, packaging status, cartons inspected.'
        }
      ];

      for (const f of t1Fields) {
        await pool.query(
          `INSERT INTO template_fields (template_id, field_name, field_label, field_type, unit, is_required, options, sort_order, help_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [template1Id, f.name, f.label, f.type, f.unit || null, f.required, f.options || null, f.sort, f.help]
        );
      }
      console.log('✓ Seeded Template 1: Standard Woven Denim & Apparel');

      // Template 2: Knitwear & T-Shirts
      const [t2Res] = await pool.query(
        `INSERT INTO inspection_templates (title, product_type, description, version, is_active, created_by)
         VALUES (?, ?, ?, 1, 1, ?)`,
        [
          'Knitwear & T-Shirt Pre-Shipment Quality Protocol',
          'Knitwear & Combed Cotton Apparel',
          'Defect analysis protocol for circular knit fabrics, jersey, pique polo shirts, and fleece hoodies.',
          adminId
        ]
      );
      template2Id = t2Res.insertId;

      const t2Fields = [
        {
          name: 'dropped_stitches_count',
          label: 'Dropped Stitch & Needle Hole Count',
          type: 'numeric_defect',
          unit: 'defects',
          required: 1,
          sort: 1,
          help: 'Count of loop breaks, runs or dropped stitches.'
        },
        {
          name: 'puckering_seam_faults',
          label: 'Puckered Seam & Tension Faults',
          type: 'numeric_defect',
          unit: 'instances',
          required: 1,
          sort: 2,
          help: 'Excessive wavy or puckered collar / hem seams.'
        },
        {
          name: 'uneven_dye_spots',
          label: 'Uneven Dyeing & Color Bleed Spots',
          type: 'numeric_defect',
          unit: 'spots',
          required: 1,
          sort: 3,
          help: 'Color blotches, streaks, or shade variation across panels.'
        },
        {
          name: 'chest_circumference',
          label: 'Chest Width (1 inch below armhole)',
          type: 'measurement_text',
          unit: 'inches',
          required: 1,
          sort: 4,
          help: 'Target: 21.0 in +/- 0.5 in'
        },
        {
          name: 'body_length_measurement',
          label: 'Total Body Length (HSP to bottom hem)',
          type: 'measurement_text',
          unit: 'inches',
          required: 1,
          sort: 5,
          help: 'Target: 29.5 in +/- 0.5 in'
        },
        {
          name: 'fabric_gsm_measurement',
          label: 'Finished Fabric GSM (Target: 180 GSM)',
          type: 'measurement_text',
          unit: 'g/m²',
          required: 1,
          sort: 6,
          help: 'Tolerance +/- 8 GSM'
        },
        {
          name: 'knit_defect_category',
          label: 'Knit Defect Type',
          type: 'dropdown_defect',
          options: JSON.stringify([
            'Yarn Imperfection / Slub',
            'Knitting Machine Barring / Stripe',
            'Collar Rib Distortion',
            'Print / Embroidery Misalignment',
            'Stain / Dirt Contamination'
          ]),
          required: 1,
          sort: 7,
          help: 'Standard knitwear defect taxonomy'
        },
        {
          name: 'photo_knit_overview',
          label: 'Lot Sample Front/Back Photo',
          type: 'image_upload',
          required: 1,
          sort: 8,
          help: 'Full lay flat image under factory lighting'
        },
        {
          name: 'photo_knit_defect',
          label: 'Defect Spot Close-Up',
          type: 'image_upload',
          required: 1,
          sort: 9,
          help: 'High magnification image of defect'
        },
        {
          name: 'knit_auditor_notes',
          label: 'Inspector Quality Summary',
          type: 'textarea',
          required: 0,
          sort: 10,
          help: 'Overall hand feel, odor check, barcoding and polybag labeling'
        }
      ];

      for (const f of t2Fields) {
        await pool.query(
          `INSERT INTO template_fields (template_id, field_name, field_label, field_type, unit, is_required, options, sort_order, help_text)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [template2Id, f.name, f.label, f.type, f.unit || null, f.required, f.options || null, f.sort, f.help]
        );
      }
      console.log('✓ Seeded Template 2: Knitwear & T-Shirts');
    } else {
      template1Id = tmplCheck[0].id;
    }

    // 5. Seed Orders
    const [ordersCheck] = await pool.query('SELECT id FROM orders LIMIT 1');
    let order1Id, order2Id, order3Id, order4Id, order5Id;
    if (ordersCheck.length === 0) {
      // Order 1
      const [o1] = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, po_number, product_type, product_description,
          factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
          factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ORD-2026-001',
          cust1Id,
          'PO-USA-89210',
          'Woven Denim Fabric & Apparel',
          '5-Pocket Classic Indigo Washed Men Denim Jeans, 13.5 oz Ringspun Denim, YKK antique brass zippers.',
          'Artistic Milliners Unit 4',
          'Karachi',
          'Plot 19/2, Sector 23, Korangi Industrial Area, Karachi, Sindh',
          'Imran Siddiqui (QA Manager)',
          '+92 300 2198471',
          'https://maps.google.com/?q=24.8387,67.1420',
          5000,
          'pieces',
          '2026-10-01',
          'Approved',
          cust1Id
        ]
      );
      order1Id = o1.insertId;

      // Order 2
      const [o2] = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, po_number, product_type, product_description,
          factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
          factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ORD-2026-002',
          cust1Id,
          'PO-USA-94812',
          'Knitwear & Combed Cotton Apparel',
          'Premium 180 GSM 100% Combed Ringspun Cotton Crewneck Tees in Black & Heather Gray.',
          'Interloop Limited (Denim & Apparel Div)',
          'Faisalabad',
          '1-Km Khurrianwala-Jaranwala Road, Faisalabad, Punjab',
          'Adnan Akhtar (Production Head)',
          '+92 321 6654312',
          'https://maps.google.com/?q=31.4981,73.2678',
          10000,
          'pieces',
          '2026-10-03',
          'In Progress',
          cust1Id
        ]
      );
      order2Id = o2.insertId;

      // Order 3
      const [o3] = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, po_number, product_type, product_description,
          factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
          factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ORD-2026-003',
          cust2Id,
          'PO-NYC-77301',
          'Woven Denim Fabric & Apparel',
          'Raw Selvedge Denim Rolls, 32-inch width, 14 oz heavy twill with authentic red selvedge ID line.',
          'Nishat Mills Limited (Weaving Unit 2)',
          'Lahore',
          '22-Km Ferozepur Road, Kahna Nau, Lahore, Punjab',
          'Bilal Rasheed (Mill GM)',
          '+92 333 4291882',
          'https://maps.google.com/?q=31.3654,74.3582',
          2500,
          'yards',
          '2026-10-04',
          'Submitted',
          cust2Id
        ]
      );
      order3Id = o3.insertId;

      // Order 4
      const [o4] = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, po_number, product_type, product_description,
          factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
          factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ORD-2026-004',
          cust2Id,
          'PO-NYC-66120',
          'Knitwear & Combed Cotton Apparel',
          'Organic Cotton Terry Bath Robes & Heavy Terry Towels, 550 GSM hotel export grade.',
          'Al-Karam Textile Mills Unit 6',
          'Multan',
          'Phase II Industrial Estate, Sher Shah Road, Multan, Punjab',
          'Zubair Hashmi',
          '+92 301 7892341',
          'https://maps.google.com/?q=30.1575,71.4249',
          3000,
          'pieces',
          '2026-10-05',
          'Needs Re-inspection',
          adminId
        ]
      );
      order4Id = o4.insertId;

      // Order 5
      const [o5] = await pool.query(
        `INSERT INTO orders (
          order_number, customer_id, po_number, product_type, product_description,
          factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
          factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'ORD-2026-005',
          cust1Id,
          'PO-USA-55109',
          'Woven Denim Fabric & Apparel',
          'Stone-Washed Denim Trucker Jackets with sherpa fleece lining, copper rivet enforcement.',
          'Crescent Bahuman Limited',
          'Sialkot',
          'Daska Road, Sambrial Export Processing Zone, Sialkot, Punjab',
          'M. Farooq',
          '+92 300 9621345',
          'https://maps.google.com/?q=32.4945,74.5229',
          1800,
          'pieces',
          '2026-10-06',
          'Unassigned',
          cust1Id
        ]
      );
      order5Id = o5.insertId;

      console.log('✓ Seeded 5 Realistic Orders across Karachi, Faisalabad, Lahore, Multan, Sialkot');
    }

    // 6. Seed Inspection Sheets with realistic field values and defect percentage calculation
    const [sheetsCheck] = await pool.query('SELECT id FROM inspection_sheets LIMIT 1');
    if (sheetsCheck.length === 0 && order1Id && template1Id) {
      const empKarachiId = employeeMap['EMP-1002'];
      const empFaisalabadId = employeeMap['EMP-1001'];
      const empLahoreId = employeeMap['EMP-1003'];

      // Sheet 1: Approved (AQL sample = 315 from 5,000 ordered)
      // Defects: 2 broken stitches, 1 oil spot, 1 shade mismatch = 4 defects total
      // Defect %: (4 / 315) * 100 = 1.27% (Passed AQL 2.5!)
      const [s1] = await pool.query(
        `INSERT INTO inspection_sheets (
          sheet_number, order_id, template_id, assigned_employee_id, status,
          ordered_quantity, inspected_quantity, total_defect_count, overall_defect_percentage,
          pass_fail_result, employee_notes, admin_remarks, started_at, submitted_at, reviewed_at, reviewed_by
        ) VALUES (?, ?, ?, ?, 'Approved', 5000, 315, 4, 1.27, 'Pass', ?, ?, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 12 HOUR, ?)`,
        [
          'INS-2026-001',
          order1Id,
          template1Id,
          empKarachiId,
          'AQL Level II Normal sampling performed. Factory illumination was 1050 lux. 315 pieces drawn at random from 125 packed master cartons. Defect rate 1.27% is well below the 2.5% maximum allowable limit. Cartons properly labeled and barcoded.',
          'Approved for container loading. Inspection certificate cryptographically endorsed.',
          adminId
        ]
      );
      const sheet1Id = s1.insertId;

      // Fetch template 1 fields to insert field values
      const [t1FieldsList] = await pool.query('SELECT * FROM template_fields WHERE template_id = ?', [template1Id]);
      for (const field of t1FieldsList) {
        let textVal = null;
        let numVal = null;
        let calcPct = null;

        if (field.field_name === 'broken_stitching_count') {
          numVal = 2;
          calcPct = (2 / 315) * 100; // 0.63%
        } else if (field.field_name === 'oil_chemical_stains') {
          numVal = 1;
          calcPct = (1 / 315) * 100; // 0.32%
        } else if (field.field_name === 'shade_variation_count') {
          numVal = 1;
          calcPct = (1 / 315) * 100; // 0.32%
        } else if (field.field_name === 'fabric_tears_holes') {
          numVal = 0;
          calcPct = 0;
        } else if (field.field_name === 'waist_width_measurement') {
          textVal = '32.1 inches (Spec: 32.0 in +/- 0.5 in)';
        } else if (field.field_name === 'inseam_length_measurement') {
          textVal = '29.9 inches (Spec: 30.0 in +/- 0.5 in)';
        } else if (field.field_name === 'fabric_gsm_weight') {
          textVal = '388 g/m² (Within +/- 15 GSM tolerance)';
        } else if (field.field_name === 'primary_defect_category') {
          textVal = 'Stitching & Construction Fault';
        } else if (field.field_name === 'defect_severity_level') {
          textVal = 'Minor (Cosmetic only, customer acceptable)';
        } else if (field.field_name === 'inspector_field_notes') {
          textVal = 'Factory QA cooperated fully. Clean folding, polybags perforated with suffocation warning.';
        }

        await pool.query(
          `INSERT INTO inspection_field_values (sheet_id, field_id, value_text, value_number, calculated_percentage)
           VALUES (?, ?, ?, ?, ?)`,
          [sheet1Id, field.id, textVal, numVal, calcPct]
        );
      }

      // Photos for Sheet 1
      await pool.query(
        `INSERT INTO inspection_photos (sheet_id, photo_url, caption, defect_tag)
         VALUES 
         (?, '/media/slider/slide-1.webp', 'Inspection on perch table at Artistic Milliners Unit 4', 'Lot Inspection'),
         (?, '/media/inspections/sample-garment-defect.webp', 'Measurement verification on waistband and fly', 'Measurement Check'),
         (?, '/media/inspections/sample-fabric-weave.webp', 'Microscopic weave check for denim warp/weft uniformity', 'Weave Verification')`,
        [sheet1Id, sheet1Id, sheet1Id]
      );

      // Audit logs for Sheet 1
      await pool.query(
        `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
         VALUES 
         (?, ?, 'ASSIGNED', 'Unassigned', 'Not Started', 'Assigned to Inspector Tariq Zaman (EMP-1002) for Karachi Mill site visit.'),
         (?, ?, 'OPENED', 'Not Started', 'In Progress', 'Inspector opened inspection sheet on mobile device upon mill gate check-in.'),
         (?, ?, 'DRAFT_SAVED', 'In Progress', 'Draft Saved', 'Inspector saved first 150 pieces measurement telemetry.'),
         (?, ?, 'SUBMITTED', 'Draft Saved', 'Submitted', 'Inspection completed on site. 315 samples evaluated. 4 defects found (1.27%).'),
         (?, ?, 'APPROVED', 'Submitted', 'Approved', 'QA Director reviewed findings, photos, and calculated defect metrics. Approved for shipment.')`,
        [
          sheet1Id, adminId,
          sheet1Id, empKarachiId,
          sheet1Id, empKarachiId,
          sheet1Id, empKarachiId,
          sheet1Id, adminId
        ]
      );

      // Sheet 2: In Progress (Live right now on dashboard!)
      if (order2Id && template2Id) {
        const [s2] = await pool.query(
          `INSERT INTO inspection_sheets (
            sheet_number, order_id, template_id, assigned_employee_id, status,
            ordered_quantity, inspected_quantity, total_defect_count, overall_defect_percentage,
            pass_fail_result, started_at
          ) VALUES (?, ?, ?, ?, 'In Progress', 10000, 500, 3, 0.60, 'Pending', NOW() - INTERVAL 1 HOUR)`,
          ['INS-2026-002', order2Id, template2Id, empFaisalabadId]
        );
        const sheet2Id = s2.insertId;

        await pool.query(
          `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
           VALUES 
           (?, ?, 'ASSIGNED', 'Unassigned', 'Not Started', 'Assigned to Inspector Kashif Mahmood (EMP-1001) in Faisalabad.'),
           (?, ?, 'OPENED', 'Not Started', 'In Progress', 'Inspector opened sheet on mobile device at Interloop Limited.')`,
          [sheet2Id, adminId, sheet2Id, empFaisalabadId]
        );
      }

      // Sheet 3: Submitted (In Admin approval queue!)
      if (order3Id && template1Id) {
        const [s3] = await pool.query(
          `INSERT INTO inspection_sheets (
            sheet_number, order_id, template_id, assigned_employee_id, status,
            ordered_quantity, inspected_quantity, total_defect_count, overall_defect_percentage,
            pass_fail_result, employee_notes, started_at, submitted_at
          ) VALUES (?, ?, ?, ?, 'Submitted', 2500, 200, 8, 4.00, 'Pending', ?, NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 45 MINUTE)`,
          [
            'INS-2026-003',
            order3Id,
            template1Id,
            empLahoreId,
            'Examined 200 yards across 4 randomly selected selvedge denim rolls at Nishat Mills. Detected 4 yarn slubs, 2 oil spots, and 2 dropped picks. Calculated defect rate 4.00%. Awaiting QA Director decision.'
          ]
        );
        const sheet3Id = s3.insertId;

        // Photos for Sheet 3
        await pool.query(
          `INSERT INTO inspection_photos (sheet_id, photo_url, caption, defect_tag)
           VALUES 
           (?, '/media/slider/slide-3.webp', 'Inspection on spinning/weaving floor at Nishat Mills Lahore', 'Roll Audit'),
           (?, '/media/inspections/sample-fabric-weave.webp', 'Yarn slub flaw identified on Roll #4', 'Yarn Slub')`,
          [sheet3Id, sheet3Id]
        );

        await pool.query(
          `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
           VALUES 
           (?, ?, 'ASSIGNED', 'Unassigned', 'Not Started', 'Assigned to Usman Ali (EMP-1003).'),
           (?, ?, 'OPENED', 'Not Started', 'In Progress', 'Sheet opened at factory.'),
           (?, ?, 'SUBMITTED', 'In Progress', 'Submitted', 'Employee completed audit and submitted into QA Approval Queue.')`,
          [sheet3Id, adminId, sheet3Id, empLahoreId, sheet3Id, empLahoreId]
        );
      }

      // Sheet 4: Needs Re-inspection (Sent back by admin with remarks!)
      if (order4Id && template2Id) {
        const [s4] = await pool.query(
          `INSERT INTO inspection_sheets (
            sheet_number, order_id, template_id, assigned_employee_id, status,
            ordered_quantity, inspected_quantity, total_defect_count, overall_defect_percentage,
            pass_fail_result, employee_notes, admin_remarks, started_at, submitted_at, reviewed_at, reviewed_by
          ) VALUES (?, ?, ?, ?, 'Needs Re-inspection', 3000, 125, 6, 4.80, 'Conditional', ?, ?, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 2 HOUR, ?)`,
          [
            'INS-2026-004',
            order4Id,
            template2Id,
            empFaisalabadId,
            'Initial round completed. 6 defects found on Terry robes.',
            'Needs Re-inspection: The photo uploaded for the color bleed on the hem border is blurry. Please draw 50 additional pieces from lot B, re-verify hem stitch tension, and re-upload clear macro photos with proper white balance.',
            adminId
          ]
        );
        const sheet4Id = s4.insertId;

        await pool.query(
          `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
           VALUES 
           (?, ?, 'ASSIGNED', 'Unassigned', 'Not Started', 'Initial assignment.'),
           (?, ?, 'SUBMITTED', 'In Progress', 'Submitted', 'Initial submission by employee.'),
           (?, ?, 'RE_INSPECTION_REQUESTED', 'Submitted', 'Needs Re-inspection', 'Admin rejected submission: Re-inspect hem stitch tension on lot 4B and upload clearer lighting photo.')`,
          [sheet4Id, adminId, sheet4Id, empFaisalabadId, sheet4Id, adminId]
        );
      }

      console.log('✓ Seeded realistic Inspection Sheets, Field Values, Photos & Full Audit Trails');
    }

    console.log('--- Database Seeding Complete! ---');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
