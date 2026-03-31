import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, type Section } from './sections.js';

export type Recipe = {
  num: number;           // primary recipe number
  numDisplay: string;    // display string e.g. "93 & 94"
  slug: string;          // url-safe e.g. "sauce-bordelaise"
  section: string;       // section slug e.g. "sauces"
  titleFr: string;
  titleEn: string;
  bodyFr: string;        // raw text, (N° X) markers intact
  bodyEn: string;        // raw text, (No. X) markers intact
  depends: number[];     // recipe numbers referenced in body
  captionFr?: string;    // illustration caption if present
  captionEn?: string;
  group?: string;        // sub-heading label e.g. "LE BŒUF"
};

export type RecipeMap = Map<number, Recipe>;
export type SectionRecipes = Map<string, Recipe[]>;

// Derive content directory from this module's location (src/lib → project root → content)
const __filename = fileURLToPath(import.meta.url);
const projectRoot = join(__filename, '../../..');
const contentDir = join(projectRoot, 'content');

function readContent(filePath: string): string {
  return readFileSync(join(contentDir, filePath), 'utf-8');
}

/** Convert an English title to a URL-safe slug */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // remove punctuation
    .trim()
    .replace(/\s+/g, '-');
}

/** Extract all (N° X) and (No. X) reference numbers from text.
 * Handles variants like (voir N° 31) and (roux, N° 8) by matching
 * N° or No. anywhere within a parenthesized expression. */
function extractDepends(frText: string, enText: string): number[] {
  const nums = new Set<number>();
  const frMatches = frText.matchAll(/\([^)]*N°\s*(\d+)[^)]*\)/g);
  const enMatches = enText.matchAll(/\([^)]*No\.\s*(\d+)[^)]*\)/g);
  for (const m of frMatches) nums.add(parseInt(m[1], 10));
  for (const m of enMatches) nums.add(parseInt(m[1], 10));
  return Array.from(nums).sort((a, b) => a - b);
}

/**
 * Extract an illustration caption from body text.
 * Captions appear as *italic text* (Markdown italics) after the recipe body.
 * Returns { body, caption } where caption is the extracted text (without asterisks), or undefined.
 */
function extractCaption(text: string): { body: string; caption?: string } {
  // Match a standalone italic block at the end of the text
  // Pattern: optional whitespace, then *...* spanning the last italic block
  const match = text.match(/^([\s\S]*?)\s*\*([^*]+)\s*\*\s*$/);
  if (match) {
    return { body: match[1].trim(), caption: match[2].trim() };
  }
  return { body: text.trim() };
}

/**
 * Parse the special dual-recipe block for No. 93 & 94.
 * Returns two separate Recipe objects from a single heading block.
 */
