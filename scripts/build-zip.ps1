param([string]$OutFile = "dobby-zork.zip")

$ErrorActionPreference = "Stop"
Write-Host "Building zip -> $OutFile"

$root = Join-Path $PWD "dobby-zork"
$tmp = Join-Path $PWD "mz-dist"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Copy-Item -Recurse -Force (Join-Path $root "src") (Join-Path $tmp "src")
Copy-Item -Recurse -Force (Join-Path $root "public") (Join-Path $tmp "public")
Copy-Item -Force (Join-Path $root "package.json") (Join-Path $tmp "package.json")
Copy-Item -Force (Join-Path $root "wrangler.toml") (Join-Path $tmp "wrangler.toml")

if (Test-Path $OutFile) { Remove-Item -Force $OutFile }
Compress-Archive -Path (Join-Path $tmp '*') -DestinationPath $OutFile
Write-Host "Created $OutFile"
