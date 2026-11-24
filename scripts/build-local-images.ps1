<# Builds all nine Velora images sequentially for Docker Desktop Kubernetes. #>
[CmdletBinding()]
param([string]$Tag = 'local')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$images = [ordered]@{
    gateway      = 'SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway/Dockerfile'
    identity     = 'SellingBuddy/src/Services/IdentityService/IdentityService.Api/Dockerfile'
    catalog      = 'SellingBuddy/src/Services/CatalogService/CatalogService.Api/Dockerfile'
    basket       = 'SellingBuddy/src/Services/BasketService/BasketService.Api/Dockerfile'
    order        = 'SellingBuddy/src/Services/OrderService/OrderService.Api/Dockerfile'
    payment      = 'SellingBuddy/src/Services/PaymentService/PaymentService.Api/Dockerfile'
    notification = 'SellingBuddy/src/Services/NotificationService/NotificationService/Dockerfile'
    storefront   = 'velora/apps/storefront/Dockerfile'
    admin        = 'velora/apps/admin/Dockerfile'
}

Push-Location $root
try {
    foreach ($entry in $images.GetEnumerator()) {
        Write-Host ("BUILD {0}" -f $entry.Key) -ForegroundColor Cyan
        docker build --tag "velora/$($entry.Key):$Tag" --file $entry.Value .
        if ($LASTEXITCODE -ne 0) { throw "Image build failed: $($entry.Key)" }
    }
}
finally { Pop-Location }

Write-Host 'Dokuz Velora imaji basariyla derlendi.' -ForegroundColor Green
