#!/usr/bin/env bash
# Package every skill under skills/ as its own ZIP — for ChatGPT's "Drop a skill ZIP or folder", for
# Claude's Settings → Capabilities → Skills upload, or for cubrik's own Skills page (one SKILL.md).
# Each ZIP holds the skill folder at its root (name/SKILL.md, references/, agents/openai.yaml), the
# layout the Agent Skills spec expects. Output: dist/skills/.
set -euo pipefail
cd "$(dirname "$0")/.."
out="dist/skills"
rm -rf "$out" && mkdir -p "$out"
for dir in skills/*/; do
  name="$(basename "$dir")"
  [ -f "$dir/SKILL.md" ] || { echo "skip $name: no SKILL.md"; continue; }
  ( cd skills && zip -qr "../$out/$name.zip" "$name" -x '*.DS_Store' '__MACOSX/*' )
  printf '%-28s %6s bytes\n' "$name.zip" "$(stat -f%z "$out/$name.zip")"
done
echo "→ $out/"
