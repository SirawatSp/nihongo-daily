import { z } from 'zod';

export const THEMES = [
  'transport',
  'food',
  'lodging',
  'shopping',
  'directions',
  'emergency',
  'smalltalk',
  'time-numbers',
  'signs',
] as const;

export const jlptSchema = z.enum(['N5', 'N4', 'N3']);

export const vocabSchema = z.object({
  id: z.string().min(1),
  kanji: z.string(), // may equal kana when the word has no kanji form
  kana: z.string().min(1),
  romaji: z.string().min(1),
  meaning: z.string().min(1),
  jlpt: jlptSchema,
  themes: z.array(z.enum(THEMES)).min(1),
  exampleJa: z.string().min(1),
  exampleKana: z.string().min(1),
  exampleEn: z.string().min(1),
});

export const grammarSchema = z.object({
  id: z.string().min(1),
  pattern: z.string().min(1),
  plainExplanation: z.string().min(1),
  formula: z.string().min(1),
  examples: z
    .array(z.object({ ja: z.string().min(1), kana: z.string().min(1), en: z.string().min(1) }))
    .length(3),
  jlpt: jlptSchema,
});

export const dialogueSchema = z.object({
  id: z.string().min(1),
  scene: z.string().min(1),
  lines: z
    .array(
      z.object({
        speaker: z.string().min(1),
        ja: z.string().min(1),
        kana: z.string().min(1),
        en: z.string().min(1),
      }),
    )
    .min(2),
  keyPhrases: z.array(z.string().min(1)).min(1),
});

export const readingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  jlpt: jlptSchema,
  ja: z.string().min(1),
  kana: z.string().min(1),
  en: z.string().min(1),
  question: z.object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).length(3),
    answerIndex: z.number().int().min(0).max(2),
  }),
});

export const vocabFileSchema = z.array(vocabSchema);
export const grammarFileSchema = z.array(grammarSchema);
export const dialogueFileSchema = z.array(dialogueSchema);
export const readingFileSchema = z.array(readingSchema);

export type Jlpt = z.infer<typeof jlptSchema>;
export type Theme = (typeof THEMES)[number];
export type VocabEntry = z.infer<typeof vocabSchema>;
export type GrammarEntry = z.infer<typeof grammarSchema>;
export type DialogueEntry = z.infer<typeof dialogueSchema>;
export type ReadingEntry = z.infer<typeof readingSchema>;
