import io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Fixeaza figurile si tabelele exact la locul lor: orice plasare -> [H]
pat_spec = re.compile(r'\\begin\{(figure|table)\}\[[^\]]*\]')
pat_nospec = re.compile(r'\\begin\{(figure|table)\}(?!\[)')

files = glob.glob('capitole/*.tex') + ['capitole/00_config_resurse.tex']
files = sorted(set(files))
tot = 0
for f in files:
    c = open(f, encoding='utf-8').read()
    n1 = len(pat_spec.findall(c))
    n2 = len(pat_nospec.findall(c))
    c = pat_spec.sub(r'\\begin{\1}[H]', c)
    c = pat_nospec.sub(r'\\begin{\1}[H]', c)
    if n1 + n2:
        open(f, 'w', encoding='utf-8').write(c)
        print('%-45s figuri/tabele fixate: %d' % (f.split('/')[-1], n1 + n2))
    tot += n1 + n2
print('--- total fixate la [H]:', tot)