function parseDualRecipe(
  content: string,
  section: string,
  usedSlugs: Set<string>
): Recipe[] {
  const recipes: Recipe[] = [];

  // Match sub-recipe blocks: **No. NNN — Title (EN Title)**
  const subPattern = /\*\*No\.\s*(\d+)\s*[—-]\s*(.+?)\*\*\s*\n\s*\*\*French:\*\*([\s\S]*?)(?=\*\*English:\*\*|\*\*No\.\s*\d+)/g;
  const enPattern = /\*\*English:\*\*([\s\S]*?)(?=---|\*\*No\.\s*\d+|$)/g;

  // Split on sub-recipe boundaries
  const subBlocks = content.split(/(?=\*\*No\.\s*\d+\s*[—-])/);

  for (const block of subBlocks) {
    if (!block.trim()) continue;

    const headMatch = block.match(/^\*\*No\.\s*(\d+)\s*[—-]\s*(.+?)\*\*/);
    if (!headMatch) continue;

    const num = parseInt(headMatch[1], 10);
    const fullTitle = headMatch[2].trim();
    // Split "French Title (English Title)"
    const titleMatch = fullTitle.match(/^(.+?)\s*\((.+?)\)\s*$/);
    const titleFr = titleMatch ? titleMatch[1].trim() : fullTitle;
    const titleEn = titleMatch ? titleMatch[2].trim() : fullTitle;

    const frMatch = block.match(/\*\*French:\*\*([\s\S]*?)(?=\*Illustrations|$|\*\*English:\*\*)/);
    const enMatch = block.match(/\*\*English:\*\*([\s\S]*?)$/);

    const rawFr = frMatch ? frMatch[1].trim() : '';
    const rawEn = enMatch ? enMatch[1].trim() : '';

    // Extract captions from FR body
    const { body: bodyFr, caption: captionFr } = extractCaption(rawFr);
    const { body: bodyEn, caption: captionEn } = extractCaption(rawEn);

    const depends = extractDepends(bodyFr, bodyEn);
    const slug = ensureUniqueSlug(slugify(titleEn), num, usedSlugs);

    recipes.push({
      num,
      numDisplay: String(num),
      slug,
      section,
      titleFr,
      titleEn,
      bodyFr,
      bodyEn,
      depends,
      captionFr: captionFr || undefined,
      captionEn: captionEn || undefined,
    });
  }

  return recipes;
}

function ensureUniqueSlug(base: string, num: number, usedSlugs: Set<string>): string {
  let slug = base;
  if (usedSlugs.has(slug)) {
    slug = `${base}-${num}`;
  }
  usedSlugs.add(slug);
  return slug;
}

/**
 * Parse a single content file and return all Recipe objects found in it.
 * @param filePath  relative path under content/
 * @param section   section slug to assign to all parsed recipes
 * @param usedSlugs mutable set of slugs already used (for uniqueness enforcement)
 * @param groupOverride  optional starting group label (for files that begin mid-section)
 */
