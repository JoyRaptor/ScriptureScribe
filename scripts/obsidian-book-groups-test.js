(async()=>{
 const p=app.plugins.plugins['scripture-scribe'];p.tooltip.card.hide(true);
 const panel=await p.activatePanel();panel.enterBibleMode();panel.bibleModeView.openNav('book');
 const nav=panel.bibleModeView.navContainer;
 const text=nav.textContent;
 const headings=[...nav.querySelectorAll('div')].map(e=>e.childElementCount===0?e.textContent:'').filter(t=>['Old Testament','New Testament','Apocryphal'].includes(t));
 const books=[...nav.querySelectorAll('button')].map(e=>e.title);
 if(headings.join('|')!=='Old Testament|New Testament|Apocryphal'||nav.querySelector('details'))throw Error('book grouping incorrect');
 if(books[0]!=='Genesis'||books[38]!=='Malachi'||books[39]!=='Matthew'||books[65]!=='Revelation'||books[66]!=='Tobit')throw Error('book ordering incorrect');
 return JSON.stringify({status:'PASS',headings,books:books.length,collapsible:false});
})();
