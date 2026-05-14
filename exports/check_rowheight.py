import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
d = Document(SRC)

for ti, t in enumerate(d.tables):
    print(f'\n=== Table {ti} ===')
    for ri, row in enumerate(t.rows):
        trPr = row._tr.find(qn('w:trPr'))
        trHeight = trPr.find(qn('w:trHeight')) if trPr is not None else None
        if trHeight is not None:
            val = trHeight.get(qn('w:val'))
            rule = trHeight.get(qn('w:hRule'))
            print(f'  row {ri}: height={val}, rule={rule}')
        else:
            print(f'  row {ri}: no trHeight (auto)')
