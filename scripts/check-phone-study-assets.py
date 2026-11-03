import hashlib,json,pathlib,subprocess

project=pathlib.Path(__file__).resolve().parent.parent
adb=r'C:/Users/JoyRaptor/AppData/Local/Android/Sdk/platform-tools/adb.exe'
phone='192.168.1.151:38649'
plugin='/storage/0000-0000/ObsidianBrain/.obsidian/plugins/scripture-scribe'
folders=['definitions','greek-books','hebrew-books','lxx-books','search-data']
expected={str(p.relative_to(project/'runtime-data')).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest()
          for folder in folders for p in (project/'runtime-data'/folder).glob('*.json')}
raw=subprocess.check_output([adb,'-s',phone,'shell','cd '+plugin+' && sha256sum '+' '.join(f+'/*.json' for f in folders)],text=True,timeout=90)
actual={line[66:].strip():line[:64] for line in raw.splitlines() if len(line)>66}
mismatches=[p for p,h in expected.items() if actual.get(p)!=h]
result={'status':'PASS' if not mismatches else 'WAITING FOR SYNC','matched':len(expected)-len(mismatches),'expected':len(expected),'mismatches':mismatches}
(project/'review-sources/phone/full-sync-check.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result))
