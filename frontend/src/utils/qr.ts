/**
 * QR codes contain a link like  https://csc.example/member/scanner?code=<token>
 * so that scanning with the phone's normal camera app opens the site directly.
 * The token is random and never contains the credit amount.
 */
export function buildQrValue(token: string): string {
  return `${window.location.origin}/member/scanner?code=${encodeURIComponent(token)}`;
}

/**
 * Pulls the token out of whatever the scanner decoded: either one of our links
 * or a raw token. Anything else is passed through unchanged and the backend
 * will answer "Invalid QR Code".
 */
export function extractQrToken(decoded: string): string {
  const text = decoded.trim();
  try {
    const url = new URL(text);
    return url.searchParams.get('code') ?? text;
  } catch {
    return text;
  }
}
