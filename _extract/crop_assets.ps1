Add-Type -AssemblyName System.Drawing

$media = "C:\Users\CarlosOmarAldabaEstr\Desktop\ruta-1-demo\_extract\word\media"
$out   = "C:\Users\CarlosOmarAldabaEstr\Desktop\ruta-1-demo\public_assets\brand"

function Get-TightBBox {
    param([System.Drawing.Bitmap]$bmp)
    $w = $bmp.Width; $h = $bmp.Height
    $minX = $w; $minY = $h; $maxX = 0; $maxY = 0
    $found = $false
    # Sample every pixel using LockBits for speed
    $rect = New-Object System.Drawing.Rectangle(0,0,$w,$h)
    $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $stride = $bmpData.Stride
    $bytes = New-Object byte[] ($stride * $h)
    [System.Runtime.InteropServices.Marshal]::Copy($bmpData.Scan0, $bytes, 0, $bytes.Length)
    $bmp.UnlockBits($bmpData)

    for ($y = 0; $y -lt $h; $y++) {
        $rowOffset = $y * $stride
        for ($x = 0; $x -lt $w; $x++) {
            $idx = $rowOffset + $x * 4
            $b = $bytes[$idx]; $g = $bytes[$idx+1]; $r = $bytes[$idx+2]; $a = $bytes[$idx+3]
            # content = not transparent AND not near-white
            if ($a -gt 10 -and -not ($r -gt 245 -and $g -gt 245 -and $b -gt 245)) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
                $found = $true
            }
        }
    }
    if (-not $found) { return $null }
    return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

function Crop-And-Save {
    param(
        [string]$srcPath,
        [int]$x, [int]$y, [int]$w, [int]$h,
        [string]$dstPath,
        [int]$pad = 12,
        [switch]$AutoTrim
    )
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $quad = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($quad)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0,0,$w,$h)), (New-Object System.Drawing.Rectangle($x,$y,$w,$h)), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()

    if ($AutoTrim) {
        $bbox = Get-TightBBox -bmp $quad
        if ($bbox) {
            $bx = [Math]::Max(0, $bbox.X - $pad)
            $by = [Math]::Max(0, $bbox.Y - $pad)
            $bw = [Math]::Min($quad.Width - $bx, $bbox.W + 2*$pad)
            $bh = [Math]::Min($quad.Height - $by, $bbox.H + 2*$pad)
            $final = New-Object System.Drawing.Bitmap($bw, $bh)
            $g2 = [System.Drawing.Graphics]::FromImage($final)
            $g2.DrawImage($quad, (New-Object System.Drawing.Rectangle(0,0,$bw,$bh)), (New-Object System.Drawing.Rectangle($bx,$by,$bw,$bh)), [System.Drawing.GraphicsUnit]::Pixel)
            $g2.Dispose()
            $quad.Dispose()
            $quad = $final
        }
    }

    $quad.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $quad.Dispose()
    Write-Host "Saved $dstPath"
}

# --- Logo (image1.png) - copy as-is ---
Copy-Item "$media\image1.png" "$out\logo.png" -Force
Write-Host "Saved $out\logo.png (copy)"

# --- Families of product (image4.png) 1700x1583, 2x2 grid, split at 850/791 ---
# top row starts at y=165 to exclude the page title/subtitle text above the cards
Crop-And-Save -srcPath "$media\image4.png" -x 0    -y 165 -w 850 -h 626 -dstPath "$out\families\planeaciones.png" -AutoTrim
Crop-And-Save -srcPath "$media\image4.png" -x 850  -y 165 -w 850 -h 626 -dstPath "$out\families\fichas.png" -AutoTrim
Crop-And-Save -srcPath "$media\image4.png" -x 0    -y 791 -w 850 -h 792 -dstPath "$out\families\diapositivas.png" -AutoTrim
Crop-And-Save -srcPath "$media\image4.png" -x 850  -y 791 -w 850 -h 792 -dstPath "$out\families\seguimiento.png" -AutoTrim

# --- Attributes (image6.png) same grid ---
Crop-And-Save -srcPath "$media\image6.png" -x 0    -y 165 -w 850 -h 626 -dstPath "$out\attributes\actualizado.png" -AutoTrim
Crop-And-Save -srcPath "$media\image6.png" -x 850  -y 165 -w 850 -h 626 -dstPath "$out\attributes\descargable.png" -AutoTrim
Crop-And-Save -srcPath "$media\image6.png" -x 0    -y 791 -w 850 -h 792 -dstPath "$out\attributes\editable.png" -AutoTrim
Crop-And-Save -srcPath "$media\image6.png" -x 850  -y 791 -w 850 -h 792 -dstPath "$out\attributes\recortables.png" -AutoTrim

# --- Routes/packages (image7.png) same grid ---
Crop-And-Save -srcPath "$media\image7.png" -x 0    -y 165 -w 850 -h 626 -dstPath "$out\routes\base.png" -AutoTrim
Crop-And-Save -srcPath "$media\image7.png" -x 850  -y 165 -w 850 -h 626 -dstPath "$out\routes\integral.png" -AutoTrim
Crop-And-Save -srcPath "$media\image7.png" -x 0    -y 791 -w 850 -h 792 -dstPath "$out\routes\seguimiento.png" -AutoTrim
Crop-And-Save -srcPath "$media\image7.png" -x 850  -y 791 -w 850 -h 792 -dstPath "$out\routes\visual.png" -AutoTrim

# --- Coverage (image8.png) same grid ---
Crop-And-Save -srcPath "$media\image8.png" -x 0    -y 165 -w 850 -h 626 -dstPath "$out\coverage\quincena.png" -AutoTrim
Crop-And-Save -srcPath "$media\image8.png" -x 850  -y 165 -w 850 -h 626 -dstPath "$out\coverage\mes.png" -AutoTrim
Crop-And-Save -srcPath "$media\image8.png" -x 0    -y 791 -w 850 -h 792 -dstPath "$out\coverage\trimestre.png" -AutoTrim
Crop-And-Save -srcPath "$media\image8.png" -x 850  -y 791 -w 850 -h 792 -dstPath "$out\coverage\ciclo.png" -AutoTrim

# --- Grade numbers (image9.png) 1536x1024, 3x2 grid, cell 512x512 ---
Crop-And-Save -srcPath "$media\image9.png" -x 0    -y 0   -w 512 -h 512 -dstPath "$out\grades\1.png" -AutoTrim
Crop-And-Save -srcPath "$media\image9.png" -x 512  -y 0   -w 512 -h 512 -dstPath "$out\grades\2.png" -AutoTrim
Crop-And-Save -srcPath "$media\image9.png" -x 1024 -y 0   -w 512 -h 512 -dstPath "$out\grades\3.png" -AutoTrim
Crop-And-Save -srcPath "$media\image9.png" -x 0    -y 512 -w 512 -h 512 -dstPath "$out\grades\4.png" -AutoTrim
Crop-And-Save -srcPath "$media\image9.png" -x 512  -y 512 -w 512 -h 512 -dstPath "$out\grades\5.png" -AutoTrim
Crop-And-Save -srcPath "$media\image9.png" -x 1024 -y 512 -w 512 -h 512 -dstPath "$out\grades\6.png" -AutoTrim

Write-Host "DONE"
