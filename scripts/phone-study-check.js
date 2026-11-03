(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];const start=performance.now();
 const panel=await p.activatePanel();const panelMs=Math.round(performance.now()-start);
 if(panel.bibleMode)panel.exitBibleMode();
 panel.interlinearState='MT';const t=performance.now();
 await panel.setRef({book:'Joel',chapter:2,verseStart:28,raw:'Joel 2:28',start:0,end:9},null);
 const words=panel.gridEl.querySelectorAll('.ss-word-card').length;
 if(words<10)throw Error('Hebrew word data missing');
 const wordMs=Math.round(performance.now()-t);const d=performance.now();await panel.showSdef('G25');
 const definitionText=panel.sdefEl.textContent;const definitionMs=Math.round(performance.now()-d);
 if(definitionText.length<100)throw Error('Definition incomplete');
 const times=[];
 for(let i=0;i<2;i++){panel.searchInput.value='H7225';const t=performance.now();await panel.runSearch();times.push(Math.round(performance.now()-t));if(!panel.searchResultsEl.textContent.includes('Genesis 1:1'))throw Error('Hebrew search result missing');}
 panel.exitSearch(false);panel.enterBibleMode();panel.bibleModeView.openNav('book');
 const nav=panel.bibleModeView.navContainer;const headings=[...nav.querySelectorAll('div')].map(e=>e.childElementCount===0?e.textContent:'').filter(t=>['Old Testament','New Testament','Apocryphal'].includes(t));
 if(headings.join('|')!=='Old Testament|New Testament|Apocryphal'||nav.querySelector('details'))throw Error('Wrong book groups');
 return {status:'PASS',panelMs,HebrewWords:words,wordLookupMs:wordMs,definitionChars:definitionText.length,definitionMs,firstWholeBibleSearchMs:times[0],repeatedSearchMs:times[1],headings,heap:performance.memory?.usedJSHeapSize};
})();
