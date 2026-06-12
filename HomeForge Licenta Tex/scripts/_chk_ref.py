import io,sys,re,glob
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
tit1={'1':'Stadiul actual','2':'Arhitectura backend','3':'Frontend Next.js','4':'Firmware ESP32','5':'Deployment'}
for f in ['1_introducere','2_stadiul_actual_si_analiza_tehnologiilor','3_arhitectura_sistemului_homeforge','4_frontend','5_firmware_esp32','6_deployment_testare','7_concluzii']:
    p='capitole/'+f+'.tex'
    t=open(p,encoding='utf-8').read()
    for m in re.finditer(r'Capitol(?:ul|ele)?\s+(\d+)', t):
        num=m.group(1)
        s=max(0,m.start()-55); e=min(len(t),m.end()+45)
        ctx=re.sub(r'\s+',' ',t[s:e])
        tgt=tit1.get(num,'?? INVALID')
        print('%-9s Cap.%s [%s]  …%s…' % (f[:9], num, tgt, ctx))
