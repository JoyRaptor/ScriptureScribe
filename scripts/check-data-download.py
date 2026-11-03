import urllib.request,pathlib
urls=['https://ebible.org/Scriptures/eng-kjv_usfm.zip','https://ebible.org/eng-kjv/1JN02.htm','https://original.sacred-texts.com/bib/boe/boe009.htm']
for i,u in enumerate(urls):
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Referer':'https://ebible.org/'})
  b=urllib.request.urlopen(req,timeout=20).read();pathlib.Path('review-sources/'+str(i)+('.zip' if i==0 else '.html')).write_bytes(b);print(u,len(b),b[:60])
 except Exception as e: print(u,str(e))
