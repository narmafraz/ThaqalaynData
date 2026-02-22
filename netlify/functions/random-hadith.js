const fs = require('fs');
const path = require('path');

// Resolve the data root relative to the function's location
// Netlify Functions are bundled at netlify/functions/, data is at repo root
const DATA_ROOT = path.resolve(__dirname, '..', '..');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_ROOT, filePath), 'utf8'));
  } catch {
    return null;
  }
}

// Pre-build a list of chapter paths that contain verses
function getChapterPaths() {
  const booksIndex = readJSON('index/books.en.json');
  if (!booksIndex) return [];

  const paths = [];

  function walk(chapters, prefix) {
    for (const ch of chapters) {
      const idx = ch.index || ch.path?.replace('/books/', '');
      if (!idx) continue;
      // If it has verse_count > 0, it's a leaf chapter with hadiths
      if (ch.verse_count > 0) {
        paths.push(idx);
      }
      // Recurse into children
      if (ch.chapters && ch.chapters.length > 0) {
        walk(ch.chapters, idx);
      }
    }
  }

  if (booksIndex.data?.chapters) {
    walk(booksIndex.data.chapters, '');
  } else if (Array.isArray(booksIndex)) {
    walk(booksIndex, '');
  }

  return paths;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  };

  try {
    const chapterPaths = getChapterPaths();
    if (chapterPaths.length === 0) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No chapters found' }) };
    }

    // Pick a random chapter
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const randomChapterIdx = chapterPaths[Math.floor(Math.random() * chapterPaths.length)];
      const filePath = `books/${randomChapterIdx.replace(/:/g, '/')}.json`;
      const chapter = readJSON(filePath);

      if (!chapter || !chapter.data?.verses?.length) continue;

      // Pick a random verse from this chapter
      const verses = chapter.data.verses.filter(v => v.part_type === 'Hadith' || v.part_type === 'Verse');
      if (verses.length === 0) continue;

      const verse = verses[Math.floor(Math.random() * verses.length)];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          chapter_index: randomChapterIdx,
          chapter_title: chapter.data.titles || {},
          verse: {
            index: verse.index,
            local_index: verse.local_index,
            part_type: verse.part_type,
            text: verse.text,
            translations: verse.translations,
          },
          link: `/books/${randomChapterIdx}`,
        }),
      };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Could not find a suitable hadith' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
