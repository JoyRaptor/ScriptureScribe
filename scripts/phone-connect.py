import json,pathlib,subprocess,time,urllib.request,sys
adb=r'C:/Users/JoyRaptor/AppData/Local/Android/Sdk/platform-tools/adb.exe'
phone='192.168.1.151:38649';out=pathlib.Path('review-sources/phone')
def run(*args):return subprocess.check_output([adb,'-s',phone,*args],text=True,timeout=25).strip()
if '--restart' in sys.argv:
 run('shell','am','force-stop','md.obsidian')
 print(run('shell','am','start','-W','-n','md.obsidian/.MainActivity'))
pid=run('shell','pidof','md.obsidian').split()[0]
port=run('forward','tcp:0','localabstract:webview_devtools_remote_'+pid)
for attempt in range(50):
 try:
  targets=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json',timeout=2))
  target=next(t for t in targets if t.get('type')=='page');break
 except Exception:time.sleep(.2)
else:raise RuntimeError('Obsidian debug target unavailable')
(out/'connection.json').write_text(json.dumps({'port':port,'target':target['webSocketDebuggerUrl']}),encoding='utf8')
print(json.dumps({'pid':pid,'port':port,'title':target['title']}))
