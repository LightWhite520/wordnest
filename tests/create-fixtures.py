"""Create a tiny, deterministic two-sheet XLSX without external dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape

def sheet(rows):
    out = []
    for n, row in enumerate(rows, 1):
        cells = ''.join(f'<c r="{chr(65+i)}{n}" t="inlineStr"><is><t>{escape(value)}</t></is></c>' for i, value in enumerate(row))
        out.append(f'<row r="{n}">{cells}</row>')
    return '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + ''.join(out) + '</sheetData></worksheet>'

folder = Path(__file__).parent / 'fixtures'
folder.mkdir(exist_ok=True)
with ZipFile(folder / 'two-sheets.xlsx', 'w', ZIP_DEFLATED) as file:
    file.writestr('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
    file.writestr('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    file.writestr('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="说明" sheetId="1" r:id="rId1"/><sheet name="词汇" sheetId="2" r:id="rId2"/></sheets></workbook>')
    file.writestr('xl/_rels/workbook.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>')
    file.writestr('xl/worksheets/sheet1.xml', sheet([['这是说明页，请选择词汇工作表']]))
    file.writestr('xl/worksheets/sheet2.xml', sheet([['英文','释义','例句'],['meadow','草地','A quiet meadow.'],['brook','小溪','A clear brook.']]))
