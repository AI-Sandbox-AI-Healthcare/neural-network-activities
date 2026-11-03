#!/usr/bin/env python3
"""Run the source-aware 38-activity check using an installed Playwright CLI."""
import argparse
import json
from pathlib import Path
import subprocess
from urllib.parse import urlparse


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8001/')
    parser.add_argument('--cli', default='playwright-cli', help='CLI executable or wrapper path')
    parser.add_argument('--session', default='nn-activities')
    parser.add_argument('--reuse', action='store_true', help='Reuse an already open named session')
    args = parser.parse_args()
    url = args.url.rstrip('/') + '/'
    if urlparse(url).hostname not in {'localhost', '127.0.0.1', '::1'}:
        parser.error('Use a locally served docs/ directory for these checks.')
    root = Path(__file__).resolve().parent.parent
    output = root / 'output/playwright'
    output.mkdir(parents=True, exist_ok=True)
    prefix = [args.cli, f'-s={args.session}']
    try:
        launch = subprocess.run(prefix + ['goto' if args.reuse else 'open', url], capture_output=True, text=True)
        if launch.returncode or '### Error' in launch.stdout:
            raise SystemExit(launch.stdout + launch.stderr)
        code = (root / 'tests/browser_checks.cjs').read_text().replace('__ACTIVITIES_BASE_URL__', url)
        result = subprocess.run(prefix + ['run-code', code], capture_output=True, text=True)
    except FileNotFoundError:
        parser.error('Playwright CLI not found; install @playwright/cli or pass --cli PATH.')
    (output / 'browser-check.log').write_text(result.stdout + result.stderr)
    if result.returncode or '### Result\n' not in result.stdout:
        raise SystemExit(f'Browser check failed; see {output / "browser-check.log"}')
    rows, _ = json.JSONDecoder().raw_decode(result.stdout.split('### Result\n', 1)[1].lstrip())
    (output / 'browser-check.json').write_text(json.dumps(rows, indent=2) + '\n')
    failures = [r for r in rows if r.get('error') or r.get('errors') or r.get('initiallyComplete')
                or not r.get('complete') or r.get('mathErrors')]
    failures += [r for r in rows if r.get('state', {}).get('retryEnabled') is False
                 or r.get('state', {}).get('beforeWhy') is True]
    if len(rows) != 38 or failures:
        raise SystemExit(f'{len(failures)} failures across {len(rows)} activities: {json.dumps(failures, indent=2)}')
    print('38/38 activities initialized and reached completion; no JavaScript or math-render errors.')
    print(f'Results: {output / "browser-check.json"}')


if __name__ == '__main__':
    main()
