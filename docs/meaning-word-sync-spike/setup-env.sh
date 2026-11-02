#!/usr/bin/env bash
# Build a Python venv with aeneas forced alignment ready, on Python 3.13 + numpy.
# aeneas 1.7.3 does not install cleanly on modern Python/numpy and expects classic
# `espeak`; this script captures every workaround discovered in the spike.
#
# Usage:
#   bash setup-env.sh
#   . venv/bin/activate
#   python aligner.py en:001007 ta:001007
set -euo pipefail
cd "$(dirname "$0")"

echo "== 1. system deps (espeak-ng + build tools) =="
sudo apt-get update
sudo apt-get install -y espeak-ng espeak-ng-data libespeak-ng-dev ffmpeg python3-dev build-essential

echo "== 2. compat symlinks (aeneas links -lespeak and calls \`espeak\`) =="
NGSO="$(ls /usr/lib/*/libespeak-ng.so 2>/dev/null | head -1)"
sudo ln -sf "$NGSO" "$(dirname "$NGSO")/libespeak.so"
sudo ln -sf /usr/bin/espeak-ng /usr/local/bin/espeak

echo "== 3. venv + numpy =="
python3 -m venv venv
. venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install "numpy<2"

echo "== 4. aeneas sdist, patched for Py3.12+ (drop numpy.distutils) =="
TMP="$(mktemp -d)"
URL="$(curl -sS https://pypi.org/pypi/aeneas/json | python3 -c "import sys,json;d=json.load(sys.stdin);print([u['url'] for u in d['releases']['1.7.3.0'] if u['url'].endswith('.tar.gz')][0])")"
curl -sS -o "$TMP/aeneas.tar.gz" "$URL"
tar xzf "$TMP/aeneas.tar.gz" -C "$TMP"
SRC="$TMP/aeneas-1.7.3.0"
python3 - "$SRC/setup.py" <<'PY'
import sys
f=sys.argv[1]; s=open(f).read()
s=s.replace(
"""try:
    from numpy import get_include
    from numpy.distutils import misc_util
except ImportError:
    print("[ERRO] You must install numpy before installing aeneas")
    print("[INFO] Try the following command:")
    print("[INFO] $ sudo pip install numpy")
    sys.exit(1)

# to compile cdtw and cmfcc, we need to include the NumPy dirs
INCLUDE_DIRS = [misc_util.get_numpy_include_dirs()]""",
"""try:
    from numpy import get_include
except ImportError:
    print("[ERRO] You must install numpy before installing aeneas")
    sys.exit(1)

# to compile cdtw and cmfcc, we need to include the NumPy dirs
INCLUDE_DIRS = [get_include()]""")
open(f,"w").write(s)
print("patched setup.py")
PY
pip install --no-build-isolation "$SRC"

echo "== 5. verify =="
PYTHONIOENCODING=UTF-8 python -m aeneas.diagnostics || true
echo
echo "Done. Activate with:  . venv/bin/activate"
echo "Run the aligner with: python aligner.py en:001007 ta:001007"
echo
echo "IMPORTANT: always run aeneas with cew disabled, e.g."
echo '  RuntimeConfiguration("cew=False|tts=espeak|tts_path=/usr/bin/espeak-ng")'
echo "(cew hangs when linked against espeak-ng; the CLI wrapper is fast and correct.)"
