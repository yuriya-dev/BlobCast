import { MODERATION_REASONS, MODERATION_STATUS, type ModerationReason, type ModerationStatus } from './constants';

export type ModerationResult = {
  status: ModerationStatus;
  reason: ModerationReason;
};

const MODERATION_PROMPT = `You are a content moderation classifier.

Analyze the content and return JSON only.

Response format:

{
  "safe": true,
  "reason": "none"
}

or

{
  "safe": false,
  "reason": "spam|scam|hate|explicit"
}

Content:

`;

function parseGeminiJson(text: string): { safe?: boolean; reason?: string } | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as { safe?: boolean; reason?: string };
  } catch {
    return null;
  }
}

function normalizeReason(reason: string | undefined): ModerationReason {
  if (!reason) return 'none';
  const lower = reason.toLowerCase();
  if (MODERATION_REASONS.includes(lower as ModerationReason)) {
    return lower as ModerationReason;
  }
  return 'spam';
}

/**
 * Classify text via Gemini. Empty text is treated as safe (media-only posts).
 * Without GEMINI_API_KEY, defaults to VISIBLE for local development.
 */
export async function moderateTextContent(content: string): Promise<ModerationResult> {
  if (!content.trim()) {
    return { status: MODERATION_STATUS.VISIBLE, reason: 'none' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY not set — skipping AI moderation (defaulting to VISIBLE).');
    return { status: MODERATION_STATUS.VISIBLE, reason: 'none' };
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${MODERATION_PROMPT}${content}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('Gemini moderation API error:', response.status, errBody);
    return { status: MODERATION_STATUS.VISIBLE, reason: 'none' };
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = parseGeminiJson(rawText);

  if (!parsed || typeof parsed.safe !== 'boolean') {
    console.warn('⚠️ Gemini returned unparseable moderation JSON:', rawText);
    return { status: MODERATION_STATUS.VISIBLE, reason: 'none' };
  }

  if (parsed.safe) {
    return { status: MODERATION_STATUS.VISIBLE, reason: 'none' };
  }

  return {
    status: MODERATION_STATUS.HIDDEN,
    reason: normalizeReason(parsed.reason),
  };
}
