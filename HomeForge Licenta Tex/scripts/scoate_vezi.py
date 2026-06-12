import io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Scoatem doar parantezele "(vezi ...)" care trimit la un FISIER sau la un CAPITOL.
# Pastram cele care trimit la sectiuni / "mai sus".
EXT = ('.py', '.tsx', '.ts', '.js', '.json')

def qualifies(inner):
    if 'Capitolul' in inner:
        return True
    if any(e in inner for e in EXT):
        return True
    return False

pat = re.compile(r' ?\(vezi[^)]*\)')

total = 0
for f in sorted(glob.glob('capitole/*.tex')):
    c = open(f, encoding='utf-8').read()
    removed = []
    def repl(m):
        inner = m.group(0)
        if qualifies(inner):
            removed.append(inner.strip())
            return ''
        return inner
    c2 = pat.sub(repl, c)
    if removed:
        open(f, 'w', encoding='utf-8').write(c2)
        total += len(removed)
        print('--- %s (%d) ---' % (f.split('/')[-1], len(removed)))
        for r in removed:
            print('   scos:', r)
print('\nTotal referinte scoase:', total)
