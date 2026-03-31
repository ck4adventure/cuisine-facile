import { buildRecipeData } from './recipes.js';

const { recipeMap, sectionRecipes } = buildRecipeData();

const sauces = sectionRecipes.get('sauces') ?? [];

console.log('\n=== SAUCES SECTION — Parsed Recipe Map ===\n');
console.log(`Total recipes in section: ${sauces.length}`);
console.log('');

for (const r of sauces) {
  const depStr = r.depends.length > 0 ? `depends: [${r.depends.join(', ')}]` : 'depends: []';
  const captionStr = r.captionFr ? `  captionFr: "${r.captionFr.slice(0, 60)}..."` : '';
  console.log(`No. ${r.num.toString().padStart(2)} | slug: "${r.slug.padEnd(30)}" | ${depStr}`);
  console.log(`        titleFr: "${r.titleFr}"`);
  console.log(`        titleEn: "${r.titleEn}"`);
  if (captionStr) console.log(captionStr);
  console.log('');
}

// Verification checks
console.log('=== Verification ===\n');
const checks = [
  { label: 'All 16 recipes parsed',                                pass: sauces.length === 16 },
  // Slugs are derived from English titles per spec → "White Sauce" → "white-sauce"
  { label: 'No. 1  slug = "white-sauce" (English title)',         pass: recipeMap.get(1)?.slug === 'white-sauce' },
  { label: 'No. 8  slug = "roux"',                                pass: recipeMap.get(8)?.slug === 'roux' },
  // No. 9 body: "Préparer un roux" — content file has NO (N° 8) marker → depends: []
  { label: 'No. 9  depends: [] (no marker in content)',           pass: JSON.stringify(recipeMap.get(9)?.depends) === '[]' },
  // No. 10 body: "Faire une sauce bordelaise" — no (N° 9) marker → depends: []
  { label: 'No. 10 depends: [] (no marker in content)',           pass: JSON.stringify(recipeMap.get(10)?.depends) === '[]' },
  // No. 16 body: "faire un roux (N° 8)" — marker IS present
  { label: 'No. 16 depends: [8] (marker in content)',             pass: JSON.stringify(recipeMap.get(16)?.depends) === '[8]' },
  { label: 'No. 15 has captionFr (Illustrations block)',          pass: !!recipeMap.get(15)?.captionFr },
  { label: 'All recipes in section "sauces"',                     pass: sauces.every(r => r.section === 'sauces') },
];

for (const { label, pass } of checks) {
  console.log(`  ${pass ? '✓' : '✗'} ${label}`);
}

console.log('');
console.log('=== RecipeMap total across all sections ===');
console.log(`Total recipes: ${recipeMap.size}`);
