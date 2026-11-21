#!/usr/bin/env python3
"""Patch only the Cash Summary Departments tab on the verified 10.0.8 UI.

Never edit existing release HTML, clinical business logic, or desktop updater.
The manifest and new HTML are committed together by the GitHub Action.
"""
from pathlib import Path
from html.parser import HTMLParser
import hashlib, json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'medilabx-ui-10.0.8' / 'MediLabX.html'
TARGET = ROOT / 'medilabx-ui-10.0.9' / 'MediLabX.html'
MANIFEST = ROOT / 'm' / 'update.json'
PREV_HASH = 'ea68d2a9be53e307db3a58d1904af7bb4550fad6aff3302fd4e8ad90cf7f88f7'
OLD_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.8/MediLabX.html'
NEW_URL = 'https://raw.githubusercontent.com/taha-waleed/adc-software-updates/main/medilabx-ui-10.0.9/MediLabX.html'

OLD = ('<div class="mlx-switch" role="group" aria-label="Cash summary categories">'
       '<button class="is-on" data-mlx-chart-mode="departments" type="button">Departments</button>'
       '<button data-mlx-chart-mode="modalities" type="button">CT / X-Ray / USG</button></div>')
NEW = ('<div class="mlx-switch" role="group" aria-label="Cash summary category">'
       '<button class="is-on" data-mlx-chart-mode="modalities" type="button">CT / X-Ray / USG</button></div>')

def digest(b): return hashlib.sha256(b).hexdigest()

def publish():
    manifest = json.loads(MANIFEST.read_text('utf-8'))
    if manifest.get('version') == '10.0.9':
        assert manifest.get('htmlUrl') == NEW_URL and TARGET.exists() and digest(TARGET.read_bytes()) == manifest.get('sha256'), 'Version 10.0.9 already exists but differs'
        print('PASS: existing 10.0.9 validated; no modifications required')
        return
    if (manifest.get('version'), manifest.get('htmlUrl'), manifest.get('sha256')) != ('10.0.8', OLD_URL, PREV_HASH):
        raise RuntimeError('Unexpected live update channel. Refusing to publish.')
    source = SOURCE.read_bytes()
    if digest(source) != PREV_HASH:
        raise RuntimeError('Source 10.0.8 HTML checksum mismatch. Aborting.')
    old, new = OLD.encode('utf-8'), NEW.encode('utf-8')
    if source.count(old) != 1:
        raise RuntimeError('Expected a single Departments control in Cash Summary. Aborting.')
    result = source.replace(old, new, 1)
    if result.replace(new, old, 1) != source:
        raise RuntimeError('Change was not reversible; some other code was changed.')
    if result.count(b'data-mlx-chart-mode="departments"') != 0:
        raise RuntimeError('Unexpected secondary Departments button remains.')
    for required in (b'data-mlx-chart-mode="modalities"', b'data-mlx-chart-metric="received"', b'data-mlx-chart-metric="visits"', b'data-mlx-chart-period="today"', b'data-mlx-chart-period="week"', b'data-mlx-chart-period="month"', b'id="mlxCashBars"'):
        if required not in result:
            raise RuntimeError('Existing Cash Summary control missing: ' + required.decode())
    if result.count(b'<button class="is-on" data-mlx-chart-mode="modalities" type="button">') != 1:
        raise RuntimeError('Modality button was duplicated.')
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    if TARGET.exists() and TARGET.read_bytes() != result:
        raise RuntimeError('Target version already exists with different contents; not overwriting.')
    if not TARGET.exists(): TARGET.write_bytes(result)
    manifest.update(version='10.0.9', htmlUrl=NEW_URL, sha256=digest(result))
    manifest['notes'] = [
        'Cash Summary chart: removed Departments toggle; CT / X-Ray / USG is now the only chart category view.',
        'Received Rs / Examinations and Today / 7 Days / Month controls remain available.',
        'All source code except the single Cash Summary mode-control markup is byte-for-byte preserved.',
        'Existing patient records, historical earnings, rate list, test analytics, Fish Tank and native updater remain unchanged.'
    ]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('PASS: 10.0.8 source SHA-256', digest(source))
    print('PASS: 10.0.9 generated HTML SHA-256', digest(result))
    print('PASS: only Departments toggle removed; other chart controls and application code unchanged')
    print('PASS: GitHub update manifest generated for version 10.0.9')

if __name__ == '__main__': publish()