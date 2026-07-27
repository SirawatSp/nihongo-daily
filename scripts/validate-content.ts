// Validates all content JSON against the zod schemas. Run in CI; a
// malformed entry fails the build. Also checks for duplicate ids.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import {
  dialogueFileSchema,
  grammarFileSchema,
  readingFileSchema,
  vocabFileSchema,
} from '../src/data/schema';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');

let failed = false;

function validate(file: string, schema: z.ZodTypeAny): void {
  const raw = JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as unknown;
  const result = schema.safeParse(raw);
  if (!result.success) {
    failed = true;
    console.error(`✗ ${file}`);
    for (const issue of result.error.issues.slice(0, 20)) {
      console.error(`  at ${issue.path.join('.')}: ${issue.message}`);
    }
    return;
  }
  const entries = result.data as { id: string }[];
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      failed = true;
      console.error(`✗ ${file}: duplicate id "${entry.id}"`);
    }
    ids.add(entry.id);
  }
  console.log(`✓ ${file}: ${entries.length} entries valid`);
}

validate('vocab.json', vocabFileSchema);
validate('grammar.json', grammarFileSchema);
validate('dialogues.json', dialogueFileSchema);
validate('readings.json', readingFileSchema);

if (failed) {
  console.error('\nContent validation FAILED.');
  process.exit(1);
}
console.log('\nAll content valid.');
