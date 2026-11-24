[CmdletBinding()]
param(
    [string]$QueueName = 'velora.debug.flow',
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot/load-env.ps1"

$compose = Join-Path $root 'docker-compose.prod.yml'
Write-Host 'Docker RabbitMQ ve sandbox payment yenileniyor...' -ForegroundColor Cyan
& docker compose -f $compose up -d --no-deps rabbitmq payment
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose servisleri yenilenemedi.' }

$baseUrl = 'http://127.0.0.1:15673'
$pair = '{0}:{1}' -f $env:RABBITMQ_USER, $env:RABBITMQ_PASSWORD
$authorization = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$headers = @{ Authorization = "Basic $authorization" }
$deadline = (Get-Date).AddMinutes(3)

do {
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/overview" -Headers $headers -TimeoutSec 5 | Out-Null
        break
    }
    catch {
        if ((Get-Date) -ge $deadline) { throw 'Docker RabbitMQ zamaninda hazir olmadi.' }
        Start-Sleep -Seconds 2
    }
} while ($true)

# Broker yeniden yaratildiktan sonra uygulama consumer'larinin geri gelmesini bekle.
do {
    $queues = Invoke-RestMethod -Uri "$baseUrl/api/queues/%2F" -Headers $headers -TimeoutSec 10
    $consumerCount = ($queues | Measure-Object -Property consumers -Sum).Sum
    if ($consumerCount -ge 15 -or (Get-Date) -ge $deadline) { break }
    Start-Sleep -Seconds 2
} while ($true)

$queuePath = [Uri]::EscapeDataString($QueueName)
$queueBody = @{
    durable = $false
    auto_delete = $false
    arguments = @{ 'x-message-ttl' = 3600000; 'x-expires' = 7200000 }
} | ConvertTo-Json -Depth 4
Invoke-RestMethod -Method Put -Uri "$baseUrl/api/queues/%2F/$queuePath" `
    -Headers $headers -ContentType 'application/json' -Body $queueBody | Out-Null

# Direct exchange binding'lerini ayri debug kuyruguna kopyalar; servis
# kuyruklarindan mesaj cekmez ve uygulama akisini etkilemez.
$bindings = Invoke-RestMethod `
    -Uri "$baseUrl/api/exchanges/%2F/SellingBuddyEventBus/bindings/source" `
    -Headers $headers -TimeoutSec 10
$routingKeys = $bindings |
    Where-Object { $_.destination_type -eq 'queue' -and $_.routing_key } |
    Select-Object -ExpandProperty routing_key -Unique

foreach ($routingKey in $routingKeys) {
    $bindingBody = @{ routing_key = $routingKey; arguments = @{} } | ConvertTo-Json -Depth 3
    Invoke-RestMethod -Method Post `
        -Uri "$baseUrl/api/bindings/%2F/e/SellingBuddyEventBus/q/$queuePath" `
        -Headers $headers -ContentType 'application/json' -Body $bindingBody | Out-Null
}

$queueUrl = "$baseUrl/#/queues/%2F/$queuePath"
Write-Host "`nDocker RabbitMQ: $baseUrl" -ForegroundColor Green
Write-Host "Mesaj izleme kuyrugu: $queueUrl" -ForegroundColor Green
Write-Host "Routing key: $($routingKeys.Count), consumer: $consumerCount" -ForegroundColor DarkGray
Write-Host 'Giris: .env icindeki RABBITMQ_USER / RABBITMQ_PASSWORD' -ForegroundColor DarkGray

if (-not $NoBrowser) { Start-Process $queueUrl }
