"""Compară toate \\ref{} cu \\label{} din capitole, raportează referințele orfane."""
import re
import glob
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ref_re = re.compile(r'\\ref\{([^}]+)\}')
label_re = re.compile(r'\\label\{([^}]+)\}')

refs = {}
labels = set()
for f in glob.glob('capitole/*.tex'):
    with open(f, encoding='utf-8') as fh:
        t = fh.read()
    for m in ref_re.finditer(t):
        refs.setdefault(m.group(1), []).append(f)
    for m in label_re.finditer(t):
        labels.add(m.group(1))

print('=== \\ref fara \\label corespunzator ===')
missing = False
for r, files in refs.items():
    if r not in labels:
        missing = True
        print(f'  {r}  (in {files})')
if not missing:
    print('  (niciunul)')
print(f'\ntotal refs unice: {len(refs)} | total labels: {len(labels)}')
