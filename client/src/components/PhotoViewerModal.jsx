import React from 'react';
import { X, ExternalLink, Calendar, Tag } from 'lucide-react';

export function PhotoViewerModal({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '92vw', backgroundColor: '#0F172A', color: '#FFFFFF', border: '1px solid #334155' }}
      >
        <div className="modal-header" style={{ borderBottomColor: '#1E293B' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
              {photo.defect_tag || 'Inspection Evidence Photo'}
            </h3>
            {photo.field_label && (
              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{photo.field_label}</span>
            )}
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1rem', backgroundColor: '#020617', textAlign: 'center', minHeight: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img 
            src={photo.photo_url} 
            alt={photo.caption || 'Evidence'} 
            style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 'var(--radius-xs)' }}
          />
        </div>

        <div className="modal-footer" style={{ backgroundColor: '#0F172A', borderTopColor: '#1E293B', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
            {photo.caption && <p style={{ fontWeight: 500, marginBottom: '4px' }}>"{photo.caption}"</p>}
            {photo.uploaded_at && (
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> {photo.uploaded_at}
              </span>
            )}
          </div>
          <a
            href={photo.photo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ color: '#FFFFFF', borderColor: '#334155' }}
          >
            <ExternalLink size={14} /> Full Resolution
          </a>
        </div>
      </div>
    </div>
  );
}
