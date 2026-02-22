const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.resolve(__dirname, '..', '..');

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_ROOT, filePath), 'utf8'));
  } catch {
    return null;
  }
}

function countNarrators() {
  const narratorsDir = path.join(DATA_ROOT, 'people', 'narrators');
  try {
    const files = fs.readdirSync(narratorsDir);
    // Count numbered JSON files (excluding index.json)
    return files.filter(f => f.match(/^\d+\.json$/)).length;
  } catch {
    return 0;
  }
}

function getBookStats(booksIndex) {
  const stats = [];

  function walk(chapters) {
    for (const ch of chapters) {
      // Top-level books have an index like "al-kafi", "quran", etc. (no colons)
      const idx = ch.index || '';
      if (!idx.includes(':') && idx) {
        const bookStat = {
          id: idx,
          title: ch.titles?.en || idx,
          title_ar: ch.titles?.ar || '',
        };

        // Count total verses and chapters recursively
        let totalVerses = 0;
        let totalChapters = 0;

        function countDeep(items) {
          for (const item of items) {
            if (item.verse_count) totalVerses += item.verse_count;
            if (item.chapters?.length) {
              totalChapters += item.chapters.length;
              countDeep(item.chapters);
            }
          }
        }

        if (ch.verse_count) totalVerses = ch.verse_count;
        if (ch.chapters?.length) {
          totalChapters = ch.chapters.length;
          countDeep(ch.chapters);
        }

        bookStat.verse_count = totalVerses;
        bookStat.chapter_count = totalChapters;
        stats.push(bookStat);
      }

      if (ch.chapters?.length) {
        walk(ch.chapters);
      }
    }
  }

  if (booksIndex?.data?.chapters) {
    walk(booksIndex.data.chapters);
  }

  return stats;
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  };

  try {
    const booksIndex = readJSON('index/books.en.json');
    const translations = readJSON('index/translations.json');

    const bookStats = getBookStats(booksIndex);
    const narratorCount = countNarrators();

    const totalVerses = bookStats.reduce((sum, b) => sum + (b.verse_count || 0), 0);
    const totalChapters = bookStats.reduce((sum, b) => sum + (b.chapter_count || 0), 0);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        total_books: bookStats.length,
        total_chapters: totalChapters,
        total_verses: totalVerses,
        total_narrators: narratorCount,
        total_translations: translations?.length || 0,
        books: bookStats,
        api_version: 'v2',
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
