Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Larabi Mohamed\Desktop\prototype caftan\public\favicon_source.jpg"
$destOgPath = "C:\Users\Larabi Mohamed\Desktop\prototype caftan\public\og-image.jpg"
$destLogoPath = "C:\Users\Larabi Mohamed\Desktop\prototype caftan\public\logo.jpg"

$logo = [System.Drawing.Image]::FromFile($srcPath)

# 1. Create 1200x630 OpenGraph Banner Image
$bannerW = 1200
$bannerH = 630
$banner = New-Object System.Drawing.Bitmap($bannerW, $bannerH)
$g = [System.Drawing.Graphics]::FromImage($banner)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Fill background with dark luxury color #0B0B0F
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0B0B0F")
$brush = New-Object System.Drawing.SolidBrush($bgColor)
$g.FillRectangle($brush, 0, 0, $bannerW, $bannerH)

# Draw logo centered in the 1200x630 banner (height ~ 550px)
$targetH = 550
$scale = $targetH / $logo.Height
$targetW = [int]($logo.Width * $scale)
$posX = [int](($bannerW - $targetW) / 2)
$posY = [int](($bannerH - $targetH) / 2)

$g.DrawImage($logo, $posX, $posY, $targetW, $targetH)
$g.Dispose()

# Save og-image.jpg (1200x630)
$enc = [System.Drawing.Imaging.Encoder]::Quality
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($enc, [long]85)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

$banner.Save($destOgPath, $codec, $ep)
$banner.Dispose()

# 2. Create 600x600 Square Logo (for square previews)
$sqSize = 600
$sqBmp = New-Object System.Drawing.Bitmap($sqSize, $sqSize)
$gSq = [System.Drawing.Graphics]::FromImage($sqBmp)
$gSq.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSq.FillRectangle($brush, 0, 0, $sqSize, $sqSize)

$scaleSq = $sqSize / [Math]::Max($logo.Width, $logo.Height)
$sqW = [int]($logo.Width * $scaleSq)
$sqH = [int]($logo.Height * $scaleSq)
$sqX = [int](($sqSize - $sqW) / 2)
$sqY = [int](($sqSize - $sqH) / 2)

$gSq.DrawImage($logo, $sqX, $sqY, $sqW, $sqH)
$gSq.Dispose()
$logo.Dispose()

$sqBmp.Save($destLogoPath, $codec, $ep)
$sqBmp.Dispose()

Write-Host "Created og-image.jpg (1200x630):" (Get-Item $destOgPath).Length "bytes"
Write-Host "Created logo.jpg (600x600):" (Get-Item $destLogoPath).Length "bytes"
