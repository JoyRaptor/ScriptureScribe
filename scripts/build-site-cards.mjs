// Bundles the real card skins and the plugin's card runtime for the website's live Card Mode
// preview (docs/assets/cards.js). Run after changing a skin: node scripts/build-site-cards.mjs
import esbuild from 'esbuild';
const entry = `
import { injectRuntime } from './src/verseCard';
import { passageRuns } from './src/textFormatting';
import { generatePalette } from './src/bookColorUtils';
import builtIn from './src/cards/default-skin.html';
import aurora from './src/cards/velvet-aurora.html';
import rainbow from './src/cards/velvet-rainbow.html';
import minimal from './src/cards/obsidian-minimal.html';
import seed from './docs/brand/skins/seed-tree-fruit.html';
import leaf from './docs/brand/skins/seed-tree-fruit-falling-leaf.html';
const text = 'What shall we say then? Shall we continue in sin, that grace may abound?';
const p = generatePalette('#f9f462'); // Romans: the Pauline palette, as the plugin uses it
window.SS_CARDS = {
  skins: [['Velvet Aurora', aurora], ['Velvet Rainbow', rainbow], ['Seed Tree Fruit', seed],
          ['Seed Tree Fruit · Falling Leaf', leaf], ['Violet & Gold', builtIn], ['Obsidian Minimal', minimal]]
    .map(([name, html]) => ({ name, html: injectRuntime(html) })),
  content: { key: 'Romans 6:1', reference: 'Romans 6:1', text, version: 'KJV', book: 'Romans', testament: 'nt',
    palette: { base: p.base, light: p.light, mid: p.mid, dark: p.dark }, runs: passageRuns(text), contrast: '' },
};`;
await esbuild.build({ stdin: { contents: entry, resolveDir: process.cwd() }, bundle: true, format: 'iife', minify: true,
  loader: { '.html': 'text' }, outfile: 'docs/assets/cards.js', logLevel: 'info' });
