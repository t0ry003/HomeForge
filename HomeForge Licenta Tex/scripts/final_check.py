"""Final sanity-check that \\texttt is properly formed everywhere.

Counts:
  - 'exttt' (any 'exttt' bytes in file)
  - '\\texttt' bytes (single backslash + 'texttt')
  - if the two differ, there are broken occurrences.
"""
import glob

BACKSLASH_T = b'\x5C' + b'texttt'  # \texttt = 7 bytes

for path in glob.glob('capitole/*.tex'):
    with open(path, 'rb') as fp:
        data = fp.read()
    total_exttt = data.count(b'exttt')
    valid = data.count(BACKSLASH_T)
    broken = total_exttt - valid
    flag = '   OK' if broken == 0 else ' BROKEN'
    print(f'{flag}  {path}: total exttt={total_exttt}, valid \\texttt={valid}, broken={broken}')
