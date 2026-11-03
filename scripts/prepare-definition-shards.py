import pathlib,json,re
root=pathlib.Path('runtime-data/definitions');root.mkdir(exist_ok=True)
source=pathlib.Path(r'C:/ObsidianBrain/.obsidian/plugins/scripture-scribe')
for filename,label in [('strongs-definitions.json','strongs'),('strongs-greek-lxx.json','lxx'),('lexicon-lsj.json','lsj')]:
 data=json.loads((source/filename).read_text('utf-8-sig'));shards={}
 for key,val in data.items():
  m=re.match(r'([GH])(\d+)',key)
  if m:shards.setdefault(f'{label}-{m[1]}{int(m[2])//100}',{})[key]=val
 for name,data in shards.items():(root/(name+'.json')).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf8')
 print(label,len(shards),'shards')
