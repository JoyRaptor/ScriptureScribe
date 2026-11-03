(async()=>{
 const id='scripture-scribe';
 app.plugins.plugins[id]?.tooltip.card?.hide(true);
 const samples=[];
 for(let i=0;i<3;i++){
  await app.plugins.unloadPlugin(id);
  const t=performance.now();
  await app.plugins.loadPlugin(id);
  samples.push(Number((performance.now()-t).toFixed(1)));
 }
 return JSON.stringify({loadMs:samples,medianMs:samples.slice().sort((a,b)=>a-b)[1],scanStarted:app.plugins.plugins[id].scanStarted});
})();