function parseFile(
  filePath: string,
  section: string,
  usedSlugs: Set<string>,
  groupOverride?: string
): Recipe[] {
  const text = readContent(filePath);
  const recipes: Recipe[] = [];

  // Current sub-heading group label
  let currentGroup: string | undefined = groupOverride;

  // Split the file into blocks separated by ---
  const blocks = text.split(/\n---\n/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Check if this block is a sub-heading (e.g. ## LE BŒUF)
    // Sub-headings: ## text where text doesn't start with "No."
    const subHeadingMatch = trimmed.match(/^##\s+(?!No\.)([A-ZÀÂÆÇÈÉÊËÎÏÔŒÙÛÜŸ][^()\n]+?)(?:\s*\(.*?\))?\s*$/m);
    if (subHeadingMatch && !trimmed.includes('**French:**')) {
      currentGroup = subHeadingMatch[1].trim();
      continue;
    }

    // Check for a recipe heading: ## No. X — title or ## No. X & Y — title
    // Also handle sub-recipe blocks: **No. X — title** (dual-recipe continuation after ---)
    const recipeHeadMatch =
      trimmed.match(/^##\s+No\.\s+(\d+)(?:\s*&\s*(\d+))?\s*[—-]\s*(.+?)$/m) ??
      trimmed.match(/^\*\*No\.\s+(\d+)\s*[—-]\s*(.+?)\*\*$/m);
    if (!recipeHeadMatch) continue;

    // Normalise: group 1 = num, group 2 = optional second num (only for ## form), group 3 = title
    // For **No. X — title** form, there is no second num — shift groups to match
    const isBoldForm = trimmed.startsWith('**No.');
    const num1 = parseInt(recipeHeadMatch[1], 10);
    const num2 = !isBoldForm && recipeHeadMatch[2] ? parseInt(recipeHeadMatch[2], 10) : null;
    // title is in group 3 for ## form, group 2 for ** form
    const rawTitle = isBoldForm ? recipeHeadMatch[2] : recipeHeadMatch[3];
    const headingTitle = rawTitle?.trim() ?? '';

    // Parse dual-recipe heading (e.g. No. 93 & 94)
    if (num2 !== null) {
      const dualRecipes = parseDualRecipe(trimmed, section, usedSlugs);
      // Assign group to each
      for (const r of dualRecipes) {
        if (currentGroup) r.group = currentGroup;
      }
      recipes.push(...dualRecipes);
      continue;
    }

    // Normal single recipe
    // Split "French Title (English Title)"
    const titleMatch = headingTitle.match(/^(.+?)\s*\((.+?)\)\s*$/);
    const titleFr = titleMatch ? titleMatch[1].trim() : headingTitle;
    const titleEn = titleMatch ? titleMatch[2].trim() : headingTitle;

    // Extract French body (everything between **French:** and **English:**)
    // Caption may appear as *italics* at the end of the French section
    const frMatch = trimmed.match(/\*\*French:\*\*([\s\S]*?)(?=\*\*English:\*\*)/);
    const enMatch = trimmed.match(/\*\*English:\*\*([\s\S]*?)$/);

    const rawFr = frMatch ? frMatch[1].trim() : '';
    const rawEn = enMatch ? enMatch[1].trim() : '';

    const { body: bodyFr, caption: captionFr } = extractCaption(rawFr);
    const { body: bodyEn, caption: captionEn } = extractCaption(rawEn);

    const depends = extractDepends(bodyFr, bodyEn);
    const slug = ensureUniqueSlug(slugify(titleEn), num1, usedSlugs);

    const recipe: Recipe = {
      num: num1,
      numDisplay: String(num1),
      slug,
      section,
      titleFr,
      titleEn,
      bodyFr,
      bodyEn,
      depends,
      captionFr: captionFr || undefined,
      captionEn: captionEn || undefined,
    };

    if (currentGroup) recipe.group = currentGroup;

    recipes.push(recipe);
  }

  return recipes;
}

/** Build the full RecipeMap and SectionRecipes from all content files */
export function buildRecipeData(): { recipeMap: RecipeMap; sectionRecipes: SectionRecipes } {
  const recipeMap: RecipeMap = new Map();
  const sectionRecipes: SectionRecipes = new Map();

  for (const section of sections) {
    if (section.slug === 'vocabulaire') continue; // different data model

    const usedSlugs = new Set<string>();
    let recipes: Recipe[] = [];

    if (section.slug === 'viandes') {
      // Merge files 07 and 08 into one section
      const part1 = parseFile('07_viandes_boeuf_veau.md', section.slug, usedSlugs);
      const part2 = parseFile('08_viandes_mouton_agneau.md', section.slug, usedSlugs);
      recipes = [...part1, ...part2];
    } else {
      recipes = parseFile(section.filePath, section.slug, usedSlugs);
    }

    sectionRecipes.set(section.slug, recipes);
    for (const r of recipes) {
      recipeMap.set(r.num, r);
    }
  }

  return { recipeMap, sectionRecipes };
}

/** Return prev/next recipes in book order for a given recipe number */
export function getAdjacentRecipes(
  num: number,
  recipeMap: RecipeMap
): { prev: Recipe | null; next: Recipe | null } {
  const sorted = Array.from(recipeMap.values()).sort((a, b) => a.num - b.num);
  const idx = sorted.findIndex((r) => r.num === num);
  return {
    prev: idx > 0 ? sorted[idx - 1] : null,
    next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

/** Return all recipes sorted by recipe number */
export function getSortedRecipes(recipeMap: RecipeMap): Recipe[] {
  return Array.from(recipeMap.values()).sort((a, b) => a.num - b.num);
}

// Singleton — built once at module load time
let _cache: { recipeMap: RecipeMap; sectionRecipes: SectionRecipes } | null = null;

export function getRecipeData(): { recipeMap: RecipeMap; sectionRecipes: SectionRecipes } {
  if (!_cache) _cache = buildRecipeData();
  return _cache;
}
