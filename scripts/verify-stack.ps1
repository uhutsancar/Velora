<#
.SYNOPSIS
    End-to-end smoke test of the Velora stack over the API gateway.

.DESCRIPTION
    Walks the whole commercial chain against the running services:

        health -> catalogue -> register -> basket -> checkout -> order

    Every call goes through Ocelot on :5000, so a pass proves gateway routing,
    Consul discovery, JWT issuance, Redis, RabbitMQ and both SQL databases are
    working together - not just that the processes started.

.EXAMPLE
    ./scripts/verify-stack.ps1
#>
[CmdletBinding()]
param(
    [string]$GatewayUrl = 'http://localhost:5000',
    [string]$AdminEmail = 'admin@velora.com',
    [string]$AdminPassword = $(if ($env:VELORA_ADMIN_PASSWORD) { $env:VELORA_ADMIN_PASSWORD } else { throw 'VELORA_ADMIN_PASSWORD tanimli degil. Once ./scripts/load-env.ps1 calistirin.' })
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$script:passed = 0
$script:failed = 0

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    Write-Host "  $Name ... " -NoNewline

    try {
        $result = & $Action
        Write-Host 'GECTI' -ForegroundColor Green
        $script:passed++
        return $result
    }
    catch {
        Write-Host 'BASARISIZ' -ForegroundColor Red
        Write-Host "      $($_.Exception.Message)" -ForegroundColor DarkRed
        $script:failed++
        return $null
    }
}

Write-Host ''
Write-Host "Velora yigin dogrulamasi ($GatewayUrl)" -ForegroundColor Cyan
Write-Host ('-' * 60)

# --- 1. Catalogue is reachable and seeded -----------------------------------
Write-Host 'Katalog' -ForegroundColor Yellow

$products = Test-Step 'Urun listesi' {
    $response = Invoke-RestMethod -Uri "$GatewayUrl/products?pageSize=5" -Method Get
    if ($response.items.Count -eq 0) { throw 'Katalogda urun yok (seed calismamis olabilir).' }
    $response
}

Test-Step 'Kategori agaci' {
    $categories = Invoke-RestMethod -Uri "$GatewayUrl/categories" -Method Get
    if ($categories.Count -eq 0) { throw 'Kategori bulunamadi.' }
    $categories
} | Out-Null

Test-Step 'Marka listesi' {
    Invoke-RestMethod -Uri "$GatewayUrl/brands" -Method Get
} | Out-Null

Test-Step 'Kampanyalar' {
    Invoke-RestMethod -Uri "$GatewayUrl/campaigns" -Method Get
} | Out-Null

$firstProduct = $products.items[0]

Test-Step 'Urun detayi (slug)' {
    $detail = Invoke-RestMethod -Uri "$GatewayUrl/products/$($firstProduct.slug)" -Method Get
    if (-not $detail.id) { throw 'Urun detayi bos dondu.' }
    $detail
} | Out-Null

# --- 2. Identity -------------------------------------------------------------
Write-Host 'Kimlik' -ForegroundColor Yellow

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$testEmail = "verify.$stamp@velora.test"
$testPassword = 'VeloraVerify2026'

