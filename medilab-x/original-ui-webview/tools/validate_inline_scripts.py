#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
import subprocess, tempfile, sys
class Scripts(HTMLParser):
 def __init__(self): super().__init__(convert_charrefs=False);self.items=[];self.inside=False;self.current=[]
 def handle_starttag(self,tag,attrs):
  if tag=="script":
   self.inside=not dict(attrs).get("src");self.current=[]
 def handle_data(self,data):
  if self.inside:self.current.append(data)
 def handle_endtag(self,tag):
  if tag=="script" and self.inside:
   self.items.append("".join(self.current));self.inside=False
path=Path(sys.argv[1]);parsed=Scripts();parsed.feed(path.read_text(encoding="utf-8"))
print("Validating",len(parsed.items),"inline scripts from",path)
bad=0
for i,source in enumerate(parsed.items):
 if not source.strip():continue
 with tempfile.NamedTemporaryFile(mode="w",suffix=".js",delete=False,encoding="utf-8") as fp:
  fp.write(source);tmp=Path(fp.name)
 try:
  run=subprocess.run(["node","--check",str(tmp)],capture_output=True,text=True)
  if run.returncode:
   bad+=1
   print("INVALID SCRIPT",i,"length",len(source),"start",repr(source[:150]),"end",repr(source[-240:]))
   print(run.stderr[:1500])
 finally:tmp.unlink(missing_ok=True)
if bad:raise SystemExit(f"INVALID JS count: {bad}")
print("PASS: all inline JavaScript syntax checks")
