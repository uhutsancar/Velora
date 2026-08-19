<#
.SYNOPSIS
    Drops the Velora development databases so they are recreated from the current model.

.DESCRIPTION
    Schema is owned by EF Core migrations and applied at start-up. Use this script
    when you want a clean slate - for example after switching branches, or once to
    drop a database that was originally created by EnsureCreated and therefore has
    no __EFMigrationsHistory table. The services migrate and reseed on next start.

    DEVELOPMENT ONLY. It deletes data.

.PARAMETER Server
    SQL Server instance. Defaults to the docker-compose instance on port 1444.

.EXAMPLE
    ./scripts/reset-databases.ps1
#>
[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
    [string]$Server = 'localhost,1444',
    [string]$User = 'sa',
    [string]$Password = 'UhutSancar123!',
    [string]$Container,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$databases = @('velora_identity', 'velora_catalog', 'velora_order')

Write-Host 'DIKKAT: Bu islem asagidaki veritabanlarini SILER:' -ForegroundColor Red
$databases | ForEach-Object { Write-Host "  - $_" }
Write-Host ''

if (-not $Force) {
    $answer = Read-Host 'Devam etmek icin "evet" yazin'

    if ($answer -ne 'evet') {
        Write-Host 'Iptal edildi.' -ForegroundColor Yellow
        return
    }
}

# Prefer sqlcmd on the host; fall back to running it inside the container.
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue

if (-not $sqlcmd -and -not $Container) {
    # Works whether the instance came from docker-compose.infrastructure.yml
    # (velora-sqlserver) or from a container started by hand (local-sqlserver).
    $Container = docker ps --filter 'name=sqlserver' --format '{{.Names}}' | Select-Object -First 1

    if (-not $Container) {
        throw 'No SQL Server found: install sqlcmd, or start the instance and pass -Container.'
    }
}

function Invoke-Sql {
    param([string]$Query)

    if ($sqlcmd) {
        & sqlcmd -S $Server -U $User -P $Password -C -Q $Query
    }
    else {
        docker exec $Container /opt/mssql-tools18/bin/sqlcmd `
            -S localhost -U $User -P $Password -C -Q $Query
    }

    if ($LASTEXITCODE -ne 0) { throw "SQL komutu basarisiz: $Query" }
}

foreach ($database in $databases) {
    if ($PSCmdlet.ShouldProcess($database, 'DROP DATABASE')) {
        Write-Host "  $database siliniyor..." -NoNewline

        # SINGLE_USER forces open connections to close so the drop cannot hang.
        $query = @"
IF DB_ID('$database') IS NOT NULL
BEGIN
    ALTER DATABASE [$database] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [$database];
END
"@

        Invoke-Sql -Query $query
        Write-Host ' tamam' -ForegroundColor Green
    }
}

Write-Host ''
Write-Host 'Veritabanlari silindi. Servisler bir sonraki baslangicta migrationlari uygulayip tohumlayacak.' -ForegroundColor Green
Write-Host 'Redis sepetlerini de temizlemek icin: docker exec local-redis redis-cli FLUSHALL' -ForegroundColor DarkGray
