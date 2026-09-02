<#
.SYNOPSIS
    Depo kokundeki .env dosyasini gecerli PowerShell oturumuna yukler.

.DESCRIPTION
    Yerel gelistirme sirlari artik kaynak kodda tutulmuyor: baglanti dizeleri,
    design-time factory'ler ve dogrulama scriptleri parolayi ortam
    degiskeninden okur. Bu script o degiskenleri tek komutla yukler.

    .env dosyasi .gitignore tarafindan disarida tutulur; hicbir zaman
    commit'lenmemelidir. Ilk kurulumda .env.example dosyasini kopyalayip
    kendi degerlerinizi uretin.

.EXAMPLE
    . ./scripts/load-env.ps1
    dotnet run --project SellingBuddy/src/Services/CatalogService/CatalogService.Api
#>
[CmdletBinding()]
param(
    [string]$EnvFile
)

# Dot-source edildiginde $PSScriptRoot bos gelebilir; o durumda calisma
# dizininden yukari dogru .env aranir.
if (-not $EnvFile) {
    $root = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { (Get-Location).Path }
    $EnvFile = Join-Path $root '.env'

    if (-not (Test-Path $EnvFile)) {
        $probe = Get-Location
        while ($probe -and -not (Test-Path (Join-Path $probe '.env'))) {
            $probe = Split-Path -Parent $probe
        }
        if ($probe) { $EnvFile = Join-Path $probe '.env' }
    }
}

if (-not (Test-Path $EnvFile)) {
    throw ".env bulunamadi: $EnvFile`nOnce .env.example dosyasini kopyalayip kendi degerlerinizi uretin."
}

$loaded = 0
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()

    # Yorumlari ve bos satirlari atla.
    if ($line -eq '' -or $line.StartsWith('#')) { return }

    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { return }

    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()

    # Tirnakli degerleri soy.
    if ($value.Length -ge 2 -and
        (($value.StartsWith('"') -and $value.EndsWith('"')) -or
         ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }

    Set-Item -Path "Env:$name" -Value $value
    $script:loaded++
}

Write-Host "$script:loaded ortam degiskeni yuklendi ($EnvFile)" -ForegroundColor Green
