import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
DST = SRC

d = Document(SRC)

fixed = 0
for t in d.tables:
    for row in t.rows:
        trPr = row._tr.find(qn('w:trPr'))
        if trPr is None:
            continue
        trHeight = trPr.find(qn('w:trHeight'))
        if trHeight is None:
            continue
        rule = trHeight.get(qn('w:hRule'))
        if rule == 'exact':
            # exact → atLeast: 최소 높이 유지하되 내용 따라 자동 확장
            trHeight.set(qn('w:hRule'), 'atLeast')
            fixed += 1

d.save(DST)
print(f'{fixed} rows: exact → atLeast (자동 확장)')
