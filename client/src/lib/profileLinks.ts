/** Strip protocol/www for storage and display (e.g. "blobcast.xyz"). */
export function normalizeWebsiteForStorage(input: string | null | undefined): string {
  if (!input?.trim()) return '';
  let value = input.trim();
  value = value.replace(/^https?:\/\//i, '');
  value = value.replace(/^www\./i, '');
  value = value.replace(/\/+$/, '');
  return value;
}

export function websiteHref(stored: string | null | undefined): string | null {
  const domain = normalizeWebsiteForStorage(stored);
  if (!domain) return null;
  return `https://${domain}`;
}

export function websiteDisplay(stored: string | null | undefined): string {
  return normalizeWebsiteForStorage(stored);
}

/** Extract GitHub username only (e.g. "octocat"). */
export function normalizeGithubForStorage(input: string | null | undefined): string {
  if (!input?.trim()) return '';
  let value = input.trim().replace(/^@/, '');

  const fromUrl = value.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)/i
  );
  if (fromUrl) return fromUrl[1];

  return value.split('/').filter(Boolean).pop()?.split('?')[0] ?? '';
}

export function githubHref(stored: string | null | undefined): string | null {
  const username = normalizeGithubForStorage(stored);
  if (!username) return null;
  return `https://github.com/${username}`;
}

export function githubDisplay(stored: string | null | undefined): string {
  return normalizeGithubForStorage(stored);
}
