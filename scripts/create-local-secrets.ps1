<# Creates the local Kubernetes secrets from the ignored repository .env file. #>
[CmdletBinding()]
param([string]$Namespace = 'velora-local')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot/load-env.ps1" -EnvFile "$root/.env"

$required = @(
    'SQL_SA_PASSWORD', 'REDIS_PASSWORD', 'RABBITMQ_USER',
    'RABBITMQ_PASSWORD', 'AUTH_SIGNING_KEY', 'SEED_ADMIN_PASSWORD'
)

foreach ($name in $required) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        throw "Gerekli ortam degiskeni bos: $name"
    }
}

function New-SqlConnection([string]$Database) {
    "Server=sql,1433;Database=$Database;User Id=sa;Password=$env:SQL_SA_PASSWORD;TrustServerCertificate=True;Encrypt=False;"
}

function Set-KubernetesSecret([string]$Name, [hashtable]$Data) {
    $arguments = @('create', 'secret', 'generic', $Name, '-n', $Namespace)
    foreach ($entry in $Data.GetEnumerator()) {
        $arguments += "--from-literal=$($entry.Key)=$($entry.Value)"
    }
    $arguments += @('--dry-run=client', '-o', 'yaml')

    $manifest = & kubectl @arguments
    if ($LASTEXITCODE -ne 0) { throw "Secret olusturulamadi: $Name" }
    $manifest | kubectl apply -f -
    if ($LASTEXITCODE -ne 0) { throw "Secret uygulanamadi: $Name" }
}

Set-KubernetesSecret 'velora-data-secrets' @{
    SQL_SA_PASSWORD  = $env:SQL_SA_PASSWORD
    REDIS_PASSWORD   = $env:REDIS_PASSWORD
    RABBITMQ_USER    = $env:RABBITMQ_USER
    RABBITMQ_PASSWORD = $env:RABBITMQ_PASSWORD
}

Set-KubernetesSecret 'velora-common-secrets' @{
    'AuthConfig__Secret'   = $env:AUTH_SIGNING_KEY
    'EventBus__UserName'   = $env:RABBITMQ_USER
    'EventBus__Password'   = $env:RABBITMQ_PASSWORD
}

Set-KubernetesSecret 'velora-identity-secrets' @{
    'ConnectionStrings__IdentityConnection' = New-SqlConnection 'velora_identity'
    'SeedAdmin__Password' = $env:SEED_ADMIN_PASSWORD
}

Set-KubernetesSecret 'velora-catalog-secrets' @{
    'ConnectionStrings__CatalogConnection' = New-SqlConnection 'velora_catalog'
}

Set-KubernetesSecret 'velora-order-secrets' @{
    'OrderDbConnectionString' = New-SqlConnection 'velora_order'
}

Set-KubernetesSecret 'velora-basket-secrets' @{
    'RedisSettings__ConnectionString' = "redis:6379,password=$env:REDIS_PASSWORD,abortConnect=false"
}

Set-KubernetesSecret 'velora-payment-secrets' @{ PLACEHOLDER = 'unused' }
Write-Host "Sirlar '$Namespace' namespace'inde olusturuldu." -ForegroundColor Green
