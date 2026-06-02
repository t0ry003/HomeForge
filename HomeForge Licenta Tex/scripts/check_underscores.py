"""Find \\texttt{...} with unescaped underscores and report them.

In LaTeX text mode, '_' must be written as '\\_' to render as a literal underscore.
This script lists places where we forgot the backslash.

Usage: python scripts/check_underscores.py
"""
import re
import glob

problems = 0
for path in glob.glob('capitole/*.tex'):
    with open(path, 'r', encoding='utf-8') as fp:
        text = fp.read()
    for m in re.finditer(r'\\texttt\{([^{}]*)\}', text):
        inner = m.group(1)
        for idx, ch in enumerate(inner):
            if ch == '_':
                prev = inner[idx - 1] if idx > 0 else ''
                if prev != '\\':
                    problems += 1
                    print(f'{path}: \\texttt{{{inner}}}')
                    break

print(f'TOTAL: {problems} entries with unescaped underscores')
