import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'teza.tex'
c = open(p, encoding='utf-8').read()

entries = [
    ('ACID', 'Atomicity, Consistency, Isolation, Durability', 'atomicitate, consistență, izolare, durabilitate'),
    ('AMQP', 'Advanced Message Queuing Protocol', 'protocol avansat de transport al mesajelor'),
    ('API', 'Application Programming Interface', 'interfață de programare a aplicațiilor'),
    ('CLI', 'Command-Line Interface', 'interfață în linie de comandă'),
    ('CoAP', 'Constrained Application Protocol', 'protocol pentru aplicații cu resurse limitate'),
    ('CORS', 'Cross-Origin Resource Sharing', 'partajare a resurselor între origini diferite'),
    ('CRUD', 'Create, Read, Update, Delete', 'creare, citire, actualizare, ștergere'),
    ('CSRF', 'Cross-Site Request Forgery', 'falsificare a cererilor între situri'),
    ('CSS', 'Cascading Style Sheets', 'foi de stil în cascadă'),
    ('CTA', 'Call To Action', 'element de îndemn la acțiune'),
    ('DHCP', 'Dynamic Host Configuration Protocol', 'protocol de configurare dinamică a gazdelor'),
    ('DNS', 'Domain Name System', 'sistem de nume de domeniu'),
    ('DNS-SD', 'DNS-based Service Discovery', 'descoperire de servicii bazată pe DNS'),
    ('DOM', 'Document Object Model', 'model de obiecte al documentului'),
    ('DRF', 'Django REST Framework', 'cadru de lucru pentru API-uri REST în Django'),
    ('GIN', 'Generalized Inverted Index', 'index inversat generalizat'),
    ('GPIO', 'General-Purpose Input/Output', 'intrare/ieșire de uz general'),
    ('HTTP', 'HyperText Transfer Protocol', 'protocol de transfer al hipertextului'),
    ('I2C', 'Inter-Integrated Circuit', 'magistrală serială între circuite integrate'),
    ('IoT', 'Internet of Things', 'Internetul lucrurilor'),
    ('IP', 'Internet Protocol', 'protocol de internet'),
    ('JSON', 'JavaScript Object Notation', 'notație de obiecte JavaScript'),
    ('JSONB', 'JSON Binary', 'format binar JSON în PostgreSQL'),
    ('JSX', 'JavaScript XML', 'sintaxă XML în JavaScript'),
    ('JWT', 'JSON Web Token', 'token web în format JSON'),
    ('LAN', 'Local Area Network', 'rețea locală'),
    ('MAC', 'Media Access Control', 'control al accesului la mediu (adresă fizică)'),
    ('MCU', 'Microcontroller Unit', 'unitate de microcontroler'),
    ('mDNS', 'Multicast DNS', 'DNS prin multicast'),
    ('M2M', 'Machine-to-Machine', 'comunicație mașină-la-mașină'),
    ('MQTT', 'Message Queuing Telemetry Transport', 'protocol de mesagerie de tip publish/subscribe'),
    ('NVS', 'Non-Volatile Storage', 'memorie nevolatilă'),
    ('OASIS', 'Organization for the Advancement of Structured Information Standards', 'organizație de standardizare'),
    ('OKLCH', 'spațiu de culoare Oklab', 'coordonate Lightness, Chroma, Hue'),
    ('ORM', 'Object-Relational Mapping', 'mapare obiect-relațională'),
    ('OTA', 'Over-The-Air', 'actualizare fără fir'),
    ('PV', 'Photovoltaic', 'fotovoltaic'),
    ('QoS', 'Quality of Service', 'calitatea serviciului'),
    ('RBAC', 'Role-Based Access Control', 'control al accesului bazat pe roluri'),
    ('RDBMS', 'Relational Database Management System', 'sistem de gestiune a bazelor de date relaționale'),
    ('REST', 'Representational State Transfer', 'transfer reprezentativ al stării'),
    ('RFC', 'Request for Comments', 'document de standardizare IETF'),
    ('RGB', 'Red, Green, Blue', 'roșu, verde, albastru'),
    ('SOC', 'State of Charge', 'stare de încărcare a bateriei'),
    ('SQL', 'Structured Query Language', 'limbaj structurat de interogare'),
    ('SRV', 'Service record', 'înregistrare DNS de serviciu'),
    ('SSID', 'Service Set Identifier', 'identificator al rețelei Wi-Fi'),
    ('TCP', 'Transmission Control Protocol', 'protocol de control al transmisiei'),
    ('TLS', 'Transport Layer Security', 'securitate la nivelul de transport'),
    ('UART', 'Universal Asynchronous Receiver-Transmitter', 'receptor-transmițător asincron universal'),
    ('UDP', 'User Datagram Protocol', 'protocol de datagrame'),
    ('UI', 'User Interface', 'interfață cu utilizatorul'),
    ('URL', 'Uniform Resource Locator', 'localizator uniform de resurse'),
    ('USB', 'Universal Serial Bus', 'magistrală serială universală'),
    ('UUID', 'Universally Unique Identifier', 'identificator unic universal'),
    ('UX', 'User Experience', 'experiența utilizatorului'),
    ('VM', 'Virtual Machine', 'mașină virtuală'),
    ('XSS', 'Cross-Site Scripting', 'injectare de scripturi între situri'),
]

lines = []
for ac, en, ro in entries:
    lines.append('  %s = %s (%s)' % (ac, en, ro))
body = '\\\\\n'.join(lines)  # separator \\ intre intrari
newblock = '\\abbreviations{\n  \\raggedright\n' + body + '\n}'

# inlocuieste tot blocul \abbreviations{...}
pat = re.compile(r'\\abbreviations\{\s*\\raggedright.*?\n\}', re.S)
m = pat.search(c)
assert m, 'bloc \\abbreviations negasit'
c = c[:m.start()] + newblock + c[m.end():]
open(p, 'w', encoding='utf-8').write(c)
print('Lista acronimelor actualizata cu traduceri RO;', len(entries), 'intrari.')
