import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/6_deployment_testare.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L4 monstrul de ~70 cuvinte -> lead scurt + 3 fraze (Primul/Al doilea/Al treilea) + split final
    ('Pentru fluxul de zi cu zi, HomeForge poate fi pornit în trei moduri, toate incluse explicit în repository: un mod \\emph{nativ} pentru dezvoltare locală (scriptul \\texttt{dev.sh}, fără containere), un mod \\emph{containerizat de dezvoltare} (Docker Compose cu bridge networking, potrivit pentru Docker Desktop pe Windows sau macOS) și un mod \\emph{containerizat de producție} (Docker Compose cu \\texttt{network\\_mode: host}, gândit pentru un host Linux nativ pe care se află și dispozitivele, tipic un Raspberry Pi 4 în aceeași rețea cu plăcile ESP32). Distincția între ultimele două nu este cosmetică: ea afectează direct dacă mecanismul de descoperire mDNS descris în Capitolul 5 poate sau nu să ajungă la dispozitive.',
     'Pentru fluxul de zi cu zi, HomeForge poate fi pornit în trei moduri, toate incluse explicit în repository. Primul este un mod \\emph{nativ} pentru dezvoltare locală (scriptul \\texttt{dev.sh}, fără containere). Al doilea este un mod \\emph{containerizat de dezvoltare} (Docker Compose cu bridge networking, potrivit pentru Docker Desktop pe Windows sau macOS). Al treilea este un mod \\emph{containerizat de producție} (Docker Compose cu \\texttt{network\\_mode: host}, gândit pentru un host Linux nativ pe care se află și dispozitivele, tipic un Raspberry Pi 4 în aceeași rețea cu plăcile ESP32). Distincția dintre ultimele două nu este cosmetică. Ea decide dacă mecanismul de descoperire mDNS descris în Capitolul 5 ajunge sau nu la dispozitive.'),
    # L21 monstrul VM de ~50 cuvinte
    ('Mai întâi, este singurul mod care funcționează corect pe aceste sisteme: Docker Desktop rulează containerele într-o mașină virtuală Linux dedicată, iar \\texttt{network\\_mode: host} se referă acolo la interfața de loopback a VM-ului (\\texttt{192.168.65.x} sau \\texttt{172.x.x.x}), nu la rețeaua fizică a gazdei Windows/macOS.',
     'Mai întâi, este singurul mod care funcționează corect pe aceste sisteme. Docker Desktop rulează containerele într-o mașină virtuală Linux dedicată, iar \\texttt{network\\_mode: host} se referă acolo la interfața de loopback a VM-ului (\\texttt{192.168.65.x} sau \\texttt{172.x.x.x}), nu la rețeaua fizică a gazdei Windows/macOS.'),
    # L37 split la ";" + vârf scurt
    ('Tranziția între cele două moduri se reduce strict la prezența sau absența fișierului overlay în comanda \\texttt{docker compose}; nicio reconstruire a imaginilor nu este necesară.',
     'Tranziția între cele două moduri se reduce strict la prezența sau absența fișierului overlay în comanda \\texttt{docker compose}. Nu e nevoie de nicio reconstruire a imaginilor.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 6 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
