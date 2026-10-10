const path = require('path');
const fs = require('fs');

/**
 * Persistent Media Storage Configuration
 * 
 * Ensures that all uploaded media (inspections, slider images, branding logos, defects)
 * are stored in the persistent `media/` directory OUTSIDE the `project/` directory.
 * 
 * Directory Structure:
 * <parent_directory>/
 *   ├── media/        <--- PERSISTENT MEDIA STORAGE (Outside project: NOT wiped on deployment)
 *   │   ├── inspections/
 *   │   ├── slider/
 *   │   ├── branding/
 *   │   └── defects/
 *   └── project/      <--- APPLICATION CODE (Deployed / Replaced on Hostinger / Cloud)
 *       ├── client/
 *       ├── server/
 *       └── ...
 */

// Root of the project deployment (where package.json and server.js sit)
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Media folder OUTSIDE the project folder (sibling to project): .../media
const OUTSIDE_MEDIA_DIR = path.resolve(PROJECT_ROOT, '../media');

// Fallback media folder INSIDE the project folder: .../project/media
const INSIDE_MEDIA_DIR = path.resolve(PROJECT_ROOT, 'media');

let MEDIA_DIR = null;

// 1. Check if an explicit MEDIA_DIR is configured in environment
if (process.env.MEDIA_DIR) {
  const envVal = process.env.MEDIA_DIR.trim();
  // Check absolute path, relative to server/, or relative to project/
  const candidatePaths = [
    path.isAbsolute(envVal) ? envVal : null,
    path.resolve(path.join(PROJECT_ROOT, 'server'), envVal),
    path.resolve(PROJECT_ROOT, envVal)
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      MEDIA_DIR = candidate;
      break;
    }
  }
}

// 2. Default & Priority: Always use OUTSIDE media directory (sibling to project/)
if (!MEDIA_DIR) {
  try {
    if (!fs.existsSync(OUTSIDE_MEDIA_DIR)) {
      fs.mkdirSync(OUTSIDE_MEDIA_DIR, { recursive: true });
    }
    MEDIA_DIR = OUTSIDE_MEDIA_DIR;
  } catch (err) {
    console.warn('[Media Storage] Warning: Could not create outside media directory, falling back to inside project:', err.message);
    if (!fs.existsSync(INSIDE_MEDIA_DIR)) {
      try { fs.mkdirSync(INSIDE_MEDIA_DIR, { recursive: true }); } catch (_) {}
    }
    MEDIA_DIR = INSIDE_MEDIA_DIR;
  }
}

// 3. Ensure all required media subdirectories exist in active MEDIA_DIR
['inspections', 'slider', 'branding', 'defects'].forEach((sub) => {
  const subDir = path.join(MEDIA_DIR, sub);
  if (!fs.existsSync(subDir)) {
    try {
      fs.mkdirSync(subDir, { recursive: true });
    } catch (err) {
      console.warn(`[Media Storage] Could not create subdirectory '${sub}':`, err.message);
    }
  }
});

console.log(`[Media Storage] Storage Root: ${MEDIA_DIR} (Outside project: ${MEDIA_DIR === OUTSIDE_MEDIA_DIR})`);

module.exports = {
  MEDIA_DIR,
  MEDIA_ROOT: MEDIA_DIR, // alias for Multer & controllers
  OUTSIDE_MEDIA_DIR,
  INSIDE_MEDIA_DIR,
  PROJECT_ROOT
};
