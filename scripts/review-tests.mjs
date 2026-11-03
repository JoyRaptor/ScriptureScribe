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

// Reading mode parses each bullet as its own block; "v40" must still find "Acts 10:39" in the bullet above.
const sermon=['[Peter preaches the same','✝️ the death Acts 10:39','🌅 the resurrection v40','👁️ the witnesses v41','📜 "to him give all the prophets witness" v43','🕊️ The Spirit falls mid-sermon on the hearers v44]'].map(text=>({text}));
const run=api.parseBlockRun(sermon);
assert.deepEqual(run.map(refs=>refs.map(api.refToString)),[[],['Acts 10:39'],['Acts 10:40'],['Acts 10:41'],['Acts 10:43'],['Acts 10:44']]);
run.forEach((refs,i)=>refs.forEach(r=>assert.match(sermon[i].text.slice(r.start,r.end),/^(?:Acts 10:39|v4\d)$/)));
assert.deepEqual(api.parseBlockRun([{text:'the resurrection v40'}],'* the death Acts 10:39').map(r=>r.map(api.refToString)),[['Acts 10:40']],'lead-in from the section above');
assert.deepEqual(api.parseBlockRun([{text:'Acts 10:39',isolated:true},{text:'then v40'}]).map(r=>r.map(api.refToString)),[['Acts 10:39'],[]],'headings do not anchor');
// A chapter-only reference previews its first verse.
const chapterRef=api.parseScriptureRefs('Psalm 50')[0];assert(chapterRef.chapterOnly);assert.equal(api.refToString(api.previewRef(chapterRef)),'Psalms 50:1');
const verseRef=api.parseScriptureRefs('Ps 50:3')[0];assert.equal(api.previewRef(verseRef),verseRef);
console.log('PASS: reading-mode bullet runs (v40 after Acts 10:39), chapter-only preview');

// Forms the soteriology orchard relies on, and other works' citations that must stay plain.
const orchard=[
 ['Ac 17:29-30, Ac 17:34',['Acts 17:29-30','Acts 17:34']],['Mt 3:2; Mt 4:17',['Matthew 3:2','Matthew 4:17']],['Lk 13:3, 5',['Luke 13:3,5']],
 ['Rom 4:3-5',['Romans 4:3-5']],['🏆 overcomes 1 Jn 5:5',['1 John 5:5']],['Jude 1:1',['Jude 1:1']],['2 Chr 30:3',['2 Chronicles 30:3']],
 ['3 Jn 1:9',['3 John 1:9']],['Philem 1:24',['Philemon 1:24']],['Zech 8:14',['Zechariah 8:14']],['Amos 7:3',['Amos 7:3']],['Jonah 3:10',['Jonah 3:10']],
 ['as he spake Jn 8:28, and v30',['John 8:28','John 8:30']],['the rock was Christ 1 Cor 10:4',['1 Corinthians 10:4']],['Ac10:39',['Acts 10:39']],
 ['the same "in" as Gn 15:6: Nineveh believed',['Genesis 15:6']],['🪨 Isa 28:16: "he that believeth"',['Isaiah 28:16']],
 ['consent Isa1:19 Deu30:19 Jos24:15 Rom10:9-10 Act16:31 Joh3:36 Amo3:3',['Isaiah 1:19','Deuteronomy 30:19','Joshua 24:15','Romans 10:9-10','Acts 16:31','John 3:36','Amos 3:3']],
 ['Mat.11:26, Luk.10:21, Mrk 1:15',['Matthew 11:26','Luke 10:21','Mark 1:15']],['in Act 3 of the play',[]],['a Mat 5 feet wide',[]],
 ['Gal 3:10 quotes Dt 27:26, and that chapter\'s curse-list is moral law:\n\n- 🗿 images v15\n- 👪 dishonoring parents v16',['Galatians 3:10','Deuteronomy 27:26','Deuteronomy 27:15','Deuteronomy 27:16']],
 ['Dt 27:26 is the curse.\n\n- images v15',['Deuteronomy 27:26']],
 ['alignment with him Amo3:3 Rom12:2 Php2:2 1Co1:10.',['Amos 3:3','Romans 12:2','Philippians 2:2','1 Corinthians 1:10']],
 ['Noah "found grace" first Gn 6:8.',['Genesis 6:8']],['Rom 3:3 John 3:16',['Romans 3:3','John 3:16']],['4 John 1:1 and 2 Nephi 31:20',[]],['12:30:45 then Gen 1:1:2',[]],
 ['Diodorus 17.30.6 · *Antiquities* 16.240 · *Church History* 3.5.3 · *Against Heresies* 1.26.2 · *Institutes* 3.3.5 · WCF 15.3 · Sermon 43, III.2',[]],
];
for(const [input,wanted] of orchard) assert.deepEqual(api.parseScriptureRefs(input).map(api.refToString),wanted,input);
assert(api.continuesAcrossBlank('curse-list is moral law:','- 🗿 images v15')&&!api.continuesAcrossBlank('the curse.','- images v15'));
console.log(`PASS: ${orchard.length} orchard address forms (trailing colons, STEPBible codes, colon-introduced lists, non-Bible citations)`);

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
