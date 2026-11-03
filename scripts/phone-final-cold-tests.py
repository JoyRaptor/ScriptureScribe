import subprocess,time,pathlib,json,re,urllib.request
adb=r'C:/Users/JoyRaptor/AppData/Local/Android/Sdk/platform-tools/adb.exe';phone='192.168.1.151:38649';out=pathlib.Path('review-sources/phone');results=[]
def run(*args):return subprocess.check_output([adb,'-s',phone,*args],text=True,timeout=25).strip()
for trial in range(1,4):
 run('shell','am','force-stop','md.obsidian');run('shell','input','keyevent','KEYCODE_HOME');time.sleep(.4)
 t=time.monotonic();launch=run('shell','am','start','-W','-n','md.obsidian/.MainActivity')
 (out/f'cold-{trial}.txt').write_text(launch,encoding='utf8')
 pid=run('shell','pidof','md.obsidian').split()[0]
 # Forward only this app's WebView debug socket, discovered from its current PID.
 port=run('forward','tcp:0','localabstract:webview_devtools_remote_'+pid)
 deadline=time.monotonic()+25;targets=[]
 while time.monotonic()<deadline:
  try:
   targets=json.load(urllib.request.urlopen('http://127.0.0.1:'+port+'/json',timeout=2));targets=[x for x in targets if x.get('type')=='page']
   if targets:break
  except Exception:pass
  time.sleep(.2)
 if not targets:raise RuntimeError('Obsidian WebView unavailable')
 connection={'port':port,'target':targets[0]['webSocketDebuggerUrl']};(out/'connection.json').write_text(json.dumps(connection),encoding='utf8')
 native=int(re.search(r'TotalTime: (\d+)',launch)[1]);entry={'trial':trial,'launchState':re.search(r'LaunchState: (\w+)',launch)[1],'nativeFirstDrawMs':native,'debugTargetAvailableMs':round((time.monotonic()-t)*1000)}
 results.append(entry);print(entry,flush=True)
 time.sleep(1)
 (out/f'cold-{trial}.png').write_bytes(subprocess.check_output([adb,'-s',phone,'exec-out','screencap','-p'],timeout=20))
 # Retire this trial's forwarding before the next launch. Keep the final one for study checks.
 if trial<3:run('forward','--remove','tcp:'+port)
(out/'cold-start-results.json').write_text(json.dumps({'device':'Samsung Galaxy Note20 Ultra SM-N986U','conditions':'Process killed before each launch; existing OS/file cache retained; vault on SD card; no app data cleared','trials':results},indent=2),encoding='utf8')
print('median native first draw',sorted(r['nativeFirstDrawMs'] for r in results)[1],flush=True)
