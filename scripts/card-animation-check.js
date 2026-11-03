(async () => {
 const card = app.plugins.plugins['scripture-scribe'].tooltip.card;
 if (!card.frame) throw Error('Open a recording card before this check');
 // Same plugin-owned srcdoc in a temporary instrumented frame. The production
 // card keeps its sandbox; this clone lets the test sample layout directly.
 const frame = document.createElement('iframe');
 frame.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;border:0;opacity:0;pointer-events:none;';
 const fits=[];let ready;const began=performance.now();
 const readyPromise=new Promise(resolve=>{ready=resolve});
 const listener=e=>{if(e.source!==frame.contentWindow)return;if(e.data?.type==='ready')ready();if(e.data?.type==='fit')fits.push({...e.data,at:Math.round(performance.now()-began)})};
 window.addEventListener('message',listener);
 try {
  frame.srcdoc=card.frame.srcdoc;document.body.appendChild(frame);
  await Promise.race([readyPromise,new Promise((_,reject)=>setTimeout(()=>reject(Error('card ready timeout')),6000))]);
  frame.contentWindow.postMessage({ss:1,type:'show',content:{...card.content,runs:[{text:card.content.text,styles:[]}]}},'*');
  const sizes=[];
  for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,150));sizes.push(frame.contentDocument.querySelector('[data-ss="text"]').style.fontSize)}
  const doc=frame.contentDocument;
  const result={status:'PASS',fitMessages:fits,fontSizes:[...new Set(sizes)],fonts:doc.fonts.status,words:doc.querySelectorAll('.w').length,jitterAnimations:doc.getAnimations().filter(a=>a.animationName==='boil').length,state:doc.documentElement.dataset.state};
  if(result.fontSizes.length!==1||result.jitterAnimations!==0||result.state!=='hold')throw Error(JSON.stringify(result));
  return JSON.stringify(result);
 } finally {window.removeEventListener('message',listener);frame.remove()}
})();
