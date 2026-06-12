import io, sys, re, glob, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def imgs_exist(name):
    # incearca extensiile uzuale daca nu are extensie
    base = name
    cand = [base]
    if not os.path.splitext(base)[1]:
        cand = [base + e for e in ['.pdf', '.png', '.jpg', '.jpeg']]
    for c in cand:
        if os.path.exists(c):
            return c
    return None

total_fig = 0
total_missing = 0
for f in sorted(glob.glob('capitole/*.tex')):
    t = open(f, encoding='utf-8').read()
    blocks = list(re.finditer(r'\\begin\{figure\}(\[[^\]]*\])?(.*?)\\end\{figure\}', t, re.S))
    if not blocks:
        continue
    print('\n=== %s (%d figuri) ===' % (f.split('/')[-1], len(blocks)))
    for m in blocks:
        total_fig += 1
        spec = m.group(1) or '(fara)'
        body = m.group(2)
        lab = re.search(r'\\label\{([^}]*)\}', body)
        label = lab.group(1) if lab else '?'
        imgs = re.findall(r'\\includegraphics(?:\[[^\]]*\])?\{([^}]*)\}', body)
        # IfFileExists placeholders
        iffe = re.findall(r'\\IfFileExists\{([^}]*)\}', body)
        status = []
        for im in imgs:
            ex = imgs_exist(im)
            if not ex:
                status.append('LIPSA:' + im); total_missing += 1
            else:
                status.append('ok')
        for im in iffe:
            ex = imgs_exist(im)
            status.append(('IFFE-ok:' if ex else 'IFFE-LIPSA:') + im)
            if not ex: total_missing += 1
        print('  %-22s %-8s imgs=%d  %s' % (label, spec, len(imgs), '; '.join(status) if status else '(fara imagine)'))

print('\n--- TOTAL figuri: %d ; imagini lipsa: %d ---' % (total_fig, total_missing))
