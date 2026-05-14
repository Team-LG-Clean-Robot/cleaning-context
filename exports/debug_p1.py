import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
from lxml import etree

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
d = Document(SRC)

body = d.element.body
# print the first 6 body children with tag and key attrs
for i, el in enumerate(body):
    if i > 10: break
    tag = etree.QName(el).localname
    text = ''
    if tag == 'p':
        text = ''.join(t.text or '' for t in el.iter(qn('w:t')))[:60]
    elif tag == 'tbl':
        text = '[TABLE]'
    # check for pageBreakBefore, page break runs
    pbb = el.find(f'.//{qn("w:pageBreakBefore")}')
    explicit_br = el.find(f'.//{qn("w:br")}[@{qn("w:type")}="page"]')
    keepNext = el.find(f'.//{qn("w:keepNext")}')
    print(f'{i}: <{tag}> text={text!r}')
    print(f'    pageBreakBefore: {pbb is not None}, explicit page break: {explicit_br is not None}, keepNext: {keepNext is not None}')
    # show pPr full xml for paragraphs
    if tag == 'p':
        pPr = el.find(qn('w:pPr'))
        if pPr is not None:
            print('    pPr xml:', etree.tostring(pPr, pretty_print=True).decode()[:400])
