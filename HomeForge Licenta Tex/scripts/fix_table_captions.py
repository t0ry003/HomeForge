import io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def find_balanced(s, start):
    # start points at the '{' after \caption; return index after matching '}'
    depth = 0
    i = start
    while i < len(s):
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return -1

def move_caption(block):
    # extrage \caption{...} (cu acolade echilibrate) + \label{...} urmator
    m = re.search(r'\\caption\s*', block)
    if not m:
        return block, False
    br = block.index('{', m.start())
    end = find_balanced(block, br)
    caption = block[m.start():end]
    rest = block[end:]
    # \vspace optional imediat dupa caption (ex. cap 2)
    vm = re.match(r'\s*\\vspace\{[^}]*\}', rest)
    vspace = ''
    if vm:
        vspace = vm.group(0).strip()
        rest = rest[vm.end():]
    # \label imediat dupa
    lm = re.match(r'\s*\\label\{[^}]*\}', rest)
    label = ''
    if lm:
        label = lm.group(0).strip()
        rest = rest[lm.end():]
    # block fara caption/label
    newblock = block[:m.start()] + rest.lstrip('\n')
    # construieste blocul de mutat
    moved = '    ' + caption
    if label:
        moved += '\n    ' + label
    # insereaza inainte de \end{table}, dupa \end{tabular}
    idx = newblock.rfind('\\end{tabular}')
    after = newblock.index('\n', idx) if '\n' in newblock[idx:] else len(newblock)
    # gaseste pozitia lui \end{table}
    et = newblock.rfind('\\end{table}')
    newblock = newblock[:et] + moved + '\n' + newblock[et:]
    return newblock, True

for f in sorted(glob.glob('capitole/*.tex')):
    t = open(f, encoding='utf-8').read()
    out = []
    last = 0
    changed = False
    for m in re.finditer(r'\\begin\{table\}.*?\\end\{table\}', t, re.S):
        blk = m.group(0)
        # doar daca \caption e inainte de \begin{tabular}
        cap = blk.find('\\caption')
        tab = blk.find('\\begin{tabular}')
        out.append(t[last:m.start()])
        if cap >= 0 and tab >= 0 and cap < tab:
            nb, ok = move_caption(blk)
            out.append(nb)
            changed = changed or ok
        else:
            out.append(blk)
        last = m.end()
    out.append(t[last:])
    if changed:
        open(f, 'w', encoding='utf-8').write(''.join(out))
        print('Actualizat:', f.split('/')[-1])
print('Gata.')
