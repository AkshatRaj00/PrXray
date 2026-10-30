'use client';

import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import styles from './Footer.module.css';

// Lightweight Zero-Dependency Brand SVGs
const TwitterXIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TelegramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerContent}>
        <div className={styles.topRow}>
          <div className={styles.brandInfo}>
            <span className={styles.brandTag}>
              <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
              OnePersonAI Systems Lab
            </span>
            <span className={styles.badge}>Security Research</span>
            <span className={styles.badge}>v1.0.0-Frontier</span>
          </div>

          <div className={styles.socialRow}>
            <a 
              href="mailto:onepersonai.service@gmail.com" 
              className={styles.emailPill}
              title="Official Support Email"
            >
              <Mail size={13} />
              <span>onepersonai.service@gmail.com</span>
            </a>

            <a 
              href="https://x.com/onepersonai_in" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Follow on X"
            >
              <TwitterXIcon />
            </a>

            <a 
              href="https://www.linkedin.com/in/onepersonai-in-197644426/?skipRedirect=true" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Connect on LinkedIn"
            >
              <LinkedInIcon />
            </a>

            <a 
              href="https://www.youtube.com/@OnePersonAI_Official" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Subscribe on YouTube"
            >
              <YouTubeIcon />
            </a>

            <a 
              href="https://t.me/onepersonaiofficial" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Join Telegram Channel"
            >
              <TelegramIcon />
            </a>

            <a 
              href="https://www.instagram.com/onepersonaiofficial/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Follow on Instagram"
            >
              <InstagramIcon />
            </a>

            <a 
              href="https://www.facebook.com/profile.php?id=61592496011767" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.socialLink}
              title="Follow on Facebook"
            >
              <FacebookIcon />
            </a>
          </div>
        </div>

        <p className={styles.bottomDisclaimer}>
          PR-XRay operates under strict Zero-Data-Ingestion guarantees. Source code diffs, cryptographic calculations, and AST heuristics execute natively within client-side V8 and Wasm memory boundaries without remote telemetry.
        </p>
      </div>
    </footer>
  );
};