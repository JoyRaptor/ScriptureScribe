import esbuild from 'esbuild';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
await esbuild.build({stdin:{contents:`export * from './src/parser';export * from './src/fetcher';export * from './src/interlinear';export * from './src/versification';export * from './src/settings';export * from './src/dataLoader';export * from './src/vaultIndex';export {TFile} from 'obsidian';export * from './src/verseOfTheDay';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'scripts/.runtime-tests.cjs',alias:{obsidian:'./scripts/stubs/obsidian.mjs','@xenova/transformers':'./scripts/stubs/xenova.mjs'},logLevel:'silent'});
const require=createRequire(import.meta.url),api=require('./.runtime-tests.cjs');
const root='C:/ObsidianBrain/.obsidian/plugins/scripture-scribe';const reads=[];
const adapter={read:async p=>{reads.push(p);const file=p.replace(/^plugin\//,'');const derived=path.join('runtime-data',file);return fs.promises.readFile(fs.existsSync(derived)?derived:path.join(root,file),'utf8');}};
api.configureDataLoader('plugin',adapter);api.initLazyLoader('plugin',adapter);
assert.equal(reads.length,0,'startup must not eagerly read a Bible or dictionary');
const first=performance.now();let r=await api.getScripture(api.parseScriptureRefs('1Jn2:23')[0],api.DEFAULT_SETTINGS);const firstTextMs=performance.now()-first;
assert(r.formattedText.includes('*but] he that acknowledgeth'));
assert(!reads.some(p=>/strongs-|lexicon|vectors/.test(p)));
let before=reads.length;await Promise.all([api.ensureKJVData(),api.ensureKJVData()]);assert.equal(reads.length,before);
const selected=api.parseScriptureRefs('Jn3:16–18,20')[0];let words=await api.fetchInterlinear(selected,'greek','KJV');assert(words.length>40);assert.equal(reads.filter(p=>p==='plugin/greek-books/John.json').length,1,'one disk read for all selected verses');
for(const address of ['Joel 2:28','Mal 4:1']){words=await api.fetchInterlinear(api.parseScriptureRefs(address)[0],'hebrew','KJV');assert(words.length>10);assert(!words.some(w=>w.original==='—'));}
const def=await api.fetchStrongsDefinition('G0025');assert(def?.definition);assert(!reads.some(p=>p.endsWith('/lexicon-lsj.json')));assert(reads.some(p=>/definitions\/lsj-G0.json/.test(p)));
for(const address of ['1 Enoch 5:6','1 Enoch 14:11','1 Enoch 14:22','1 Enoch 89:7','1 Enoch 89:74','1 Enoch 108:13']){r=await api.getScripture(api.parseScriptureRefs(address)[0],api.DEFAULT_SETTINGS);assert(!r.text.startsWith('['),address);assert(r.version.includes('Charles'),address);}
api.setVersificationData(JSON.parse(fs.readFileSync('src/books/versification-mapping.json','utf8')));
for(const [input,c,v] of [['Ps 9:1',9,2],['Ps 10:1',9,22],['Ps 23:1',22,1],['Ps 114:1',113,1],['Ps 115:1',113,9],['Ps 116:10',115,1],['Ps 147:12',147,1],['Joel 2:28',2,28],['Mal 4:1',4,1]]){const mapped=api.mapToSwete(api.parseScriptureRefs(input)[0]);assert.equal(mapped.chapter,c,input);assert.equal(mapped.verseStart,v,input);}
assert.equal(api.mapToHebrew(api.parseScriptureRefs('Mal 4:1')[0]).verseStart,19);
r=await api.getScripture(api.parseScriptureRefs('Ps 116:9-10')[0],{...api.DEFAULT_SETTINGS,primaryTranslation:'LXX'});assert(!r.text.startsWith('['));
// Persistent index: cold read, warm reuse, edit, exclusion, deletion, and cancelled build.
const files=[new api.TFile(),new api.TFile()];Object.assign(files[0],{path:'a.md',stat:{mtime:1,size:12}});Object.assign(files[1],{path:'b.md',stat:{mtime:1,size:13}});
let docs=new Map([['a.md','Rom 7:25-8:1'],['b.md','Jn 3:16,18']]),disk=new Map(),count=0;
const vault={getMarkdownFiles:()=>files,getAbstractFileByPath:p=>files.find(f=>f.path===p),cachedRead:async f=>{count++;return docs.get(f.path);},adapter:{read:async p=>{if(!disk.has(p))throw Error('missing');return disk.get(p);},write:async(p,s)=>disk.set(p,s)}};
await api.buildVaultIndex(vault,[],undefined,'plugin');assert.equal(count,2);assert(api.getNotesForVerse('Romans 8:1').length===1);
count=0;await api.buildVaultIndex(vault,[],undefined,'plugin');assert.equal(count,0,'unchanged notes must not be reread');assert.equal(api.getNotesForVerse('John 3:16').length,1);
docs.set('b.md','Jn 3:17');files[1].stat.mtime=2;await api.updateVaultIndexForFile(vault,files[1]);assert.equal(api.getNotesForVerse('John 3:16').length,0);assert.equal(api.getNotesForVerse('John 3:17').length,1);
files.splice(0,1);api.removeVaultIndexFile('a.md');assert.equal(api.getNotesForVerse('Romans 8:1').length,0);
await api.buildVaultIndex(vault,[],undefined,'plugin');assert.equal(api.getNotesForVerse('Romans 8:1').length,0);
const legacyCache=disk.get('plugin/vault-index-cache.json');
await api.buildVaultIndex(vault,[],undefined,'plugin',()=>false,true,'phone-A');
await api.buildVaultIndex(vault,[],undefined,'plugin',()=>false,true,'desktop-B');
assert(disk.has('plugin/vault-index-cache-phone-A.json'));
assert(disk.has('plugin/vault-index-cache-desktop-B.json'));
assert.equal(disk.get('plugin/vault-index-cache.json'),legacyCache,'device caches must not overwrite the shared migration cache');
count=0;await api.buildVaultIndex(vault,[],undefined,'plugin',()=>false,true,'phone-A');assert.equal(count,0);
await api.buildVaultIndex(vault,[],undefined,'plugin',()=>true,false,'cancelled');assert(!disk.has('plugin/vault-index-cache-cancelled.json'));
// A chapter-only reference names the chapter, not its verses: Bible mode must not light every verse of it.
const chapterNote=Object.assign(new api.TFile(),{path:'c.md',stat:{mtime:1,size:24}});files.push(chapterNote);docs.set('c.md','see Psalm 50, then Ps 50:3');
await api.updateVaultIndexForFile(vault,chapterNote);assert.equal(api.getNotesForVerse('Psalms 50:1').length,0);assert.equal(api.getNotesForVerse('Psalms 50:3').length,1);
api.stopVaultIndex();
// Translations are honest: only listed translations load, nothing is substituted, failures say so.
{
 const realFetch=globalThis.fetch;const calls=[];
 const settings=t=>({...api.DEFAULT_SETTINGS,primaryTranslation:t});
 globalThis.fetch=async url=>{calls.push(String(url));const q=decodeURIComponent(String(url).split('bible-api.com/')[1].split('?')[0]);
  if(String(url).includes('translation=web')&&q==='John 3')return{ok:true,json:async()=>({verses:[1,2,3].map(v=>({verse:v,text:` web ${v}\n`}))})};
  if(String(url).includes('translation=web'))return{ok:true,json:async()=>({verses:[{verse:16,text:'For God so loved the world (WEB)'}]})};
  return{ok:false,json:async()=>({error:'not found'})};};
 let v=await api.getScripture(api.parseScriptureRefs('Jn 3:16')[0],settings('WEB'));
 assert.equal(v.version,'WEB');assert.equal(v.source,'api');assert.match(v.text,/\(WEB\)/);assert.match(api.sourceLabel(v),/^WEB · bible-api/);
 v=await api.getScripture(api.parseScriptureRefs('Gen 1:1')[0],settings('YLT'));
 assert.equal(v.version,'KJV','a failed translation is shown as the KJV it is');assert.equal(v.requested,'YLT');assert.equal(api.sourceLabel(v),'YLT unavailable · showing KJV');
 const n=calls.length;v=await api.getScripture(api.parseScriptureRefs('Jn 3:16')[0],settings('ESV'));
 assert.equal(calls.length,n,'copyrighted translations are never fetched');assert.equal(v.version,'KJV');assert.equal(v.requested,'ESV');
 const before=calls.length;const ch=await api.getOnlineChapter('John',3,'WEB');assert.equal(calls.length,before+1,'a chapter is one request');assert.deepEqual([...ch.keys()],[1,2,3]);assert.equal(ch.get(2),'web 2');
 await api.getOnlineChapter('John',3,'WEB');assert.equal(calls.length,before+1,'and is reused');
 assert.equal(await api.getOnlineChapter('John',3,'NIV'),null);
 api.clearScriptureCache();await api.getOnlineChapter('John',3,'WEB');assert.equal(calls.length,before+2,'clearing the cache really refetches');
 assert(api.TRANSLATIONS.every(t=>t.id==='KJV'||t.id==='LXX'||t.api),'every selectable translation has a source');
 globalThis.fetch=realFetch;
}
// Verse of the Day: every entry is a real verse (it used to say "Psalm", which no lookup matched).
{
 for(const e of api.VOTD_ENTRIES){const ref=api.parseScriptureRefs(`${e.book} ${e.chapter}:${e.verse}`)[0];assert(ref,`${e.book} ${e.chapter}:${e.verse} parses`);
  const v=await api.getScripture(ref,api.DEFAULT_SETTINGS);assert(!v.text.startsWith('['),`${api.refToString(ref)} has KJV text`);}
 const day=new Date(2026,10,5);assert.equal(api.getVerseOfTheDay('deterministic',day),api.getVerseOfTheDay('deterministic',day));
}
console.log(JSON.stringify({status:'PASS',checks:'lazy text, single-flight, per-book interlinear, Hebrew numbering gaps, dictionary shards, Enoch supplement, 8 mappings, LXX split range, persistent index cold/warm/edit/delete',firstTextMs:Math.round(firstTextMs),diskReads:reads},null,2));
