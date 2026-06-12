import io,sys,re,glob
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
files=['models.py','serializers.py','permissions.py','mqtt_listener.py','mqtt_client.py','fronius.py','apiClient.js','SmartDeviceCard.tsx','useDashboardLayout.ts','DeviceUICreator.tsx']
for f in files:
    p='cod/'+f
    lines=open(p,encoding='utf-8').read().split('\n')
    print('\n##### '+f+' #####')
    for i,ln in enumerate(lines,1):
        s=ln.strip()
        if s.startswith('#') or s.startswith('//') or s.startswith('*') or s.startswith('/*'):
            print('%4d: %s' % (i, s[:150]))
