const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { initSocket } = require('./services/socket');
const { pool } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const siteSettingsRoutes = require('./routes/siteSettingsRoutes');
const orderRoutes = require('./routes/orderRoutes');
const templateRoutes = require('./routes/templateRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const defectRoutes = require('./routes/defectRoutes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
const CLIENT_URL = process.env.CLIENT_URL || true;
initSocket(server, CLIENT_URL);

const compression = require('compression');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP Response Compression (Gzip / Deflate for ultra-fast response delivery)
app.use(compression({
  threshold: 1024, // Compress responses > 1KB
  level: 6
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Persistent media directory (outside project folder, immune to deployment overwrites)
const { MEDIA_DIR, INSIDE_MEDIA_DIR } = require('./config/media');

// Serve primary persistent media from outside project folder
app.use('/media', express.static(MEDIA_DIR, {
  maxAge: '365d',
  immutable: true
}));

// Secondary fallback: Also serve legacy/bundled assets from project/media if not yet in outside directory
if (INSIDE_MEDIA_DIR !== MEDIA_DIR && fs.existsSync(INSIDE_MEDIA_DIR)) {
  app.use('/media', express.static(INSIDE_MEDIA_DIR, {
    maxAge: '365d',
    immutable: true
  }));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Fabrication Inspection & Audit Platform API',
    mediaDirectory: MEDIA_DIR
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/defects', defectRoutes);

// Serve Frontend Static Files in Production (Vite React Build)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  // Hashed Vite chunks (JS, CSS) are immutable and cached for 1 year
  const clientAssetsPath = path.join(clientDistPath, 'assets');
  if (fs.existsSync(clientAssetsPath)) {
    app.use('/assets', express.static(clientAssetsPath, {
      maxAge: '365d',
      immutable: true
    }));
  }

  // Self-hosted fonts cached for 1 year
  const clientFontsPath = path.join(clientDistPath, 'fonts');
  if (fs.existsSync(clientFontsPath)) {
    app.use('/fonts', express.static(clientFontsPath, {
      maxAge: '365d',
      immutable: true
    }));
  }

  // General static assets (icons, manifest) with 1-day cache; index.html must never be stale-cached
  const htmlCacheHeader = 'no-cache, no-store, must-revalidate';
  app.use(express.static(clientDistPath, {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', htmlCacheHeader);
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  app.get('*', (req, res, next) => {
    // Pass through API, media, and WebSocket endpoints
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.setHeader('Cache-Control', htmlCacheHeader);
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  console.log(`[Frontend] Serving React Vite SPA from: ${clientDistPath} with CDN edge cache optimization`);
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = parseInt(process.env.PORT || '5000', 10);

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Fabrication Audit Backend running on port ${PORT}`);
  console.log(`📡 WebSocket real-time gateway initialized`);
  console.log(`📁 Media directory: ${MEDIA_DIR}`);
  console.log(`====================================================`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Closing HTTP server and database pool.');
  server.close(async () => {
    await pool.end();
    console.log('Server and pool closed cleanly.');
    process.exit(0);
  });
});
