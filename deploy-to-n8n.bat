@echo off
setlocal

set PROJECT_DIR=%~dp0
set CONTAINER_NAME=n8n
set PACKAGE_NAME=n8n-nodes-comfyui-toolkit

echo [1/5] Bagimliliklar yukleniyor...
cd /d "%PROJECT_DIR%"
call npm install
if %errorlevel% neq 0 ( echo HATA: npm install basarisiz & exit /b 1 )

echo [2/5] Proje build ediliyor...
call npm run build
if %errorlevel% neq 0 ( echo HATA: Build basarisiz & exit /b 1 )

echo [3/5] Tarball olusturuluyor...
for %%f in ("%PROJECT_DIR%%PACKAGE_NAME%-*.tgz") do del "%%f" 2>nul
call npm pack
if %errorlevel% neq 0 ( echo HATA: npm pack basarisiz & exit /b 1 )

for %%f in ("%PROJECT_DIR%%PACKAGE_NAME%-*.tgz") do set TARBALL=%%f
if not defined TARBALL ( echo HATA: Tarball bulunamadi & exit /b 1 )

echo [4/5] Container'a kopyalanip yukleniyor...
docker cp "%TARBALL%" %CONTAINER_NAME%:/home/node/.n8n/nodes/
if %errorlevel% neq 0 ( echo HATA: docker cp basarisiz & exit /b 1 )

for %%f in ("%TARBALL%") do set TARBALL_FILENAME=%%~nxf
docker exec %CONTAINER_NAME% sh -c "cd /home/node/.n8n/nodes && npm install ./%TARBALL_FILENAME%"
if %errorlevel% neq 0 ( echo HATA: Container icinde npm install basarisiz & exit /b 1 )

echo [5/5] n8n yeniden baslatiliyor...
docker restart %CONTAINER_NAME%
if %errorlevel% neq 0 ( echo HATA: docker restart basarisiz & exit /b 1 )

echo.
echo Tamamlandi! n8n adresinde ComfyUI node'lari aktif:
echo http://localhost:5678

endlocal
pause
