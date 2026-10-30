import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot'],
        allow: '/',
      },
    ],
    sitemap: 'https://pr-xray.onepersonai.in/sitemap.xml',
  };
}