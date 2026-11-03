import pathlib,hashlib,json,subprocess
root=pathlib.Path('runtime-data');plugin=pathlib.Path(r'C:/ObsidianBrain/.obsidian/plugins/scripture-scribe')
files=['main.js','semantic-runtime.js','styles.css','kjv-formatted.json','enoch-charles.json','search-data/greek.json','search-data/hebrew.json','search-data/lxx.json']
manifest={f:hashlib.sha256((plugin/f).read_bytes()).hexdigest() for f in files}
pathlib.Path('review-sources/deployed-hashes.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
adb=r'C:/Users/JoyRaptor/AppData/Local/Android/Sdk/platform-tools/adb.exe';phone='192.168.1.151:38649';base='/storage/0000-0000/ObsidianBrain/.obsidian/plugins/scripture-scribe/'
for name,expected in manifest.items():
 r=subprocess.run([adb,'-s',phone,'shell','sha256sum',base+name],capture_output=True,text=True,timeout=20)
 actual=r.stdout.split()[0] if r.stdout.strip() else ''
 print(name,'synced' if actual==expected else 'waiting for sync',flush=True)
