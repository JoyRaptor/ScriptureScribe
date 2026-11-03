import json,re,pathlib
root=pathlib.Path(r'C:\+Projects\Scripture-scribe')
installed=pathlib.Path(r'C:\ObsidianBrain\.obsidian\plugins\scripture-scribe')
def canon(s):
 for a,b in [('III ','3 '),('II ','2 '),('I ','1 ')]:
  if s.startswith(a): s=b+s[len(a):];break
 return {'Revelation of John':'Revelation','Song of Songs':'Song of Solomon'}.get(s,s)
d=json.loads((installed/'kjv.json').read_text('utf-8-sig'));counts={}
for key in d:
 m=re.match(r'(.+) (\d+):(\d+)$',key)
 if m:
  b,c,v=canon(m[1]),int(m[2]),int(m[3]);a=counts.setdefault(b,[])
  while len(a)<c:a.append(0)
  a[c-1]=max(a[c-1],v)
(root/'src/verseCounts.json').write_text(json.dumps(counts,separators=(',',':')),encoding='utf-8')
# Derived assets; original Bible databases are preserved byte-for-byte.
for source,folder in [('strongs-greek','greek-books'),('strongs-hebrew','hebrew-books'),('strongs-lxx','lxx-books')]:
 data=json.loads((installed/(source+'.json')).read_text('utf-8-sig'));books={}
 for key,val in data.items():
  m=re.match(r'(.+) (\d+:\d+.*)$',key)
  if not m:continue
  b=canon(m[1]);books.setdefault(b,{})[b+' '+m[2]]=val
 target=root/'runtime-data'/folder;target.mkdir(parents=True,exist_ok=True)
 for b,val in books.items():(target/(b+'.json')).write_text(json.dumps(val,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Generated verse counts and per-book language data')
