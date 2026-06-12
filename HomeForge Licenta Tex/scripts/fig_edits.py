"""Aplică 3 modificări la figura din capitolul 4:
1. adaugă referință la Figura accent_colors în paragraful Settings;
2. înlocuiește figura redundantă settings_page cu o secțiune nouă
   „Colecția de dispozitive" + figura device_collection;
3. elimină figura add_device_dialog (rămâne doar textul secțiunii).
"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATH = 'capitole/4_frontend.tex'
with open(PATH, encoding='utf-8') as f:
    c = f.read()

orig = c

# --- 1. Referință la Figura accent_colors în paragraful Settings ---
c = c.replace(
    'aplicate instant prin \\texttt{updateAccentColor}) și un panou read-only',
    'aplicate instant prin \\texttt{updateAccentColor} — efectul vizual este '
    'ilustrat în Figura \\ref{fig:accent_colors}) și un panou read-only',
)

# --- 2. Înlocuiește blocul figurii settings_page cu secțiunea Colecție + figura device_collection ---
settings_fig = (
    '% FIGURĂ DE ADĂUGAT: screenshot al paginii Settings — partea de sus cu profil\n'
    '% și avatar, partea de jos cu paleta de 7 cercuri pentru accent color. Sugestie:\n'
    '% poți face screenshot cu o culoare violet/cyan selectată pentru a se vedea.\n'
    '\\begin{figure}[htbp]\n'
    '    \\centering\n'
    '    % \\includegraphics[width=0.85\\textwidth]{figuri/settings_page.png}\n'
    '    \\caption{Pagina de setări a utilizatorului, cu paleta de \\emph{accent colors} (screenshot de adăugat)}\n'
    '    \\label{fig:settings_page}\n'
    '\\end{figure}'
)

collection_section = (
    '\\section{Colecția de dispozitive a comunității}\n'
    'Pagina \\texttt{app/dashboard/device-collection/page.tsx} este locul în care utilizatorii '
    'explorează tipurile de dispozitive deja aprobate. Spre deosebire de \\emph{device builder} '
    '(care \\emph{creează} un tip nou), colecția le \\emph{expune} pe cele existente: fiecare tip '
    'apare ca un card (\\texttt{Card} din shadcn/ui) cu numele, badge-uri pentru senzorii din '
    'componență și o miniatură a topologiei hardware. Sus se află un câmp de căutare '
    '(\\texttt{Input} cu filtrare locală prin \\texttt{useMemo}), iar un buton de import permite '
    'încărcarea unui tip dintr-un fișier JSON (\\texttt{importDeviceTypesFromFile}). La click pe '
    'un card, aplicația navighează către pagina de detaliu \\texttt{device-collection/[id]}, unde '
    'se găsesc codul firmware, schema electrică, documentația și dialogul de descărcare a '
    'sketch-ului personalizat (prezentat în Figura \\ref{fig:ui_primitives}). Datele provin '
    'dintr-un singur \\texttt{useQuery} către \\texttt{GET /api/device-types/}, restrâns la '
    'tipurile aprobate.\n\n'
    '% FIGURĂ DE ADĂUGAT: screenshot al paginii /dashboard/device-collection —\n'
    '% grila de carduri cu tipurile de dispozitive aprobate (nume, badge-uri de\n'
    '% senzori, miniatură topologie), cu câmpul de căutare vizibil sus.\n'
    '% La final: înlocuiește \\fbox{...} cu \\includegraphics (decomentat).\n'
    '\\begin{figure}[htbp]\n'
    '    \\centering\n'
    '    % \\includegraphics[width=0.9\\textwidth]{figuri/device_collection.png}\n'
    '    \\fbox{\\parbox[c][6cm][c]{0.86\\linewidth}{\\centering\\scriptsize captură: colecția de dispozitive\\\\— de adăugat —}}\n'
    '    \\caption{Pagina \\emph{Device Collection}: grila tipurilor de dispozitive aprobate, '
    'propuse de comunitate, fiecare card afișând badge-uri pentru senzori și o miniatură a '
    'topologiei hardware.}\n'
    '    \\label{fig:device_collection}\n'
    '\\end{figure}'
)

assert settings_fig in c, 'NU am găsit blocul figurii settings_page'
c = c.replace(settings_fig, collection_section)

# --- 3. Elimină blocul figurii add_device_dialog ---
add_fig = (
    '\n\n% FIGURĂ DE ADĂUGAT: screenshot al AddDeviceDialog la pasul 2, cu formularul\n'
    '% completat (Nume: „Bec living", IP: „192.168.1.42", Cameră: „Living Room",\n'
    '% iconița aleasă). Sugestie: poți face câte un screenshot pentru fiecare pas.\n'
    '\\begin{figure}[htbp]\n'
    '    \\centering\n'
    '    % \\includegraphics[width=0.7\\textwidth]{figuri/add_device_dialog.png}\n'
    '    \\caption{Dialogul de adăugare a unui dispozitiv nou — pasul de detalii (screenshot de adăugat)}\n'
    '    \\label{fig:add_device_dialog}\n'
    '\\end{figure}'
)

assert add_fig in c, 'NU am găsit blocul figurii add_device_dialog'
c = c.replace(add_fig, '')

if c == orig:
    print('NICIO modificare aplicată!')
else:
    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(c)
    print('Modificări aplicate cu succes.')
