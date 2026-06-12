import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/6_deployment_testare.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # --- traducere comentariu mixt EN/RO ---
    (r'# Apply DB migrations (preferă migrate.sh dacă bash este disponibil)',
     r'# Aplică migrațiile bazei de date (preferă migrate.sh dacă bash este disponibil)'),
    # --- perechi -> paranteze ---
    (r'pe care se află și dispozitivele — tipic un Raspberry Pi 4 în aceeași rețea cu plăcile ESP32)',
     r'pe care se află și dispozitivele, tipic un Raspberry Pi 4 în aceeași rețea cu plăcile ESP32)'),
    (r'folosește \emph{bridge networking} — modul implicit Docker — și expune porturile critice',
     r'folosește \emph{bridge networking} (modul implicit Docker) și expune porturile critice'),
    (r'Pentru deployment-ul țintă — un Raspberry Pi 4 sau alt mini-server Linux care partajează aceeași rețea fizică cu dispozitivele — repository-ul include',
     r'Pentru deployment-ul țintă (un Raspberry Pi 4 sau alt mini-server Linux care partajează aceeași rețea fizică cu dispozitivele), repository-ul include'),
    # --- singulare ---
    (r'ambele ar trebui reconsiderate — vezi secțiunea de discuție.',
     r'ambele ar trebui reconsiderate, vezi secțiunea de discuție.'),
    (r'celor două procese auxiliare Django — \texttt{mqtt\_listener} pentru recepția telemetriei MQTT',
     r'celor două procese auxiliare Django: \texttt{mqtt\_listener} pentru recepția telemetriei MQTT'),
    (r'procesul principal al containerului — atunci când serverul se oprește, întregul container se închide.',
     r'procesul principal al containerului: atunci când serverul se oprește, întregul container se închide.'),
    (r'dacă schema este sincronizată cu modelele — în schimb, dacă un dezvoltator a uitat',
     r'dacă schema este sincronizată cu modelele. În schimb, dacă un dezvoltator a uitat'),
    # --- pasi de test (\item X — Y -> X: Y) ---
    (r'deschidere \texttt{http://localhost:3000} — \texttt{SetupWizard} ar trebui să apară',
     r'deschidere \texttt{http://localhost:3000}: \texttt{SetupWizard} ar trebui să apară'),
    (r'navigare la \texttt{/dashboard/settings} — câmpul \emph{role} arată \texttt{Owner}.',
     r'navigare la \texttt{/dashboard/settings}: câmpul \emph{role} arată \texttt{Owner}.'),
    (r'apăsarea butonului \emph{Propose} — verificarea că backend-ul răspunde \texttt{201 Created}',
     r'apăsarea butonului \emph{Propose}: verificarea că backend-ul răspunde \texttt{201 Created}'),
    (r'aprobarea cu \emph{Approve} — verificarea că în \texttt{/dashboard/device-types}',
     r'aprobarea cu \emph{Approve}: verificarea că în \texttt{/dashboard/device-types}'),
    (r'încercarea de a aproba cu un utilizator \texttt{user} — backend-ul răspunde \texttt{403 Forbidden}.',
     r'încercarea de a aproba cu un utilizator \texttt{user}: backend-ul răspunde \texttt{403 Forbidden}.'),
    (r'monitorizarea pe Serial Monitor (115200 baud) — așteptarea mesajului',
     r'monitorizarea pe Serial Monitor (115200 baud): așteptarea mesajului'),
    (r'introducerea IP-ului ESP32-ului — \texttt{POST /api/devices/} returnează \texttt{201};',
     r'introducerea IP-ului ESP32-ului: \texttt{POST /api/devices/} returnează \texttt{201};'),
    (r'apăsarea toggle-ului de pe card — UI-ul se actualizează imediat (optimistic)',
     r'apăsarea toggle-ului de pe card: UI-ul se actualizează imediat (optimistic)'),
    (r'realimentarea ESP32 — în maxim 5 secunde, primul \texttt{publishState()}',
     r'realimentarea ESP32: în maxim 5 secunde, primul \texttt{publishState()}'),
    (r'ieșirea din modul edit — \texttt{flushSave} forțează un \texttt{PUT /api/dashboard-layout/}',
     r'ieșirea din modul edit: \texttt{flushSave} forțează un \texttt{PUT /api/dashboard-layout/}'),
    (r'refresh hard de browser (\texttt{Ctrl+Shift+R}) — layout-ul revine identic;',
     r'refresh hard de browser (\texttt{Ctrl+Shift+R}): layout-ul revine identic;'),
    (r'urmată de re-login — layout-ul este încă acolo',
     r'urmată de re-login: layout-ul este încă acolo'),
    # --- tabel ---
    (r'Confirmat — wizard $\rightarrow$ Settings arată badge \emph{Owner}',
     r'Confirmat: wizard $\rightarrow$ Settings arată badge \emph{Owner}'),
    (r'Confirmat — notificarea ajunge în mai puțin de 1 s în \emph{notification-center}',
     r'Confirmat: notificarea ajunge în mai puțin de 1 s în \emph{notification-center}'),
    (r'Confirmat — observat în \textasciitilde 32 s în medie',
     r'Confirmat: observat în \textasciitilde 32 s în medie'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:80])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 6 OK; em-dash ramase:', c.count('—'), '; "Apply DB migrations" ramase:', c.count('Apply DB migrations'))
