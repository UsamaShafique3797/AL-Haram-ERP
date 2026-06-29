# Generates a multi-resolution Windows .ico from the company logo PNG.
# Uses PNG-compressed frames (supported on Windows Vista+), so the icon
# stays crisp at every taskbar / Explorer size.
#
# Usage:
#   cd desktop
#   .\make-icon.ps1

param(
    [string]$SourcePng = "",
    [string]$OutIco = ""
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
if ([string]::IsNullOrWhiteSpace($SourcePng)) {
    $SourcePng = Join-Path $Root "client/public/images/logo.png"
}
if ([string]::IsNullOrWhiteSpace($OutIco)) {
    $OutIco = Join-Path $PSScriptRoot "AlHaram.Desktop/Assets/app.ico"
}

if (-not (Test-Path $SourcePng)) { throw "Logo not found: $SourcePng" }
New-Item -ItemType Directory -Force -Path (Split-Path $OutIco) | Out-Null

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$source = [System.Drawing.Image]::FromFile($SourcePng)

$frames = @()
foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, 0, 0, $s, $s)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $frames += , @{ Size = $s; Bytes = $ms.ToArray() }
    $ms.Dispose()
}
$source.Dispose()

$fs = [System.IO.File]::Open($OutIco, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR
$bw.Write([UInt16]0)                 # reserved
$bw.Write([UInt16]1)                 # type = icon
$bw.Write([UInt16]$frames.Count)     # image count

# Directory entries are 16 bytes each; image data follows.
$offset = 6 + (16 * $frames.Count)
foreach ($f in $frames) {
    $dim = if ($f.Size -ge 256) { 0 } else { $f.Size }
    $bw.Write([Byte]$dim)            # width
    $bw.Write([Byte]$dim)            # height
    $bw.Write([Byte]0)               # palette count
    $bw.Write([Byte]0)               # reserved
    $bw.Write([UInt16]1)             # color planes
    $bw.Write([UInt16]32)            # bits per pixel
    $bw.Write([UInt32]$f.Bytes.Length)
    $bw.Write([UInt32]$offset)
    $offset += $f.Bytes.Length
}
foreach ($f in $frames) {
    $bw.Write($f.Bytes)
}

$bw.Flush()
$bw.Close()
$fs.Close()

Write-Host "Icon written: $OutIco ($($frames.Count) sizes)" -ForegroundColor Green
