"""Compact the TanStack Query section in chapter 4."""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = 'capitole/4_frontend.tex'
with open(path, 'r', encoding='utf-8') as f:
    txt = f.read()

# Locate by a unique marker phrase
needle = 'Două decizii de configurare merită evidențiate:'
if needle in txt:
    # Find the start of the section
    sect_start = txt.find(r'\section{Gestiunea stării: TanStack Query}')
    sect_end = txt.find(r'\section{Dashboard-ul principal}')
    if sect_start != -1 and sect_end != -1:
        new_section = (
            r'\section{Gestiunea stării: TanStack Query}' '\n'
            'HomeForge folosește \\textit{TanStack Query} (denumit anterior React Query) pentru toate datele la nivel de aplicație. '
            '\\texttt{QueryProvider} este montat în root-ul aplicației (\\texttt{components/query-provider.tsx}) și expune un singur \\texttt{QueryClient}. '
            'Fiecare componentă apoi consumă două hook-uri: \\texttt{useQuery} pentru fetch-uri (lista de dispozitive, profilul, notificările) și \\texttt{useMutation} pentru scrieri (toggle, update, delete). '
            'Două decizii de configurare merită evidențiate: lista de dispozitive folosește \\texttt{refetchInterval: 3000} (polling la 3 secunde, înlocuind o eventuală conexiune WebSocket), iar contorul de notificări necitite folosește \\texttt{refetchInterval: 30000} (30 de secunde, suficient pentru un badge fără a încărca inutil backend-ul).\n\n'
        )
        txt = txt[:sect_start] + new_section + txt[sect_end:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(txt)
        print('replaced section')
    else:
        print('section markers not found')
else:
    print('needle not found')
