import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/1_introducere.tex'
c = open(p, encoding='utf-8').read()

reps = [
    (r'\texttt{homeforge/devices/\{MAC\}/state} și — pentru dispozitivele cu actuator — se abonează',
     r'\texttt{homeforge/devices/\{MAC\}/state} și, pentru dispozitivele cu actuator, se abonează'),
    (r'plus tipuri rezervate pentru extensii ulterioare — mișcare, lumină, CO\textsubscript{2})',
     r'plus tipuri rezervate pentru extensii ulterioare: mișcare, lumină și CO\textsubscript{2})'),
    (r'una pentru dezvoltare (bridge networking, porturi mapate explicit — Docker Desktop pe Windows/macOS)',
     r'una pentru dezvoltare (bridge networking, cu porturi mapate explicit, pentru Docker Desktop pe Windows/macOS)'),
    (r'Pentru un utilizator final orientat exclusiv către funcționalitate, aceasta reprezintă o alegere solidă.',
     r'Pentru un utilizator final orientat exclusiv către funcționalitate, aceasta este o alegere solidă.'),
    (r'Această observație constituie punctul de pornire al proiectului HomeForge.',
     r'Această observație este punctul de pornire al proiectului HomeForge.'),
]
for a, b in reps:
    if a not in c:
        print('NOT FOUND:', a[:70]); sys.exit(1)
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 1 OK; em-dash ramase:', c.count('—'))
