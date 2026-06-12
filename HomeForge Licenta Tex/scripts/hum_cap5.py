import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/5_firmware_esp32.tex'
c = open(p, encoding='utf-8').read()

reps = [
    # --- traducere comentarii engleza -> romana (din codul sursa firmware) ---
    (r'doc[lastControlKey] = relayState;   // echo dynamic key back',
     r'doc[lastControlKey] = relayState;   // trimite înapoi cheia dinamică'),
    (r'    // Apply the DHT11 tolerance correction.',
     r'    // Aplică corecția de toleranță DHT11.'),
    (r'if (!isnan(newP)) pressure = newP / 100.0;   // Pa to hPa',
     r'if (!isnan(newP)) pressure = newP / 100.0;   // Pa în hPa'),
    # --- em-dash-uri ---
    (r'aproximativ 5 euro la achiziție unitară — un termen acceptabil',
     r'aproximativ 5 euro la achiziție unitară, un termen acceptabil'),
    (r'sunt strict obligatorii — backend-ul refuză să accepte',
     r'sunt strict obligatorii: backend-ul refuză să accepte'),
    (r'să fie un singur token alfanumeric — același format pe care îl așteaptă \texttt{mqtt\_listener} pe partea de Django;',
     r'să fie un singur token alfanumeric, același format pe care îl așteaptă \texttt{mqtt\_listener} pe partea de Django;'),
    (r'identificator unic la nivel de platformă — un dispozitiv care își schimbă IP-ul',
     r'identificator unic la nivel de platformă: un dispozitiv care își schimbă IP-ul'),
    (r'Aceste prefixe sunt utile la depanare — un \texttt{mosquitto\_sub} pe brokerul HomeForge permite',
     r'Aceste prefixe sunt utile la depanare: un \texttt{mosquitto\_sub} pe brokerul HomeForge permite'),
    (r'dar omit linia \texttt{client.subscribe(...)} — neavând actuator, nu se abonează la niciun topic de comandă.',
     r'dar omit linia \texttt{client.subscribe(...)}: neavând actuator, nu se abonează la niciun topic de comandă.'),
    (r'populează câmpurile relevante pentru senzorii lor — \texttt{VAR\_TEMP}, \texttt{VAR\_HUMID}, \texttt{VAR\_PRESSURE}, după caz —, fără \texttt{VAR\_RELAY}',
     r'populează câmpurile relevante pentru senzorii lor (\texttt{VAR\_TEMP}, \texttt{VAR\_HUMID}, \texttt{VAR\_PRESSURE}, după caz), fără \texttt{VAR\_RELAY}'),
    (r'trei reprezentări pentru valoarea booleană — boolean nativ, string (\texttt{"true"}, \texttt{"on"}, \texttt{"1"}) și întreg —, pentru a fi compatibil',
     r'trei reprezentări pentru valoarea booleană (boolean nativ, string \texttt{"true"}, \texttt{"on"}, \texttt{"1"} și întreg), pentru a fi compatibil'),
    (r'închizând bucla de feedback — backend-ul primește confirmarea',
     r'închizând bucla de feedback: backend-ul primește confirmarea'),
    (r'citirile prea frecvente nu sunt fiabile — senzorul are nevoie de cel puțin o secundă între eșantioane —, deci intervalul de 5 secunde',
     r'citirile prea frecvente nu sunt fiabile (senzorul are nevoie de cel puțin o secundă între eșantioane), deci intervalul de 5 secunde'),
    (r'acolo unde topologia de rețea o permite — vezi Capitolul 6)',
     r'acolo unde topologia de rețea o permite, vezi Capitolul 6)'),
    (r'Dacă toate cele trei niveluri eșuează — situație rară, dar plauzibilă atunci când serverul nu rulează încă sau este pe altă subrețea — dispozitivul activează',
     r'Dacă toate cele trei niveluri eșuează (situație rară, dar plauzibilă atunci când serverul nu rulează încă sau este pe altă subrețea), dispozitivul activează'),
    (r'\texttt{SCL = GPIO 22} — valorile implicite Wire ale ESP32)',
     r'\texttt{SCL = GPIO 22}, valorile implicite Wire ale ESP32)'),
    (r'publicând trei valori — temperatură, umiditate și presiune — în trei widget-uri corespunzătoare.',
     r'publicând trei valori (temperatură, umiditate și presiune) în trei widget-uri corespunzătoare.'),
    (r'cea mai redusă componentă a platformei — fiecare sketch are între 150 și 200 de linii.',
     r'cea mai redusă componentă a platformei: fiecare sketch are între 150 și 200 de linii.'),
    (r'decizia arhitecturală a HomeForge — comunicare exclusivă prin MQTT, format de mesaje transparent — devine direct observabilă:',
     r'decizia arhitecturală a HomeForge (comunicare exclusivă prin MQTT, format de mesaje transparent) devine direct observabilă:'),
]
miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:80])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 5 OK; em-dash ramase:', c.count('—'), '; comentarii EN ramase:',
      c.count('echo dynamic key back') + c.count('Apply the DHT11') + c.count('Pa to hPa'))
