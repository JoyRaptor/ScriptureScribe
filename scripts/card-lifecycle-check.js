(async()=>{
 const existing=app.plugins.plugins['scripture-scribe'].tooltip.card;
 const before=document.querySelectorAll('.ss-verse-card-overlay').length;
 let complete;
 const card=new existing.constructor(()=>new Promise(resolve=>{complete=resolve}),()=> 'test.html','');
 card.warm();card.destroy();complete('<html><body>late skin</body></html>');
 await new Promise(resolve=>setTimeout(resolve,50));
 if(document.querySelectorAll('.ss-verse-card-overlay').length!==before)throw Error('Destroyed card appended a late overlay');
 return JSON.stringify({status:'PASS',lateOverlayAfterDestroy:false});
})();
