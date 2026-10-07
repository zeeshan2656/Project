const { query } = require('../config/db');
const path = require('path');

// Safe in-memory cache with immediate invalidation on CMS updates
let cachedSiteData = null;

function invalidateSiteSettingsCache() {
  cachedSiteData = null;
}

/**
 * Public: Get site settings & branding
 */
async function getSettings(req, res) {
  try {
    if (cachedSiteData) {
      return res.json({ success: true, ...cachedSiteData });
    }

    const settings = await query('SELECT * FROM site_settings LIMIT 1');
    const slides = await query('SELECT * FROM slider_slides WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');

    if (!settings || settings.length === 0) {
      return res.status(404).json({ success: false, message: 'Site settings not initialized.' });
    }

    const s = settings[0];
    // Parse JSON fields safely if they are stored as strings
    const parseIfString = (val) => {
      if (!val) return [];
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
      }
      return val;
    };

    cachedSiteData = {
      settings: {
        ...s,
        about_bullets: parseIfString(s.about_bullets),
        services_content: parseIfString(s.services_content),
        process_content: parseIfString(s.process_content),
        trust_stats: parseIfString(s.trust_stats)
      },
      slides
    };

    return res.json({
      success: true,
      ...cachedSiteData
    });
  } catch (err) {
    console.error('Error fetching site settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch site settings.' });
  }
}

/**
 * Admin: Update site settings & branding (CMS)
 */
