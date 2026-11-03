import esbuild from 'esbuild';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
await esbuild.build({stdin:{contents:`export * from './src/parser';export * from './src/fetcher';export * from './src/embedEngine';export * from './src/versification';export * from './src/settings';export * from './src/dataLoader';export * from './src/vaultIndex';export * from './src/searchIndex';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'scripts/.review-bundle.cjs',alias:{obsidian:'./scripts/stubs/obsidian.mjs','@xenova/transformers':'./scripts/stubs/xenova.mjs'},logLevel:'silent'});
const require=createRequire(import.meta.url), api=require('./.review-bundle.cjs');
const cases=[
 ['as Paul 1 Cor 6:11 says',['1 Corinthians 6:11']],['Moses 2 Kings 5:14 Naaman',['2 Kings 5:14']],
 ['Psalm 22:1',['Psalms 22:1']],['Pss 22:1',['Psalms 22:1']],['I Cor 6:11',['1 Corinthians 6:11']],
 ['First Corinthians 6:11',['1 Corinthians 6:11']],['II Kings 5:14',['2 Kings 5:14']],['III John 7',['3 John 1:7']],['1st Cor 6:11',['1 Corinthians 6:11']],
 ['Jude 5',['Jude 1:5']],['2 Jn 7',['2 John 1:7']],['2 Ne 31:20',[]],['Gen 51:1',[]],['Jn 3:99',[]],['Mal 4:7',[]],
 ['Rom 7:25-8:1',['Romans 7:25-8:1']],['Rom 3:24; 5:1; 8:1',['Romans 3:24','Romans 5:1','Romans 8:1']],
 ['Rom 3:24; Eph 2:8',['Romans 3:24','Ephesians 2:8']],['Jn 3:16 and v. 18',['John 3:16','John 3:18']],
 ['Jn 3:16; vv. 19-20, verse 21, verses 22-23',['John 3:16','John 3:19-20','John 3:21','John 3:22-23']],
 ['1Jn5:13 and v. 14',['1 John 5:13','1 John 5:14']],['1 Jn 2:1\n\nDort V.10',['1 John 2:1']],
 ['## Heading Rom 8:1\nVol. 2 then v. 4',['Romans 8:1']],['Jn 3:16\n\nverse 4',['John 3:16']],
 ['Mt 5:17a',['Matthew 5:17']],['Rom 8:28ff',['Romans 8:28']],['Jn 3.16',['John 3:16']],['read Gen 12',['Genesis 12']],
 ['In Jn 3:16, 2 things stand out',['John 3:16']],['Jas 2:14-17, 20, 24',['James 2:14-17,20,24']],['Jn3:16,18',['John 3:16,18']],
 ['JOHN 3:14-15',['John 3:14-15']],['2Ch20:20',['2 Chronicles 20:20']],['[[note on John 8|brief]]',[]],['`Jn 3:16`',[]],
 ['D&C 82:7, 2 Nephi 31:20, Surah 23:102',[]],['at 12:30 he said',[]],['---\nref: Jn 3:16\n---\nJn 3:17',['John 3:17']],
 ['```ts\nJn 3:16\n```\nJn 3:17',['John 3:17']],['[Jn 3:16](https://site/John3:17)',[]],['[[John 3:16]]',[]],['[Jn 3:16][link]\n[link]: https://example.com',[]],
];
for(const dash of '-‐‑‒–—―−﹣－') {cases.push([`see Jn 3:16 ${dash} 18 here`,['John 3:16-18']]);cases.push([`Jn3:16${dash}18`,['John 3:16-18']]);}
let failed=0;
for(const [input,wanted] of cases){try{const refs=api.parseScriptureRefs(input);assert.deepEqual(refs.map(api.refToString),wanted);for(const r of refs)assert.equal(input.slice(r.start,r.end),r.raw);}catch(e){console.error('FAIL',JSON.stringify(input),e.actual,e.expected);failed++;}}
assert.equal(failed,0,`${failed} parser failures`);
assert.equal(api.parseScriptureRefs('Psalm 151:1').length,0);
assert.equal(api.parseScriptureRefs('Psalm 151:1','LXX').length,1);
api.setKJVData(JSON.parse(fs.readFileSync('kjv.json','utf8')));
const range=api.parseScriptureRefs('Rom 7:25–8:1')[0];assert.equal(api.expandRef(range).length,2);
const verse=await api.getScripture(range,api.DEFAULT_SETTINGS);assert(verse.text.includes('There is therefore now no condemnation'));
assert.equal(api.expandRef(api.parseScriptureRefs('Gen 12')[0]).length,20);
assert(api.buildLink(range,'KJV').includes('7%3A25-8%3A1'));
console.log(`PASS: ${cases.length} parser cases, offsets, chapter expansion, cross-chapter retrieval, complete-passage links`);

function editorFor(value) {
 return { value, getValue(){return this.value;}, getCursor(){return {line:0,ch:0};}, getLine(){return this.value;}, offsetToPos(offset){return {line:0,ch:offset};},
 replaceRange(text,from,to=from){this.value=this.value.slice(0,from.ch)+text+this.value.slice(to.ch);}, setValue(text){this.value=text;} };
}
for(const [input,canonical] of [['mt1:23','Matthew 1:23'],['Jn 3:16 and v23','John 3:23'],['Jn 3:16–18','John 3:16-18']]) {
 const editor=editorFor(input);const ref=api.parseScriptureRefs(canonical)[0];
 await api.embedSingleRef(editor,ref,'link',api.DEFAULT_SETTINGS);
 assert(editor.value.includes('biblegateway.com'),input);
 assert(!editor.value.includes('v23'),input);
}
let editor=editorFor('Jn 3:16 and `Jude 5`');await api.embedAllRefs(editor,'link',api.DEFAULT_SETTINGS);assert(editor.value.includes('`Jude 5`'));assert.equal((editor.value.match(/biblegateway.com/g)||[]).length,1);
editor=editorFor('Jn 3:16');const pending=api.embedAllRefs(editor,'quote',api.DEFAULT_SETTINGS);editor.value='An edit made during passage loading';await pending;assert.equal(editor.value,'An edit made during passage loading');
console.log('PASS: abbreviated/carried/dash embeds, Markdown exclusions and concurrent-edit protection');