$session = Test-Step 'Yeni musteri kaydi' {
    $body = @{
        email     = $testEmail
        password  = $testPassword
        firstName = 'Dogrulama'
        lastName  = 'Kullanici'
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$GatewayUrl/auth/register" -Method Post -Body $body -ContentType 'application/json'
}

if (-not $session) {
    Write-Host ''
    Write-Host 'Kimlik dogrulama basarisiz; kalan adimlar atlaniyor.' -ForegroundColor Red
    Write-Host "Sonuc: $script:passed gecti, $script:failed basarisiz" -ForegroundColor Red
    exit 1
}

$customerHeaders = @{ Authorization = "Bearer $($session.accessToken)" }

Test-Step 'Profil okuma (/auth/me)' {
    Invoke-RestMethod -Uri "$GatewayUrl/auth/me" -Method Get -Headers $customerHeaders
} | Out-Null

Test-Step 'Token yenileme' {
    $body = @{ refreshToken = $session.refreshToken } | ConvertTo-Json
    $refreshed = Invoke-RestMethod -Uri "$GatewayUrl/auth/refresh" -Method Post -Body $body -ContentType 'application/json'
    if (-not $refreshed.accessToken) { throw 'Yenileme token dondurmedi.' }
    $script:customerHeaders = @{ Authorization = "Bearer $($refreshed.accessToken)" }
    $refreshed
} | Out-Null

if ($script:customerHeaders) { $customerHeaders = $script:customerHeaders }

Test-Step 'Adres olusturma' {
    $body = @{
        title = 'Ev'; firstName = 'Dogrulama'; lastName = 'Kullanici'
        phone = '05555555555'; street = 'Kemankes Mah. Karakoy Cad. No 12'
        city  = 'Istanbul'; state = 'Beyoglu'; country = 'Turkiye'
        zipCode = '34425'; isDefault = $true
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$GatewayUrl/addresses" -Method Post -Body $body -Headers $customerHeaders -ContentType 'application/json'
} | Out-Null

# --- 3. Basket ---------------------------------------------------------------
Write-Host 'Sepet' -ForegroundColor Yellow

Test-Step 'Sepete urun ekleme' {
    $body = @{
        productId      = $firstProduct.id
        productName    = $firstProduct.name
        unitPrice      = $firstProduct.effectivePrice
        oldUnitPrice   = $firstProduct.price
        quantity       = 1
        pictureUrl     = $firstProduct.primaryImageUrl
        slug           = $firstProduct.slug
        availableStock = $firstProduct.totalStock
    } | ConvertTo-Json

    $basket = Invoke-RestMethod -Uri "$GatewayUrl/basket/additem" -Method Post -Body $body -Headers $customerHeaders -ContentType 'application/json'
    if ($basket.items.Count -eq 0) { throw 'Sepet bos dondu.' }
    $basket
} | Out-Null

Test-Step 'Sepet okuma' {
    Invoke-RestMethod -Uri "$GatewayUrl/basket/me" -Method Get -Headers $customerHeaders
} | Out-Null

Test-Step 'Favorilere ekleme' {
    Invoke-RestMethod -Uri "$GatewayUrl/basket/wishlist/$($firstProduct.id)" -Method Post -Headers $customerHeaders
} | Out-Null

# --- 4. Checkout saga --------------------------------------------------------
Write-Host 'Odeme ve siparis' -ForegroundColor Yellow

Test-Step 'Checkout (event yayinlanir)' {
    $body = @{
        city = 'Istanbul'; street = 'Kemankes Mah. Karakoy Cad. No 12'
        state = 'Beyoglu'; country = 'Turkiye'; zipCode = '34425'
        cardNumber = '4242424242424242'; cardHolderName = 'DOGRULAMA KULLANICI'
        cardExpiration = (Get-Date).AddYears(2).ToString('o')
        cardSecurityNumber = '123'; cardTypeId = 2; buyer = ''
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$GatewayUrl/basket/checkout" -Method Post -Body $body -Headers $customerHeaders -ContentType 'application/json'
} | Out-Null

Test-Step 'Siparis olusturuldu (saga tamamlandi)' {
    # Checkout is event driven: Basket -> RabbitMQ -> Order -> Payment -> Order.
    $deadline = (Get-Date).AddSeconds(45)

    while ((Get-Date) -lt $deadline) {
        $orders = Invoke-RestMethod -Uri "$GatewayUrl/orders?pageSize=5" -Method Get -Headers $customerHeaders

        if ($orders.items.Count -gt 0) {
            return $orders.items[0]
        }

        Start-Sleep -Seconds 3
    }

    throw '45 saniye icinde siparis olusmadi. RabbitMQ ve OrderService loglarini kontrol edin.'
} | Out-Null

# --- 5. Back office ----------------------------------------------------------
Write-Host 'Yonetim' -ForegroundColor Yellow

$adminSession = Test-Step 'Yonetici girisi' {
    $body = @{ userName = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$GatewayUrl/auth/login" -Method Post -Body $body -ContentType 'application/json'

    if ($response.user.roles -notcontains 'Admin') { throw 'Hesap Admin rolune sahip degil.' }
    $response
}

if ($adminSession) {
    $adminHeaders = @{ Authorization = "Bearer $($adminSession.accessToken)" }

    Test-Step 'Yonetim urun listesi' {
        Invoke-RestMethod -Uri "$GatewayUrl/admin/products?pageSize=5" -Method Get -Headers $adminHeaders
    } | Out-Null

    Test-Step 'Katalog istatistikleri' {
        Invoke-RestMethod -Uri "$GatewayUrl/admin/products/stats" -Method Get -Headers $adminHeaders
    } | Out-Null

    Test-Step 'Analitik dashboard' {
        $dashboard = Invoke-RestMethod -Uri "$GatewayUrl/admin/analytics/dashboard?days=30" -Method Get -Headers $adminHeaders
        if ($null -eq $dashboard.summary) { throw 'Dashboard ozeti bos.' }
        $dashboard
    } | Out-Null

    Test-Step 'Yonetim siparis listesi' {
        Invoke-RestMethod -Uri "$GatewayUrl/admin/orders?pageSize=5" -Method Get -Headers $adminHeaders
    } | Out-Null

    Test-Step 'Kullanici listesi' {
        Invoke-RestMethod -Uri "$GatewayUrl/users?pageSize=5" -Method Get -Headers $adminHeaders
    } | Out-Null

    Test-Step 'Yetkisiz erisim reddediliyor' {
        # The customer token must not reach an admin endpoint.
        try {
            Invoke-RestMethod -Uri "$GatewayUrl/admin/products" -Method Get -Headers $customerHeaders | Out-Null
            throw 'Musteri tokeni admin ucuna erisebildi (GUVENLIK SORUNU).'
        }
        catch [System.Net.WebException], [Microsoft.PowerShell.Commands.HttpResponseException] {
            $status = $_.Exception.Response.StatusCode.value__
            if ($status -ne 401 -and $status -ne 403) { throw "Beklenen 401/403 yerine $status alindi." }
            $true
        }
    } | Out-Null
}

Write-Host ('-' * 60)
Write-Host ''

if ($script:failed -eq 0) {
    Write-Host "TUM ADIMLAR GECTI ($script:passed)" -ForegroundColor Green
    exit 0
}

Write-Host "Sonuc: $script:passed gecti, $script:failed basarisiz" -ForegroundColor Red
exit 1
