@echo off
title BAZUH PDV

cd /d "C:\Users\vande\OneDrive\Desktop\Projetos\ERP-BAZUH"

echo Iniciando BAZUH PDV...

start "" "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" "http://localhost:4173/"

npm run preview -- --host localhost

pause