"""Scan chapters for AI-cliché-ish patterns and report counts per file."""
import re
import glob
import collections
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATTERNS = [
    # Generic AI clichés in Romanian
    r'\bîn esență\b',
    r'\bînainte de toate\b',
    r'\bdincolo de aceasta\b',
    r'\bcu alte cuvinte\b',
    r'\bmerită (menționat|evidențiat|subliniat)\b',
    r'\bîn mod (semnificativ|considerabil|surprinzător|interesant)\b',
    r'\b(este|sunt) (foarte|extrem) de \w+',
    r'\bîn primul rând\b',
    r'\bcu certitudine\b',
    # Common transition starts (often overused in AI)
    r'\bAstfel,\s',
    r'\bAșadar,\s',
    r'\bPrin urmare,\s',
    r'\bDe asemenea,\s',
    r'\bÎn plus,\s',
    r'\bPe de altă parte,\s',
    # Bombastic / corporate adjectives
    r'\brobust\w*\b',
    r'\bcrucial\w*\b',
    r'\bcomprehensiv\w*\b',
    r'\boptim(?:al)?\b',
    r'\bvital\w*\b',
    # Verb-heavy "oferă/permite/asigură" patterns (AI loves these)
    r'\boferă posibilitatea\b',
    r'\bpermite (utilizatorului|sistemului)\b',
    r'\basigură (că|faptul că|posibilitatea)\b',
]

for path in sorted(glob.glob('capitole/[1-7]*.tex')):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    counts = collections.Counter()
    for pat in PATTERNS:
        n = len(re.findall(pat, text, re.IGNORECASE))
        if n:
            counts[pat] = n
    if counts:
        print(f'\n--- {path} ---')
        for pat, c in counts.most_common():
            print(f'  {c:3d}x  {pat}')
