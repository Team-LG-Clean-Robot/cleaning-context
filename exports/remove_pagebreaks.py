import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
DST = SRC

d = Document(SRC)

# 모든 페이지 나누기 (<w:br w:type="page"/>) 제거
removed = 0
for br in d.element.iter(qn('w:br')):
    if br.get(qn('w:type')) == 'page':
        br.getparent().remove(br)
        removed += 1

# w:pageBreakBefore 도 같이 제거 (혹시 있다면)
pbb_removed = 0
for pbb in d.element.iter(qn('w:pageBreakBefore')):
    pbb.getparent().remove(pbb)
    pbb_removed += 1

d.save(DST)
print(f'페이지 나누기 제거: {removed}개')
print(f'pageBreakBefore 제거: {pbb_removed}개')
