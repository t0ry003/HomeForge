"""Measure line counts of minted code blocks in chapters."""
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATTERN = re.compile(
    r'\\begin\{minted\}\{[^}]+\}\s*\n(.*?)\\end\{minted\}',
    re.DOTALL,
)

for path in [
    'capitole/3_arhitectura_sistemului_homeforge.tex',
    'capitole/4_frontend.tex',
    'capitole/5_firmware_esp32.tex',
    'capitole/6_deployment_testare.tex',
]:
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()
    print(f'\n=== {path} ===')
    blocks = list(PATTERN.finditer(text))
    blocks.sort(key=lambda m: -m.group(1).count('\n'))
    for i, m in enumerate(blocks):
        body = m.group(1)
        lines = body.count('\n')
        start = max(0, m.start() - 100)
        ctx_line = text[start:m.start()].split('\n')[-1].strip()[:80]
        print(f'  {lines:3d} lines | ctx: ...{ctx_line}')
