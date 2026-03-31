import type { RecipeMap } from './recipes.js';

/**
 * Resolve a recipe number to its full URL path.
 * Returns e.g. "/sauces/roux" or null if the recipe number is not found.
 */
export function resolveRecipeUrl(num: number, recipeMap: RecipeMap): string | null {
  const recipe = recipeMap.get(num);
  if (!recipe) return null;
  return `/${recipe.section}/${recipe.slug}`;
}

/**
 * Replace all (N° X) and (No. X) patterns in a body string with HTML anchor tags.
 * The anchor href is the resolved URL, or "#" if not found.
 * Serializes the referenced recipe as JSON in data-recipe for client-side use.
 */
export function linkifyBody(
  text: string,
  recipeMap: RecipeMap,
  lang: 'fr' | 'en'
): string {
  const pattern = lang === 'fr'
    ? /\(N°\s*(\d+)\)/g
    : /\(No\.\s*(\d+)\)/g;

  return text.replace(pattern, (match, numStr) => {
    const num = parseInt(numStr, 10);
    const url = resolveRecipeUrl(num, recipeMap);
    const recipe = recipeMap.get(num);
    const dataAttr = recipe
      ? ` data-recipe="${encodeURIComponent(JSON.stringify(recipe))}"`
      : '';
    const href = url ?? '#';
    return `<a href="${href}" class="recipe-ref"${dataAttr}>${match}</a>`;
  });
}
