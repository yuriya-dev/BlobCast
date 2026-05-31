export * from './constants';
export { resolveContentText } from './resolveContentText';
export { moderateTextContent, type ModerationResult } from './geminiModeration';

import { resolveContentText } from './resolveContentText';
import { moderateTextContent } from './geminiModeration';

export async function runContentModeration(options: {
  contentText?: string;
  walrusBlobId?: string;
}) {
  const text = await resolveContentText(options);
  return moderateTextContent(text);
}
