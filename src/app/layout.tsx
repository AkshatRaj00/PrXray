import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SentinelProvider } from '@/lib/state/sentinelContext';

export const viewport: Viewport = {
  themeColor: '#090d13',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://pr-xray.onepersonai.in'),
  title: {
    default: 'PR-XRay | In-Browser Client-Side SAST Security Engine',
    template: '%s | PR-XRay Systems Lab',
  },
  description: 'Enterprise static application security testing platform running 100% inside client memory. Real-time Shannon entropy secret scanning, AST taint analysis, and WebGPU neural patch remediation.',
  keywords: [
    'SAST',
    'Application Security',
    'Static Code Analysis',
    'Client-Side Security',
    'Shannon Entropy',
    'Secret Scanner',
    'WebGPU AI Copilot',
    'Monaco Editor Security',
    'Next.js SAST',
    'OnePersonAI',
    'Akshat Raj'
  ],
  authors: [{ name: 'Akshat Raj', url: 'https://github.com/AkshatRaj00' }],
  creator: 'OnePersonAI Systems Lab',
  publisher: 'OnePersonAI',
  applicationName: 'PR-XRay',
  generator: 'Next.js 16 (Turbopack)',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://pr-xray.onepersonai.in',
    siteName: 'PR-XRay Security Sentinel',
    title: 'PR-XRay | High-Velocity Client-Side SAST & Neural Remediation',
    description: 'Zero-data-ingestion security auditing platform. Detect secrets, cyclomatic hotspots, and AST vulnerabilities in milliseconds using WebGPU and WASM.',
    images: [
      {
        url: '/og-banner.png',
        width: 1200,
        height: 630,
        alt: 'PR-XRay In-Browser Security Canvas Banner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PR-XRay | In-Browser Client-Side SAST Security Engine',
    description: 'Autonomous static security analysis and neural patch synthesis running 100% locally in your browser.',
    creator: '@AkshatRaj00',
    images: ['/og-banner.png'],
  },
  alternates: {
    canonical: 'https://pr-xray.onepersonai.in',
  },
  verification: {
    google: 'google-site-verification-token-placeholder',
  },
};

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PR-XRay',
    operatingSystem: 'Any (Web Browser)',
    applicationCategory: 'SecurityApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: 'Akshat Raj',
      url: 'https://github.com/AkshatRaj00',
    },
    publisher: {
      '@type': 'Organization',
      name: 'OnePersonAI',
      url: 'https://onepersonai.in',
    },
    description: 'In-browser zero-data-ingestion SAST security platform. Performs real-time Shannon entropy secret scanning and AST analysis using WebGPU.',
  };
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#090d13',
          color: '#e6edf3',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          minHeight: '100vh',
        }}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SentinelProvider>
          {children}
        </SentinelProvider>
      </body>
    </html>
  );
}