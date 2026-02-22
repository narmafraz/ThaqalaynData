# Thaqalayn Data API

> Public JSON API for Islamic hadith collections and Quran data.
> Base URL: `https://thaqalayndata.netlify.app/`

## Overview

The Thaqalayn Data API provides free, open-access JSON data for the Quran and major Shia hadith collections. All data is served as static JSON files from a CDN with no rate limits or authentication required.

## Response Format

Every JSON file uses this wrapper structure:

```json
{
  "index": "al-kafi:1:2:1",
  "kind": "verse_list",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `index` | `string` | Colon-separated path identifier |
| `kind` | `string` | Content type discriminator |
| `data` | `object` | Content varies by `kind` |

### Kind Values

| Kind | Description | Data Type |
|------|-------------|-----------|
| `chapter_list` | Section with sub-chapters | Chapter with `chapters[]` |
| `verse_list` | Chapter with verses/hadiths | Chapter with `verses[]` |
| `verse_detail` | Individual hadith detail | Verse with chapter context |
| `person_content` | Narrator biography | Narrator object |
| `person_list` | Narrator index | Array of narrators |

## Endpoints

### Books

| URL Pattern | Description | Example |
|-------------|-------------|---------|
| `/books/{book}.json` | Book root (volumes) | `/books/al-kafi.json` |
| `/books/{book}/{vol}.json` | Volume (books) | `/books/al-kafi/1.json` |
| `/books/{book}/{vol}/{book_num}.json` | Book section (chapters) | `/books/al-kafi/1/2.json` |
| `/books/{book}/{vol}/{book_num}/{ch}.json` | Chapter (verses) | `/books/al-kafi/1/2/1.json` |
| `/books/{book}/{surah}.json` | Quran surah | `/books/quran/1.json` |

**Available books:**

| Book ID | Name | Content |
|---------|------|---------|
| `al-kafi` | Al-Kafi | 8 volumes, ~16,000 hadiths |
| `quran` | The Holy Quran | 114 surahs, 6,236 ayahs |
| And 20+ more collections registered via ThaqalaynAPI |

### People (Narrators)

| URL Pattern | Description | Example |
|-------------|-------------|---------|
| `/people/narrators/index.json` | Narrator index | All narrators |
| `/people/narrators/{id}.json` | Narrator detail | `/people/narrators/100.json` |

### Index Files

| URL Pattern | Description |
|-------------|-------------|
| `/index/translations.json` | Translation metadata |
| `/index/books.{lang}.json` | Book tree with titles in language |
| `/books/books.json` | Book listing |

## Data Models

### Chapter

```typescript
interface Chapter {
  index: number;              // Global index within book
  local_index: number;        // Index within parent
  part_type: string;          // "Volume" | "Book" | "Chapter" | "Section"
  path: string;               // Canonical path "/books/al-kafi:1:2:1"
  titles: Record<string, string>;  // { ar: "...", en: "..." }
  descriptions?: Record<string, string[]>;
  verse_count?: number;
  verse_start_index?: number;
  verse_translations?: string[];   // ["en.hubeali", "en.sarwar"]
  nav?: Navigation;
  chapters?: Chapter[];       // Present when kind=chapter_list
  verses?: Verse[];           // Present when kind=verse_list
}
```

### Verse

```typescript
interface Verse {
  index: number;              // Global index within book
  local_index: number;        // Index within chapter
  part_type: string;          // "Hadith" | "Verse" | "Heading"
  path: string;               // "/books/al-kafi:1:2:1:1"
  text: string[];             // Arabic text segments
  translations: Record<string, string[]>;  // { "en.hubeali": [...] }
  narrator_chain?: NarratorChain;
  relations?: Record<string, string[]>;    // { "Mentions": ["/books/quran:9:122"] }
  gradings?: string[];        // Scholar grading strings
  sajda_type?: string;
  source_url?: string;
}
```

### NarratorChain

```typescript
interface NarratorChain {
  parts: SpecialText[];       // Structured chain with links
}

interface SpecialText {
  kind: string;               // "narrator" | "plain"
  text: string;               // Display text
  path?: string;              // "/people/narrators/100" (narrator only)
}
```

### Narrator

```typescript
interface Narrator {
  index: number;              // Stable narrator ID
  path: string;               // "/people/narrators/{id}"
  titles: Record<string, string>;  // { ar: "...", en: "..." }
  verse_count: number;
  verse_paths: string[];      // All hadiths with this narrator
  relations: Record<string, string[]>;
  subchains: Record<string, ChainVerses>;
}
```

### Navigation

```typescript
interface Navigation {
  prev?: string;    // Path to previous chapter
  next?: string;    // Path to next chapter
  up?: string;      // Path to parent chapter
}
```

## Path Format

Paths use colon-separated indices:

- `/books/al-kafi:1:2:1` = Al-Kafi, Volume 1, Book 2, Chapter 1
- `/books/quran:1` = Quran, Surah 1 (Al-Fatiha)
- `/people/narrators/100` = Narrator with ID 100

To convert a path to an API URL:
1. Replace colons with forward slashes
2. Append `.json`

Example: `/books/al-kafi:1:2:1` → `https://thaqalayndata.netlify.app/books/al-kafi/1/2/1.json`

## Translation IDs

Translation IDs follow the format `{lang}.{translator}`:

| ID | Language | Translator |
|----|----------|------------|
| `en.hubeali` | English | HubeAli.com |
| `en.sarwar` | English | Shaykh Muhammad Sarwar |
| `en.qarai` | English | Ali Quli Qarai (Quran) |
| `fr.thaqalayn` | French | Project Thaqalayn |

Full list available at `/index/translations.json`.

## Cross-References

The `relations` field on verses contains cross-references:

- **"Mentions"**: A hadith cites a Quran verse
- **"Mentioned In"**: A Quran verse is referenced by hadiths

```json
{
  "relations": {
    "Mentions": ["/books/quran:59:2", "/books/quran:9:122"]
  }
}
```

## Gradings

Hadith gradings are stored as HTML-formatted strings:

```json
{
  "gradings": [
    "Allamah Baqir al-Majlisi: <span>صحيح</span> - Mir'aat al 'Uqool",
    "Shaykh Baqir al-Behbudi: <span>صحيح</span> - Sahih al-Kafi"
  ]
}
```

Common terms: صحيح (Sahih), حسن (Hasan), ضعيف (Da'if), مجهول (Majhul), موثق (Muwathaq), معتبر (Mu'tabar).

## CORS

All data is served via Netlify CDN with permissive CORS headers. You can fetch data directly from browser-based applications.

## JSON Schema

Formal JSON Schema definitions are available in the [ThaqalaynDataGenerator repository](https://github.com/AminSaidi-IUST/ThaqalaynDataGenerator) under `app/schemas/`.

## License

This data is provided free for educational and research purposes. Please credit "Thaqalayn Project" when using this data.
