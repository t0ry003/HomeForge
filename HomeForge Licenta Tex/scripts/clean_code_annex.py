import io, sys, re, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# (sursa relativ la directorul tezei, destinatie in cod/, marker comentariu)
FILES = [
    ('../backend/api/models.py',                                'cod/models.py',            '#'),
    ('../backend/api/serializers.py',                           'cod/serializers.py',       '#'),
    ('../backend/api/permissions.py',                           'cod/permissions.py',       '#'),
    ('../backend/api/management/commands/mqtt_listener.py',     'cod/mqtt_listener.py',     '#'),
    ('../backend/api/mqtt_client.py',                           'cod/mqtt_client.py',       '#'),
    ('../backend/api/solar/providers/fronius.py',               'cod/fronius.py',           '#'),
    ('../frontend/lib/apiClient.js',                            'cod/apiClient.js',         '//'),
    ('../frontend/components/devices/SmartDeviceCard.tsx',      'cod/SmartDeviceCard.tsx',  '//'),
    ('../frontend/hooks/useDashboardLayout.ts',                 'cod/useDashboardLayout.ts','//'),
    ('../frontend/app/dashboard/device-builder/DeviceUICreator.tsx', 'cod/DeviceUICreator.tsx', '//'),
]

def is_separator(c):
    # comentariu format DOAR din simboluri decorative (fara litere/cifre)
    return re.fullmatch(r'[-=*_#/!~<>\.\s]*', c) is not None

def clean(text, marker):
    # MINIMAL & SIGUR: scoatem doar comentariile goale, separatoarele pure si TODO/FIXME.
    # Pastram TOATE comentariile descriptive (inclusiv etichete de sectiune cu text).
    lines = text.split('\n')
    out, removed = [], []
    for ln in lines:
        s = ln.strip()
        if s.startswith(marker) and not s.startswith(marker + '!'):  # pastram shebang
            c = s[len(marker):].strip()
            drop = (is_separator(c)
                    or re.match(r'(?i)^(todo|fixme|xxx|hack)\b\s*[:!-]?\s*$', c)
                    or re.match(r'(?i)^(todo|fixme|xxx|hack)\b', c) and len(c) < 40)
            if drop:
                removed.append(ln)
                continue
        out.append(ln)
    res = re.sub(r'\n{3,}', '\n\n', '\n'.join(out))
    return res, removed

print('%-28s %6s %6s %6s' % ('fisier', 'orig', 'curat', 'scoase'))
print('-' * 52)
report = []
for src, dst, marker in FILES:
    if not os.path.exists(src):
        print('LIPSA SURSA:', src); continue
    txt = open(src, encoding='utf-8').read()
    cleaned, removed = clean(txt, marker)
    open(dst, 'w', encoding='utf-8', newline='\n').write(cleaned)
    print('%-28s %6d %6d %6d' % (dst.split('/')[-1],
          len(txt.split(chr(10))), len(cleaned.split(chr(10))), len(removed)))
    report.append((dst, removed))

# raport detaliat al liniilor scoase (sa verific ca nu sunt descriptive)
print('\n===== LINII ELIMINATE (verificare) =====')
for dst, removed in report:
    if removed:
        print('\n--- %s (%d) ---' % (dst.split('/')[-1], len(removed)))
        for r in removed[:60]:
            print('   ', r.strip())
