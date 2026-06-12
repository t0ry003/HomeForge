import io,sys
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
for p in ['capitole/1_introducere.tex','capitole/7_concluzii.tex']:
    c=open(p,encoding='utf-8').read()
    n=c.count(r'\paragraph{')
    c=c.replace(r'\paragraph{', r'\paragraph*{')
    open(p,'w',encoding='utf-8').write(c)
    print(p.split('/')[-1], '->', n, 'paragraph* ')
