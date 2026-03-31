# Cuisine Facile en Français Facile — Site Spec

## Project overview

A static bilingual reader for a digitized 1976 French cookbook: *Cuisine Facile en Français Facile* (Hachette). All content is pre-transcribed and translated — no CMS, no backend, no auth. This is a read-only site that works like a digital book.

The primary use cases are:
- Browsing and reading recipes while cooking (often on phone or tablet)
- Using it as a French language learning tool (toggle between FR/EN/both)
- Quickly jumping to a specific recipe or section

---

## Tech stack

- **Framework:** Astro (static output, `output: 'static'`)
- **Language:** TypeScript throughout
- **Styling:** Plain CSS with CSS custom properties — no Tailwind, no CSS-in-JS
- **JS in browser:** Minimal. Language toggle state and reference panel interactions only. No frameworks in the browser.
- **Build output:** Fully static HTML, deployable to any static host (Netlify, Vercel, GitHub Pages)
- **Node version:** 18+

---

## Repository structure

```
cuisine-facile/
├── content/
│   ├── 00_front_matter.md
│   ├── 01_vocabulaire.md
│   ├── 02_sauces.md
│   ├── 03_soupes_fondues.md
│   ├── 04_oeufs.md
│   ├── 05_poissons.md
│   ├── 06_coquillages_crustaces.md
│   ├── 07_viandes_boeuf_veau.md
│   ├── 08_viandes_mouton_agneau.md
│   ├── 09_le_porc.md
│   ├── 10_lapin_volaille.md
│   ├── 11_legumes.md
│   └── 12_desserts.md
├── src/
│   ├── lib/
│   │   ├── recipes.ts       # parse markdown → typed recipe objects
│   │   ├── sections.ts      # section metadata (slug, title FR/EN, recipe range)
│   │   └── links.ts         # resolve "N° X" references → internal URLs
│   ├── pages/
│   │   ├── index.astro              # landing page
│   │   ├── vocabulaire.astro        # glossary (special layout, not recipe-based)
│   │   └── [section]/
│   │       ├── index.astro          # section index page
│   │       └── [recipe].astro       # single recipe view
│   ├── components/
│   │   ├── SiteHeader.astro         # persistent top bar: lang toggle + dark mode
│   │   ├── RecipeView.astro         # recipe body with FR/EN/Both display
│   │   ├── RefPanel.astro           # reference recipe panel (sidebar desktop, inline mobile)
│   │   └── RecipeNav.astro          # prev/next recipe navigation
│   └── styles/
│       └── global.css
├── public/
│   └── (static assets, any scanned illustrations if added later)
├── astro.config.mjs
├── tsconfig.json
└── SPEC.md
```

---

## Content file format

Each content file is structured markdown. The files do **not** use frontmatter — they are human-transcribed and follow a consistent prose pattern. The data layer must parse them programmatically.

### Recipe files (sections 02–12)

Each recipe follows this pattern:

```markdown
## No. 9 — Sauce bordelaise (Bordeaux Sauce)

**French:**
Préparer un roux (N° 8) • faire frire un oignon...

**English:**
Make a roux (No. 8) • fry a chopped onion...
```

Key parsing rules:
- Recipe number is in the `## No. X —` heading. Numbers are integers. Some entries cover two recipes: `## No. 93 & 94 —`
- French body follows `**French:**`, English body follows `**English:**`
- Recipe bodies use `•` as a step separator (not newlines)
- Cross-references appear as `(N° 8)` in French text and `(No. 8)` in English text — these must be detected and converted to internal links
- Some recipes have illustration captions in `*italics*` after the recipe body — these should be preserved as a separate optional field and displayed in a visually subdued way
- Section files may contain sub-headings like `## LE BŒUF` or `## MOUTON-AGNEAU` — these are category labels within a section, not recipes, and should be used to group recipes on the section index page

### Vocabulaire file (section 01)

Different structure — a glossary, not recipes. Contains:
- Equipment list (French terms, one per line)
- Cooking terms (bold French term followed by `: definition`)

The vocabulaire page has its own layout (see Vocabulaire screen below) and does **not** use the recipe data model.

### Front matter file (section 00)

Metadata only — title, publisher, year, cartoons, back cover text. Used only for the landing page hero. Not part of recipe routing.

---

## Data model

### Core types (`src/lib/recipes.ts`)

