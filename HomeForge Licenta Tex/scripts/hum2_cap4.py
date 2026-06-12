import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/4_frontend.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L65 — vârf scurt + tranzitie spre cele trei paragrafe
    ('ci o stivă compusă din trei nivele, fiecare cu un rol bine definit.',
     'ci o stivă compusă din trei nivele, fiecare cu un rol bine definit. Le iau pe rând.'),
    # L228 — split + scot copula "facilitează"
    ('Alegerea de a nu folosi TypeScript pentru acest modul a fost deliberată: păstrează codul la nivelul unui apel \\texttt{fetch} standard și facilitează parcurgerea sa de către cititori familiarizați cu API-ul \\texttt{fetch} al browserelor.',
     'Alegerea de a nu folosi TypeScript aici a fost deliberată. Codul rămâne la nivelul unui apel \\texttt{fetch} standard, ușor de urmărit de oricine cunoaște API-ul \\texttt{fetch} al browserelor.'),
    # L266 — frază de ~40 cuvinte -> 3 fraze
    ('Două decizii de configurare merită evidențiate: lista de dispozitive folosește \\texttt{refetchInterval: 3000} (polling la 3 secunde, înlocuind o eventuală conexiune WebSocket), iar contorul de notificări necitite folosește \\texttt{refetchInterval: 30000} (30 de secunde, suficient pentru un badge fără a încărca inutil backend-ul).',
     'Două decizii de configurare merită evidențiate. Lista de dispozitive folosește \\texttt{refetchInterval: 3000}, adică polling la 3 secunde, în locul unei conexiuni WebSocket. Contorul de notificări necitite folosește \\texttt{refetchInterval: 30000}, adică 30 de secunde: suficient pentru un badge, fără a încărca inutil backend-ul.'),
    # L334 — split, vârf scurt
    ('Componenta \\texttt{SmartDeviceCard} este probabil cea mai densă din întregul frontend, fiindcă rezolvă în același loc trei probleme dificile: randarea dinamică a unui număr variabil de widget-uri, optimistic UI și combaterea \\textit{glitch}-urilor de stare la apăsări rapide.',
     'Componenta \\texttt{SmartDeviceCard} este probabil cea mai densă din întregul frontend. Rezolvă în același loc trei probleme grele: randarea dinamică a unui număr variabil de widget-uri, optimistic UI și combaterea \\textit{glitch}-urilor de stare la apăsări rapide.'),
    # L415 — split ~45 cuvinte + fix typo nepoluate->nepopulate
    ('Indicatorii cumulativi (energie produsă astăzi / anul curent / total) au fost eliminați din varianta curentă, deoarece valorile primite de la API-ul Fronius pe modele GEN24 s-au dovedit nepoluate (frecvent \\texttt{null} sau resetate la zero); rămânerea exclusiv la valorile instantanee asigură consistența indiferent de modelul de invertor.',
     'Indicatorii cumulativi (energie produsă astăzi / anul curent / total) au fost eliminați din varianta curentă. Valorile primite de la API-ul Fronius pe modele GEN24 s-au dovedit nepopulate, frecvent \\texttt{null} sau resetate la zero. Rămânerea exclusiv la valorile instantanee asigură consistența indiferent de modelul de invertor.'),
    # L533 — split lead + scot copula "reprezintă"
    ('Adăugarea unui dispozitiv reprezintă una dintre cele mai frecvente acțiuni efectuate de utilizator, motiv pentru care a fost implementată sub forma unui dialog multi-pas: \\texttt{AddDeviceDialog.tsx}.',
     'Adăugarea unui dispozitiv este una dintre cele mai frecvente acțiuni ale utilizatorului. De aceea am implementat-o ca dialog multi-pas: \\texttt{AddDeviceDialog.tsx}.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 4 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
