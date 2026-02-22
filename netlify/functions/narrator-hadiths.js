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

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=3600',
  };

  const id = event.queryStringParameters?.id;
  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing required parameter: id (narrator ID)' }),
    };
  }

  try {
    const narrator = readJSON(`people/narrators/${id}.json`);
    if (!narrator) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Narrator ${id} not found` }),
      };
    }

    const data = narrator.data || narrator;
    const versePaths = data.verse_paths || [];

    // Optionally load actual hadith text (limit to prevent huge responses)
    const loadText = event.queryStringParameters?.include_text === 'true';
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20', 10), 50);
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);

    const paginatedPaths = versePaths.slice(offset, offset + limit);

    let hadiths = paginatedPaths.map(p => ({ path: p }));

    if (loadText) {
      hadiths = paginatedPaths.map(versePath => {
        // Parse path: /books/al-kafi:1:2:1:5 → chapter al-kafi:1:2:1, verse 5
        const stripped = versePath.replace('/books/', '');
        const parts = stripped.split(':');
        const verseIdx = parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : 0;
        const chapterIndex = parts.slice(0, -1).join(':');
        const filePath = `books/${chapterIndex.replace(/:/g, '/')}.json`;

        const chapter = readJSON(filePath);
        if (!chapter?.data?.verses) {
          return { path: versePath, error: 'Chapter not found' };
        }

        const verse = chapter.data.verses.find(v => v.local_index === verseIdx);
        if (!verse) {
          return { path: versePath, error: 'Verse not found' };
        }

        return {
          path: versePath,
          chapter_title: chapter.data.titles || {},
          verse: {
            index: verse.index,
            local_index: verse.local_index,
            part_type: verse.part_type,
            text: verse.text,
            translations: verse.translations,
          },
        };
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        narrator: {
          id: narrator.index || id,
          titles: data.titles || {},
        },
        total_hadiths: versePaths.length,
        offset,
        limit,
        hadiths,
      }),
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
