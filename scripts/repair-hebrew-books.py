import runpy,pathlib,json,re
x=runpy.run_path('build-interlinear-complete.py');data={}
for file in pathlib.Path('.').glob('TAHOT*.txt'):x['parse_file_hebrew'](str(file),data)
added=0
for file in pathlib.Path('runtime-data/hebrew-books').glob('*.json'):
 book=file.stem;current=json.loads(file.read_text('utf8'))
 for key,words in data.items():
  if key.startswith(book+' ') and key not in current:current[key]=words;added+=1
 file.write_text(json.dumps(current,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('Recovered missing Hebrew verses from supplied STEPBible source:',added)
for key in ['Joel 2:28','Malachi 4:1']:
 print(key,len(data.get(key,[])))
