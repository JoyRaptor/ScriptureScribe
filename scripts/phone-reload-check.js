(async()=>{
 const id='scripture-scribe';
 await app.plugins.unloadPlugin(id);await app.plugins.loadPlugin(id);
 const p=app.plugins.plugins[id];const panel=await p.activatePanel();
 if(p.getReadingPanel()!==panel)throw Error('Sidebar panel tracking failed');
 return {status:'PASS',latestLifecycleGuard:typeof p.tooltip.card.destroyed==='boolean',panelTrackedImmediately:true};
})();