```ts
export type Recipe = {
  num: number           // primary recipe number (use first if range e.g. 93 for "93 & 94")
  numDisplay: string    // display string e.g. "93" or "93 & 94"
  slug: string          // url-safe e.g. "sauce-bordelaise"
  section: string       // section slug e.g. "sauces"
  titleFr: string
  titleEn: string
  bodyFr: string        // raw text, (N° X) markers intact
  bodyEn: string        // raw text, (No. X) markers intact
  depends: number[]     // recipe numbers referenced in body, extracted at parse time
  captionFr?: string    // illustration caption if present
  captionEn?: string
  group?: string        // sub-heading label e.g. "LE BŒUF" if recipe falls under one
}

export type RecipeMap = Map<number, Recipe>  // keyed by recipe number
export type SectionRecipes = Map<string, Recipe[]>  // keyed by section slug
```

### Section metadata (`src/lib/sections.ts`)

```ts
export type Section = {
  slug: string
  filePath: string       // relative to content/
  titleFr: string
  titleEn: string
  recipeRange: [number, number] | null  // null for vocabulaire
  description?: string   // opening line from the section if present
}

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
    description: 'Les sauces accompagnent les viandes, les poissons, les légumes.',
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
    slug: 'viandes-boeuf-veau',
    filePath: '07_viandes_boeuf_veau.md',
    titleFr: 'Les Viandes : Le Bœuf & Le Veau',
    titleEn: 'Meats: Beef & Veal',
    recipeRange: [81, 94],
  },
  {
    slug: 'viandes-mouton-agneau',
    filePath: '08_viandes_mouton_agneau.md',
    titleFr: 'Le Veau (suite) & Le Mouton/L\'Agneau',
    titleEn: 'Veal (cont.) & Mutton/Lamb',
    recipeRange: [95, 100],
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
    recipeRange: null, // determine from file
  },
  {
    slug: 'legumes',
    filePath: '11_legumes.md',
    titleFr: 'Les Légumes',
    titleEn: 'Vegetables',
    recipeRange: null, // determine from file
  },
  {
    slug: 'desserts',
    filePath: '12_desserts.md',
    titleFr: 'Les Desserts',
    titleEn: 'Desserts',
    recipeRange: null, // determine from file
  },
]
```


### Link resolution (`src/lib/links.ts`)

At render time, recipe body text containing `(N° 8)` or `(No. 8)` patterns must be converted to links. The resolver takes a recipe number and returns the full URL path for that recipe.

```ts
export function resolveRecipeUrl(num: number, recipeMap: RecipeMap): string | null
// returns e.g. "/sauces/roux" or null if not found
```

The rendered link in the recipe body should display as the original text `(N° 8)` but be a clickable anchor. On click:
- **Desktop:** populates the reference panel (sidebar) without navigating away
- **Mobile:** expands the referenced recipe inline, directly below the paragraph containing the link

---

## The four screens

### 1. Landing page (`/`)

