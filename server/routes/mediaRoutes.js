const express = require('express');

const router = express.Router();

const PLACEHOLDER_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Media unavailable">
  <rect width="120" height="120" rx="18" fill="#F3F4F6"/>
  <circle cx="60" cy="50" r="18" fill="#D1D5DB"/>
  <path d="M28 96c7-16 19-24 32-24s25 8 32 24" fill="#D1D5DB"/>
  <path d="M36 36h48" stroke="#9CA3AF" stroke-width="6" stroke-linecap="round"/>
</svg>`;

const isAllowedHost = (hostname) => (
  hostname.endsWith('.supabase.co') ||
  hostname === 'supabase.co' ||
  hostname === 'ui-avatars.com'
);

router.get('/proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).send('Missing url parameter');
  }

  let targetUrl;
  try {
    targetUrl = new URL(url);
  } catch {
    return res.status(400).send('Invalid url parameter');
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol) || !isAllowedHost(targetUrl.hostname)) {
    return res.status(403).send('URL not allowed');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=300');

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.status(200).send(buffer);
  } catch (error) {
    const accept = req.headers.accept || '';
    if (accept.includes('image/') || accept.includes('*/*') || !accept) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(PLACEHOLDER_SVG);
    }

    return res.status(502).json({
      success: false,
      message: 'Unable to load media',
      error: error.message,
    });
  }
});

module.exports = router;