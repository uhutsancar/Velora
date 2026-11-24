<#
.SYNOPSIS
    Velora'nin yerel Kubernetes kurulumunu yonetir.

.DESCRIPTION
    Kubernetes'i gunluk kullanmak icin gereken birkac komutu tek yerde toplar.
    Amac kubectl'i gizlemek degil; her komut ekrana ne calistirdigini yazar, yani
    bu script ayni zamanda bir ogrenme notu gibi de okunabilir.

    Kurulum iki parcadir:
      * deploy/local/infrastructure.yaml  -> SQL Server, Redis, RabbitMQ
      * deploy/charts/velora (Helm)       -> dokuz uygulama servisi

.PARAMETER Action
    status   Ne calisiyor, nereden erisilir (varsayilan)
    up       Altyapiyi ve uygulamayi kurar/gunceller
    down     Uygulamayi kaldirir, altyapiyi birakir
    destroy  Namespace'i komple siler (veritabani dahil)
    logs     Bir servisin loglarini canli izler:  -Service catalog
    restart  Bir servisi yeniden baslatir:        -Service catalog
    open     Magaza, admin ve API'yi tarayicida acar
    rabbit   RabbitMQ yonetim portunu localhost:15672'ye acar

.EXAMPLE
    ./scripts/velora-k8s.ps1
    ./scripts/velora-k8s.ps1 up
    ./scripts/velora-k8s.ps1 logs -Service catalog
