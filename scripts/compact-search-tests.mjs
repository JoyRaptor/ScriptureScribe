import esbuild from 'esbuild';import fs from 'node:fs';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import path from 'node:path';
const queries=['G25','H7225','g0025','ἀγάπη','אלהים','love','shepherd','eternal life','faith AND works','faith|grace','love NOT world','leads me beside still waters','in the beginning God created','morph:V-AAI*','morph:G4100|V-A*','semantic:forgiveness of sins','nt love','ot shepherd'];
if(!process.argv[2]){
 await esbuild.build({stdin:{contents:`export * from './src/fetcher';export * from './src/interlinear';export * from './src/searchIndex';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',outfile:'scripts/.compact-search-test.cjs',alias:{obsidian:'./scripts/stubs/obsidian.mjs'},logLevel:'silent'});
 const results=[];
 for(const mode of ['original','compact']){const r=spawnSync(process.execPath,['--expose-gc',process.argv[1],mode],{encoding:'utf8',maxBuffer:16000000});if(r.status!==0)throw Error(r.stderr);results.push(JSON.parse(r.stdout));}
 assert.deepEqual(results[1].queries,results[0].queries);
 console.log(JSON.stringify({status:'PASS',queries:queries.length,wordSearchResults:'identical across all results, not just top 10',originalHeapMB:results[0].heapMB,compactHeapMB:results[1].heapMB}));
}else{
 console.log=()=>{};const api=createRequire(import.meta.url)('./.compact-search-test.cjs');const source='C:/ObsidianBrain/.obsidian/plugins/scripture-scribe';
 api.setKJVData(JSON.parse(fs.readFileSync(path.join(source,'kjv.json'),'utf8')));
 if(process.argv[2]==='original'){
  api.setGreekData(JSON.parse(fs.readFileSync(path.join(source,'strongs-greek.json'),'utf8')));api.setHebrewData(JSON.parse(fs.readFileSync(path.join(source,'strongs-hebrew.json'),'utf8')));api.setLXXData(JSON.parse(fs.readFileSync(path.join(source,'strongs-lxx.json'),'utf8')));
  await api.buildSearchIndex(api.getGreekData(),api.getHebrewData(),api.getLXXData());
 }else{
  api.configureSearchLoader(async()=>{const stores={};for(const language of ['greek','hebrew','lxx']){const data=JSON.parse(fs.readFileSync('runtime-data/search-data/'+language+'.json','utf8'));stores[language]=Object.fromEntries(Object.entries(data.verses).map(([ref,ids])=>[ref,ids.map(id=>data.words[id])]));}return stores;});
 }
 const results={};for(const q of queries)results[q]=await api.search(q);global.gc();process.stdout.write(JSON.stringify({queries:results,heapMB:Math.round(process.memoryUsage().heapUsed/1024/1024)}));
}
