# Velora — Kubernetes

Velora'nin Kubernetes kurulumu. Bu dosya *nasil kullanilacagini* anlatir;
*neden boyle tasarlandigi* chart dosyalarindaki yorumlarda ve `plan.md` icinde.

---

## Hizli baslangic

```powershell
. ./scripts/load-env.ps1          # sirlari oturuma yukle (.env)
./scripts/velora-k8s.ps1 up       # altyapi + uygulama
./scripts/velora-k8s.ps1 open     # tarayicida ac
```

Erisim adresleri (port-forward gerekmez):

| Ne | Adres |
|---|---|
| Magaza | http://localhost:30080 |
| Admin paneli | http://localhost:30081 |
| API (gateway) | http://localhost:30000 |

Admin girisi: `admin@velora.com` / `.env` icindeki `SEED_ADMIN_PASSWORD`.

---

## Docker Desktop'ta neden bos gorunuyor?

Docker Desktop'in **Kubernetes** ekraninda sol ustte bir **Namespace** kutusu
vardir ve varsayilani `default`'tur. Velora `default`'ta degil, **`velora-local`**
namespace'inde calisir; o kutuyu degistirmeden ekran bos gorunur.

Bu bir hata degil, bir filtredir: namespace'ler Kubernetes'te klasor gibidir ve
her isin kendi klasorunde durmasi bilincli bir tercihtir (kota, yetki ve silme
islemleri namespace bazinda yapilir).

Terminalden ayni seyi gormek icin:

```powershell
kubectl get pods -n velora-local
```

---

## Gunluk komutlar

```powershell
./scripts/velora-k8s.ps1                      # durum + adresler
./scripts/velora-k8s.ps1 logs -Service catalog   # canli log
./scripts/velora-k8s.ps1 restart -Service catalog
./scripts/velora-k8s.ps1 down                 # uygulamayi kaldir, veriyi birak
./scripts/velora-k8s.ps1 destroy              # her seyi sil (veritabani dahil)
```

Script her adimda calistirdigi `kubectl` / `helm` komutunu ekrana yazar; dogrudan
o komutlari kullanmak isterseniz kopyalayabilirsiniz.

---

## Yapinin parcalari

```
deploy/
├── charts/velora/              Helm chart — dokuz servisin tamami
│   ├── templates/              tek sablon, servis basina render edilir
│   ├── values.yaml             ortak varsayilanlar (prod kabul edilir)
│   ├── values-local.yaml       Docker Desktop
│   ├── values-dev.yaml         paylasimli dev kumesi
│   ├── values-staging.yaml     prod aynasi
│   └── values-prod.yaml        prod
└── local/infrastructure.yaml   SQL / Redis / RabbitMQ (YALNIZCA yerel)
```

**Yeni servis eklemek** `values.yaml` icindeki `services:` altina bir blok
yazmaktir. Deployment, Service, ServiceAccount, HPA, PDB ve gerekiyorsa
migration Job'i ayni sablonlardan uretilir; hicbir manifest kopyalanmaz.

---

## Ortamlar arasi farklar

| | local | dev | staging | prod |
|---|---|---|---|---|
| Veri katmani | kume ici | kume ici | kume ici | **yonetilen** (ADR-04) |
| Replika | 1 | 1 | 2+ | 2+ |
| HPA / PDB | yok | yok | var | var |
| NetworkPolicy | kapali | kapali | acik | acik |
| Disari acilma | NodePort | Ingress | Ingress | Ingress |
| Imaj | yerel daemon | GHCR | GHCR | GHCR (digest) |

`values-*.yaml` dosyalari bilincli olarak kisadir: yalnizca varsayilandan
**farkli** olani listelerler, boylece aradaki fark tek bakista gorunur.

---

## Sirlar

Ham `Secret` manifesti **Git'e girmez** (base64 sifreleme degildir).

* **Yerel:** `.env` dosyasindan `scripts/create-local-secrets.sh` ile uretilir.
* **dev/staging/prod:** External Secrets Operator bir vault'tan ceker; chart
  yalnizca Secret'in *adini* bilir, icerigini degil.

---

## Dogrulama

```powershell
python scripts/verify-chart.py                 # mimari degismezler (54 kontrol)
python scripts/verify-stack.py                 # HTTP zinciri (60 kontrol)
python scripts/verify-eventbus.py              # event bus (32 kontrol)
```

`verify-chart.py`, `helm lint` ve `kubeconform`'un yakalayamadigi hatalari
kontrol eder: liveness probe'una bagimlilik sizmasi, degismez selector'a version
girmesi, tek replikali is yukune PDB yazilmasi, gateway'in gittigi portun
Service portuyla ayrilmasi gibi. Bunlarin hepsi gecerli YAML uretir ve yine de
sistemi bozar.

`verify-stack.py` ve `verify-eventbus.py` calisan bir kuruluma ihtiyac duyar:

```powershell
. ./scripts/load-env.ps1
$env:VELORA_GATEWAY = 'http://localhost:30000'
python scripts/verify-stack.py
```

---

## Imajlar

Yerel imajlar `velora/<servis>:local` adiyla derlenir:

```powershell
bash scripts/build-local-images.sh
```

Docker Desktop'in Kubernetes'i ayni Docker daemon'ini kullandigi icin bu imajlar
registry'e itilmeden pod'larda kullanilabilir (`imagePullPolicy: Never`).

Dockerfile'lar once yalnizca `.csproj` dosyalarini kopyalayip `restore` eder,
kaynak kodu sonra alir. Boylece kod degisikliklerinde bagimlilik cozumu
onbellekten gelir (plan.md B12).

---

## Bilinen sinirlar

| Konu | Durum |
|---|---|
| `catalog` tek replika | Gorseller kap ici diske yaziliyor; nesne depolamaya tasinmadan olceklenemez (B6) |
| Metrik / iz kaydi yok | OpenTelemetry, Prometheus ve yapilandirilmis log henuz eklenmedi (B7) |
| RabbitMQ prefetch yok | Tuketiciler arasi yuk dengesi ve idempotency eksik (B11) |
| Imaj boyutu ~350 MB | `chiseled` temel imaja gecilirse ~120 MB'a duser (plan 5.2) |
| GitOps yok | Dagitim su an elle `helm upgrade`; Argo CD kurulmadi (Faz 4) |
