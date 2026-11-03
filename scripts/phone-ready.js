(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];
 return {ready:app.workspace.layoutReady,pluginLoaded:!!p.tooltip,usesCompactSearch:typeof p.loadSearchData==='function',scanStarted:p.scanStarted,notes:app.vault.getMarkdownFiles().length,bodyTextReady:document.body.innerText.includes('Triage Map'),heap:performance.memory?.usedJSHeapSize};
})();
