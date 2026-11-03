import subprocess,time,pathlib,json
adb=r'C:/Users/JoyRaptor/AppData/Local/Android/Sdk/platform-tools/adb.exe';phone='192.168.1.151:38649';out=pathlib.Path('review-sources/phone')
def run(*args,**kw):return subprocess.run([adb,'-s',phone,*args],capture_output=True,text=True,timeout=kw.pop('timeout',20),**kw)
start=time.monotonic();r=run('shell','am','start','-W','-n','md.obsidian/.MainActivity');elapsed=time.monotonic()-start
(out/'launch-as-found.txt').write_text(r.stdout+'\nHost elapsed '+str(elapsed),encoding='utf8');print(r.stdout, 'host call seconds',round(elapsed,3),flush=True)
for second in [0,2,5]:
 if second:time.sleep(second)
 (out/f'as-found-{second}.png').write_bytes(subprocess.check_output([adb,'-s',phone,'exec-out','screencap','-p'],timeout=20))
print(run('shell','cat','/proc/net/unix').stdout.split('webview_devtools')[-1][-200:] if False else run('shell','sh','-c',"cat /proc/net/unix | grep devtools").stdout)
print(run('shell','pidof','md.obsidian').stdout)
