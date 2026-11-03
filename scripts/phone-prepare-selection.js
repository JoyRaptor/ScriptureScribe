(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];p.tooltip.card.hide(true);
 await new Promise(r=>setTimeout(r,900));const panel=await p.activatePanel();
 panel.enterBibleMode();const bible=panel.bibleModeView;bible.closeNav();bible.goTo(1,1);
 await new Promise(r=>setTimeout(r,700));
 return {text:panel.containerEl.innerText.slice(0,1200),viewport:{w:innerWidth,h:innerHeight,dpr:devicePixelRatio}};
})();
