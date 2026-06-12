import io, sys, glob, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Inlocuim caracterele non-ASCII decorative (din comentarii) care nu pot fi redate
# de pdfLaTeX + Computer Modern in blocurile minted. Pastram diacriticele romanesti.
KEEP = set('ăâîșțĂÂÎȘȚ')  # diacritice romanesti (suportate)
UNI = {
    '─': '-', '│': '|', '└': '-', '├': '-', '┐': '-',
    '┌': '-', '┘': '-', '┤': '-', '┼': '+', '═': '=',
    '•': '*', '‣': '*', '●': '*', '▪': '*', '·': '.',
    '→': '->', '←': '<-', '↔': '<->', '⇒': '=>',
    '—': '--', '–': '-', '−': '-',
    '‘': "'", '’': "'", '‚': "'", '“': '"', '”': '"', '„': '"',
    '…': '...', '°': ' deg', '×': 'x', '÷': '/',
    '✓': '[x]', '✗': '[ ]', '✔': '[x]', '✘': '[ ]',
    '≥': '>=', '≤': '<=', '≈': '~=', '≠': '!=',
    ' ': ' ', ' ': ' ', '​': '', '﻿': '',
    'é': 'e', 'ü': 'u', 'ö': 'o',  # nume autori in comentarii
}

for f in glob.glob('cod/*.py') + glob.glob('cod/*.js') + glob.glob('cod/*.ts') + glob.glob('cod/*.tsx'):
    t = open(f, encoding='utf-8').read()
    orig = t
    for k, v in UNI.items():
        t = t.replace(k, v)
    # orice alt non-ASCII ramas care NU e diacritica romaneasca -> aproximare ASCII
    rest = sorted(set(c for c in t if ord(c) > 127 and c not in KEEP))
    for c in rest:
        repl = unicodedata.normalize('NFKD', c).encode('ascii', 'ignore').decode() or '?'
        t = t.replace(c, repl)
    if t != orig:
        open(f, 'w', encoding='utf-8', newline='\n').write(t)
        ramase = sorted(set(c for c in t if ord(c) > 127 and c not in KEEP))
        print('%-26s sanitizat; non-ASCII ramase (doar diacritice ok):' % f.split('/')[-1],
              sorted(set(c for c in t if ord(c) > 127)))
    else:
        print('%-26s curat (nimic de schimbat)' % f.split('/')[-1])
