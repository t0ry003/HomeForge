import io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
for f in sorted(glob.glob('capitole/*.tex')):
    t = open(f, encoding='utf-8').read()
    for m in re.finditer(r'\\begin\{table\}.*?\\end\{table\}', t, re.S):
        blk = m.group(0)
        cap = blk.find('\\caption')
        tab = blk.find('\\begin{tabular}')
        lab = re.search(r'\\label\{([^}]*)\}', blk)
        name = lab.group(1) if lab else '?'
        if cap >= 0 and tab >= 0:
            poz = 'SUB tabel (OK)' if cap > tab else 'DEASUPRA (trebuie mutat sub)'
            print(f.split('/')[-1], '|', name, '->', poz)
