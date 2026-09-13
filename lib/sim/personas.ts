import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { personaSchema } from './schema';
export function loadPersonas(
  root = path.join(
    process.cwd(),
    'content/rnb/sales-design-consultant/simulator/personas',
  ),
) {
  return readdirSync(root)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) =>
      personaSchema.parse(
        JSON.parse(readFileSync(path.join(root, file), 'utf8')),
      ),
    );
}
