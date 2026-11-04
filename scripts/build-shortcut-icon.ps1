$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $projectRoot 'assets'
$sourcePath = Join-Path $assets 'chatgpt-logo-source.png'
$iconPath = Join-Path $assets 'codex-icon.ico'
$previewPath = Join-Path $assets 'codex-icon-preview.png'

Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
if ($source.Width -ne $source.Height) {
  $source.Dispose()
  throw 'Expected a square logo image.'
}

$canvasSize = $source.Width
$base = [System.Drawing.Bitmap]::new($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($base)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $canvasSize, $canvasSize))
$graphics.Dispose()
$source.Dispose()

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frames = foreach ($size in $sizes) {
  $frame = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $frameGraphics = [System.Drawing.Graphics]::FromImage($frame)
  $frameGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $frameGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $frameGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $frameGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $frameGraphics.DrawImage($base, [System.Drawing.Rectangle]::new(0, 0, $size, $size))
  $frameGraphics.Dispose()
  $stream = [System.IO.MemoryStream]::new()
  $frame.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $frame.Dispose()
  [pscustomobject]@{ Size = $size; Png = $stream.ToArray() }
  $stream.Dispose()
}

$icoStream = [System.IO.File]::Create($iconPath)
$writer = [System.IO.BinaryWriter]::new($icoStream)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($frame in $frames) {
  $dimension = if ($frame.Size -eq 256) { 0 } else { [byte]$frame.Size }
  $writer.Write([byte]$dimension)
  $writer.Write([byte]$dimension)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]32)
  $writer.Write([uint32]$frame.Png.Length)
  $writer.Write([uint32]$offset)
  $offset += $frame.Png.Length
}
foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Png) }
$writer.Dispose()
$icoStream.Dispose()

$previewStream = [System.IO.File]::Create($previewPath)
$base.Save($previewStream, [System.Drawing.Imaging.ImageFormat]::Png)
$previewStream.Dispose()
$base.Dispose()
Write-Output "Created $iconPath with $($frames.Count) sizes; the source alpha and rounded corners are preserved."
