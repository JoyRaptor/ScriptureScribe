import fs from 'fs';

const kjvData = JSON.parse(fs.readFileSync('../kjv.json', 'utf8'));
const hebrewData = JSON.parse(fs.readFileSync('books/strongs-hebrew.json', 'utf8'));
const greekData = JSON.parse(fs.readFileSync('books/strongs-greek.json', 'utf8'));

const kjvVerses = Object.keys(kjvData).map(verse => {
  const match = verse.match(/^(.*?)\s+(\d+):(\d+)$/);
  if (!match) return verse;
  let bookName = match[1];
  bookName = bookName.replace(/^I\s/, '1 ');
  bookName = bookName.replace(/^II\s/, '2 ');
  bookName = bookName.replace(/^III\s/, '3 ');
  if (bookName === 'Revelation of John') {
    bookName = 'Revelation';
  }
  return `${bookName} ${match[2]}:${match[3]}`;
});

const interlinearVerses = new Set([
  ...Object.keys(hebrewData),
  ...Object.keys(greekData)
]);

const missingVerses = kjvVerses.filter(verse => !interlinearVerses.has(verse));

let output = '';

if (missingVerses.length === 0) {
  output += 'All KJV verses are present in the interlinear database.\n';
} else {
  output += `Missing ${missingVerses.length} verses in the interlinear database:\n`;
  
  // Group by book and chapter
  const missingByBookAndChapter = {};
  for (const verse of missingVerses) {
    const match = verse.match(/^(.*?)\s+(\d+):(\d+)$/);
    if (!match) {
      output += `Could not parse verse: ${verse}\n`;
      continue;
    }
    const book = match[1];
    const chapter = match[2];
    
    if (!missingByBookAndChapter[book]) {
      missingByBookAndChapter[book] = {};
    }
    if (!missingByBookAndChapter[book][chapter]) {
      missingByBookAndChapter[book][chapter] = [];
    }
    missingByBookAndChapter[book][chapter].push(match[3]);
  }
  
  for (const book in missingByBookAndChapter) {
    for (const chapter in missingByBookAndChapter[book]) {
      const verses = missingByBookAndChapter[book][chapter];
      output += `- ${book} Chapter ${chapter}: missing ${verses.length} verses (${verses.join(', ')})\n`;
    }
  }
}

fs.writeFileSync('missing_verses_utf8.txt', output);
console.log('Done reporting to missing_verses_utf8.txt');
