"""Validate the distributable report with Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'outputs' / 'sgrt-interactive-report'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.h1 = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.h1 += tag == 'h1'
        for key in ('src', 'href', 'data-image'):
            if key in attrs:
                self.links.append(attrs[key])

def main():
    page = Page()
    page.feed((REPORT / 'index.html').read_text(encoding='utf-8'))
    assert page.h1 == 1, 'Expected one report title'
    assert len(page.ids) == len(set(page.ids)), 'Duplicate HTML IDs'
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        if url.path:
            asset = (REPORT / unquote(url.path)).resolve()
            assert asset.is_relative_to(REPORT.resolve()), f'Resource escapes report: {link}'
            assert asset.is_file(), f'Missing resource: {link}'
        elif url.fragment:
            assert unquote(url.fragment) in page.ids, f'Missing anchor: {link}'
    source = json.loads((REPORT / 'source.json').read_text(encoding='utf-8'))
    assert [s['page'] for s in source['slides']] == list(range(1, 30))
    manuscript = (REPORT / 'report.md').read_text(encoding='utf-8')
    assert source['sha256'] in manuscript, 'Source fingerprint missing from manuscript'
    for slide in source['slides']:
        assert f"source-{slide['page']:02d}" in page.ids
        assert slide['notes'] in manuscript, f"Notes missing on page {slide['page']}"
    images = list((REPORT / 'assets').glob('*.svg'))
    assert len(images) == 9, 'Expected eight illustrations and one site icon'
    for image in images:
        ET.parse(image)
    assert (REPORT / 'assets' / 'structure-atlas.html').stat().st_size > 0
    pdf = REPORT / 'AlignRT与SGRT专题报告_A4.pdf'
    assert pdf.read_bytes().startswith(b'%PDF-'), 'Invalid PDF header'
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    print(f'PASS v{version}: local assets, anchors, 29 source pages, SVG and PDF integrity')

if __name__ == '__main__':
    main()
