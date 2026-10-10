const { pool } = require('./db');
const { seedDatabase } = require('./seed');

/**
 * Safely ensure a column exists in a MySQL table using SHOW COLUMNS
 */
async function ensureColumn(table, column, definition) {
  try {
    // Check if table exists first
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
    if (cols.length === 0) {
      console.log(`[Auto-Migration] Adding missing column: ${table}.${column}`);
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[Auto-Migration] ✓ Added ${table}.${column}`);
    }
  } catch (err) {
    // Some MySQL versions/configs might error on specific syntax, log warning without throwing
    console.warn(`[Auto-Migration Notice] Could not alter ${table}.${column}:`, err.message);
  }
}

/**
 * Automatically migrate and synchronize live database schema on server boot
 */
async function runAutoMigrations() {
  console.log('[Auto-Migration] Checking and synchronizing database schema...');

  try {
    // 1. Users table columns
    await ensureColumn('users', 'plain_password', 'VARCHAR(255) NULL');
    await ensureColumn('users', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');
    await ensureColumn('users', 'status', "ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");

    // Clean existing NULLs & populate initial plain passwords for known demo accounts
    await pool.query('UPDATE users SET is_deleted = 0 WHERE is_deleted IS NULL').catch(() => {});
    await pool.query("UPDATE users SET status = 'active' WHERE status IS NULL").catch(() => {});
    await pool.query("UPDATE users SET plain_password = 'customer123' WHERE role = 'customer' AND (plain_password IS NULL OR plain_password = '')").catch(() => {});
    await pool.query("UPDATE users SET plain_password = 'emp123' WHERE role = 'employee' AND (plain_password IS NULL OR plain_password = '')").catch(() => {});
    await pool.query("UPDATE users SET plain_password = 'admin123' WHERE role = 'admin' AND (plain_password IS NULL OR plain_password = '')").catch(() => {});

    // 2. Inspection Templates table columns
    await ensureColumn('inspection_templates', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');
    await ensureColumn('inspection_templates', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('inspection_templates', 'disposition_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'auditor_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'order_autofill_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'sampling_plan_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'defect_master_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'severity_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'calculations_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'aql_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'dimensional_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'sections_config', 'JSON NULL');
    await ensureColumn('inspection_templates', 'validation_config', 'JSON NULL');

    await pool.query('UPDATE inspection_templates SET is_deleted = 0 WHERE is_deleted IS NULL').catch(() => {});
    await pool.query('UPDATE inspection_templates SET is_active = 1 WHERE is_active IS NULL').catch(() => {});

    // 3. Orders table columns
    await ensureColumn('orders', 'inspection_status', "VARCHAR(50) NOT NULL DEFAULT 'Unassigned'");
    await ensureColumn('orders', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');

    await pool.query('UPDATE orders SET is_deleted = 0 WHERE is_deleted IS NULL').catch(() => {});

    // 4. Inspection Sheets table columns
    await ensureColumn('inspection_sheets', 'disposition', "VARCHAR(50) NOT NULL DEFAULT 'Pending'");
    await ensureColumn('inspection_sheets', 'general_info_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'order_autofill_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'sampling_plan_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'defect_findings_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'dimensional_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'aql_results_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'signatures_data', 'JSON NULL');
    await ensureColumn('inspection_sheets', 'packaging_remarks', 'TEXT NULL');
    await ensureColumn('inspection_sheets', 'pass_fail_result', "VARCHAR(50) NULL DEFAULT 'Pending'");

    // 5. Defects table columns (if defects table exists)
    try {
      const [defectCols] = await pool.query("SHOW TABLES LIKE 'defects'");
      if (defectCols.length > 0) {
        await ensureColumn('defects', 'reference_images', 'JSON NULL');
        await ensureColumn('defects', 'is_deleted', 'TINYINT(1) NOT NULL DEFAULT 0');
        await ensureColumn('defects', 'severity_default', "VARCHAR(50) NOT NULL DEFAULT 'Major'");
      }
    } catch (_) {}

    // 6. Check if inspection_templates or users need seeding
    try {
      const [tmplRows] = await pool.query('SELECT COUNT(*) AS total FROM inspection_templates');
      const [userRows] = await pool.query('SELECT COUNT(*) AS total FROM users');
      if (tmplRows[0]?.total === 0 || userRows[0]?.total === 0) {
        console.log('[Auto-Migration] Database requires initial seed data. Running seedDatabase()...');
        await seedDatabase();
      }
    } catch (seedErr) {
      console.warn('[Auto-Migration Notice] Template/user check seed notice:', seedErr.message);
    }

    console.log('[Auto-Migration] ✓ Database schema synchronization completed successfully.');
  } catch (err) {
    console.error('[Auto-Migration Error] Failed to run schema migrations:', err.message);
  }
}

module.exports = {
  runAutoMigrations,
  ensureColumn
};
