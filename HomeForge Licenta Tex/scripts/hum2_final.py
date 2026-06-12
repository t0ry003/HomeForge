import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

edits = {
 'capitole/4_frontend.tex': [
    # split + fix typo "reducă" -> "redusă" ; produce o frază foarte scurtă
    ('Componenta este responsivă: pe ecrane mobile devine un \\texttt{Sheet} care alunecă din lateral, iar pe desktop poate fi reducă la o coloană de iconițe.',
     'Componenta este responsivă. Pe ecrane mobile devine un \\texttt{Sheet} care alunecă din lateral, iar pe desktop poate fi redusă la o coloană de iconițe.'),
    ('Toate verifică încă o dată rolul (\\texttt{useUser()} + role check) și au protecții suplimentare la nivel de UI (butoanele destructive sunt mereu confirmate printr-un \\texttt{AlertDialog}).',
     'Toate verifică încă o dată rolul (\\texttt{useUser()} + role check). Există și protecții la nivel de UI: butoanele destructive sunt mereu confirmate printr-un \\texttt{AlertDialog}.'),
 ],
 'capitole/5_firmware_esp32.tex': [
    ('Imediat după conectare, dispozitivul publică starea curentă prin \\texttt{publishState()}; acest mesaj joacă rolul unui \\emph{check-in} și este suficient pentru ca daemon-ul \\texttt{mqtt\\_listener} să facă auto-binding-ul descris în Capitolul 3.',
     'Imediat după conectare, dispozitivul publică starea curentă prin \\texttt{publishState()}. Acest mesaj joacă rolul unui \\emph{check-in}: este suficient pentru ca daemon-ul \\texttt{mqtt\\_listener} să facă auto-binding-ul descris în Capitolul 3.'),
 ],
}
total = 0
for p, reps in edits.items():
    c = open(p, encoding='utf-8').read()
    miss = [a for a, _ in reps if a not in c]
    if miss:
        for m in miss:
            print('NOT FOUND in', p, ':', m[:70])
        sys.exit(1)
    for a, b in reps:
        c = c.replace(a, b)
    open(p, 'w', encoding='utf-8').write(c)
    total += len(reps)
print('Pass final OK; inlocuiri:', total)
