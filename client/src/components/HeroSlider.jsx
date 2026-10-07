import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck, ArrowRight, Play, Pause, LogIn, UserPlus } from 'lucide-react';

export function HeroSlider({ slides = [], onCtaClick }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef(null);

  const total = slides.length;

  useEffect(() => {
    if (total <= 1 || !isPlaying) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 6000);

    return () => clearInterval(timerRef.current);
  }, [total, isPlaying, currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  if (!slides || slides.length === 0) {
    return (
      <div style={{ height: '520px', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
        No slider slides configured yet.
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div 
      className="hero-slider"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
    >
      {/* 1. VISUAL IMAGE STAGE (Full on Desktop, Compact 230px on Mobile) */}
      <div className="hero-image-stage">
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="hero-slide-item"
            style={{
              opacity: idx === currentIndex ? 1 : 0,
              transform: idx === currentIndex ? 'scale(1)' : 'scale(1.06)',
              transition: 'opacity 900ms cubic-bezier(0.4, 0, 0.2, 1), transform 6000ms ease-out',
              pointerEvents: idx === currentIndex ? 'auto' : 'none',
              zIndex: idx === currentIndex ? 1 : 0
            }}
          >
            <img
              src={slide.image_url}
              alt={slide.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 35%'
              }}
            />
            {/* Cinematic multi-gradient overlay for desktop */}
            <div
              className="hero-desktop-overlay"
              style={{
                background: 'linear-gradient(to right, rgba(2, 6, 23, 0.94) 0%, rgba(15, 23, 42, 0.78) 45%, rgba(15, 23, 42, 0.35) 100%)'
              }}
            />
            <div
              className="hero-desktop-overlay"
              style={{
                background: 'linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, transparent 40%)'
              }}
            />
            {/* Soft gradient overlay for mobile */}
            <div className="hero-mobile-img-overlay" />
          </div>
        ))}

        {/* Slider Manual Navigation Controls (Desktop bottom-right / Mobile bottom-right of image) */}
        <div className="hero-controls-bar">
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '3px'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
            0{currentIndex + 1} / 0{total}
          </span>

          <button
            onClick={handleNext}
            aria-label="Next Slide"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '3px'
            }}
          >
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pause Autoplay' : 'Play Autoplay'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '3px',
              marginLeft: '2px'
            }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
        </div>

        {/* Slide Indicator Dots (Desktop bottom-left / Mobile bottom-left of image) */}
        <div className="hero-dots-bar">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === currentIndex ? '26px' : '8px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: i === currentIndex ? '#38BDF8' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 300ms ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* 2. CONTENT STAGE (Overlay on Desktop, Cleanly Below Image on Mobile) */}
      <div className="hero-content-stage">
        <div className="container" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ maxWidth: '680px' }}>
            {/* Badge */}
            <div 
              className="hero-badge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#60A5FA',
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '1.25rem',
                backdropFilter: 'blur(8px)'
              }}
            >
              <ShieldCheck size={15} />
              <span>{currentSlide.badge || 'Third-Party Fabrication Audit'}</span>
            </div>

            {/* Title */}
            <h1
              className="hero-title"
              style={{
                fontSize: 'clamp(2.1rem, 4.2vw, 3.6rem)',
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
                color: '#FFFFFF',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
            >
              {currentSlide.title}
            </h1>

            {/* Subtitle / Paragraph */}
            <p
              className="hero-subtitle"
              style={{
                fontSize: 'clamp(1rem, 1.3vw, 1.2rem)',
                lineHeight: 1.6,
                color: '#CBD5E1',
                marginBottom: '2rem',
                maxWidth: '580px'
              }}
            >
              {currentSlide.subtitle}
            </p>

            {/* Actions */}
            <div className="hero-actions" style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => onCtaClick ? onCtaClick(currentSlide.button_link || '/register') : (window.location.href = currentSlide.button_link || '#services')}
                className="btn btn-accent btn-lg"
                style={{ 
                  padding: '0.8rem 1.85rem', 
                  fontWeight: 700, 
                  borderRadius: 'var(--radius-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  boxShadow: '0 4px 16px rgba(2, 132, 199, 0.45)'
                }}
              >
                <UserPlus size={18} />
                <span>{currentSlide.button_text || 'Register as Buyer (USA)'}</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={() => onCtaClick ? onCtaClick('/login') : null}
                className="btn btn-outline btn-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.8rem 1.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <LogIn size={17} />
                <span>Portal Sign In</span>
              </button>

              <a
                href="#process"
                className="btn btn-outline btn-lg"
                style={{
                  backgroundColor: 'transparent',
                  color: '#94A3B8',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.8rem 1.4rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem'
                }}
              >
                Audit Workflow
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
