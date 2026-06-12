import io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Comentarii verbose/tip-eseu (detectabile ca AI) de ELIMINAT complet.
# Pastram comentariile terse, factuale (umane, utile la debug).
DELETE = {
    'SmartDeviceCard.tsx': [
        "This ensures if the user navigates away",
        "We intentionally do NOT use onSuccess",
        'because that causes the "revert" glitch',
        "We let the cache invalidation handle eventual consistency",
        "Ensure invalidation happens strictly after state setting",
        "We use a slight delay for visual consistency",
        "This prevents infinite loading spinners",
        "we clear it aggressively in the useEffect",
        'This prevents the "flash" where incorrect server state',
        "However, if the server state matches our optimistic state",
        'BUT if the server state has "caught up"',
        'This handles the "force send" scenario',
        "AND if the server actually has those keys",
        "Use loose equality for numbers/strings just in case",
        'This effectively "locks" the loading state',
        'The server caught up! We can "resync"',
        "This feels instant but prevents accidental double-execution",
        "Clear debouncing flag slightly later to ensure overlap",
        'This prevents the "gap" where neither debouncing',
        "Whether the card is conceptually tappable, ignoring the transient",
        "state. Used for layout-affecting hints so the card height stays stable",
        "while a command is in flight (the loading overlay shows progress",
        "Ensures every mapped control is shown instead of being silently dropped",
        "keeping the card reusable for new sensors/gauges added in the future",
    ],
    'DeviceUICreator.tsx': [
        "Algorithm:",
        "1. Separate sensors and controls",
        "2. For sensors:",
        "1 sensor: row layout, large size",
        "2 sensors: square layout, medium size",
        "3 sensors: 1 large square",
        "4+ sensors: square layout, alternate sizes",
        "3. For controls (switches):",
        "1 control: row layout, large size",
        "2-3 controls: row layout, medium size",
        "4+ controls: row layout, small size",
        "4. Pair related sensors (temp+humidity)",
        "5. Motion sensors always get medium size",
        "Sensor types are derived from NODE_TO_WIDGET_MAP",
        "type that maps to a widget",
        "comingSoon` widgets are valid choices kept for forward-compat",
        "support isn't wired up yet, so the builder renders them disabled",
        "Only currently-supported sensors are auto-generated; motion/light/co2 are",
        "future implementations and intentionally omitted",
        "First sensor gets large size for visual hierarchy",
        "Alternate sizes for visual rhythm",
        "But motion sensors stay medium (binary doesn't need large)",
        "Motion sensors: always medium (binary state)",
        "Temp/Humidity pairs: same size for visual consistency",
        "Single sensor: row layout, large for prominence",
        "Two sensors: square grid, medium size",
        "3+ sensors: square grid, varied sizes",
    ],
    'mqtt_listener.py': [
        "This requires 'device_type' and 'card_template' relation",
        "Since this is a management command loop",
        "Ideally caches would be used",
        "Firmware sends: {\"temperature\": 25.5",
        "Device Type has widgets mapped to:",
        "We need to find which widget corresponds to the incoming key",
    ],
    'models.py': [
        "data and saved templates never break) but are NOT yet wired",
        "so the builder UI should present them",
    ],
}

JSDOC_OLD = '''/**
 * Hook that manages the dashboard grid layout state.
 *
 * - Fetches layout from API on mount (falls back to localStorage offline)
 * - Auto-reconciles when the device list changes
 * - Debounce-saves to API (and mirrors to localStorage as cache)
 * - Flushes pending saves immediately when exiting edit mode ("Done")
 * - Provides mutation helpers (reorder, create/rename/delete folder, etc.)
 */'''
JSDOC_NEW = '// manages dashboard grid layout: API/localStorage persistence, reconcile, folder mutations'

def is_comment(s):
    return s.startswith('//') or s.startswith('#') or s.startswith('*') or s.startswith('/*')

def process(fname, marker_unused):
    p = 'cod/' + fname
    txt = open(p, encoding='utf-8').read()
    if fname == 'useDashboardLayout.ts':
        txt = txt.replace(JSDOC_OLD, JSDOC_NEW)
    dels = DELETE.get(fname, [])
    out = []
    removed = 0
    for ln in txt.split('\n'):
        s = ln.strip()
        if is_comment(s) and any(d in ln for d in dels):
            removed += 1
            continue
        if is_comment(s):
            # normalizeaza separatoarele decorative: "// -- X --" / "// === X ===" -> "// X"
            m = re.match(r'^(\s*(?://|#))\s*[-=]{2,}\s*(.+?)\s*[-=]*\s*$', ln)
            if m and re.search(r'[A-Za-z]', m.group(2)):
                ln = '%s %s' % (m.group(1), m.group(2).strip())
            # ramasite de em-dash (-- ca separator de clauza) -> virgula
            ln = re.sub(r'\s--\s', ', ', ln)
        out.append(ln)
    res = re.sub(r'\n{3,}', '\n\n', '\n'.join(out))
    open(p, 'w', encoding='utf-8', newline='\n').write(res)
    return removed

files = ['models.py','serializers.py','permissions.py','mqtt_listener.py','mqtt_client.py',
         'fronius.py','apiClient.js','SmartDeviceCard.tsx','useDashboardLayout.ts','DeviceUICreator.tsx']
print('%-26s %s' % ('fisier', 'comentarii scoase'))
for f in files:
    n = process(f, None)
    print('%-26s %d' % (f, n))