#>
[CmdletBinding()]
param(
    [ValidateSet('status', 'up', 'down', 'destroy', 'logs', 'restart', 'open', 'rabbit')]
    [string]$Action = 'status',

    [string]$Service,

    [string]$Namespace = 'velora-local'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$helmCommand = Get-Command helm -ErrorAction SilentlyContinue
$helm = if ($helmCommand) { $helmCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs/Helm/helm.exe' }
if (-not (Test-Path $helm)) { throw 'Helm bulunamadi. Once Helm CLI kurun.' }

# NodePort'lar deploy/charts/velora/values-local.yaml icinde sabitlenmistir;
# port-forward gerekmemesinin sebebi budur.
$urls = [ordered]@{
    'Magaza' = 'http://localhost:30080'
    'Admin'  = 'http://localhost:30081'
    'API'    = 'http://localhost:30000'
}

function Write-Step($text) { Write-Host "`n$text" -ForegroundColor Cyan }
function Write-Cmd($text) { Write-Host "  > $text" -ForegroundColor DarkGray }

function Invoke-Step($description, $command) {
    Write-Step $description
    Write-Cmd $command
    Invoke-Expression $command
}

function Show-Status {
    Write-Step 'PODLAR'
    Write-Cmd "kubectl get pods -n $Namespace"
    kubectl get pods -n $Namespace

    Write-Step 'ERISIM ADRESLERI'
    foreach ($name in $urls.Keys) {
        $url = $urls[$name]
        $probe = if ($name -eq 'API') { "$url/health" } else { $url }

        try {
            $code = (Invoke-WebRequest -Uri $probe -TimeoutSec 8 -UseBasicParsing).StatusCode
            $color = 'Green'
        }
        catch {
            $code = 'ulasilamiyor'
            $color = 'Red'
        }

        Write-Host ("  {0,-8} {1,-28} {2}" -f $name, $url, $code) -ForegroundColor $color
    }

    Write-Host "`n  Admin girisi: admin@velora.com / .env dosyasindaki SEED_ADMIN_PASSWORD" -ForegroundColor DarkGray
    Write-Host "  Docker Desktop > Kubernetes ekraninda Namespace kutusunu '$Namespace' yapin." -ForegroundColor DarkGray
}

switch ($Action) {

    'status' { Show-Status }

    'up' {
        Invoke-Step 'Altyapi (SQL / Redis / RabbitMQ)' `
            "kubectl apply -f `"$root/deploy/local/infrastructure.yaml`""

        Write-Step 'Sirlar (.env dosyasindan, depoya yazilmaz)'
        Write-Cmd './scripts/create-local-secrets.ps1'
        & "$root/scripts/create-local-secrets.ps1" -Namespace $Namespace

        Write-Step 'Altyapinin hazir olmasi bekleniyor'
        foreach ($infrastructure in @('sql', 'redis', 'rabbitmq')) {
            Invoke-Step "Hazir: $infrastructure" `
                "kubectl rollout status deployment/$infrastructure -n $Namespace --timeout=600s"
        }

        Write-Step 'Uygulama (Helm)'
        Write-Cmd "helm upgrade --install velora deploy/charts/velora -f deploy/charts/velora/values-local.yaml -n $Namespace --timeout 10m"
        & $helm upgrade --install velora "$root/deploy/charts/velora" -f "$root/deploy/charts/velora/values-local.yaml" -n $Namespace --timeout 10m

        Show-Status
    }

    'down' {
        # Altyapi birakilir: veritabanini yeniden kurmak dakikalar surer ve
        # gunluk calismada buna gerek yoktur.
        Invoke-Step 'Uygulama kaldiriliyor (altyapi kaliyor)' `
            "helm uninstall velora -n $Namespace"
    }

    'destroy' {
        Write-Host "`nDIKKAT: '$Namespace' namespace'i ve icindeki VERITABANI silinecek." -ForegroundColor Yellow
        $answer = Read-Host "Devam edilsin mi? (evet/hayir)"

        if ($answer -ne 'evet') {
            Write-Host 'Iptal edildi.' -ForegroundColor DarkGray
            break
        }

        Invoke-Step 'Namespace siliniyor' "kubectl delete namespace $Namespace"
    }

    'logs' {
        if (-not $Service) { throw "Servis adi gerekli. Ornek: ./scripts/velora-k8s.ps1 logs -Service catalog" }
        Invoke-Step "Loglar: $Service (cikmak icin Ctrl+C)" `
            "kubectl logs -n $Namespace -l app.kubernetes.io/name=$Service --tail=100 -f"
    }

    'restart' {
        if (-not $Service) { throw "Servis adi gerekli. Ornek: ./scripts/velora-k8s.ps1 restart -Service catalog" }
        Invoke-Step "Yeniden baslatiliyor: $Service" `
            "kubectl rollout restart deployment/velora-$Service -n $Namespace"
        Invoke-Step 'Bekleniyor' `
            "kubectl rollout status deployment/velora-$Service -n $Namespace --timeout=5m"
    }

    'open' {
        foreach ($name in $urls.Keys) {
            Write-Host "  $name -> $($urls[$name])"
            Start-Process $urls[$name]
        }
    }

    'rabbit' {
        $localPort = 15672
        $rabbitUrl = "http://127.0.0.1:$localPort"
        function Test-RabbitPort {
            try {
                $client = [System.Net.Sockets.TcpClient]::new('127.0.0.1', $localPort)
                $client.Dispose()
                return $true
            }
            catch { return $false }
        }

        $alreadyForwarding = Get-CimInstance Win32_Process -Filter "Name = 'kubectl.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match 'port-forward.+(service/|svc/)?rabbitmq.+15672:15672' } |
            Select-Object -First 1

        # A port-forward process exits when its selected RabbitMQ pod is replaced.
        # Check the socket as well as the process so a stale/racing process cannot
        # make this command report a panel that is not actually reachable.
        if (-not $alreadyForwarding -or -not (Test-RabbitPort)) {
            Write-Step "RabbitMQ port-forward baslatiliyor: $rabbitUrl"
            Write-Cmd "kubectl port-forward service/rabbitmq 15672:15672 -n $Namespace --address 127.0.0.1"
            Start-Process -FilePath 'kubectl' `
                -ArgumentList @('port-forward', 'service/rabbitmq', '15672:15672', '-n', $Namespace, '--address', '127.0.0.1') `
                -WindowStyle Hidden | Out-Null

        }

        $ready = $false
        foreach ($attempt in 1..20) {
            if (Test-RabbitPort) { $ready = $true; break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw 'RabbitMQ port-forward 10 saniye icinde acilmadi.' }

        Write-Host "  RabbitMQ UI -> $rabbitUrl" -ForegroundColor Green
        Write-Host '  Giris bilgileri -> .env icindeki RABBITMQ_USER / RABBITMQ_PASSWORD' -ForegroundColor DarkGray
        Start-Process $rabbitUrl
    }
}
