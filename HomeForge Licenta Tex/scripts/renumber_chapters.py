import io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ---------- Partea A: Introducere + Concluzii nenumerotate ----------
def destarize(path):
    c = open(path, encoding='utf-8').read()
    # \chapter{T} -> \chapter*{T} + TOC
    def chap(m):
        t = m.group(1)
        return '\\chapter*{%s}\n\\addcontentsline{toc}{chapter}{%s}' % (t, t)
    c = re.sub(r'\\chapter\{([^}]*)\}', chap, c)
    # \subsection{T} -> \subsection*{T} + TOC (intai subsection, ca sa nu fie prins de section)
    def sub(m):
        t = m.group(1)
        return '\\subsection*{%s}\\phantomsection\\addcontentsline{toc}{subsection}{%s}' % (t, t)
    c = re.sub(r'\\subsection\{([^}]*)\}', sub, c)
    # \section{T} -> \section*{T} + TOC
    def sec(m):
        t = m.group(1)
        return '\\section*{%s}\\phantomsection\\addcontentsline{toc}{section}{%s}' % (t, t)
    c = re.sub(r'\\section\{([^}]*)\}', sec, c)
    open(path, 'w', encoding='utf-8').write(c)
    print('Nenumerotat:', path.split('/')[-1])

destarize('capitole/1_introducere.tex')
destarize('capitole/7_concluzii.tex')

# ---------- Partea B: reformulari explicite (inainte de decalare) ----------
# Structura lucrarii (intro): elimina referinta "Capitolul 7"
p1 = 'capitole/1_introducere.tex'
c1 = open(p1, encoding='utf-8').read()
old_item = r'\item Capitolul 7 conține concluziile și direcții viitoare de dezvoltare.'
new_item = r'\item Concluziile rezumă rezultatele obținute și schițează direcții viitoare de dezvoltare.'
assert old_item in c1, 'item Cap7 negasit'
c1 = c1.replace(old_item, new_item)
open(p1, 'w', encoding='utf-8').write(c1)

# ---------- Partea C: decalarea referintelor "Capitolul N" in toate capitolele ----------
# Ordine: intai 1->Introducere si 7->Concluzii, apoi 2..6 crescator (fara cascada).
remap_seq = [
    ('Capitolul 1', 'Introducere'),   # ref. la introducere (ex. concluzii)
    ('Capitolul 2', 'Capitolul 1'),
    ('Capitolul 3', 'Capitolul 2'),
    ('Capitolul 4', 'Capitolul 3'),
    ('Capitolul 5', 'Capitolul 4'),
    ('Capitolul 6', 'Capitolul 5'),
]
tot = 0
for f in sorted(glob.glob('capitole/*.tex')):
    c = open(f, encoding='utf-8').read()
    n0 = sum(c.count(a) for a, _ in remap_seq)
    for a, b in remap_seq:
        c = c.replace(a, b)
    open(f, 'w', encoding='utf-8').write(c)
    tot += n0
print('Referinte capitole decalate (aproximativ):', tot)
print('Gata renumerotare.')
