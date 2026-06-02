"""Fix LaTeX texttt patterns broken by earlier scripts.

Replaces:
  TAB + 'exttt'    -> '\texttt'   (i.e. the literal sequence 0x09 'e','x','t','t','t')
  '\\\\' + 'texttt' -> '\\texttt'  (literal '\\\\texttt' present as 4-char text)

Run from project root: python scripts/fix_texttt.py
"""
import glob

TAB_EXTTT = b'\x09exttt'         # TAB followed by 'exttt'
DBL_TEXTTT = b'\\\\texttt'        # literal '\\\\texttt' (four chars when printed)
SGL_TEXTTT = b'\\texttt'          # literal '\texttt'

for path in glob.glob('capitole/*.tex'):
    with open(path, 'rb') as fp:
        data = fp.read()
    before = data
    data = data.replace(TAB_EXTTT, SGL_TEXTTT)
    data = data.replace(DBL_TEXTTT, SGL_TEXTTT)
    if data != before:
        with open(path, 'wb') as fp:
            fp.write(data)
        print(f'rewrote {path}')
    else:
        print(f'unchanged {path}')
