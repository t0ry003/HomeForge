"""Extract every minted block from chapter files for source verification."""
import re
import glob
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATTERN = re.compile(
    r'\\begin\{minted\}\{([^}]+)\}\s*\n(.*?)\\end\{minted\}',
    re.DOTALL,
)

for path in sorted(glob.glob('capitole/[1-7]*.tex')):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    blocks = list(PATTERN.finditer(text))
    if not blocks:
        continue
    print(f'\n========================================')
    print(f'FILE: {path}  ({len(blocks)} blocks)')
    print(f'========================================')
    for i, m in enumerate(blocks, 1):
        lang = m.group(1)
        body = m.group(2)
        # Find approximate line number
        line_no = text[:m.start()].count('\n') + 1
        # Show 3 lines of context before
        start = max(0, m.start() - 250)
        ctx = text[start:m.start()].split('\n')[-2:]
        ctx_str = ' '.join(l.strip() for l in ctx)[:160]
        print(f'\n--- Block {i} (line {line_no}, lang={lang}) ---')
        print(f'CONTEXT: ...{ctx_str}')
        print('CODE:')
        for line in body.split('\n'):
            print(f'  {line}')
