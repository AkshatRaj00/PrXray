import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: '#090d13',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '25%',
          border: '1.5px solid #3fb950',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Outer Circular Glow Radar/Target Effect */}
        <div
          style={{
            position: 'absolute',
            inset: 1.5,
            borderRadius: '50%',
            border: '1px dashed #58a6ff',
            opacity: 0.5,
          }}
        />
        
        {/* Modern Cyber Secure 'X' Character with Custom Glow */}
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: 900,
            color: '#3fb950',
            textShadow: '0 0 4px #58a6ff, 0 0 8px #3fb950',
            fontSize: '18px',
            transform: 'scale(1.15)',
          }}
        >
          X
        </span>
      </div>
    ),
    { ...size }
  );
}