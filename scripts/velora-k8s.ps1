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

.EXAMPLE
    ./scripts/velora-k8s.ps1
    ./scripts/velora-k8s.ps1 up
    ./scripts/velora-k8s.ps1 logs -Service catalog
#>
[CmdletBinding()]
param(
    [ValidateSet('status', 'up', 'down', 'destroy', 'logs', 'restart', 'open')]
    [string]$Action = 'status',

    [string]$Service,

    [string]$Namespace = 'velora-local'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

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
        Write-Cmd 'bash scripts/create-local-secrets.sh'
        bash "$root/scripts/create-local-secrets.sh" $Namespace

        Invoke-Step 'Altyapinin hazir olmasi bekleniyor' `
            "kubectl wait --for=condition=ready pod --all -n $Namespace --timeout=600s"

        Invoke-Step 'Uygulama (Helm)' `
            "helm upgrade --install velora `"$root/deploy/charts/velora`" -f `"$root/deploy/charts/velora/values-local.yaml`" -n $Namespace --timeout 10m"

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
}
