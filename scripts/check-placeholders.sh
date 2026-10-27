#!/usr/bin/env bash
# Chequeo previo a publicar.
#  - Falla (exit 1) si queda el número de WhatsApp placeholder.
#  - Falla si el dominio de js/config.js no coincide con el de canonical/og/sitemap/robots.
#  - Avisa (sin fallar) si hay fotos "próximamente" en el catálogo.
# Uso: bash scripts/check-placeholders.sh
cd "$(dirname "$0")/.." || exit 1

FILES=$(find . -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.xml' -o -name '*.txt' -o -name '*.json' \) \
  -not -path './.git/*' -not -path './node_modules/*' -not -path './scripts/*' -not -path './_originales/*' -not -path './.vercel/*')
status=0

echo "== Número de WhatsApp placeholder (XXXXXXXXX)"
if grep -n "XXXXXXXXX" $FILES; then
  echo "ERROR: falta cargar el número real en js/config.js y en los href de respaldo de los HTML."
  status=1
else
  echo "OK"
fi

echo
echo "== Dominio (siteUrl)"
site=$(grep -o 'siteUrl: *"[^"]*"' js/config.js | sed 's/.*"\(.*\)"/\1/')
echo "siteUrl en js/config.js: $site"
other=$(grep -ohE 'https://[a-z0-9.-]+\.vercel\.app|https://tecnolab[a-z0-9.-]*\.[a-z]+' *.html robots.txt sitemap.xml | sort -u | grep -vxF "$site")
if [ -n "$other" ]; then
  echo "ERROR: dominios distintos de siteUrl en canonical/og/sitemap/robots:"
  echo "$other"
  status=1
else
  echo "OK"
fi

echo
echo '== "Foto próximamente" (aviso, no falla)'
grep -n "Foto próximamente" $FILES || echo "ninguna"

exit $status
