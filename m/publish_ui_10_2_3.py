#!/usr/bin/env python3
"""Publish the 10.2.3 visual integration to the existing HTML-only update channel.
Never regenerate patient data, overwrite the Windows installer, or modify the older release.
"""
from pathlib import Path
import hashlib, json, re, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "m" / "update.json"
OLD = ROOT / "medilabx-ui-10.2.2" / "MediLabX.html"
NEW = ROOT / "medilabx-ui-10.2.3" / "MediLabX.html"
OLD_URL = "https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.2/MediLabX.html"
NEW_URL = "https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.2.3/MediLabX.html"
OLD_SHA = "e20a96a2eea98308de37014dbd8d1c50f17d24e8dee6813dfb1a5ff8b47598c4"
REQUIRED = [
 "id=\"patientForm\"", "id=\"savePatient\"", "id=\"pName\"",
 "id=\"pAge\"", "id=\"pGender\"", "id=\"adc85UpdateCentre\"",
 "id=\"adc85CheckUpdates\"", "id=\"adc85UpdateNow\"",
 "id=\"reportPatient\"", "id=\"backupData\"", "id=\"restoreData\"",
 "id=\"adcSettingsList\"", "id=\"adcSettingsViews\"",
 "mlx1022-update-polish-js", "mlx107-fishtank-css",
]
NOTES = [
 "Integrated supplied HTML theme into MediLab X: dark gradient sidebar, rounded cards, Manrope typography, line-style SVG icons and smooth animation.",
 "Matched Settings navigation to the reference design with 280px category rail, scrollable sections, clear headings and matching controls.",
 "Added Light, Dark and Automatic appearance modes, six accent palettes, text sizes, roundness and density preferences.",
 "Added reference-style GitHub update banner linked to the existing real Check for updates and Update Now actions; no demo progress or simulated backups.",
 "Existing patient registration, records, reports, receipts, WhatsApp Desktop, update security, backup, roles, notifications, Now Brief and Fish Tank source handlers preserved.",
 "Only HTML UI layer changed; native Windows installer and clinical local storage schema not changed.",
]

def sha(data):
 return hashlib.sha256(data).hexdigest()

def run():
 manifest = json.loads(MANIFEST.read_text("utf-8"))
 original = OLD.read_bytes()
 updated = NEW.read_bytes()
 if sha(original) != OLD_SHA:
  raise RuntimeError("10.2.2 baseline SHA does not match known live release")
 if len(updated) < len(original) + 10000:
  raise RuntimeError("Proposed 10.2.3 is unexpectedly small")
 baseline = original.decode("utf-8")
 candidate = updated.decode("utf-8")
 suffix = re.search(r"</body>\s*</html>\s*$", baseline, flags=re.I)
 if not suffix or not candidate.startswith(baseline[:suffix.start()]):
  raise RuntimeError("Existing 10.2.2 app implementation has changed; abort")
 if any(key not in candidate for key in REQUIRED):
  raise RuntimeError("A required existing feature was removed")
 if candidate.count('id="mlx1023-reference-theme"') != 1 or candidate.count('id="mlx1023-reference-js"') != 1:
  raise RuntimeError("Missing or duplicated theme add-on")
 addon = re.search(r'<script id="mlx1023-reference-js">([\s\S]*?)</script>',candidate)
 if not addon:
  raise RuntimeError("New theme JavaScript missing")
 js = addon.group(1)
 if any(x in js for x in ["localStorage.clear(", "removeItem('medilab", "function saveDB(", "function loadDB("]):
  raise RuntimeError("New theme tries to mutate the clinical data store")
 with tempfile.TemporaryDirectory() as work:
  file = Path(work) / "theme.js"
  file.write_text(js, encoding="utf-8")
  subprocess.run(["node", "--check", str(file)], check=True)
 digest = sha(updated)
 if manifest.get("version") == "10.2.3":
  if manifest.get("htmlUrl") == NEW_URL and manifest.get("sha256") == digest:
   print("PASS: 10.2.3 manifest already matches the released source", digest)
   return
  raise RuntimeError("10.2.3 manifest exists but does not match HTML")
 if (manifest.get("version"), manifest.get("htmlUrl"), manifest.get("sha256")) != ("10.2.2",OLD_URL,OLD_SHA):
  raise RuntimeError("Live release manifest changed unexpectedly; refusing unsafe overwrite")
 manifest.update(version="10.2.3", htmlUrl=NEW_URL, sha256=digest, notes=NOTES)
 MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
 print("PASS: prior clinical logic preserved byte-for-byte")
 print("PASS: reference visual add-on JavaScript syntax")
 print("PASS: 10.2.3 file bytes", len(updated), "SHA256", digest)
 print("PASS: SHA-256 verified update manifest emitted")

if __name__ == "__main__":
 run()
