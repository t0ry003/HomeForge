import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = 'capitole/4_frontend.tex'
c = open(p, encoding='utf-8').read()

# Liste de definitii: "\item \texttt{X} — desc" -> ":"  (potrivire unica prin cuvantul urmator)
colon_items = [
    r'\texttt{app/login/} — formular', r'\texttt{app/register/} — formular',
    r'\texttt{app/setup/} — \textit{setup wizard}', r'\texttt{page.tsx} — dashboard-ul principal',
    r'\texttt{devices/} — lista detaliată', r'\texttt{device-builder/} — editorul vizual',
    r'\texttt{device-collection/} — colecția', r'\texttt{device-types/} — pagina cu tipurile',
    r'\texttt{topology/} — vizualizarea de topologie', r'\texttt{settings/} — pagina de setări',
    r'\texttt{admin/} — secțiune restricționată', r'\texttt{all} — toate dispozitivele',
    r'\texttt{room} — grupare pe cameră', r'\texttt{type} — grupare pe tipul',
    r'\texttt{status} — grupare pe \texttt{Online}', r'\texttt{name} — sortare alfabetică',
    r'\texttt{FirmwareCodeEditor.tsx} — editor de cod', r'\texttt{WiringDiagramEditor.tsx} — încărcare',
    r'\texttt{DocumentationEditor.tsx} — editor Markdown', r'\texttt{name} — denumirea tipului',
    r'\texttt{definition.structure[]} — noduri', r'\texttt{card\_template.controls[]} — widget-urile',
    r'\texttt{documentation} — text;', r'\texttt{documentation\_images\_base64} — imagini',
    r'\texttt{apiClient.js} — comunicarea', r'\texttt{SmartDeviceCard.tsx} — randarea dinamică',
    r'\texttt{useDashboardLayout.ts} — layout-ul persistent', r'\texttt{DeviceUICreator.tsx} — device builder-ul',
    r'\texttt{useQuery} — unul pentru lista',
]
# Titluri \paragraph / \subsection -> ":"
colon_heads = [
    r'\paragraph{Tailwind CSS 4 — sistemul de stiluri.}', r'\paragraph{Radix UI — primitivele de comportament.}',
    r'\paragraph{shadcn/ui — stratul de', r'\paragraph{Lucide React — iconițe.}',
    r'\paragraph{Sonner — sistemul de toast.}', r'\paragraph{Framer Motion — animații.}',
    r'\subsection{\texttt{UserProvider} — sursa unică',
]

reps = []
for s in colon_items + colon_heads:
    reps.append((s, s.replace(' — ', ': ', 1)))

