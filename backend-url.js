function getBackendUrl(hostname = '', search = '', fallback = 'https://linkedin-hunter-backend.onrender.com') {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const override = params.get('backend') || params.get('backendUrl') || (typeof globalThis !== 'undefined' ? globalThis.LINKEDIN_HUNTER_BACKEND_URL : undefined);

  if (override) {
    return override;
  }

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  return fallback;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getBackendUrl };
} else if (typeof window !== 'undefined') {
  window.getBackendUrl = getBackendUrl;
}
