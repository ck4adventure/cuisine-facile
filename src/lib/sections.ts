export type Section = {
  slug: string;
  filePath: string;       // relative to content/
  titleFr: string;
  titleEn: string;
  recipeRange: [number, number] | null;  // null for vocabulaire
  description?: string;
};

export const sections: Section[] = [
  {
    slug: 'vocabulaire',
    filePath: '01_vocabulaire.md',
    titleFr: 'Le Vocabulaire de la Cuisine',
    titleEn: 'Kitchen Vocabulary',
    recipeRange: null,
  },
  {
    slug: 'sauces',
    filePath: '02_sauces.md',
    titleFr: 'Les Sauces',
    titleEn: 'Sauces',
    recipeRange: [1, 16],
    description: 'Les sauces accompagnent les viandes, les poissons, les légumes. Pour remuer les sauces se servir d\'une cuillère en bois.',
  },
  {
    slug: 'soupes-fondues',
    filePath: '03_soupes_fondues.md',
    titleFr: 'Les Soupes & Les Fondues',
    titleEn: 'Soups & Fondues',
    recipeRange: [17, 24],
  },
  {
    slug: 'oeufs',
    filePath: '04_oeufs.md',
    titleFr: 'Les Œufs',
    titleEn: 'Eggs',
    recipeRange: [25, 38],
  },
  {
    slug: 'poissons',
    filePath: '05_poissons.md',
    titleFr: 'Les Poissons',
    titleEn: 'Fish',
    recipeRange: [39, 64],
  },
  {
    slug: 'coquillages-crustaces',
    filePath: '06_coquillages_crustaces.md',
    titleFr: 'Les Coquillages et Crustacés',
    titleEn: 'Shellfish & Crustaceans',
    recipeRange: [65, 80],
  },
  {
    slug: 'viandes',
    // This section merges two source files (07 + 08). filePath is the primary file.
    filePath: '07_viandes_boeuf_veau.md',
    titleFr: 'Les Viandes',
    titleEn: 'Meats',
    recipeRange: [81, 100],
  },
  {
    slug: 'le-porc',
    filePath: '09_le_porc.md',
    titleFr: 'Le Porc',
    titleEn: 'Pork',
    recipeRange: [101, 110],
  },
  {
    slug: 'lapin-volaille',
    filePath: '10_lapin_volaille.md',
    titleFr: 'Le Lapin & La Volaille',
    titleEn: 'Rabbit & Poultry',
    recipeRange: null,
  },
  {
    slug: 'legumes',
    filePath: '11_legumes.md',
    titleFr: 'Les Légumes',
    titleEn: 'Vegetables',
    recipeRange: null,
  },
  {
    slug: 'desserts',
    filePath: '12_desserts.md',
    titleFr: 'Les Desserts',
    titleEn: 'Desserts',
    recipeRange: null,
  },
];
