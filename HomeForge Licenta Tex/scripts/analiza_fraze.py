import io, sys, re, math, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def extrage_proza(txt):
    # scoate blocurile de cod minted
    txt = re.sub(r'\\begin\{minted\}.*?\\end\{minted\}', ' ', txt, flags=re.S)
    # scoate medii figure/table/tabular (pastram doar proza)
    txt = re.sub(r'\\begin\{(figure|table|tabular|subfigure)\}.*?\\end\{\1\}', ' ', txt, flags=re.S)
    # scoate liniile de comentariu
    txt = '\n'.join(l for l in txt.splitlines() if not l.lstrip().startswith('%'))
    # scoate titluri de sectiune (nu sunt fraze)
    txt = re.sub(r'\\(chapter|section|subsection|subsubsection|paragraph|caption|label|cite|ref|begin|end|item|newcommand|includegraphics)\b\*?(\[[^\]]*\])?(\{[^}]*\})?', ' ', txt)
    # pastram continutul comenzilor inline de formatare
    for _ in range(3):
        txt = re.sub(r'\\(emph|textit|textbf|texttt|textsubscript|textsc)\{([^{}]*)\}', r'\2', txt)
    # scoate restul comenzilor \cmd{...} si \cmd
    txt = re.sub(r'\\[a-zA-Z@]+\*?(\{[^{}]*\})?', ' ', txt)
    txt = txt.replace('{', ' ').replace('}', ' ').replace('\\', ' ')
    txt = txt.replace('$', ' ').replace('~', ' ')
    return txt

def split_fraze(txt):
    # protejeaza abrevieri si numere zecimale
    txt = re.sub(r'(\d)\.(\d)', r'\1@\2', txt)
    for ab in ['etc.', 'Fig.', 'ex.', 'cf.', 'nr.', 'vs.', 'V1.', 'No.', 'pp.', 'v.']:
        txt = txt.replace(ab, ab.replace('.', '@'))
    bucati = re.split(r'[.!?]+(?=\s|$)', txt)
    fraze = []
    for b in bucati:
        b = b.replace('@', '.').strip()
        cuv = [w for w in re.split(r'\s+', b) if re.search(r'[A-Za-zĂÂÎȘȚăâîșț0-9]', w)]
        if len(cuv) >= 2:
            fraze.append(len(cuv))
    return fraze

def stats(fr):
    n = len(fr)
    m = sum(fr)/n
    sd = math.sqrt(sum((x-m)**2 for x in fr)/n)
    cv = sd/m
    scurte = sum(1 for x in fr if x <= 8)
    medii = sum(1 for x in fr if 9 <= x <= 25)
    lungi = sum(1 for x in fr if x > 25)
    return n, m, sd, cv, scurte, medii, lungi, max(fr), min(fr)

print(f"{'capitol':42} {'fraze':>5} {'medie':>6} {'sd':>5} {'CV':>5} {'<=8':>4} {'9-25':>5} {'>25':>4} {'max':>4}")
print('-'*90)
total = []
for f in sorted(glob.glob('capitole/*.tex')):
    txt = open(f, encoding='utf-8').read()
    fr = split_fraze(extrage_proza(txt))
    if len(fr) < 5:
        continue
    total += fr
    n, m, sd, cv, sc, me, lu, mx, mn = stats(fr)
    nume = f.replace('capitole/', '').replace('.tex', '')
    flag = '  <-- PREA UNIFORM' if cv < 0.45 else ''
    print(f"{nume:42} {n:5d} {m:6.1f} {sd:5.1f} {cv:5.2f} {sc:4d} {me:5d} {lu:4d} {mx:4d}{flag}")
print('-'*90)
n, m, sd, cv, sc, me, lu, mx, mn = stats(total)
print(f"{'TOTAL':42} {n:5d} {m:6.1f} {sd:5.1f} {cv:5.2f} {sc:4d} {me:5d} {lu:4d} {mx:4d}")
print()
print("Reper: text uman variat are CV (sd/medie) ~0.5-0.7 si un mix sanatos de fraze scurte (<=8 cuvinte).")
print("Procent fraze scurte total:", f"{100*sc/n:.0f}%", "| lungi (>25):", f"{100*lu/n:.0f}%")