async function updateSettings(req, res) {
  try {
    const {
      company_name,
      tagline,
      contact_email,
      contact_phone,
      whatsapp_number,
      whatsapp_message,
      hero_badge,
      hero_title,
      hero_subtitle,
      about_title,
      about_content,
      about_bullets,
      services_content,
      process_content,
      trust_stats
    } = req.body;

    let logo_url = req.body.logo_url;
    if (req.file) {
      logo_url = `/media/branding/${req.file.filename}`;
    }

    const safeVal = (v) => (v !== undefined ? v : null);
    const stringifyIfNeeded = (val) => {
      if (val === undefined || val === null) return null;
      if (typeof val === 'object') return JSON.stringify(val);
      if (typeof val === 'string') {
        try {
          JSON.parse(val);
          return val; // already valid JSON
        } catch (e) {
          return JSON.stringify([val]);
        }
      }
      return val;
    };

    const currentSettings = await query('SELECT id, logo_url FROM site_settings LIMIT 1');
    if (currentSettings.length === 0) {
      await query(
        `INSERT INTO site_settings (
          company_name, tagline, logo_url, contact_email, contact_phone, whatsapp_number, whatsapp_message,
          hero_badge, hero_title, hero_subtitle, about_title, about_content, about_bullets, services_content, process_content, trust_stats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name || 'ApexFabric Quality Audits',
          tagline || '',
          logo_url || '/media/branding/logo.svg',
          contact_email || '',
          contact_phone || '',
          whatsapp_number || '',
          whatsapp_message || '',
          hero_badge || '',
          hero_title || '',
          hero_subtitle || '',
          about_title || '',
          about_content || '',
          stringifyIfNeeded(about_bullets),
          stringifyIfNeeded(services_content),
          stringifyIfNeeded(process_content),
          stringifyIfNeeded(trust_stats)
        ]
      );
    } else {
      const finalLogo = logo_url ? logo_url : (req.file ? `/media/branding/${req.file.filename}` : currentSettings[0].logo_url);
      await query(
        `UPDATE site_settings SET 
          company_name = COALESCE(?, company_name),
          tagline = COALESCE(?, tagline),
          logo_url = COALESCE(?, logo_url),
          contact_email = COALESCE(?, contact_email),
          contact_phone = COALESCE(?, contact_phone),
          whatsapp_number = COALESCE(?, whatsapp_number),
          whatsapp_message = COALESCE(?, whatsapp_message),
          hero_badge = COALESCE(?, hero_badge),
          hero_title = COALESCE(?, hero_title),
          hero_subtitle = COALESCE(?, hero_subtitle),
          about_title = COALESCE(?, about_title),
          about_content = COALESCE(?, about_content),
          about_bullets = COALESCE(?, about_bullets),
          services_content = COALESCE(?, services_content),
          process_content = COALESCE(?, process_content),
          trust_stats = COALESCE(?, trust_stats)
        WHERE id = ?`,
        [
          safeVal(company_name),
          safeVal(tagline),
          safeVal(finalLogo),
          safeVal(contact_email),
          safeVal(contact_phone),
          safeVal(whatsapp_number),
          safeVal(whatsapp_message),
          safeVal(hero_badge),
          safeVal(hero_title),
          safeVal(hero_subtitle),
          safeVal(about_title),
          safeVal(about_content),
          safeVal(stringifyIfNeeded(about_bullets)),
          safeVal(stringifyIfNeeded(services_content)),
          safeVal(stringifyIfNeeded(process_content)),
          safeVal(stringifyIfNeeded(trust_stats)),
          currentSettings[0].id
        ]
      );
    }

    invalidateSiteSettingsCache();
    return res.json({ success: true, message: 'Site configuration updated successfully.' });
  } catch (err) {
    console.error('Error updating site settings:', err);
    return res.status(500).json({ success: false, message: 'Failed to update site configuration.' });
  }
}

/**
 * Admin: Get all slider slides (including inactive)
 */
async function getAdminSlides(req, res) {
  try {
    const slides = await query('SELECT * FROM slider_slides ORDER BY sort_order ASC, id ASC');
    return res.json({ success: true, slides });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch slides.' });
  }
}

/**
 * Admin: Create slider slide with uploaded photo
 */
async function createSlide(req, res) {
  try {
    const { title, subtitle, badge, button_text, button_link, sort_order, is_active } = req.body;
    let image_url = req.body.image_url;

    if (req.file) {
      const sub = path.basename(req.file.destination) || 'slider';
      image_url = `/media/${sub}/${req.file.filename}`;
    }

    if (!title || !image_url) {
      return res.status(400).json({ success: false, message: 'Slide title and image are required.' });
    }

    const result = await query(
      `INSERT INTO slider_slides (title, subtitle, badge, image_url, button_text, button_link, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title ?? '',
        subtitle ?? '',
        badge ?? 'Fabrication Audit',
        image_url,
        button_text ?? 'Learn More',
        button_link ?? '#services',
        parseInt(sort_order || 0, 10),
        is_active === '0' || is_active === false ? 0 : 1
      ]
    );

    invalidateSiteSettingsCache();
    return res.status(201).json({
      success: true,
      message: 'Slider image added successfully.',
      slideId: result.insertId,
      image_url
    });
  } catch (err) {
    console.error('Error creating slide:', err);
    return res.status(500).json({ success: false, message: 'Failed to create slider slide.' });
  }
}

/**
 * Admin: Update slider slide
 */
async function updateSlide(req, res) {
  try {
    const { id } = req.params;
    const { title, subtitle, badge, button_text, button_link, sort_order, is_active } = req.body;

    let image_url = req.body.image_url;
    if (req.file) {
      const sub = path.basename(req.file.destination) || 'slider';
      image_url = `/media/${sub}/${req.file.filename}`;
    }

    await query(
      `UPDATE slider_slides SET
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        badge = COALESCE(?, badge),
        image_url = COALESCE(?, image_url),
        button_text = COALESCE(?, button_text),
        button_link = COALESCE(?, button_link),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        title !== undefined ? title : null,
        subtitle !== undefined ? subtitle : null,
        badge !== undefined ? badge : null,
        image_url !== undefined ? image_url : null,
        button_text !== undefined ? button_text : null,
        button_link !== undefined ? button_link : null,
        sort_order !== undefined ? parseInt(sort_order, 10) : null,
        is_active !== undefined ? (is_active === '0' || is_active === false ? 0 : 1) : null,
        id
      ]
    );

    invalidateSiteSettingsCache();
    return res.json({ success: true, message: 'Slide updated successfully.' });
  } catch (err) {
    console.error('Error updating slide:', err);
    return res.status(500).json({ success: false, message: 'Failed to update slide.' });
  }
}

/**
 * Admin: Delete slider slide
 */
async function deleteSlide(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM slider_slides WHERE id = ?', [id]);
    invalidateSiteSettingsCache();
    return res.json({ success: true, message: 'Slide deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete slide.' });
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getAdminSlides,
  createSlide,
  updateSlide,
  deleteSlide
};
