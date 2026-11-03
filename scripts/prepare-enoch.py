import pathlib,re,json
s=pathlib.Path('review-sources/enoch-pdf-text.txt').read_text('utf8')
s=re.sub(r'\[p\.\s*[^\]]+\]','',s);s=re.sub(r'The Book of Enoch, by R\.H\. Charles, \[1917\], at sacred-texts\.com','',s)
# Retain complete chapters separately, so supplied passages never mix translations.
def roman(n):
 total=0;prev=0
 for c in reversed(n):
  v={'I':1,'V':5,'X':10,'L':50,'C':100}[c];total+=v if v>=prev else -v;prev=max(prev,v)
 return total
matches=list(re.finditer(r'^CHAPTER\s+([IVXLC]+)\s*\.?[ \t]*$',s,re.M));chapters={}
for i,m in enumerate(matches):
 c=roman(m[1]);body=s[m.end():matches[i+1].start() if i+1<len(matches) else len(s)]
 if c==77 and c in chapters: c=78 # printed heading repeats LXXVII before the sun/moon chapter
 chapters[c]=chapters.get(c,'')+'\n'+body
out={}
for c,body in chapters.items():
 # Decimal verse markers. Some poetic verses omit the period.
 body=re.sub(r'^\s*[IVXLC]+\.\s+\d+[-.].*$', '', body,flags=re.M)
 markers=list(re.finditer(r"(?<![\w:^.-])([1-9]\d{0,2})([a-z]?)\.?\s+(?=[A-Z\[\'\"(])",body))
 for i,m in enumerate(markers):
  v=int(m[1]);text=body[m.end():markers[i+1].start() if i+1<len(markers) else len(body)]
  # Remove trailing section titles, page notes and footnotes before next chapter.
  text=re.split(r'\n\s*(?:Footnotes|[IVXLC]+[ .–-]+[IVXLC]+\.|[IVXLC]+\.\s+[A-Z])',text)[0]
  text=' '.join(text.split()).strip();key=f'1 Enoch {c}:{v}'
  if text:out[key]=out.get(key,'')+(' ' if key in out else '')+text
print('Chapters',len(chapters),'verses',len(out))
for key in ['1 Enoch 5:6','1 Enoch 14:11','1 Enoch 14:22','1 Enoch 89:7','1 Enoch 89:74','1 Enoch 108:13']:
 assert out.get(key),key
 print(key,out[key][:90])

old=json.loads(pathlib.Path('kjv.json').read_text('utf-8-sig'));missing=[]
for c in range(1,109):
 nums=[int(k.split(':')[-1]) for k in old if k.startswith(f'1 Enoch {c}:')]
 for v in range(1,max(nums or [0])+1):
  key=f'1 Enoch {c}:{v}'
  if key not in old:missing.append(key)
# Two verse numbers are omitted in the typeset source. Their text and
# boundaries are identifiable in the adjoining passage and checked against
# independent verse-addressed Charles editions (recorded in DATA-SOURCES.md).
out['1 Enoch 22:4']=' '.join(re.search(r"(And these\s+places have[\s\S]*?upon them[.]')",chapters[22])[1].split())
out['1 Enoch 93:2']=' '.join(re.search(r"(And Enoch said:[\s\S]*?heavenly tablets[.]')",chapters[93])[1].split())
subset={k:out[k] for k in missing if k in out}
absent=[k for k in missing if k not in out]
print('Missing addresses',len(missing),'recovered',len(subset),'unresolved',absent)
assert not absent
pathlib.Path('runtime-data/enoch-charles.json').write_text(json.dumps(subset,ensure_ascii=False,separators=(',',':')),encoding='utf8')
pathlib.Path('review-sources/enoch-extraction-audit.json').write_text(json.dumps({'missing':missing,'recovered':len(subset)},indent=2),encoding='utf8')
