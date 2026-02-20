# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThaqalaynData is a static data API repository containing Islamic religious texts (Quran and Al-Kafi hadith collection) in structured JSON format. The repository is deployed to Netlify and consumed by the Thaqalayn app (https://github.com/narmafraz/Thaqalayn).

## Development Commands

### Local Testing
```bash
# Start local HTTP server with CORS support on port 8888
python3 serve.py
# or
./serve.py
```

## Data Architecture

### Directory Structure

- `books/` - Contains all book data in hierarchical JSON files
  - `quran/` - Quran chapters and verses organized by chapter (surah)
  - `al-kafi/` - Al-Kafi hadith collection organized by volume/book/chapter/hadith
  - `complete/` - Single-file versions of complete books (quran.json, al-kafi.json)
  - `books.json` - Top-level index of all books
  - `quran.json` - Quran metadata and structure
  - `al-kafi.json` - Al-Kafi metadata and structure

- `people/` - Contains data about people referenced in the texts
  - `narrators/` - Narrator information and hadith chain references (numbered JSON files)

### Path Convention

All content uses a hierarchical path structure with colon separators:

- `/books/quran:1` - Quran chapter 1 (Al-Fatiha)
- `/books/quran:1:1` - Quran chapter 1, verse 1
- `/books/al-kafi:1` - Al-Kafi volume 1
- `/books/al-kafi:1:2` - Al-Kafi volume 1, book 2
- `/books/al-kafi:1:2:3` - Al-Kafi volume 1, book 2, chapter 3
- `/books/al-kafi:1:2:3:4` - Al-Kafi volume 1, book 2, chapter 3, hadith 4
- `/people/narrators/123` - Narrator with ID 123

### JSON File Structure

#### Metadata Files (books.json, quran.json, al-kafi.json)
Contain:
- `kind` - Type of content ("chapter_list")
- `index` - Identifier for the resource
- `data` - Object containing:
  - `chapters[]` - Array of child chapters/sections
  - `titles` - Multilingual titles (ar, en)
  - `descriptions` - Multilingual descriptions
  - `path` - Resource path
  - `verse_count` - Total number of verses/hadiths
  - `crumbs[]` - Breadcrumb navigation hierarchy

#### Chapter/Content Files
Contain:
- `verses[]` - Array of verse objects with:
  - `index` - Global verse index
  - `local_index` - Index within this chapter
  - `text` - Object with language keys (ar, en) containing the text
  - `narrator_chain` - For hadiths: structured narrator chain with parts
  - `relations[]` - Cross-references to other texts (e.g., Quran verses referenced in hadiths)

#### Narrator Files (people/narrators/N.json)
Contain:
- `index` - Narrator ID
- `titles` - Narrator name(s) in different languages
- `verse_paths[]` - List of hadiths this narrator appears in
- `subchains` - Object mapping chain segments to verses

### Key Concepts

**Narrator Chains**: In Al-Kafi hadiths, each hadith has a `narrator_chain` that tracks the chain of transmission. The chain is broken into parts:
- `kind: "narrator"` - Links to a narrator in `/people/narrators/`
- `kind: "plain"` - Plain text connecting narrators
- Narrator IDs are indexed and tracked across all hadiths

**Relations/References**: The `relations` field links related content across books (e.g., a hadith in Al-Kafi that references a Quran verse will have a relation pointing to that verse's path).

**Multi-language Support**: Most content includes Arabic (`ar`) and English (`en`) translations. Some content includes transliterated English (`ent`).

**Verse Indexing**: Each verse/hadith has both a `local_index` (within its chapter) and a global `index` (within the entire book).

## Deployment

The repository is deployed to Netlify automatically on push, serving the JSON files as a static API at **https://thaqalayndata.netlify.app/**. The `netlify.toml` configuration sets CORS headers to allow cross-origin requests. The production Angular app at **https://thaqalayn.netlify.app/** consumes this data API.

## Important Notes

- All JSON files must maintain strict structural consistency to ensure the API contract is preserved
- When modifying existing data, preserve all existing fields unless explicitly removing deprecated fields
- Path references must use the canonical colon-separated format
- Narrator IDs must remain stable once assigned (they are referenced across multiple hadiths)
- The `complete/` directory contains denormalized single-file versions for convenience but should be regenerated if source data changes
