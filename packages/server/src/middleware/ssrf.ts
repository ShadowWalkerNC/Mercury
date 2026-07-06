/**
 * SSRF guard — rejects outbound fetches to private/loopback ranges.
 * Wrap any user-supplied URL through checkSSRF() before fetching.
 */
export function checkSSRF(rawUrl: string): void {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only http and https URLs are permitted');
  }

  const hostname = url.hostname;

  const blocked = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
    /^0\.0\.0\.0$/,
    /\.internal$/i,
    /\.local$/i,
  ];

  for (const pattern of blocked) {
    if (pattern.test(hostname)) {
      throw new Error(`Blocked SSRF target: ${hostname}`);
    }
  }
}
