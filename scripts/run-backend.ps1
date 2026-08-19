<#
.SYNOPSIS
    Starts every Velora backend service in its own window.

.DESCRIPTION
    Order matters: Identity, Catalog, Basket and Order register themselves with
    Consul, and the gateway resolves them by name, so the gateway starts last.
    Each service runs with `dotnet run`, which keeps hot reload and the debugger
    usable during development.

.PARAMETER SkipInfrastructure
    Assume Consul/RabbitMQ/Redis/SQL Server are already up.

.EXAMPLE
    ./scripts/run-backend.ps1
#>
[CmdletBinding()]
param(
    [switch]$SkipInfrastructure
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'SellingBuddy/src'

if (-not $SkipInfrastructure) {
    & (Join-Path $PSScriptRoot 'start-infrastructure.ps1')
}

# Ordered: dependencies first, gateway last.
$services = @(
    @{ Name = 'IdentityService';  Path = 'Services/IdentityService/IdentityService.Api';       Port = 5005 },
    @{ Name = 'CatalogService';   Path = 'Services/CatalogService/CatalogService.Api';         Port = 5004 },
    @{ Name = 'BasketService';    Path = 'Services/BasketService/BasketService.Api';           Port = 5003 },
    @{ Name = 'OrderService';     Path = 'Services/OrderService/OrderService.Api';             Port = 5002 },
    @{ Name = 'PaymentService';   Path = 'Services/PaymentService/PaymentService.Api';         Port = 5001 },
    @{ Name = 'NotificationSvc';  Path = 'Services/NotificationService/NotificationService';   Port = 0    },
    @{ Name = 'ApiGateway';       Path = 'ApiGateways/WebApiGateway/Web.ApiGateway';           Port = 5000 }
)

Write-Host ''
Write-Host 'Velora servisleri baslatiliyor...' -ForegroundColor Cyan

foreach ($service in $services) {
    $projectPath = Join-Path $src $service.Path

    if (-not (Test-Path $projectPath)) {
        Write-Warning "$($service.Name): $projectPath bulunamadi, atlaniyor."
        continue
    }

    Write-Host "  -> $($service.Name)" -ForegroundColor Yellow

    Start-Process -FilePath 'powershell.exe' -ArgumentList @(
        '-NoExit',
        '-Command',
        "`$Host.UI.RawUI.WindowTitle = 'Velora - $($service.Name)'; Set-Location '$projectPath'; dotnet run"
    ) | Out-Null

    # Give each service a head start so its Consul registration lands before the
    # next one competes for the SQL Server connection pool.
    Start-Sleep -Seconds 6
}

Write-Host ''
Write-Host 'Servisler baslatildi.' -ForegroundColor Green
Write-Host '  API Gateway   http://localhost:5000'
Write-Host '  Identity      http://localhost:5005/swagger'
Write-Host '  Catalog       http://localhost:5004/swagger'
Write-Host '  Basket        http://localhost:5003/swagger'
Write-Host '  Order         http://localhost:5002/swagger'
Write-Host '  Consul UI     http://localhost:8500'
Write-Host ''
Write-Host 'Frontend icin:  cd velora; pnpm install; pnpm dev' -ForegroundColor Cyan
