[CmdletBinding()]
param(
    [string]$TopicName = 'SellingBuddyEventBus',
    [string]$AzureTopicName = 'sellingbuddytopicname',
    [switch]$KeepAzureActive
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot/load-env.ps1"

$env:EVENTBUS_TYPE = 'RabbitMQ'
$env:EVENTBUS_TOPIC = $TopicName

Write-Host 'Docker event servisleri RabbitMQ moduna aliniyor...' -ForegroundColor Cyan
& docker compose -f "$root/docker-compose.prod.yml" up -d --no-deps --force-recreate `
    basket catalog order payment notification
if ($LASTEXITCODE -ne 0) { throw 'Docker servisleri RabbitMQ moduna alinamadi.' }

if (-not $KeepAzureActive -and -not [string]::IsNullOrWhiteSpace($env:EventBus__ConnectionString)) {
    $env:EVENTBUS_TOPIC = $AzureTopicName
    $env:AZURE_TOPIC_ACTION = 'disable'
    Write-Host 'Azure Service Bus topic silinmeden devre disi birakiliyor...' -ForegroundColor Cyan
    & dotnet run --project "$root/tools/Velora.AzureObserver/Velora.AzureObserver.csproj" -c Release
    if ($LASTEXITCODE -ne 0) { throw 'Azure Service Bus topic devre disi birakilamadi.' }
}

$env:EVENTBUS_TOPIC = $TopicName
Write-Host "`nRabbitMQ etkin: $TopicName" -ForegroundColor Green
Write-Host 'Azure Service Bus uygulama tarafinda kullanilmiyor.' -ForegroundColor Green
