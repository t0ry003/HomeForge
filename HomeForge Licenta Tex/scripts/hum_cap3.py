import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/3_arhitectura_sistemului_homeforge.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L4 pereche -> paranteza
    (r'expune un API REST — în accepțiunea originală a lui Fielding, ca stil arhitectural orientat pe resurse, reprezentări și mesaje auto-descriptive \cite{fielding_rest_dissertation} — consumat de aplicația web Next.js și rulează',
     r'expune un API REST (în accepțiunea originală a lui Fielding, ca stil arhitectural orientat pe resurse, reprezentări și mesaje auto-descriptive \cite{fielding_rest_dissertation}), consumat de aplicația web Next.js, și rulează'),
    # L6 en-dash browser--backend / backend--hardware
    (r'Alegerea REST pentru stratul browser--backend și a MQTT pentru stratul backend--hardware este justificată',
     r'Alegerea REST pentru comunicația dintre browser și backend, respectiv a MQTT pentru cea dintre backend și hardware, este justificată'),
    # L6 pauza finala
    (r'nu suportă nativ \textit{push}-ul de la server către client și nici conexiuni persistente — aceste cerințe sunt acoperite de MQTT.',
     r'nu suportă nativ \textit{push}-ul de la server către client și nici conexiuni persistente, iar aceste cerințe sunt acoperite de MQTT.'),
    # L45
    (r'șterge fizic avatarul vechi atunci când se încarcă unul nou — un detaliu mic, dar important pentru a evita acumularea de fișiere orfane.',
     r'șterge fizic avatarul vechi atunci când se încarcă unul nou. Este un detaliu minor, dar util pentru a evita acumularea de fișiere orfane.'),
    # L47
    (r'atunci când baza de date nu conține niciun utilizator — frontend-ul îl folosește pentru a redirecționa primul vizitator către un \textit{setup wizard} (vezi Capitolul 4).',
     r'atunci când baza de date nu conține niciun utilizator. Frontend-ul îl folosește pentru a redirecționa primul vizitator către un \textit{setup wizard} (vezi Capitolul 4).'),
    # L100
    (r'enumerate explicit în \texttt{models.py:163-195} — pe lângă cele interactive',
     r'enumerate explicit în \texttt{models.py:163-195}: pe lângă cele interactive'),
    # L144 pereche
    (r'Specificația oficială a formatului — RFC 7519, publicată de IETF în 2015 — definește un JWT',
     r'Specificația oficială a formatului (RFC 7519, publicată de IETF în 2015) definește un JWT'),
    # L144 pauza finala
    (r'înainte de a reîncerca cererea originală — în cea mai mare parte a timpului, utilizatorul nu observă că token-ul a expirat.',
     r'înainte de a reîncerca cererea originală. În cea mai mare parte a timpului, utilizatorul nu observă că token-ul a expirat.'),
    # L290
    (r'este, de fapt, adresa MAC a dispozitivului — am păstrat numele \texttt{device\_id} din motive istorice, dar identificatorul real în MQTT este MAC-ul.',
     r'este, de fapt, adresa MAC a dispozitivului. Am păstrat numele \texttt{device\_id} din motive istorice, însă identificatorul real în MQTT este adresa MAC.'),
    # L308 pereche
    (r'fișierul conține toate artefactele asociate fiecărui tip direct în interior — cod firmware, text al schemei electrice, documentație Markdown și imagini codificate \texttt{base64} — fără referințe la fișiere externe.',
     r'fișierul conține toate artefactele asociate fiecărui tip direct în interior: cod firmware, text al schemei electrice, documentație Markdown și imagini codificate \texttt{base64}, fără referințe la fișiere externe.'),
    # L316
    (r'(\texttt{MAX\_SIZE = 5 * 1024 * 1024} bytes — 5 MB)',
     r'(\texttt{MAX\_SIZE = 5 * 1024 * 1024} bytes, adică 5 MB)'),
    # L329
    (r"\texttt{REST\_FRAMEWORK['PAGE\_SIZE'] = 50} — paginare implicită",
     r"\texttt{REST\_FRAMEWORK['PAGE\_SIZE'] = 50}: paginare implicită"),
    # L330
    (r'\texttt{TIMEOUT=300} și \texttt{MAX\_ENTRIES=1000} — suficient pentru o instanță locală',
     r'\texttt{TIMEOUT=300} și \texttt{MAX\_ENTRIES=1000}: suficient pentru o instanță locală'),
    # L332
    (r'(prin \texttt{django-cors-headers}) — permisiv pentru un demo',
     r'(prin \texttt{django-cors-headers}): permisiv pentru un demo'),
    # L333
    (r'include \texttt{channels} (Django Channels) — păstrat ca dependență',
     r'include \texttt{channels} (Django Channels): păstrat ca dependență'),
    # L362
    (r'nu se persistă nicio măsurătoare (\texttt{P\_PV}, energie totală, stare de încărcare a bateriei) în baza de date — informația este obținută la fiecare cerere de la sursa originală',
     r'nu se persistă nicio măsurătoare (\texttt{P\_PV}, energie totală, stare de încărcare a bateriei) în baza de date; informația este obținută la fiecare cerere de la sursa originală'),
    # L386
    (r'\texttt{power} cu \texttt{solarW}, \texttt{gridW}, \texttt{loadW}, \texttt{batteryW} — valori instantanee în Watt',
     r'\texttt{power} cu \texttt{solarW}, \texttt{gridW}, \texttt{loadW}, \texttt{batteryW}: valori instantanee în Watt'),
    # L388
    (r'(toate cu \texttt{null} acolo unde furnizorul nu le expune — la modelele Fronius GEN24, de exemplu, contoarele cumulative nu sunt accesibile prin acest endpoint)',
     r'(toate cu \texttt{null} acolo unde furnizorul nu le expune; la modelele Fronius GEN24, de exemplu, contoarele cumulative nu sunt accesibile prin acest endpoint)'),
    # L393
    (r'scurtă (\texttt{OVERVIEW\_CACHE\_TTL = 8} secunde) — necesară pentru a respecta rate-limit-ul Fronius și pentru a deduplica',
     r'scurtă (\texttt{OVERVIEW\_CACHE\_TTL = 8} secunde), necesară pentru a respecta rate-limit-ul Fronius și a deduplica'),
    # L396 pereche
    (r'există o comandă Django dedicată — \texttt{python manage.py poll\_solar --interval 30} — care iterează periodic',
     r'există o comandă Django dedicată, \texttt{python manage.py poll\_solar --interval 30}, care iterează periodic'),
    # L461
    (r'unicitatea \texttt{deviceId}-urilor și — opțional, dacă contextul conține \texttt{user} — existența efectivă a dispozitivelor referite.',
     r'unicitatea \texttt{deviceId}-urilor și, opțional (dacă contextul conține \texttt{user}), existența efectivă a dispozitivelor referite.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 3 OK; em-dash ramase:', c.count('—'), '; browser--backend:', c.count('browser--backend'), '; backend--hardware:', c.count('backend--hardware'))
