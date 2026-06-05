export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Local disk upload — development only when R2 is unavailable. */
export function isDevUploadAllowed(): boolean {
  return !isProduction();
}
