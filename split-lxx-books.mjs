/**
 * split-lxx-books.mjs
 * Splits the monolithic strongs-lxx.json into per-book files for lazy loading.
 * This enables mobile devices to load one book at a time (~0.5-1.5MB)
 * instead of the entire 34MB file at once.
 */
import fs from 'fs';
import path from 'path';

const SOURCE = 'src/books/strongs-lxx.json';
const OUT_DIR = 'lxx-books';

// Also split Hebrew
const HEB_SOURCE = 'strongs-hebrew.json';
const HEB_OUT_DIR = 'hebrew-books';

function splitFile(source, outDir, label) {
    if (!fs.existsSync(source)) {
        console.log(`Skipping ${label}: ${source} not found`);
        return;
    }

    console.log(`--- Splitting ${label} ---`);
    const data = JSON.parse(fs.readFileSync(source, 'utf8'));

    // Group by book name
    const books = new Map();
    for (const [key, words] of Object.entries(data)) {
        const lastSpace = key.lastIndexOf(' ');
        const bookName = key.substring(0, lastSpace);
        if (!books.has(bookName)) books.set(bookName, {});
        books.get(bookName)[key] = words;
    }

    // Write each book to its own file
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let totalSize = 0;
    for (const [bookName, bookData] of books) {
        const fileName = bookName.replace(/[/:*?"<>|]/g, '_') + '.json';
        const filePath = path.join(outDir, fileName);
        const json = JSON.stringify(bookData);
        fs.writeFileSync(filePath, json);
        const sizeKB = (json.length / 1024).toFixed(1);
        totalSize += json.length;
        console.log(`  ${bookName}: ${Object.keys(bookData).length} verses, ${sizeKB} KB`);
    }

    // Also write a manifest listing all books
    const manifest = {};
    for (const [bookName, bookData] of books) {
        const fileName = bookName.replace(/[/:*?"<>|]/g, '_') + '.json';
        manifest[bookName] = {
            file: fileName,
            verses: Object.keys(bookData).length,
        };
    }
    fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`\n  Total: ${books.size} books, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Manifest: ${outDir}/_manifest.json\n`);
}

splitFile(SOURCE, OUT_DIR, 'LXX Interlinear');
splitFile(HEB_SOURCE, HEB_OUT_DIR, 'Hebrew Interlinear');

console.log('Done! Copy lxx-books/ and hebrew-books/ to your Obsidian plugin folder.');
