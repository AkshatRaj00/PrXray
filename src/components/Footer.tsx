'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #30363d',
      backgroundColor: '#090d13',
      padding: '2rem 1.5rem',
      color: '#8b949e',
      fontSize: '0.85rem',
      width: '100%',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        <div>
          <span style={{ color: '#e6edf3', fontWeight: 600 }}>PR-XRay</span> &copy; 2026{' '}
          <a href="https://onepersonai.in" target="_blank" rel="noreferrer" style={{ color: '#58a6ff', textDecoration: 'none' }}>
            OnePersonAI
          </a> Systems Lab. Client-side deterministic security.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <Link href="/scan" style={{ color: '#8b949e', textDecoration: 'none' }}>Scan</Link>
          <Link href="/audit" style={{ color: '#8b949e', textDecoration: 'none' }}>Audit</Link>
          <a href="https://github.com/AkshatRaj00/PrXray" target="_blank" rel="noreferrer" style={{ color: '#8b949e', textDecoration: 'none' }}>
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}