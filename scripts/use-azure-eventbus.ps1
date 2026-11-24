[CmdletBinding()]
param(
    [string]$TopicName = 'sellingbuddytopicname',
    [string]$ObserverSubscription = 'velora-debug-monitor'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot/load-env.ps1"

if ([string]::IsNullOrWhiteSpace($env:EventBus__ConnectionString)) {
    throw 'EventBus__ConnectionString .env icinde tanimli degil.'
}

$env:EVENTBUS_TYPE = 'AzureServiceBus'
$env:EVENTBUS_TOPIC = $TopicName
$env:AZURE_DEBUG_SUBSCRIPTION = $ObserverSubscription

Write-Host 'Azure observer subscription hazirlaniyor...' -ForegroundColor Cyan
& dotnet run --project "$root/tools/Velora.AzureObserver/Velora.AzureObserver.csproj" -c Release
if ($LASTEXITCODE -ne 0) { throw 'Azure observer subscription olusturulamadi.' }

Write-Host 'Docker event consumer/publisher servisleri Azure Service Bus moduna aliniyor...' -ForegroundColor Cyan
& docker compose -f "$root/docker-compose.prod.yml" up -d --no-deps --force-recreate `
    basket catalog order payment notification
if ($LASTEXITCODE -ne 0) { throw 'Docker servisleri Azure Service Bus moduna alinamadi.' }

Write-Host "`nAzure Service Bus etkin: $TopicName" -ForegroundColor Green
Write-Host "Izleme subscription: $ObserverSubscription" -ForegroundColor Green
Write-Host 'Azure Portal > Topic > Service Bus Explorer ekraninda bu subscription ile Peek kullanin.' -ForegroundColor DarkGray