reps += [
    # captions -> virgula
    (r'\caption{Setup wizard — pasul „account"}', r'\caption{Setup wizard, pasul „account"}'),
    (r'\caption{Setup wizard — pasul „devices"}', r'\caption{Setup wizard, pasul „devices"}'),
    (r'\caption{Setup wizard — ecranul de finalizare}', r'\caption{Setup wizard, ecranul de finalizare}'),
    # comentariu LaTeX
    (r'% FIGURĂ COMPUSĂ 2x2 — fluxul de onboarding.', r'% FIGURĂ COMPUSĂ 2x2: fluxul de onboarding.'),
    # paranteze (perechi)
    (r'conține 28 de astfel de componente — printre ele \texttt{button.tsx}, \texttt{card.tsx}, \texttt{dialog.tsx}, \texttt{dropdown-menu.tsx}, \texttt{slider.tsx}, \texttt{sidebar.tsx}, \texttt{tabs.tsx}, \texttt{tooltip.tsx}, \texttt{command.tsx}, \texttt{markdown-editor.tsx} — toate generate inițial',
     r'conține 28 de astfel de componente (printre ele \texttt{button.tsx}, \texttt{card.tsx}, \texttt{dialog.tsx}, \texttt{dropdown-menu.tsx}, \texttt{slider.tsx}, \texttt{sidebar.tsx}, \texttt{tabs.tsx}, \texttt{tooltip.tsx}, \texttt{command.tsx}, \texttt{markdown-editor.tsx}), toate generate inițial'),
    (r'orchestrează trei surse de date — dispozitive, tipuri de dispozitive și camere — și le combină',
     r'orchestrează trei surse de date (dispozitive, tipuri de dispozitive și camere) și le combină'),
    (r'păstrând câmpurile grele — \texttt{firmware\_code}, \texttt{wiring\_diagram\_base64}, \texttt{documentation} — din lista completă',
     r'păstrând câmpurile grele (\texttt{firmware\_code}, \texttt{wiring\_diagram\_base64}, \texttt{documentation}) din lista completă'),
    (r'Restul codului — sidebar, breadcrumbs, mode toggle, pagini de admin — este aproape integral declarativ',
     r'Restul codului (sidebar, breadcrumbs, mode toggle, pagini de admin) este aproape integral declarativ'),
    # asides simple -> virgula
    (r'(vezi \texttt{components/devices/IconPicker.tsx}) — un \texttt{Popover} cu căutare',
     r'(vezi \texttt{components/devices/IconPicker.tsx}), un \texttt{Popover} cu căutare'),
    (r'\texttt{@dnd-kit/utilities} — toate trei făcând parte',
     r'\texttt{@dnd-kit/utilities}, toate trei făcând parte'),
    (r'imediat după navigare — un comportament natural',
     r'imediat după navigare, un comportament natural'),
    (r'\texttt{accent\_color} din \texttt{Profile} — vezi Capitolul 3)',
     r'\texttt{accent\_color} din \texttt{Profile}, vezi Capitolul 3)'),
    (r'la mount (\texttt{loadUser}) — întâi din \texttt{localStorage}',
     r'la mount (\texttt{loadUser}): întâi din \texttt{localStorage}'),
    (r'lista actuală de dispozitive — elimină referințele către cele șterse',
     r'lista actuală de dispozitive: elimină referințele către cele șterse'),
    (r'cardul devine \emph{tap-to-toggle} — întreaga suprafață a cardului acționează ca un switch',
     r'cardul devine \emph{tap-to-toggle}: întreaga suprafață a cardului acționează ca un switch'),
    (r'zeci de cereri per gest) — un \textit{debounce} clasic;',
     r'zeci de cereri per gest), un \textit{debounce} clasic;'),
    (r'expuse de \texttt{useMutation} — \texttt{mutationFn}, \texttt{onMutate}, \texttt{onError} și \texttt{onSettled}.',
     r'expuse de \texttt{useMutation}: \texttt{mutationFn}, \texttt{onMutate}, \texttt{onError} și \texttt{onSettled}.'),
    (r'dacă backend-ul nu mai răspunde — nu vrem ca utilizatorul',
     r'dacă backend-ul nu mai răspunde, fiindcă nu vrem ca utilizatorul'),
    (r'intervalul „de când utilizatorul a deschis pagina" — o legendă explicită îl semnalează',
     r'intervalul „de când utilizatorul a deschis pagina", iar o legendă explicită îl semnalează'),
    (r'Câmpurile lipsă (\texttt{null}) sunt randate ca \texttt{—}, evitând',
     r'Câmpurile lipsă (\texttt{null}) sunt randate ca o liniuță, evitând'),
    (r'deschide componenta \texttt{SolarSystemDialog.tsx} — un \texttt{Dialog} cu câmpurile',
     r'deschide componenta \texttt{SolarSystemDialog.tsx}, un \texttt{Dialog} cu câmpurile'),
    (r'corespunde unui ID definit în \texttt{structure[]} — astfel, este imposibil',
     r'corespunde unui ID definit în \texttt{structure[]}. Astfel, este imposibil'),
    (r'\texttt{animate-in fade-in duration-300} — o clasă utilitară',
     r'\texttt{animate-in fade-in duration-300}, o clasă utilitară'),
    (r'Mesajele sunt specifice fiecărei pagini — pe dashboard, de exemplu',
     r'Mesajele sunt specifice fiecărei pagini. Pe dashboard, de exemplu'),
    (r'aplicate instant prin \texttt{updateAccentColor} — efectul vizual este ilustrat în Figura \ref{fig:accent_colors})',
     r'aplicate instant prin \texttt{updateAccentColor}, iar efectul vizual este ilustrat în Figura \ref{fig:accent_colors})'),
    (r'\texttt{window.location.reload()} — soluție simplă, care poate fi înlocuită',
     r'\texttt{window.location.reload()}, o soluție simplă care poate fi înlocuită'),
    (r'\emph{Database Connected} — momentan statice, dar gândite',
     r'\emph{Database Connected}, momentan statice, dar gândite'),
    (r'iar pentru fiecare propunere — un mini-grafic React Flow',
     r'iar pentru fiecare propunere: un mini-grafic React Flow'),
    (r'evidențiază temporar un user — folosit din notificări',
     r'evidențiază temporar un user, folosit din notificări'),
    (r'să trimită comenzi de probă — utilă pentru iterația',
     r'să trimită comenzi de probă, utilă pentru iterația'),
    (r'\item folosește două \texttt{useQuery} — unul pentru lista',  # safety: ensure exact item form
     r'\item folosește două \texttt{useQuery}: unul pentru lista'),
]

miss = [a for a, _ in reps if a not in c]
if miss:
    for m in miss:
        print('NOT FOUND:', m[:80])
    sys.exit(1)
for a, b in reps:
    c = c.replace(a, b)
open(p, 'w', encoding='utf-8').write(c)
print('Cap 4 OK; em-dash ramase:', c.count('—'))
