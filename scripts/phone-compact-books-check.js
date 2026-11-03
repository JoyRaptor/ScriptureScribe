(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];const panel=await p.activatePanel();
 if(!p.getReadingPanel())throw Error('Mobile panel routing lost');
 panel.enterBibleMode();panel.bibleModeView.openNav('book');await new Promise(r=>setTimeout(r,800));
 const nav=panel.bibleModeView.navContainer;const inner=nav.firstElementChild;inner.scrollTop=0;
 const buttons=[...nav.querySelectorAll('button')];const revelation=buttons.find(b=>b.title==='Revelation');
 const r=revelation.getBoundingClientRect(),clip=inner.getBoundingClientRect();
 if(r.bottom>Math.min(clip.bottom,innerHeight))throw Error('New Testament still clipped: '+JSON.stringify({bottom:r.bottom,clip:clip.bottom,viewport:innerHeight}));
 return {status:'PASS',bookButtonHeight:buttons[0].getBoundingClientRect().height,RevelationBottom:r.bottom,drawerBottom:clip.bottom,viewportHeight:innerHeight,all66Visible:true,apocryphalAtBottom:nav.textContent.indexOf('Apocryphal')>nav.textContent.indexOf('New Testament')};
})();
