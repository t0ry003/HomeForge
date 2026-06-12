"""1. Precizează durata de auto-dispariție a tooltip-ului (~8 s).
2. Înlocuiește figura onboarding cu o grilă 2x2 care folosește \\IfFileExists:
   afișează imaginea dacă există, altfel un chenar placeholder pătrat
   (deci pozele NU mai apar peste chenare — se substituie automat).
"""
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PATH = 'capitole/4_frontend.tex'
with open(PATH, encoding='utf-8') as f:
    c = f.read()
orig = c

# --- 1. Formulare mai precisă pentru auto-dispariție ---
c = c.replace(
    'cu dispariție automată după 8,5 secunde sau prin acțiune explicită a utilizatorului (buton de închidere)',
    'cu dispariție automată după aproximativ 8 secunde (mai exact, un \\texttt{setTimeout} '
    'la 8500 ms de la încărcarea paginii, tooltip-ul devenind vizibil la 500 ms) sau imediat, '
    'prin butonul de închidere',
)

# --- 2. Înlocuiește blocul figurii onboarding cu grila 2x2 ---
old_fig = (
    '% FIGURĂ DE ADĂUGAT (combinată, 4 panel-uri 2×2): (sus-stânga) setup wizard\n'
    '% pasul „account", (sus-dreapta) setup wizard pasul „devices" cu lista\n'
    '% predefinite, (jos-stânga) dashboard cu OnboardingChecklist activ,\n'
    '% (jos-dreapta) un PageTooltip deschis pe o pagină interioară.\n'
    '\\begin{figure}[htbp]\n'
    '    \\centering\n'
    '    % \\includegraphics[width=0.95\\textwidth]{figuri/onboarding_combo.png}\n'
    '    \\caption{Fluxul complet de onboarding: setup wizard (sus) și mecanismele de onboarding ulterior (jos) (screenshot de adăugat)}\n'
    '    \\label{fig:onboarding_combo}\n'
    '\\end{figure}'
)

# Grilă 2x2. \IfFileExists pune imaginea dacă există, altfel chenarul placeholder.
# Imagini așteptate (pătrate): onboarding_account, onboarding_devices,
# onboarding_checklist, onboarding_tooltip (toate .png în figuri/).
new_fig = r"""% FIGURĂ COMPUSĂ 2x2 — fluxul de onboarding. Fiecare panou afișează automat
% imaginea dacă există în figuri/, altfel un chenar placeholder pătrat
% (\IfFileExists => pozele nu mai apar peste chenare, se substituie singure).
% Imagini așteptate (pătrate): onboarding_account.png, onboarding_devices.png,
% onboarding_checklist.png, onboarding_tooltip.png.
\newcommand{\onboardpanel}[1]{%
  \IfFileExists{figuri/#1.png}%
    {\includegraphics[width=\linewidth]{figuri/#1.png}}%
    {\fbox{\parbox[c][6.6cm][c]{0.92\linewidth}{\centering\scriptsize #1\\— de adăugat —}}}%
}
\begin{figure}[htbp]
    \centering
    \begin{subfigure}[t]{0.48\textwidth}
        \centering
        \onboardpanel{onboarding_account}
        \caption{Setup wizard — pasul „account"}
        \label{fig:onb_account}
    \end{subfigure}\hfill
    \begin{subfigure}[t]{0.48\textwidth}
        \centering
        \onboardpanel{onboarding_devices}
        \caption{Setup wizard — pasul „devices"}
        \label{fig:onb_devices}
    \end{subfigure}

    \vspace{0.6em}

    \begin{subfigure}[t]{0.48\textwidth}
        \centering
        \onboardpanel{onboarding_checklist}
        \caption{Checklist-ul de pe dashboard}
        \label{fig:onb_checklist}
    \end{subfigure}\hfill
    \begin{subfigure}[t]{0.48\textwidth}
        \centering
        \onboardpanel{onboarding_tooltip}
        \caption{Tooltip de pagină (\texttt{PageTooltip})}
        \label{fig:onb_tooltip}
    \end{subfigure}
    \caption{Fluxul de onboarding al platformei: pașii \emph{account} (a) și \emph{devices} (b) din setup wizard, urmați de mecanismele afișate ulterior în aplicație — checklist-ul de pe dashboard (c) și tooltip-ul contextual de pagină (d).}
    \label{fig:onboarding_combo}
\end{figure}"""

assert old_fig in c, 'NU am gasit blocul figurii onboarding'
c = c.replace(old_fig, new_fig)

if c == orig:
    print('NICIO modificare!')
else:
    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(c)
    print('OK — modificari aplicate.')
