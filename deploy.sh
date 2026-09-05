#!/bin/sh
# Публикация тренажёра на GitHub Pages: проставить версию ассетам (обход кеша
# браузера — иначе новая index.html может прийти со старым app.js), скопировать в
# публичную папку, закоммитить, запушить.
#   ./deploy.sh "текст коммита"
set -e
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M)
python3 - "$V" <<'PY'
import re, sys
v = sys.argv[1]; p = 'index.html'; s = open(p).read()
s = re.sub(r'href="css/style\.css(\?v=[^"]*)?"', 'href="css/style.css?v=%s"' % v, s)
s = re.sub(r'src="js/(\w+)\.js(\?v=[^"]*)?"', lambda m: 'src="js/%s.js?v=%s"' % (m.group(1), v), s)
open(p, 'w').write(s)
PY
rsync -a --delete --exclude .git ./ ../../legaldesign-trainer/
cd ../../legaldesign-trainer
git add -A
git commit -q -m "${1:-Обновление тренажёра} (assets v$V)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" || true
GIT_TERMINAL_PROMPT=0 git push -q origin master
echo "опубликовано, версия ассетов $V"
