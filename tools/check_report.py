"""Validate the distributable report with Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'outputs' / 'sgrt-interactive-report'
V2_PAGES = (
    'technical-v2/index.html',
    'technical-v2/surface/index.html',
    'technical-v2/coordinates/index.html',
    'technical-v2/pose/index.html',
    'technical-v2/validity/index.html',
    'technical-v2/feedback/index.html',
    'technical-v2/evidence/index.html',
)

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

def check_page(path, root=REPORT):
    page = Page()
    page.feed(path.read_text(encoding='utf-8'))
    assert page.h1 == 1, 'Expected one report title'
    assert len(page.ids) == len(set(page.ids)), 'Duplicate HTML IDs'
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        if url.path:
            asset = (path.parent / unquote(url.path)).resolve()
            assert asset.is_relative_to(root.resolve()), f'Resource escapes report: {link}'
            assert asset.is_file(), f'Missing resource: {link}'
            if url.fragment and asset.suffix.lower() == '.html':
                target = Page()
                target.feed(asset.read_text(encoding='utf-8'))
                assert unquote(url.fragment) in target.ids, f'Missing cross-page anchor: {link}'
        elif url.fragment:
            assert unquote(url.fragment) in page.ids, f'Missing anchor: {link}'
    return page


def _v2_data():
    text = (REPORT / 'technical-v2' / 'assets' / 'report-data.js').read_text(encoding='utf-8')
    marker = 'window.SGRT_REPORT_DATA = Object.freeze('
    start = text.index(marker) + len(marker)
    data, _ = json.JSONDecoder().raw_decode(text[start:])
    return data


def check_evidence_refs(data):
    """Every chapter and experiment must point at a registered evidence id."""
    known = {item['id'] for item in data['evidence']}
    for owner in [*data['chapters'], *data['experiments']]:
        for evidence_id in owner.get('evidenceIds', []):
            assert evidence_id in known, (
                f"Unknown evidence: {evidence_id} in {owner['id']}"
            )


def check_v2(root=REPORT):
    """Validate the v2 hub, chapter pages, registry and legacy redirect map."""
    v2_root = root / 'technical-v2'
    pages = {}
    for relative in V2_PAGES:
        path = root / relative
        assert path.is_file(), f'Missing v2 page: {relative}'
        pages[relative] = check_page(path, root)

    data = _v2_data()
    check_evidence_refs(data)
    chapters = data['chapters']
    experiments = data['experiments']
    assert len(chapters) == 6, 'Expected six v2 chapters'
    assert len(experiments) == 15, 'Expected fifteen v2 experiments'
    assert len({item['id'] for item in experiments}) == 15, 'Duplicate experiment ID'
    chapter_ids = {item['id'] for item in chapters}
    for experiment in experiments:
        assert experiment['chapterId'] in chapter_ids, f"Unknown chapter: {experiment['chapterId']}"
        assert experiment['id'] in pages['technical-v2/index.html'].ids, (
            f"Hub experiment index missing: {experiment['id']}"
        )

    legacy_anchors = data['legacyAnchors']
    for old_id, target in legacy_anchors.items():
        url = urlsplit(target)
        assert url.path, f'Legacy anchor has no page: {old_id}'
        target_path = (v2_root / unquote(url.path)).resolve()
        assert target_path.is_relative_to(v2_root.resolve()), f'Legacy target escapes v2: {target}'
        target_page = check_page(target_path, root)
        assert unquote(url.fragment) in target_page.ids, f'Legacy anchor missing: {old_id} -> {target}'

    return {
        'pages': len(pages),
        'experiments': len(experiments),
        'legacy_anchors': legacy_anchors,
    }


def main():
    page = check_page(REPORT / 'index.html')
    technical = check_page(REPORT / 'technical' / 'index.html')
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
    v2 = check_v2(REPORT)
    version = (ROOT / 'VERSION').read_text(encoding='utf-8').strip()
    print(f'PASS v{version}: two reports, {len(technical.ids)} technical anchors, '
          f'{v2["experiments"]} v2 experiments, local assets, 29 source pages, SVG and PDF integrity')

if __name__ == '__main__':
    main()
