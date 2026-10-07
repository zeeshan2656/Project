import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { siteApi } from '../services/api';

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('apex_site_settings');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_) {}
    return {
      company_name: 'ApexFabric',
      tagline: 'Premier Third-Party Fabrication, Apparel & Mill Inspection Services in Pakistan',
      logo_url: '/media/branding/texnexus-logo-dark_1791319090286_311370303.svg',
      contact_email: 'operations@apexfabric-audit.com',
      contact_phone: '+92 300 8472910',
      whatsapp_number: '+92 300 8472910',
      whatsapp_message: 'Hello, I would like to inquire about booking a third-party fabrication inspection.',
      hero_badge: 'ISO 9001:2015 Accredited Quality Audits',
      hero_title: 'Precision Fabrication Inspection & Mill Quality Auditing Across Pakistan',
      hero_subtitle: 'Empowering USA & international apparel buyers with uncompromised on-site quality assurance, real-time defect telemetry, and rigorous third-party fabrication verifications.',
      about_title: 'Independent Quality Assurance You Can Trust',
      about_content: 'We serve as your dedicated boots-on-the-ground in Pakistan textile and industrial manufacturing hubs.',
      about_bullets: [],
      services_content: [],
      process_content: [],
      trust_stats: []
    };
  });
  const [slides, setSlides] = useState(() => {
    try {
      const cached = localStorage.getItem('apex_site_slides');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return [];
  });
  const [loading, setLoading] = useState(true);

  const fetchSiteData = useCallback(async () => {
    try {
      const res = await siteApi.getSettings();
      if (res && res.success && res.settings) {
        setSettings(res.settings);
        setSlides(res.slides || []);

        try {
          localStorage.setItem('apex_site_settings', JSON.stringify(res.settings));
          if (res.slides) {
            localStorage.setItem('apex_site_slides', JSON.stringify(res.slides));
          }
        } catch (_) {}

        // Dynamically update document title!
        if (res.settings.company_name) {
          document.title = `${res.settings.company_name} | Third-Party Inspection & Mill Audit Platform`;
        }
      }
    } catch (err) {
      console.warn('Failed to load dynamic site settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  // Clean WhatsApp click-to-chat URL helper
  const getWhatsAppLink = (customText) => {
    const rawNumber = settings.whatsapp_number ? settings.whatsapp_number.replace(/[^0-9]/g, '') : '923008472910';
    const text = encodeURIComponent(customText || settings.whatsapp_message || 'Hello, I would like to book an inspection audit.');
    return `https://wa.me/${rawNumber}?text=${text}`;
  };

  return (
    <SiteContext.Provider value={{
      settings,
      slides,
      loading,
      fetchSiteData,
      companyName: settings.company_name,
      logoUrl: settings.logo_url || '/media/branding/texnexus-logo-dark_1791319090286_311370303.svg',
      tagline: settings.tagline,
      contactEmail: settings.contact_email,
      contactPhone: settings.contact_phone,
      whatsappNumber: settings.whatsapp_number,
      whatsappLink: getWhatsAppLink()
    }}>
      {children}
    </SiteContext.Provider>
  );
}

export const useSite = () => useContext(SiteContext);
