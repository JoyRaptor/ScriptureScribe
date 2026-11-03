(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];
 p.tooltip.card.hide(true);
 await p.scanPromise;
 const original=app.vault.cachedRead;
 const results=[];
 try {
  for(const force of [true,false]){
   let reads=0;
   app.vault.cachedRead=function(...args){reads++;return original.apply(this,args)};
   if(!force)p.scanPromise=null;
   const start=performance.now();
   await p.startVaultScan(force);
   results.push({kind:force?'cold':'cached',ms:Math.round(performance.now()-start),noteReads:reads});
  }
 } finally {app.vault.cachedRead=original;}
 return JSON.stringify({notes:app.vault.getMarkdownFiles().length,results});
})();
