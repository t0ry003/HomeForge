import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/3_arhitectura_sistemului_homeforge.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L4 ~48 cuvinte -> lead scurt + 2 fraze
    ('Backend-ul HomeForge este un serviciu Django care îndeplinește două roluri simultane: expune un API REST (în accepțiunea originală a lui Fielding, ca stil arhitectural orientat pe resurse, reprezentări și mesaje auto-descriptive \\cite{fielding_rest_dissertation}), consumat de aplicația web Next.js, și rulează în paralel un proces dedicat care ascultă mesajele MQTT publicate de microcontrolere.',
     'Backend-ul HomeForge este un serviciu Django cu două roluri simultane. Expune un API REST (în accepțiunea originală a lui Fielding, ca stil arhitectural orientat pe resurse, reprezentări și mesaje auto-descriptive \\cite{fielding_rest_dissertation}), consumat de aplicația web Next.js. În paralel, rulează un proces dedicat care ascultă mesajele MQTT publicate de microcontrolere.'),
    # L6 ~55 cuvinte -> lead scurt + 2 fraze
    ('O analiză comparativă între REST și stilurile de tip \\emph{big web services} (SOAP, WS-*) arată că REST este indicat pentru scenariile în care clienții au nevoie de un model simplu, \\textit{stateless} și ușor de cache-uit, în timp ce SOAP și WS-* devin relevante doar atunci când sunt necesare mecanisme avansate de transport, precum tranzacțiile distribuite sau mesageria cu garanții formale de livrare \\cite{pautasso_rest_vs_ws}.',
     'O analiză comparativă între REST și stilurile de tip \\emph{big web services} (SOAP, WS-*) arată o delimitare clară. REST este indicat când clienții au nevoie de un model simplu, \\textit{stateless} și ușor de cache-uit. SOAP și WS-* devin relevante doar când sunt necesare mecanisme avansate de transport, precum tranzacțiile distribuite sau mesageria cu garanții formale de livrare \\cite{pautasso_rest_vs_ws}.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 3 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
