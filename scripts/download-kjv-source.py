import urllib.request,zipfile,io,pathlib
root=pathlib.Path('review-sources');root.mkdir(exist_ok=True)
u='https://ebible.org/Scriptures/eng-kjv_usfm.zip'
b=urllib.request.urlopen(u,timeout=45).read();(root/'eng-kjv_usfm.zip').write_bytes(b)
z=zipfile.ZipFile(io.BytesIO(b));print(z.namelist()[:12])
for n in z.namelist():
 if '1JN' in n.upper() or '1JO' in n.upper():
  t=z.read(n).decode('utf-8-sig');(root/'1John.usfm').write_text(t,encoding='utf-8');print(t[:600]);print('2:23',t[t.find('\\v 23'):t.find('\\v 23')+400])
