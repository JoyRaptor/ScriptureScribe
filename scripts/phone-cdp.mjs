import fs from 'node:fs';
const connection=JSON.parse(fs.readFileSync('review-sources/phone/connection.json','utf8'));
const ws=new WebSocket(connection.target);await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
const expression=fs.readFileSync(process.argv[2],'utf8');
const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('CDP timed out')),90000);ws.onmessage=e=>{const r=JSON.parse(e.data);if(r.id===1){clearTimeout(timer);resolve(r)}};ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true,userGesture:true}}))});
ws.close();if(result.result?.exceptionDetails){console.error(JSON.stringify(result.result.exceptionDetails));process.exitCode=1}else console.log(JSON.stringify(result.result?.result?.value??result));
