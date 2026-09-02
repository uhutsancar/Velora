<#
.SYNOPSIS
    Starts the infrastructure Velora depends on: Consul, RabbitMQ, Redis and SQL Server.

.DESCRIPTION
    Brings up docker-compose.infrastructure.yml and waits until each container is
    actually reachable, not merely "created" - SQL Server in particular reports
    running long before it accepts connections.

.EXAMPLE
    ./scripts/start-infrastructure.ps1
#>
[CmdletBinding()]
param(
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host 'Velora altyapisi baslatiliyor...' -ForegroundColor Cyan

docker compose -f (Join-Path $root 'docker-compose.infrastructure.yml') up -d
if ($LASTEXITCODE -ne 0) { throw 'docker compose up basarisiz oldu.' }

function Wait-ForPort {
    param(
        [string]$Name,
        [int]$Port,
        [int]$Timeout
    )

    $deadline = (Get-Date).AddSeconds($Timeout)
    Write-Host "  $Name (:$Port) bekleniyor..." -NoNewline

    while ((Get-Date) -lt $deadline) {
        $result = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue

        if ($result.TcpTestSucceeded) {
            Write-Host ' hazir' -ForegroundColor Green
            return $true
        }

        Start-Sleep -Seconds 2
    }

    Write-Host ' ZAMAN ASIMI' -ForegroundColor Red
    return $false
}

$ready = $true
$ready = (Wait-ForPort -Name 'Consul'     -Port 8500 -Timeout $TimeoutSeconds) -and $ready
$ready = (Wait-ForPort -Name 'RabbitMQ'   -Port 5672 -Timeout $TimeoutSeconds) -and $ready
$ready = (Wait-ForPort -Name 'Redis'      -Port 6379 -Timeout $TimeoutSeconds) -and $ready
$ready = (Wait-ForPort -Name 'SQL Server' -Port 1444 -Timeout $TimeoutSeconds) -and $ready

if (-not $ready) {
    throw 'Bazi servisler zamaninda hazir olmadi. "docker compose logs" ile kontrol edin.'
}

Write-Host ''
Write-Host 'Altyapi hazir:' -ForegroundColor Green
Write-Host '  Consul UI    http://localhost:8500'
Write-Host '  RabbitMQ UI  http://localhost:15672  (guest / guest)'
Write-Host '  Redis        localhost:6379'
Write-Host '  SQL Server   localhost,1444          (sa / $env:SQL_SA_PASSWORD)'
