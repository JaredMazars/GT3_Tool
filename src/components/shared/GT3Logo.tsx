'use client';

import Image from 'next/image';

export function GT3Logo() {
  return (
    <div 
      style={{
        display: 'inline-block',
        padding: '40px 60px',
        overflow: 'visible',
        minWidth: '600px',
        minHeight: '350px',
        transform: 'rotate(-0deg)',
        position: 'relative',
      }}
    >
      <div
        style={{
          display: 'block',
          animation: 'drawIn 1.5s ease-out forwards',
          opacity: 0,
          position: 'relative',
          width: '500px',
          height: '280px',
        }}
      >
        <Image
          src="/GT3.png"
          alt="GT3 Logo"
          fill
          style={{
            objectFit: 'contain',
          }}
          priority
        />
      </div>
    </div>
  );
}

