import { prisma } from '../db';

function extractTextFromBlobPayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as Record<string, unknown>;
  const content = record.content;
  if (content && typeof content === 'object' && 'text' in content) {
    const text = (content as { text?: unknown }).text;
    return typeof text === 'string' ? text.trim() : '';
  }
  return '';
}

/**
 * Resolve plain text for Gemini from request body or simulated Walrus blob store.
 */
export async function resolveContentText(options: {
  contentText?: string;
  walrusBlobId?: string;
}): Promise<string> {
  if (options.contentText?.trim()) {
    return options.contentText.trim();
  }

  if (!options.walrusBlobId) {
    return '';
  }

  const blobId = options.walrusBlobId.replace(/^walrus:\/\//, '');

  const blob = await prisma.simulatedBlob.findUnique({
    where: { id: blobId },
  });

  if (!blob) {
    return '';
  }

  try {
    const parsed = JSON.parse(blob.content);
    const fromJson = extractTextFromBlobPayload(parsed);
    if (fromJson) return fromJson;
    return typeof parsed === 'string' ? parsed.trim() : '';
  } catch {
    return blob.content.trim();
  }
}
