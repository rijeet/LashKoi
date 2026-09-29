# Serves election GeoJSON + map viewer on http://127.0.0.1:8765
# Usage:  cd "E:\Project Next\LashKoi\reference\prototypes"
#         .\serve-map.ps1

$ElectionRoot = "E:\election_file_2026"
$LashKoiRoot = $PSScriptRoot
$Port = 8765

if (-not (Test-Path $ElectionRoot)) {
  Write-Error "Election data folder not found: $ElectionRoot"
  exit 1
}

# Symlink/junction so one server can serve both data and map-viewer.html
$link = Join-Path $ElectionRoot "_map"
if (Test-Path $link) { Remove-Item $link -Force -Recurse -ErrorAction SilentlyContinue }
New-Item -ItemType Junction -Path $link -Target $LashKoiRoot | Out-Null

Write-Host "Data root:  $ElectionRoot"
Write-Host "Open map:   http://127.0.0.1:${Port}/_map/reference/prototypes/map-viewer.html"
Write-Host "Press Ctrl+C to stop."
Set-Location $ElectionRoot
python -m http.server $Port
