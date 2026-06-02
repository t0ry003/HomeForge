"""Replace selected 'Astfel,' transitions in chapter 4 to reduce repetition."""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = 'capitole/4_frontend.tex'
with open(path, 'r', encoding='utf-8') as f:
    txt = f.read()

replacements = [
    (
        'Astfel, dacă un utilizator accesează aplicația de pe',
        'Practic, dacă un utilizator accesează aplicația de pe',
    ),
    (
        'PATCH /api/device-order/}. Astfel, preferința',
        'PATCH /api/device-order/}. Preferința',
    ),
    (
        'oprește \\texttt{isRefetching}. Astfel, vizual,',
        'oprește \\texttt{isRefetching}, iar vizual',
    ),
]

n = 0
for old, new in replacements:
    if old in txt:
        txt = txt.replace(old, new)
        n += 1
        print(f'replaced: {old[:70]}...')

with open(path, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f'Total replacements: {n}')
