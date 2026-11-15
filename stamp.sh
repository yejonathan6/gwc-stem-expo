#!/bin/sh
# Bust browser caches after each change: ./stamp.sh  (rewrites ?v= on all local JS imports)
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(from \"\./[a-z0-9-]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g; s#(import\(\"\./[a-z0-9-]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g" js/*.js
sed -i -E "s#(src=\"js/main\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(href=\"styles/[a-z]+\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
echo "stamped v=$V"
