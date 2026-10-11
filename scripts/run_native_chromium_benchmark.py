#!/usr/bin/env python3
"""Run the opt-in Chromium capture against a clean, committed experiment source."""
import argparse
import os
import subprocess
import time
import urllib.request
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--capture-dir", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    if subprocess.check_output(["git","branch","--show-current"],text=True).strip() != "dev-native-chromium-print":
        raise RuntimeError("Run only on dev-native-chromium-print")
    if subprocess.check_output(["git","status","--porcelain","--untracked-files=no"],text=True).strip():
        raise RuntimeError("Commit tracked changes before capturing a source SHA")
    output = args.capture_dir.resolve()
    if output.exists() and any(output.iterdir()):
        raise RuntimeError("Use a new empty capture directory; never mix captures")
    output.mkdir(parents=True,exist_ok=True)
    route_tree = root/"src/routeTree.gen.ts"
    original_tree = route_tree.read_bytes()
    with (output/"vite.log").open("w") as log:
        server = subprocess.Popen(["node_modules/.bin/vite","dev","--host","127.0.0.1","--port","4173","--strictPort"],stdout=log,stderr=subprocess.STDOUT)
        try:
            for attempt in range(60):
                if server.poll() is not None: raise RuntimeError("Vite failed; inspect vite.log")
                try:
                    urllib.request.urlopen("http://127.0.0.1:4173/",timeout=1)
                    break
                except Exception:
                    time.sleep(1)
            else: raise RuntimeError("Vite did not become ready")
            # The router plugin rewrites ordering in this generated file. Restore
            # the committed bytes before capture; no application source differs.
            route_tree.write_bytes(original_tree)
            env = {**os.environ,"NATIVE_PRINT_BENCHMARK_DIR":str(output)}
            with (output/"capture.log").open("w") as capture_log:
                subprocess.run(["node_modules/.bin/playwright","test","tests/e2e/native-chromium-benchmark.spec.ts","--workers=1","--reporter=line"],env=env,stdout=capture_log,stderr=subprocess.STDOUT,check=True)
        finally:
            server.terminate()
            server.wait(timeout=15)
    print(f"Capture complete: {output}; score with native_chromium_print_benchmark.py")


if __name__ == "__main__": main()
