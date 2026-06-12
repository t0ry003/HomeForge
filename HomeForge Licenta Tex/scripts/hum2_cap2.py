import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/2_stadiul_actual_si_analiza_tehnologiilor.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L6 ~37 cuvinte
    ('Modelul cerere-răspuns presupune că senzorul deschide o conexiune TCP nouă pentru fiecare mesaj, trimite un header HTTP care, cu cookie-uri și meta-informații, poate ajunge la câteva sute de bytes, apoi așteaptă răspunsul și închide conexiunea.',
     'Modelul cerere-răspuns presupune că senzorul deschide o conexiune TCP nouă pentru fiecare mesaj. Trimite un header HTTP care, cu cookie-uri și meta-informații, poate ajunge la câteva sute de bytes, apoi așteaptă răspunsul și închide conexiunea.'),
    # L6 ~40 cuvinte -> 3 fraze, una foarte scurta
    ('Atunci când serverul vrea să trimită o comandă către dispozitiv, problema se mută: HTTP nu suportă push nativ, deci fie clientul interoghează ciclic (\\textit{polling}), fie se trece la WebSocket-uri, ceea ce ne aduce, de fapt, foarte aproape de paradigma de \\textit{publish/subscribe}.',
     'Iar când serverul vrea să trimită o comandă către dispozitiv, problema se mută. HTTP nu suportă push nativ. Fie clientul interoghează ciclic (\\textit{polling}), fie se trece la WebSocket-uri, ceea ce ne aduce, de fapt, foarte aproape de paradigma \\textit{publish/subscribe}.'),
    # L8 ~33 cuvinte
    ('Antetul minim al unui pachet MQTT este de doar 2 bytes \\cite{mqtt_standard_iot}, iar protocolul oferă nativ trei niveluri de QoS și un mecanism de \\textit{Last Will and Testament}, prin care brokerul detectează automat deconectarea unui nod.',
     'Antetul minim al unui pachet MQTT este de doar 2 bytes \\cite{mqtt_standard_iot}. În plus, protocolul oferă nativ trei niveluri de QoS și un mecanism de \\textit{Last Will and Testament}, prin care brokerul detectează automat deconectarea unui nod.'),
    # L10 ~45 cuvinte
    ('Un studiu comparativ al principalelor protocoale de mesagerie pentru IoT (MQTT, CoAP, AMQP și HTTP) arată că MQTT și CoAP sunt mai potrivite pentru rețelele de senzori cu lățime de bandă redusă și pentru nodurile cu resurse limitate, în timp ce HTTP rămâne firesc pentru integrarea cu sisteme web tradiționale \\cite{mqtt_vs_http_iot_perf}.',
     'Un studiu comparativ al principalelor protocoale de mesagerie pentru IoT (MQTT, CoAP, AMQP și HTTP) arată o împărțire clară. MQTT și CoAP se potrivesc rețelelor de senzori cu lățime de bandă redusă și nodurilor cu resurse limitate, în timp ce HTTP rămâne firesc pentru integrarea cu sisteme web tradiționale \\cite{mqtt_vs_http_iot_perf}.'),
    # L10 ~48 cuvinte (scot filler "La rândul său")
    ('La rândul său, un \\textit{survey} dedicat utilizării MQTT în sistemele M2M și IoT inventariază implementările uzuale de broker (Mosquitto, HiveMQ, EMQ X, VerneMQ) și remarcă faptul că Mosquitto este una dintre cele mai răspândite alegeri, datorită amprentei reduse de resurse și a capacității de a rula inclusiv pe un Raspberry Pi \\cite{mqtt_standard_iot}.',
     'Un alt \\textit{survey}, dedicat utilizării MQTT în sistemele M2M și IoT, inventariază implementările uzuale de broker: Mosquitto, HiveMQ, EMQ X, VerneMQ. Dintre ele, Mosquitto este una dintre cele mai răspândite alegeri, datorită amprentei reduse de resurse și a faptului că rulează inclusiv pe un Raspberry Pi \\cite{mqtt_standard_iot}.'),
    # L71 ~40 cuvinte -> 3 fraze
    ('Documentația oficială PostgreSQL precizează că, spre deosebire de tipul \\texttt{json} (care păstrează textul JSON brut), \\texttt{JSONB} pre-parsează documentul într-un format binar decompus, ceea ce face citirea ulterioară mai rapidă și permite indexare cu \\texttt{GIN} pentru căutări în interiorul JSON-ului \\cite{postgresql_jsonb_docs}.',
     'Documentația oficială PostgreSQL precizează diferența față de tipul \\texttt{json}, care păstrează textul JSON brut. Tipul \\texttt{JSONB} pre-parsează documentul într-un format binar decompus. Astfel, citirea ulterioară devine mai rapidă și se poate indexa cu \\texttt{GIN} pentru căutări în interiorul JSON-ului \\cite{postgresql_jsonb_docs}.'),
    # L71 ~38 cuvinte
    ('Pentru o platformă didactică, această combinație este ideală: studenții văd o schemă SQL clară pentru \\texttt{User}, \\texttt{Room}, \\texttt{Device}, dar nu sunt obligați să facă o migrație de fiecare dată când adaugă un senzor cu un format nou.',
     'Pentru o platformă didactică, combinația este ideală. Studenții văd o schemă SQL clară pentru \\texttt{User}, \\texttt{Room} și \\texttt{Device}, dar nu sunt obligați să facă o migrație ori de câte ori adaugă un senzor cu un format nou.'),
    # L86 ~40 cuvinte
    ('În implementarea curentă, mecanismul \\textit{Last Will and Testament} oferit de MQTT nu este utilizat; statusul \\texttt{offline} este detectat printr-un timer aplicativ, în cadrul comenzii \\texttt{mqtt\\_listener}, care marchează drept \\texttt{offline} orice dispozitiv ce nu a mai publicat în ultimele 30 de secunde.',
     'În implementarea curentă, mecanismul \\textit{Last Will and Testament} oferit de MQTT nu este utilizat. Statusul \\texttt{offline} este detectat printr-un timer aplicativ, în comanda \\texttt{mqtt\\_listener}, care marchează drept \\texttt{offline} orice dispozitiv ce nu a mai publicat în ultimele 30 de secunde.'),
    # L94 ~42 cuvinte
    ('Cercetări din domeniul Edge Computing au demonstrat că este fezabilă rularea containerelor Docker chiar și pe noduri cu resurse limitate, precum Raspberry Pi, ceea ce confirmă că aceeași imagine poate fi distribuită fără modificări de la un server obișnuit la un nod de margine \\cite{docker_iot_edge}.',
     'Cercetări din domeniul Edge Computing au demonstrat că rularea containerelor Docker este fezabilă chiar și pe noduri cu resurse limitate, precum Raspberry Pi \\cite{docker_iot_edge}. Aceeași imagine poate fi distribuită fără modificări, de la un server obișnuit până la un nod de margine.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 2 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
