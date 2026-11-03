import pathlib,json,re
source=pathlib.Path(r'C:/ObsidianBrain/.obsidian/plugins/scripture-scribe');target=pathlib.Path('runtime-data/search-data');target.mkdir(exist_ok=True)
aliases=json.loads(pathlib.Path('review-sources/book-aliases.json').read_text('utf8'))
def canonical(key):
 m=re.match(r'(.+) (\d+:\d+.*)$',key)
 if not m:return key
 book=aliases.get(re.sub(r'\s+','',m[1]).lower(),m[1])
 return book+' '+m[2]
for label in ['greek','hebrew','lxx']:
 data=json.loads((source/f'strongs-{label}.json').read_text('utf-8-sig'));words=[];lookup={};verses={};total=0
 for key,entries in data.items():
  key=canonical(key)
  ids=[]
  for entry in entries:
   word={k:entry[k] for k in ['e','o','s','m'] if k in entry};signature=json.dumps(word,ensure_ascii=False,separators=(',',':'))
   if signature not in lookup:lookup[signature]=len(words);words.append(word)
   ids.append(lookup[signature]);total+=1
  verses[key]=ids
 asset={'words':words,'verses':verses};file=target/(label+'.json');file.write_text(json.dumps(asset,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 # Check losslessness of every searchable field, including word order and morphology.
 for key,entries in data.items():
  normalized=canonical(key)
  assert [words[i] for i in verses[normalized]]==[{k:entry[k] for k in ['e','o','s','m'] if k in entry} for entry in entries]
 print(label,total,'word occurrences;',len(words),'unique records;',file.stat().st_size,'bytes')
