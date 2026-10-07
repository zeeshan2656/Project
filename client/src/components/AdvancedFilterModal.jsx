import React, { useEffect } from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';

export function AdvancedFilterModal({
  isOpen,
  onClose,
  title = 'Advanced Filters',
  activeCount = 0,
  onReset,
  children
}) {
  // Prevent background scrolling when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="mobile-filter-modal-overlay" onClick={onClose}>
      <div 
        className="mobile-filter-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Handle / Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Filter size={18} color="#2563EB" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {title}
                </h3>
                {activeCount > 0 && (
                  <span style={{ fontSize: '0.65rem', backgroundColor: '#2563EB', color: '#FFFFFF', padding: '2px 7px', borderRadius: '12px', fontWeight: 700 }}>
                    {activeCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                Refine and search records
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748B'
            }}
            aria-label="Close filters"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
          {children}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '0.65rem', paddingTop: '0.85rem', borderTop: '1px solid #E2E8F0' }}>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="btn btn-outline"
              style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ flex: 1.5, justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Check size={16} /> Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
