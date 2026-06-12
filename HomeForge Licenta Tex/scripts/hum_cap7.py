import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/7_concluzii.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # perechi -> paranteze
    (r'precum Home Assistant — caracterizate de un nivel ridicat de abstractizare care reduce accesibilitatea componentelor interne pentru un dezvoltator în formare — HomeForge menține',
     r'precum Home Assistant (caracterizate de un nivel ridicat de abstractizare care reduce accesibilitatea componentelor interne pentru un dezvoltator în formare), HomeForge menține'),
    (r'patru niveluri de descoperire — override manual prin \texttt{server\_ip}, cache local în NVS, interogare \texttt{\_mqtt.\_tcp.local} și endpoint web \texttt{/config} —, eliminând',
     r'patru niveluri de descoperire (override manual prin \texttt{server\_ip}, cache local în NVS, interogare \texttt{\_mqtt.\_tcp.local} și endpoint web \texttt{/config}), eliminând'),
    (r'în două variante complementare — bridge networking pentru dezvoltare cross-platform (Docker Desktop pe Windows/macOS) și \texttt{network\_mode: host} pentru producție pe Linux nativ — permite obținerea',
     r'în două variante complementare (bridge networking pentru dezvoltare cross-platform pe Docker Desktop Windows/macOS și \texttt{network\_mode: host} pentru producție pe Linux nativ) permite obținerea'),
    # en-dash MAC--IP -> compus cu cratima
    (r'\textbf{Auto-binding MAC--IP.}', r'\textbf{Auto-binding MAC-IP.}'),
    # singulare -> doua puncte
    (r'alegerea unui protocol anume — dezbaterea „REST vs. MQTT vs. WebSocket" devine secundară',
     r'alegerea unui protocol anume: dezbaterea „REST vs. MQTT vs. WebSocket" devine secundară'),
    (r'simplifică considerabil etapa de depanare — observarea directă a traficului MQTT cu \texttt{mosquitto\_sub} s-a dovedit utilă în mod repetat.',
     r'simplifică considerabil etapa de depanare: observarea directă a traficului MQTT cu \texttt{mosquitto\_sub} s-a dovedit utilă în mod repetat.'),
    # copula avoidance -> "este"
    (r'Adăugarea acestuia constituie o direcție evidentă de continuare.',
     r'Adăugarea acestuia este o direcție evidentă de continuare.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:80])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 7 OK; em-dash ramase:', c.count('—'), '; MAC--IP ramase:', c.count('MAC--IP'))
