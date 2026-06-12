import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/2_stadiul_actual_si_analiza_tehnologiilor.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L8 — pereche de pauze -> paranteză aside
    (r'Mesajele se publică pe „topice” — șiruri ierarhice de forma \texttt{homeforge/devices/AABBCCDDEEFF/state} — iar brokerul rutează',
     r'Mesajele se publică pe „topice” (șiruri ierarhice de forma \texttt{homeforge/devices/AABBCCDDEEFF/state}), iar brokerul rutează'),
    # L10 — pereche de pauze -> paranteză
    (r'principalelor protocoale de mesagerie pentru IoT — MQTT, CoAP, AMQP și HTTP — arată că',
     r'principalelor protocoale de mesagerie pentru IoT (MQTT, CoAP, AMQP și HTTP) arată că'),
    # L21 — pauză -> două puncte
    (r'\item MQTT pentru comunicația cu dispozitivele fizice — telemetrie și comenzi, în timp real;',
     r'\item MQTT pentru comunicația cu dispozitivele fizice: telemetrie și comenzi, în timp real;'),
    # L22 — en-dash browser--backend + pauză -> reformulare
    (r'\item HTTP/REST pentru interacțiunea browser--backend — fetch-ul listei de dispozitive, login, profil, layout-ul dashboard-ului.',
     r'\item HTTP/REST pentru interacțiunea dintre browser și backend: preluarea listei de dispozitive, autentificarea, profilul și layout-ul dashboard-ului.'),
    # L53 — pauză -> două puncte
    (r'\item zero magie ascunsă — fiecare endpoint este vizibil în \texttt{urls.py};',
     r'\item zero magie ascunsă: fiecare endpoint este vizibil în \texttt{urls.py};'),
    # L58 — filler "Cu alte cuvinte"
    (r'Cu alte cuvinte, HomeForge nu intră în competiție cu Home Assistant pe terenul lui.',
     r'Prin urmare, HomeForge nu intră în competiție cu Home Assistant pe terenul lui.'),
    # L84 — pauză -> două puncte
    (r'am folosit Mosquitto — open-source, standardizat OASIS, suficient de ușor încât poate rula',
     r'am folosit Mosquitto: open-source, standardizat OASIS și suficient de ușor încât poate rula'),
    # L86 — pauză -> virgulă
    (r'în cadrul comenzii \texttt{mqtt\_listener} — un dispozitiv care nu a publicat în ultimele 30 de secunde este marcat ca \texttt{offline}.',
     r'în cadrul comenzii \texttt{mqtt\_listener}, care marchează drept \texttt{offline} orice dispozitiv ce nu a mai publicat în ultimele 30 de secunde.'),
    # L89 — pauză -> punct (frază nouă)
    (r'și un sistem de bundling deja optimizat — la combinarea celor două, ecuația practică e că obțin un timp scurt până la prima interacțiune fără să configurez manual Webpack sau alte unelte de build.',
     r'și un sistem de bundling deja optimizat. În practică, cele două combinate oferă un timp scurt până la prima interacțiune, fără să configurez manual Webpack sau alte unelte de build.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:70])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 2 OK; em-dash ramase:', c.count('—'), '; browser--backend:', c.count('browser--backend'))
