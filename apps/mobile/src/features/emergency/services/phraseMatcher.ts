// Decides when what the speech recogniser heard counts as the SOS phrase.
// Pure logic with no phone APIs, so it is easy to test.
//
// A single "help me" is often heard by mistake (TV, a song, a chat). So by default the phrase has to
// be heard twice within a few seconds ("help me, help me"). Both can be in one sentence.

export interface MatcherOptions {
  phrases: string[]; // e.g. ['help me']
  hitsRequired: number; // how many times it must be heard
  windowMs: number; // ...within this long
  cooldownMs: number; // after a trigger, ignore everything for this long
}

export const DEFAULT_MATCHER: MatcherOptions = {
  phrases: ['help me'],
  hitsRequired: 2,
  windowMs: 10_000,
  cooldownMs: 30_000,
};

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Pulls the text out of what the recogniser returns: JSON like {"text":"help me"} or {"partial":"..."} or plain text. */
export function extractText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  try {
    const v = JSON.parse(raw) as { text?: unknown; partial?: unknown; alternatives?: { text?: unknown }[] };
    if (typeof v.text === 'string') return v.text;
    if (Array.isArray(v.alternatives) && typeof v.alternatives[0]?.text === 'string') return v.alternatives[0].text;
    return '';
  } catch {
    return raw;
  }
}

/** How many times `phrase` appears in `text` as whole words. */
export function countPhrase(text: string, phrase: string): number {
  const t = ` ${normalize(text)} `;
  const p = ` ${normalize(phrase)} `;
  if (p.trim() === '') return 0;
  let n = 0;
  let i = t.indexOf(p);
  while (i !== -1) {
    n++;
    i = t.indexOf(p, i + p.length - 1); // phrases may share the space between them
  }
  return n;
}

export class PhraseMatcher {
  private hits: number[] = [];
  private lastTrigger = -Infinity;

  constructor(private opts: MatcherOptions = DEFAULT_MATCHER) {}

  setOptions(o: Partial<MatcherOptions>): void {
    this.opts = { ...this.opts, ...o };
  }

  getPhrases(): string[] {
    return [...this.opts.phrases];
  }

  reset(): void {
    this.hits = [];
  }

  /** Feed each FINAL result. Returns true when the SOS should start. */
  feed(raw: unknown, now: number): boolean {
    if (now - this.lastTrigger < this.opts.cooldownMs) return false;
    const text = extractText(raw);
    if (!text) return false;
    let found = 0;
    for (const p of this.opts.phrases) found += countPhrase(text, p);
    if (found === 0) return false;

    for (let i = 0; i < found; i++) this.hits.push(now);
    this.hits = this.hits.filter((t) => now - t <= this.opts.windowMs);
    if (this.hits.length >= this.opts.hitsRequired) {
      this.hits = [];
      this.lastTrigger = now;
      return true;
    }
    return false;
  }
}
