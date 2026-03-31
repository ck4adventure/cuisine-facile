import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const contentDir = join(dirname(__filename), '../../content');

export type EquipItem = { fr: string; en: string };

export type TermItem = {
  fr: string;    // French term label
  defFr: string; // French definition
  en: string;    // English term label
  defEn: string; // English definition
};

export type VocabData = {
  equipment: EquipItem[];
  terms: TermItem[];
};

export function parseVocab(): VocabData {
  const text = readFileSync(join(contentDir, '01_vocabulaire.md'), 'utf-8');

  const equipment: EquipItem[] = [];
  const terms: TermItem[] = [];

  // Split into H2 sections by ---
  const blocks = text.split(/\n---\n/).map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    // Equipment block: has both "**French —" and "**English —" with bullet lists
    if (block.includes('**French —') && block.includes('**English —')) {
      const frSection = block.match(/\*\*French[^*]+\*\*([\s\S]*?)(?=\*\*English)/);
      const enSection = block.match(/\*\*English[^*]+\*\*([\s\S]*?)$/);
      if (frSection && enSection) {
        const frItems = frSection[1].match(/^- (.+)$/mg)?.map((l) => l.slice(2).trim()) ?? [];
        const enItems = enSection[1].match(/^- (.+)$/mg)?.map((l) => l.slice(2).trim()) ?? [];
        for (let i = 0; i < Math.min(frItems.length, enItems.length); i++) {
          equipment.push({ fr: frItems[i], en: enItems[i] });
        }
      }
      continue;
    }

    // Cooking terms block: has "**French:**" and "**English:**" sections
    // with "**term** : definition" entries
    if (block.includes('**French:**') && block.includes('**English:**')) {
      const frSection = block.match(/\*\*French:\*\*([\s\S]*?)(?=\*\*English:\*\*)/);
      const enSection = block.match(/\*\*English:\*\*([\s\S]*?)$/);
      if (frSection && enSection) {
        const termPattern = /^\*\*(.+?)\*\*\s*:\s*(.+)$/mg;

        const frTerms: { term: string; def: string }[] = [];
        for (const m of frSection[1].matchAll(termPattern)) {
          frTerms.push({ term: m[1].trim(), def: m[2].trim() });
        }

        const enTerms: { term: string; def: string }[] = [];
        for (const m of enSection[1].matchAll(termPattern)) {
          enTerms.push({ term: m[1].trim(), def: m[2].trim() });
        }

        for (let i = 0; i < Math.min(frTerms.length, enTerms.length); i++) {
          terms.push({
            fr: frTerms[i].term,
            defFr: frTerms[i].def,
            en: enTerms[i].term,
            defEn: enTerms[i].def,
          });
        }
      }
    }
  }

  return { equipment, terms };
}

let _cache: VocabData | null = null;
export function getVocabData(): VocabData {
  if (!_cache) _cache = parseVocab();
  return _cache;
}
