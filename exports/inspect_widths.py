import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.shared import Twips, Emu

SRC = r'C:\Users\yusun\Desktop\1-2.프로젝트기획서_작성본.docx'
d = Document(SRC)

# Page setup
sec = d.sections[0]
print(f'page width: {sec.page_width}, height: {sec.page_height}')
print(f'margins: L={sec.left_margin} R={sec.right_margin}')
usable = sec.page_width - sec.left_margin - sec.right_margin
print(f'usable width: {usable} (= {usable / 914400:.2f} inches)')
print()

for ti, t in enumerate(d.tables):
    # get table grid widths
    tblGrid = t._tbl.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tblGrid')
    widths = []
    if tblGrid is not None:
        for gridCol in tblGrid.findall('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}gridCol'):
            w = gridCol.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w')
            widths.append(int(w) if w else None)
    total_dxa = sum(w for w in widths if w)  # dxa = 1/20 pt
    total_emu = total_dxa * 635  # 1 dxa = 635 EMU
    print(f'Table {ti}: rows={len(t.rows)} cols={len(t.columns)}  total_width_dxa={total_dxa}  ({total_emu / 914400:.2f} in)  widths_dxa={widths}')
