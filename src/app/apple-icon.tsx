import { ImageResponse } from 'next/og';


export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#090d13',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '24%',
          border: '6px solid #3fb950',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Nested radar targeting circles */}
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: '2px dashed #58a6ff',
            opacity: 0.65,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 22,
            borderRadius: '50%',
            border: '1px solid #30363d',
          }}
        />
        
        {/* Cyber Shield/Diagnostic Crosshair Text */}
        <span
          style={{
            fontFamily: 'system-ui, monospace',
            fontWeight: 900,
            color: '#3fb950',
            fontSize: '110px',
            textShadow: '0px 0px 20px rgba(63,185,80,0.8), 0px 0px 40px rgba(88,166,255,0.6)',
            transform: 'translateY(-4px)',
          }}
        >
          X
        </span>
      </div>
    ),
    { ...size }
  );
}