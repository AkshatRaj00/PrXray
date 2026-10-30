'use client';

import React from 'react';
import Link from 'next/link';

export function Navbar() {
  return (
    <header style={{
      borderBottom: '1px solid #30363d',
      backgroundColor: 'rgba(13, 17, 23, 0.85)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #238636, #1f6feb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#fff',
            fontSize: '14px',
            border: '1px solid #3fb950'
          }}>
            X
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#e6edf3', letterSpacing: '-0.02em' }}>
            PR-XRay <span style={{ fontSize: '0.75rem', color: '#3fb950', border: '1px solid #238636', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>v2.4</span>
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link href="/scan" style={{ color: '#8b949e', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Scanner
          </Link>
          <Link href="/audit" style={{ color: '#8b949e', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Workbench
          </Link>
          <a
            href="https://github.com/AkshatRaj00/PrXray"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '0.35rem 0.85rem',
              backgroundColor: '#21262d',
              border: '1px solid #30363d',
              borderRadius: '6px',
              color: '#c9d1d9',
              fontSize: '0.85rem',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}