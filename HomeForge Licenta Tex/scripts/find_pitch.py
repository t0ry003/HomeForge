"""Scan chapters for pitch-y / non-academic phrasings."""
import re
import glob
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATTERNS = [
    r'\bÎn loc s[ăa]\b',
    r'\bvreau\b',
    r'\baleg s[ăa]\b',
    r'\bp[ăa]strez \w+\b',
    r'\bcutie neagr[ăa]\b',
    r'\bde neprețuit\b',
    r'\bexact ce\b',
    r'\bpur și simplu\b',
    r'\binten[țt]ionat \w+\b',
    r'\bo punte\b',
    r'\bo iluzie\b',
    r'\bmagic\w*\b',
    r'\bidee\s*[a-zăâîșț]*\s+central[ăa]\b',
    r'\bpartea cea mai\b',
    r'\bdincolo de\b',
    r'\bnu este accidentală?\b',
    r'\bdetaliu\s+frumos\b',
    r'\bcheia\b',
    r'\baspect important\b',
    r'\bcer\w+ explicit\w*\b',
    r'\beste pragmatic\b',
    r'\bpragmatic\w*\b',
    r'\bsimplu spus\b',
    r'\bcetățean de prim[ăa] clas[ăa]\b',
    r'\bunor lucruri\b',
    r'\bcap\w* de adevăr\b',
]

for path in sorted(glob.glob('capitole/[1-7]*.tex')):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    matches = []
    for p in PATTERNS:
        for m in re.finditer(p, text, re.IGNORECASE):
            line_start = text.rfind('\n', 0, m.start()) + 1
            line_end = text.find('\n', m.end())
            ln = text[:m.start()].count('\n') + 1
            ctx = text[line_start:line_end if line_end != -1 else len(text)]
            matches.append((ln, m.group(), ctx[:160]))
    if matches:
        print(f'\n=== {path} ===')
        for ln, m, ctx in matches[:20]:
            print(f'  L{ln} [{m}]: {ctx[:140]}')
