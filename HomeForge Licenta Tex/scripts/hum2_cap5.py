import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/5_firmware_esp32.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # L20 ~45 cuvinte -> 3 fraze
    ('Pentru a face explicațiile cât mai concrete, exemplele de mai jos provin din varianta \\emph{ESP32 5V Relay}: este singurul template care implementează atât fluxul de telemetrie (publicare de stare), cât și fluxul invers de comenzi (subscribe + callback), permițând ilustrarea ambelor sensuri de comunicație MQTT într-un singur fișier sursă.',
     'Pentru a face explicațiile cât mai concrete, exemplele de mai jos provin din varianta \\emph{ESP32 5V Relay}. Este singurul template care implementează ambele sensuri: fluxul de telemetrie (publicare de stare) și fluxul invers de comenzi (subscribe + callback). Astfel ilustrez ambele direcții de comunicație MQTT într-un singur fișier sursă.'),
    # L302 monstrul de ~90 cuvinte -> 1 lead scurt + 4 fraze
    ('Pentru claritate, sunt enumerate în continuare aspectele \\emph{neimplementate} în firmware-ul curent: nu sunt utilizate task-uri FreeRTOS create explicit, întrucât bucla \\texttt{loop()} împreună cu \\texttt{PubSubClient.loop()} este suficientă pentru volumul actual de logică; nu este implementat un \\texttt{Captive Portal} pentru configurarea Wi-Fi la prima pornire, SSID-ul și parola fiind înlocuite în cod prin placeholder-uri; comunicarea MQTT nu folosește TLS, ceea ce este acceptabil în context LAN privat, dar pentru un deployment de producție ar trebui adăugate certificate și \\texttt{WiFiClientSecure}; nu este implementată actualizarea OTA, re-flash-area realizându-se prin USB-UART.',
     'Pentru claritate, enumăr aici ce nu este implementat în firmware-ul curent. Nu folosesc task-uri FreeRTOS create explicit: bucla \\texttt{loop()} împreună cu \\texttt{PubSubClient.loop()} acoperă volumul actual de logică. Nu există un \\texttt{Captive Portal} pentru configurarea Wi-Fi la prima pornire, SSID-ul și parola fiind înlocuite direct în cod prin placeholder-uri. Comunicarea MQTT nu folosește TLS, ceea ce este acceptabil într-un LAN privat, dar pentru un deployment de producție ar trebui adăugate certificate și \\texttt{WiFiClientSecure}. Actualizarea OTA nu este implementată, re-flash-area făcându-se prin USB-UART.'),
    # L305 ~50 cuvinte -> 3 fraze + scot copula "reprezintă"
    ('Firmware-ul ESP32 reprezintă, ca volum de cod, cea mai redusă componentă a platformei: fiecare sketch are între 150 și 200 de linii. Cu toate acestea, este nivelul la care decizia arhitecturală a HomeForge (comunicare exclusivă prin MQTT, format de mesaje transparent) devine direct observabilă: traficul generat de o placă poate fi inspectat prin \\texttt{mosquitto\\_sub -t "homeforge/devices/+/state"}, iar conținutul mesajelor recepționate de backend este identificabil cu corespondentul lor de pe placă.',
     'Firmware-ul ESP32 este, ca volum de cod, cea mai redusă componentă a platformei: fiecare sketch are între 150 și 200 de linii. Cu toate acestea, este nivelul la care decizia arhitecturală a HomeForge devine direct observabilă, comunicarea trecând exclusiv prin MQTT, într-un format de mesaje transparent. Traficul unei plăci poate fi inspectat prin \\texttt{mosquitto\\_sub -t "homeforge/devices/+/state"}, iar conținutul mesajelor recepționate de backend se potrivește cu corespondentul lor de pe placă.'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:75])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 5 pass-2 OK; em-dash:', c.count('—'), '; inlocuiri:', len(reps))
