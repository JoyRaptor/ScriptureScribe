import json,re,zipfile,pathlib,hashlib
z=zipfile.ZipFile('review-sources/0.zip');names=json.loads(pathlib.Path('src/verseCounts.json').read_text('utf8'));mapping=['GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT','1SA','2SA','1KI','2KI','1CH','2CH','EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG','ISA','JER','LAM','EZK','DAN','HOS','JOL','AMO','OBA','JON','MIC','NAM','HAB','ZEP','HAG','ZEC','MAL','MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','COL','PHP','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV']
# Use explicit book IDs: JSON insertion order is not canonical for Philippians/Colossians.
booknames=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Colossians','Philippians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']
idbook=dict(zip(mapping,booknames));out={};plain={}
for n in z.namelist():
 if not n.endswith('.usfm'):continue
 t=z.read(n).decode('utf-8-sig');m=re.search(r'\\id\s+(\S+)',t)
 if not m or m[1] not in idbook:continue
 book=idbook[m[1]]
 for chap in re.split(r'\\c\s+(\d+)\s*',t)[1:][::2]:pass
 parts=re.split(r'\\c\s+(\d+)\s*',t)
 for i in range(1,len(parts),2):
  chapter=int(parts[i]);vs=re.split(r'\\v\s+(\d+)\s+',parts[i+1])
  for j in range(1,len(vs),2):
   verse=int(vs[j]);body=vs[j+1]
   body=re.sub(r'\\f\s[\s\S]*?\\f\*|\\x\s[\s\S]*?\\x\*', '', body)
   body=re.sub(r'\\(?:\+)?w\s+([^|]+)\|[^\\]*\\(?:\+)?w\*',r'\1',body)
   body=re.sub(r'\\add\s+([\s\S]*?)\\add\*',lambda m:'*'+m[1].strip()+'*',body)
   body=re.sub(r'\\(?:s\d?|r|d|ms\d?|mt\d?|sp)\s+[^\r\n]*','',body)
   body=re.sub(r'\\(?:\+)?[a-z]+\d?\*?\s*',' ',body)
   body=' '.join(body.split()).replace('¶ ','').strip();key=f'{book} {chapter}:{verse}'
   plain[key]=body.replace('*','')
   if '*' in body:out[key]=body
assert len(plain)==31102,len(plain)
assert '*but*' in out['1 John 2:23'] or '*[but]' in out['1 John 2:23'],out['1 John 2:23']

# Transfer emphasis onto the installed text, preserving its exact wording.
import difflib
installed=json.loads(pathlib.Path(r'C:/ObsidianBrain/.obsidian/plugins/scripture-scribe/kjv.json').read_text('utf-8-sig'))
def canon(s):
 return re.sub(r'^I ', '1 ', re.sub(r'^II ', '2 ', re.sub(r'^III ', '3 ',s))).replace('Revelation of John ','Revelation ')
formatted={};skipped=[]
for rawkey,text in installed.items():
 key=canon(rawkey);source=out.get(key)
 if not source:continue
 plain_source=source.replace('*','')
 src_words=list(re.finditer(r"[A-Za-z0-9]+",plain_source));dst_words=list(re.finditer(r"[A-Za-z0-9]+",text))
 italic_spans=[];pos=0;active=False;start=0
 for char in source:
  if char=='*':
   if active:italic_spans.append((start,pos))
   else:start=pos
   active=not active
  else:pos+=1
 marked={i for i,w in enumerate(src_words) if any(a<=w.start()<b for a,b in italic_spans)}
 matcher=difflib.SequenceMatcher(None,[w[0].lower() for w in src_words],[w[0].lower() for w in dst_words],autojunk=False)
 indexmap={a+i:b+i for a,b,n in matcher.get_matching_blocks() for i in range(n)}
 if not marked.issubset(indexmap) or len(indexmap)/max(1,len(src_words))<0.8:
  skipped.append(key);continue
 selected={indexmap[i] for i in marked};spans=[]
 for i in sorted(selected):
  if spans and i==spans[-1][2]+1:spans[-1]=(spans[-1][0],dst_words[i].end(),i)
  else:spans.append((dst_words[i].start(),dst_words[i].end(),i))
 result=text
 for a,b,_ in reversed(spans):result=result[:a]+'*'+result[a:b]+'*'+result[b:]
 formatted[key]=result
p=pathlib.Path('runtime-data');p.mkdir(exist_ok=True);(p/'kjv-formatted.json').write_text(json.dumps(formatted,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
pathlib.Path('review-sources/kjv-italics-skipped.json').write_text(json.dumps(skipped),encoding='utf-8')
print('Parsed',len(plain),'canonical verses;',len(formatted),'with verified supplied-word italics;',len(skipped),'not safely alignable')
print(formatted['1 John 2:23'])
