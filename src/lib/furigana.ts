// Aligns a Japanese sentence with its kana reading to produce furigana
// tokens. Pure functions only.

export interface FuriToken {
  text: string;
  ruby?: string; // reading for kanji runs
}

const isKanji = (ch: string): boolean =>
  /[一-龯㐀-䶿々〆ヶ]/.test(ch);

/** Split into alternating runs of kanji and non-kanji text. */
function segments(ja: string): { text: string; kanji: boolean }[] {
  const out: { text: string; kanji: boolean }[] = [];
  for (const ch of ja) {
    const k = isKanji(ch);
    const last = out[out.length - 1];
    if (last && last.kanji === k) last.text += ch;
    else out.push({ text: ch, kanji: k });
  }
  return out;
}

/**
 * Align `ja` (mixed kanji/kana) with `kana` (full reading). Kanji-run
 * readings are recovered by anchoring on the literal kana runs around them.
 * Falls back to no ruby when the alignment fails — never throws.
 */
export function alignFurigana(ja: string, kana: string): FuriToken[] {
  const segs = segments(ja);
  const tokens: FuriToken[] = [];
  let pos = 0; // cursor into kana
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!seg) continue;
    if (!seg.kanji) {
      const idx = kana.indexOf(seg.text, pos);
      pos = idx === -1 ? pos : idx + seg.text.length;
      tokens.push({ text: seg.text });
      continue;
    }
    const next = segs[i + 1];
    if (!next) {
      const ruby = kana.slice(pos);
      tokens.push(ruby ? { text: seg.text, ruby } : { text: seg.text });
      pos = kana.length;
      continue;
    }
    // Reading runs until the next literal (non-kanji) run reappears.
    const anchor = kana.indexOf(next.text, pos + 1);
    if (anchor === -1) {
      tokens.push({ text: seg.text });
      continue;
    }
    tokens.push({ text: seg.text, ruby: kana.slice(pos, anchor) });
    pos = anchor;
  }
  return tokens;
}
