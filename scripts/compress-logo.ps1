Add-Type -AssemblyName System.Drawing
$src = "C:\Users\Larabi Mohamed\Desktop\prototype caftan\public\logo.jpg"
$dest = "C:\Users\Larabi Mohamed\Desktop\prototype caftan\public\og-logo.jpg"

$img = [System.Drawing.Image]::FromFile($src)
$maxDim = 600
$scale = [Math]::Min($maxDim / $img.Width, $maxDim / $img.Height)
if ($scale -gt 1) { $scale = 1 }
$newW = [int]($img.Width * $scale)
$newH = [int]($img.Height * $scale)

$bmp = New-Object System.Drawing.Bitmap($newW, $newH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $newW, $newH)
$img.Dispose()
$g.Dispose()

$enc = [System.Drawing.Imaging.Encoder]::Quality
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($enc, [long]80)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

$bmp.Save($dest, $codec, $ep)
$bmp.Dispose()

Write-Host "Created og-logo.jpg with size:" (Get-Item $dest).Length "bytes"
