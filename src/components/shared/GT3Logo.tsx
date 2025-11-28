'use client';

export function GT3Logo() {
  return (
    <div 
      style={{
        display: 'inline-block',
        padding: '40px 60px',
        overflow: 'visible',
        minWidth: '600px',
        minHeight: '350px',
        transform: 'rotate(-12deg)',
        position: 'relative',
      }}
    >
      <span 
        className="gt3-logo-text"
        style={{
          fontFamily: 'var(--font-windsong)',
          fontSize: '120px',
          fontWeight: '700',
          fontStyle: 'italic',
          background: 'linear-gradient(135deg, #5B93D7 0%, #2E5AAC 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          display: 'block',
          animation: 'drawIn 1.5s ease-out forwards',
          opacity: 0,
          letterSpacing: '-0.02em',
          lineHeight: '1.4',
          whiteSpace: 'nowrap',
        }}
      >
        Gt3
      </span>
    </div>
  );
}

