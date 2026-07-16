const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const configuredApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const apiBase = isLocalHost && configuredApiBase.includes('onrender.com')
  ? 'http://localhost:5000/api'
  : configuredApiBase;

export function getProxiedMediaUrl(url) {
  if (!url) {
    return '';
  }

  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      parsedUrl.hostname.endsWith('.supabase.co') ||
      parsedUrl.hostname === 'supabase.co' ||
      parsedUrl.hostname === 'ui-avatars.com'
    ) {
      return `${apiBase}/media/proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    return url;
  }

  return url;
}