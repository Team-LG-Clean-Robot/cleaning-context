import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import re

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
DST = SRC

d = Document(SRC)

# heading 패턴: "아이디어 기획서" 또는 "(n) ..." 또는 한국어 섹션 제목
heading_patterns = [
    r'^아이디어 기획서$',
    r'^\(\d+\)',  # (1), (2) ...
]

def is_heading(text):
    text = text.strip()
    return any(re.match(p, text) for p in heading_patterns)

def set_page_break_before(p):
    pPr = p._element.find(qn('w:pPr'))
    if pPr is None:
        pPr = OxmlElement('w:pPr')
        p._element.insert(0, pPr)
    pbb = pPr.find(qn('w:pageBreakBefore'))
    if pbb is None:
        pbb = OxmlElement('w:pageBreakBefore')
        pPr.append(pbb)

count = 0
for p in d.paragraphs:
    if is_heading(p.text):
        set_page_break_before(p)
        count += 1
        print(f'  page break before: {p.text!r}')

d.save(DST)
print(f'\n총 {count}개 헤딩 앞에 페이지 나누기 추가')
