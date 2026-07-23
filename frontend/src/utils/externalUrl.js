export function externalUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (/^https?:\/(?!\/)/i.test(url)) {
    return url.replace(/^((?:https?):)\/+/i, '$1//');
  }
  if (/^https?\/\//i.test(url)) {
    return url.replace(/^(https?)\/\//i, '$1://');
  }
  if (url.startsWith('//')) return `https:${url}`;
  return `https://${url.replace(/^\/+/, '')}`;
}

export default externalUrl;
