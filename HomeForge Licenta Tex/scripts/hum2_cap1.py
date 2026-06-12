import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/1_introducere.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L4 — sparg fraza de ~32 cuvinte
    ('O „casă inteligentă” înseamnă, în practică, o rețea de senzori și actuatori conectați la o unitate de control care interpretează datele și execută acțiuni automate sau manuale, declanșate de utilizator.',
     'O „casă inteligentă” înseamnă, în practică, o rețea de senzori și actuatori conectați la o unitate de control. Aceasta interpretează datele și execută acțiuni, fie automate, fie declanșate de utilizator.'),
    # L6 — frază lungă -> scurtă + medie
    ('Acest lucru este relevant pentru tema lucrării de față, fiindcă explică de ce o platformă transparentă, care rulează local și pe care utilizatorul o poate inspecta, are sens chiar și atunci când există alternative comerciale.',
     'Observația contează pentru lucrarea de față. Ea explică de ce o platformă transparentă, locală și inspectabilă de utilizator, are sens chiar și acolo unde există alternative comerciale.'),
    # L8 — frază de ~37 cuvinte
    ('Protocolul MQTT (Message Queuing Telemetry Transport) a devenit standardul \\textit{de facto} pentru schimbul de mesaje între microcontrolere și server, în primul rând datorită overhead-ului redus și a faptului că un singur broker poate distribui eficient mesaje la mulți abonați \\cite{mqtt_standard_iot}.',
     'Protocolul MQTT (Message Queuing Telemetry Transport) a devenit standardul \\textit{de facto} pentru schimbul de mesaje între microcontrolere și server. Două motive cântăresc cel mai mult: overhead-ul redus și faptul că un singur broker poate distribui eficient mesaje la mulți abonați \\cite{mqtt_standard_iot}.'),
    # L18 — frază de ~38 cuvinte
    ('Marea majoritate a produselor de pe piață (Google Nest, Amazon Alexa, Tuya, Sonoff și variațiunile lor) lucrează după un model centrat pe cloud: dispozitivul fizic trimite datele către serverele producătorului, acolo se rulează logica de automatizare și de acolo se trimit comenzile înapoi.',
     'Marea majoritate a produselor de pe piață (Google Nest, Amazon Alexa, Tuya, Sonoff și variațiunile lor) lucrează după un model centrat pe cloud. Dispozitivul fizic trimite datele către serverele producătorului, acolo rulează logica de automatizare, de acolo se întorc comenzile.'),
    # L26 — frază lungă -> scurtă + medie
    ('Răspunsul curent al cercetării și al comunității open-source la aceste limitări este \\textit{Edge Computing}: mutarea logicii și a stocării cât mai aproape de sursa datelor, ideal în rețeaua locală a utilizatorului \\cite{edge_computing_iot_2020}.',
     'Răspunsul cercetării și al comunității open-source la aceste limitări este \\textit{Edge Computing}. Pe scurt: muți logica și stocarea cât mai aproape de sursa datelor, ideal chiar în rețeaua locală a utilizatorului \\cite{edge_computing_iot_2020}.'),
    # L49 — monstrul de ~55 de cuvinte, spart in 3
    ('Pentru a putea integra atâtea categorii de dispozitive, platforma a adoptat un nivel ridicat de abstractizare: orice dispozitiv este modelat ca o „entitate" cu o „stare" discretă, comunicarea internă se realizează printr-o magistrală de evenimente, iar fluxurile concrete de rețea (interlocutori, topice MQTT, structura payload-urilor JSON) sunt acoperite de un strat de interfață grafică.',
     'Pentru a integra atâtea categorii de dispozitive, platforma a adoptat un nivel ridicat de abstractizare. Orice dispozitiv devine o „entitate" cu o „stare" discretă, iar comunicarea internă trece printr-o magistrală de evenimente. Fluxurile concrete de rețea, adică interlocutorii, topicele MQTT și structura payload-urilor JSON, rămân ascunse sub stratul grafic.'),
    # L49 — final de paragraf, punch scurt
    ('Rezultatul este o platformă potrivită pentru consumatorul final, dar opacă pentru cineva interesat de modul de funcționare la nivel inferior.',
     'Rezultatul? O platformă potrivită pentru consumatorul final, dar opacă pentru cineva interesat de funcționarea la nivel inferior.'),
    # L51 — frază -> scurtă + medie (persoana intai, consistent cu restul)
    ('Obiectivul nu a fost replicarea funcționalităților Home Assistant, ci asigurarea transparenței end-to-end a fluxului de date, păstrând în același timp o bază de cod redusă și ușor de parcurs.',
     'Obiectivul nu a fost replicarea funcționalităților Home Assistant. Am urmărit transparența end-to-end a fluxului de date, păstrând în același timp o bază de cod redusă și ușor de parcurs.'),
    # L54 — monstrul de ~52 de cuvinte
    ('Spre deosebire de soluțiile care abstractizează complet stiva tehnologică, platforma menține vizibile componentele subiacente: portul 1883 al brokerului Mosquitto este expus în rețeaua locală, fiecare dispozitiv are un topic MQTT documentat, iar codul backend-ului (Django + Django REST Framework) are o dimensiune care permite parcurgerea integrală a logicii într-un interval de timp rezonabil.',
     'Spre deosebire de soluțiile care abstractizează complet stiva tehnologică, platforma ține componentele la vedere. Portul 1883 al brokerului Mosquitto este expus în rețeaua locală, fiecare dispozitiv are un topic MQTT documentat, iar codul backend-ului (Django cu Django REST Framework) este suficient de mic încât logica să poată fi parcursă integral într-un timp rezonabil.'),
    # L59 — sparg fraza eterogena
    ('Datele raportate de senzori sunt eterogene: un releu transmite o valoare booleană, o stație meteorologică transmite mai mulți parametri de tip \\textit{float}, un termostat raportează simultan temperatura curentă și valoarea de referință.',
     'Datele raportate de senzori sunt eterogene. Un releu transmite o valoare booleană, o stație meteorologică transmite mai mulți parametri de tip \\textit{float}, iar un termostat raportează simultan temperatura curentă și valoarea de referință.'),
    # L59 — spart la ";"
    ('Adăugarea unei coloane SQL distincte pentru fiecare nou câmp ar necesita migrații frecvente; soluția adoptată este stocarea stării într-o coloană JSONB denumită \\texttt{current\\_state} pe modelul \\texttt{Device} (\\texttt{models.py:96}).',
     'O coloană SQL distinctă pentru fiecare câmp nou ar însemna migrații dese. Soluția adoptată: starea se păstrează într-o coloană JSONB denumită \\texttt{current\\_state} pe modelul \\texttt{Device} (\\texttt{models.py:96}).'),
    # L66 — fraza-lista de ~40 cuvinte
    ('Codul este menținut minimalist: backend-ul este o aplicație Django REST Framework standard, structura bazei de date poate fi inspectată prin migrațiile Django, traficul MQTT poate fi observat din linia de comandă cu \\texttt{mosquitto\\_sub}, iar întreaga aplicație rulează prin Docker Compose.',
     'Codul este menținut minimalist. Backend-ul este o aplicație Django REST Framework standard, structura bazei de date poate fi inspectată prin migrațiile Django, traficul MQTT poate fi observat din linia de comandă cu \\texttt{mosquitto\\_sub}, iar întreaga aplicație rulează prin Docker Compose.'),
    # L66 — final, propozitie scurta
    ('Astfel, fluxul de la apăsarea unui buton din interfața web până la comutarea fizică a unui releu poate fi urmărit pas cu pas, fără a fi necesară traversarea unor straturi succesive de abstractizare.',
     'Astfel, fluxul de la apăsarea unui buton în interfața web până la comutarea fizică a unui releu poate fi urmărit pas cu pas. Nu e nevoie să traversezi straturi succesive de abstractizare.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 1 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
