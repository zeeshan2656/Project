const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Root media folder outside of project folder: "awais new/media"
const MEDIA_ROOT = path.resolve(__dirname, '../../../../media');

// Ensure root and subdirectories exist
['inspections', 'slider', 'branding'].forEach(sub => {
  const dir = path.join(MEDIA_ROOT, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'inspections';
    if (req.originalUrl.includes('slides') || req.originalUrl.includes('slider')) {
      subfolder = 'slider';
    } else if (req.originalUrl.includes('branding') || req.originalUrl.includes('logo') || req.originalUrl.includes('site-settings')) {
      subfolder = 'branding';
    } else if (req.body && req.body.category) {
      subfolder = req.body.category;
    }

    const targetDir = path.join(MEDIA_ROOT, subfolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e9);
    cb(null, `${sanitizedName}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp|svg|pdf/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mime = file.mimetype;

  if (allowedTypes.test(ext) || allowedTypes.test(mime)) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPG, PNG, WEBP, SVG) and PDFs are allowed.'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max for high-res inspection photos
  },
  fileFilter
});

const sharp = require('sharp');
// Disable sharp cache on Windows so files are never locked
sharp.cache(false);

/**
 * Middleware that converts any uploaded image in req.file / req.files to WebP.
 * Preserves SVG and PDF without altering them.
 * Updates req.file.filename, req.file.path, and req.file.mimetype so downstream
 * controllers automatically use the .webp file without code changes.
 */
async function convertToWebp(req, res, next) {
  try {
    const processFile = async (file) => {
      if (!file || !file.path) return;
      const ext = path.extname(file.filename || file.originalname).toLowerCase();

      // Preserve SVGs and PDFs
      if (ext === '.svg' || ext === '.pdf' || file.mimetype === 'image/svg+xml' || file.mimetype === 'application/pdf') {
        return;
      }

      const origPath = file.path;
      const dir = path.dirname(origPath);
      const baseName = path.basename(file.filename, ext);
      const webpFilename = `${baseName}.webp`;
      const webpPath = path.join(dir, webpFilename);

      if (ext === '.webp') {
        return; // Already webp
      }

      await sharp(origPath)
        .webp({ quality: 85 })
        .toFile(webpPath);

      // Remove the original non-webp file
      if (origPath !== webpPath && fs.existsSync(origPath)) {
        try {
          fs.unlinkSync(origPath);
        } catch (unlinkErr) {
          console.warn('Failed to clean up uploaded raw file:', unlinkErr.message);
        }
      }

      // Update file object for subsequent controllers
      file.filename = webpFilename;
      file.path = webpPath;
      file.mimetype = 'image/webp';
    };

    if (req.file) {
      await processFile(req.file);
    }

    if (req.files) {
      if (Array.isArray(req.files)) {
        for (const f of req.files) {
          await processFile(f);
        }
      } else if (typeof req.files === 'object') {
        for (const key of Object.keys(req.files)) {
          const list = req.files[key];
          if (Array.isArray(list)) {
            for (const f of list) {
              await processFile(f);
            }
          } else {
            await processFile(list);
          }
        }
      }
    }

    next();
  } catch (err) {
    console.error('Error converting image to WebP:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to process uploaded image format conversion: ' + err.message
    });
  }
}

module.exports = {
  upload,
  convertToWebp,
  MEDIA_ROOT
};