**Layout:**
- Persistent site header (see Header below)
- Hero: left half = title block, right half = illustration placeholder (a scan of one of Andrée Marquet's pen illustrations from the book, to be added later — for now a styled placeholder)
- Below hero: section grid, two columns, one card per section
- Each section card shows: recipe number range, French title, English title (hidden in FR-only mode), recipe count
- Bottom of page: prev/next browse buttons (these navigate the full flat recipe sequence across all sections, so the site can be browsed like a book from any entry point including the home page)

**Hero text:**
- Eyebrow: `Hachette · Civilisation · 1976`
- Title: `Cuisine Facile en Français Facile` (serif)
- Subtitle: `Easy Cooking in Easy French` (serif italic, hidden in FR-only mode)
- Meta: `172 recipes · 12 sections · illustrations by Andrée Marquet`

---

### 2. Section index page (`/[section]`)

**Layout:**
- Site header
- Section header block: section number, French title, English title, recipe range, opening description line if present
- Full list of recipes in the section, one row per recipe
- Each row: recipe number · French title · English title (toggleable) · dependency badge if recipe depends on another · hover arrow
- Dependency badge text: `builds on N° X` — shown only in EN or Both modes, hidden in FR-only
- Sub-heading labels (e.g. `LE BŒUF`, `MOUTON-AGNEAU`) appear as visual dividers between recipe groups within the list

**Viandes note:** The section index for `/viandes` shows all recipes 81–100 from both source files, with the sub-heading labels (`LE BŒUF`, `LE VEAU`, `MOUTON-AGNEAU`) as dividers.

---

### 3. Single recipe view (`/[section]/[recipe]`)

**Layout — desktop (≥768px):**
- Site header
- Two-column layout: recipe pane (left, ~65%) + reference panel (right, ~35%)
- Recipe pane contains:
  - Breadcrumb: section name
  - Recipe number (small, muted)
  - Recipe title (serif, large)
  - FR block: left border accent (warm amber `#c8a96e`), lang label `FRANÇAIS`, body text
  - EN block: left border accent (sage green `#7a9e87`), lang label `ENGLISH`, body text
  - Illustration caption if present (small, italic, muted, below both blocks)
  - Prev/next navigation row at bottom
- Reference panel (right column):
  - Label: `REFERENCED RECIPES`
  - Empty state: `Tap a linked recipe to see it here.`
  - When populated: shows a card with the referenced recipe's number, title, and body — respecting the current language toggle

**Layout — mobile (<768px):**
- No sidebar. Reference panel does not exist as a persistent element.
- When a recipe link `(N° X)` is tapped, the referenced recipe expands inline immediately below the paragraph containing the link. It appears as an indented card with a subtle left border. Tapping again collapses it.
- Prev/next navigation is full-width at the bottom.

**Language toggle behavior:**
- `FR`: show FR block only, hide EN block
- `EN`: show EN block only, hide FR block
- `FR+EN` (default): show both blocks stacked, FR above EN
- The reference panel content respects the same toggle
- Toggle state is persisted in `localStorage` under key `facile-lang` and applied on page load

**Recipe body rendering:**
- `•` separators should render as a subtle visual separator between steps — either replaced with line breaks and a small bullet, or styled as `·` with spacing. Not rendered as a raw bullet list — the original text is prose with inline separators.
- `(N° X)` / `(No. X)` patterns become interactive links (see link resolution above)
- `*italic text*` in the original markdown (illustration captions) is rendered as a separate caption block, not inline

---

### 4. Vocabulaire page (`/vocabulaire`)

**Layout:**
- Site header
- Section header: `Le Vocabulaire de la Cuisine` / `Kitchen Vocabulary`
- Self-quiz hint bar: appears only in FR-only or EN-only mode, text:
  - FR-only: `FR only — definitions hidden. Try to recall the English before toggling.`
  - EN-only: `EN only — French terms hidden. Try to recall the French before toggling.`
- Two subsections, each rendered as a two-column table:
  1. **Ustensiles** (equipment list)
  2. **Termes de cuisine** (cooking terms)
- Table columns: `Terme / FR` | `Définition / EN`
- In FR-only mode: EN column hidden, table goes full width
- In EN-only mode: FR column hidden, table goes full width
- In Both mode: both columns shown at 50/50
- French terms styled in serif italic; English definitions in regular sans

---

## Site header (persistent, all pages)

```
[← back]   Cuisine Facile en Français Facile   [FR] [FR+EN] [EN]  [◑ Dark]
```

- Back arrow: goes to section index if on a recipe page, goes to home if on section index, hidden on home page
- Title: links to home
- Language toggle: three buttons, one active at a time. State persisted in localStorage.
- Dark mode toggle: persisted in localStorage under `facile-theme`. Default light.
- On mobile: title may be truncated or hidden to preserve space for the toggle buttons

---

## Routing and URL structure

```
/                                    landing page
/vocabulaire                         glossary
/sauces                              section index
/sauces/sauce-blanche                recipe (slug derived from titleEn)
/sauces/roux
/oeufs/omelette-naturelle
/viandes/boeuf-bourguignon
/viandes/gigot-agneau-mouton
/desserts/crepes-suzette
```

Recipe slugs are derived from the English title: lowercase, spaces to hyphens, accents stripped, punctuation removed. They must be unique within a section. Generate slugs at parse time and store on the `Recipe` type.

The prev/next navigation traverses the full flat sequence of all recipes in book order (1 → 172+), crossing section boundaries. Recipe N° 16 (last sauce) → next → N° 17 (first soup). The landing page prev/next buttons start from recipe N° 1 / end at the last recipe.

---

## Design system

### Typography
- Serif (recipe titles, body text, glossary terms): system serif stack — `Georgia, 'Times New Roman', serif`
- Sans (UI chrome, labels, navigation, numbers): system sans stack — `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Base font size: 16px
- Recipe body line-height: 1.75
- No external font loading — keep it fast and offline-capable

### Colors (light mode)
- Background: `#ffffff`
- Surface (cards, sidebar): `#f8f7f4` (slightly warm off-white)
- Border: `rgba(0,0,0,0.1)`
- Text primary: `#1a1a18`
- Text secondary: `#5a5a56`
- Text muted: `#9a9a94`
- FR accent (left border on FR block): `#c8a96e` (warm amber)
- EN accent (left border on EN block): `#7a9e87` (sage green)
- Link / interactive: `#c8633a` (terracotta)

### Colors (dark mode)
- Background: `#1a1916`
- Surface: `#242320`
- Border: `rgba(255,255,255,0.1)`
- Text primary: `#f0ede6`
- Text secondary: `#a8a59e`
- Text muted: `#6a6a64`
- FR accent: `#c8a96e` (unchanged)
- EN accent: `#7a9e87` (unchanged)
- Link: `#d4845a`

### Spacing
- Page horizontal padding: `24px` (desktop), `16px` (mobile)
- Section header padding: `24px`
- Recipe body max-width: `680px`
- Sidebar width: `280px` (desktop only)

### Borders
- All borders: `0.5px solid` using the border color above
- Card border-radius: `8px`
- Button border-radius: `4px`

---

## Build instructions for Claude Code

### Step 1 — Data layer first, no UI

Parse all content files and verify the data layer before writing any Astro pages.

1. Set up the Astro project with TypeScript
2. Implement `src/lib/sections.ts` — the static section metadata array
3. Implement `src/lib/recipes.ts` — the markdown parser
   - Read each content file from `content/`
   - Extract all recipes matching the `## No. X —` pattern
   - Parse French and English bodies
   - Extract `depends` array by scanning for `(N° X)` / `(No. X)` patterns
   - Generate URL slugs from English titles
   - Handle the viandes merge (files 07 + 08 → single section)
   - Handle dual-recipe headings (`## No. 93 & 94 —`)
4. Implement `src/lib/links.ts` — the reference resolver
5. **Before proceeding to UI:** log the full parsed recipe map for the sauces section to the console and verify: all 16 recipes parsed, correct titles, correct `depends` arrays (e.g. recipe 9 should have `depends: [8]`, recipe 10 should have `depends: [9]`)

### Step 2 — Pages and components

Only after the data layer is verified:

1. `SiteHeader.astro` — persistent header with lang toggle and dark mode
2. `global.css` — CSS custom properties for both themes, base typography
3. `index.astro` — landing page
4. `vocabulaire.astro` — glossary page
5. `[section]/index.astro` — section index
6. `[section]/[recipe].astro` — single recipe view
7. Components: `RecipeView.astro`, `RefPanel.astro`, `RecipeNav.astro`

### Step 3 — Interactivity (plain JS, no framework)

All browser-side JS should be in `<script>` tags in the relevant Astro components, or in a small `src/scripts/` directory if shared. No React, Vue, or Svelte.

Required interactions:
- Language toggle: show/hide FR/EN blocks, update active button, persist to localStorage
- Dark mode toggle: swap CSS class on `<html>`, persist to localStorage
- Reference panel population (desktop): clicking a `(N° X)` link fetches the pre-rendered recipe data (available as a JSON data attribute on the link element, serialized at build time) and renders it into the panel
- Inline reference expansion (mobile): same data, different render target — expands below the paragraph

### Notes and edge cases

- The `•` step separators in recipe bodies: render each step on its own line with a small typographic separator. Suggested approach: split on `•`, wrap each step in a `<span class="step">`, render them as block elements with a `::before` pseudo-element for the bullet. This preserves the prose feel without using `<ul>/<li>`.
- Illustration captions in `*italics*`: strip the asterisks and render in a `<p class="caption">` after the recipe body, not inline.
- The section description quote in sauces (`> Les sauces accompagnent...`) should be extracted and displayed as an epigraph on the section index page.
- Recipe N° 93 & 94 are two distinct recipes in one heading. Parse them as two separate Recipe objects sharing the same markdown block. The heading `## No. 93 & 94 —` should produce recipe 93 (`Rôti de veau farci`) and recipe 94 (`Paupiettes de veau`), each with their own title and body extracted from the subsections within that block.
- Slugs must be unique within a section. If two recipes would produce the same slug, append the recipe number: `omelette-33`.
- All content is fixed at build time. No client-side data fetching needed. Recipe data for the reference panel should be serialized into `data-recipe` attributes on link elements at build time so the JS can read it without any fetch.