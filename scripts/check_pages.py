#!/usr/bin/env python3
"""Check that the committed GitHub Pages files match their shared source."""
import contextlib
import io
from pathlib import Path
import tempfile
import build_pages


def main():
    with tempfile.TemporaryDirectory() as temp:
        build_pages.DOCS = Path(temp) / 'docs'
        with contextlib.redirect_stdout(io.StringIO()):
            build_pages.main()
        mismatches = []
        for generated in build_pages.DOCS.rglob('*'):
            if generated.is_file():
                relative = generated.relative_to(build_pages.DOCS)
                committed = build_pages.ROOT / 'docs' / relative
                if not committed.is_file() or committed.read_bytes() != generated.read_bytes():
                    mismatches.append(str(relative))
        expected = {act[0] + '.html' for act in build_pages.ACTIVITIES}
        actual = {p.name for p in (build_pages.ROOT / 'docs/activities').glob('*.html')}
        mismatches.extend(f'activity catalog: {p}' for p in expected ^ actual)
        if mismatches:
            raise SystemExit('Regenerate with python3 scripts/build_pages.py:\n' + '\n'.join(mismatches))
    print('All 38 activity pages and shared assets match the source.')


if __name__ == '__main__':
    main()
