# Velora'yi lokalde calistirma

Projeyi calistirmanin uc yolu var. Ne yapmak istediginize gore secin:

| Yol | Ne zaman | Sure |
|---|---|---|
| **A — Servis servis** | Kod yazarken; hot reload ve debugger calisir | ~3 dk |
| **B — Docker Compose** | Butun sistemi bir kerede gormek icin | ~5 dk |
| **C — Kubernetes** | Dagitimi denemek icin | ~2 dk (imajlar hazirsa) |

Hepsinin ortak on kosulu **Adim 0**'dir.

---

## Adim 0 — Bir kerelik hazirlik

### 0.1 Gerekli araclar

```powershell
dotnet --version      # 8.x olmali
node --version        # 20.11+
pnpm --version        # 9.x   (yoksa: corepack enable)
docker --version
```

### 0.2 Sirlari olustur

Parolalar depoda tutulmuyor; `.env` dosyasini bir kere uretmelisiniz.

```powershell
cd D:\microservice_project
Copy-Item .env.example .env
notepad .env
```

Doldurulmasi zorunlu alanlar:

```
SQL_SA_PASSWORD=Guclu.Bir.Parola123!
REDIS_PASSWORD=baska-bir-parola
RABBITMQ_USER=velora
RABBITMQ_PASSWORD=bir-parola-daha
AUTH_SIGNING_KEY=<en az 48 karakter rastgele>
SEED_ADMIN_EMAIL=admin@velora.com
SEED_ADMIN_PASSWORD=Admin.Parolasi123!

# .NET tarafinin okudugu turevler (SQL_SA_PASSWORD ile AYNI olmali)
VELORA_SQL_PASSWORD=Guclu.Bir.Parola123!
VELORA_SEED_ADMIN_PASSWORD=Admin.Parolasi123!
VELORA_ADMIN_EMAIL=admin@velora.com
VELORA_ADMIN_PASSWORD=Admin.Parolasi123!
VELORA_RABBITMQ_USER=velora
VELORA_RABBITMQ_PASSWORD=bir-parola-daha
```

Rastgele anahtar uretmek icin:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

> `.env` `.gitignore` icinde; asla commit edilmez.

### 0.3 Her yeni terminalde sirlari yukle

```powershell
. .\scripts\load-env.ps1
```

Basinda **nokta ve bosluk** olmali. Olmazsa degiskenler yuklenmez ve
servisler `VELORA_SQL_PASSWORD tanimli degil` diyerek durur.

---

## YOL A — Servis servis calistirma

Kod yazarken kullanilacak yol. Her servis kendi terminalinde calisir.

### A.1 Altyapiyi baslat (Terminal 1)

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
docker compose -f docker-compose.infrastructure.yml up -d
```

Ne kalkiyor:

| Servis | Adres |
|---|---|
| SQL Server | `localhost,1444` |
| Redis | `localhost:6379` |
| RabbitMQ | `localhost:5672` (panel: http://localhost:15672) |
| Consul | http://localhost:8500 |

Hazir olduklarini dogrulayin:

```powershell
docker compose -f docker-compose.infrastructure.yml ps
```

Hepsinin `healthy` olmasini bekleyin (SQL Server ilk acilista ~1 dk surer).

### A.2 Backend servisleri — SIRA ONEMLI

Gateway digerlerini Consul'dan bulur, bu yuzden **en son** baslatilir.
Her biri **ayri bir terminalde** calisir ve her terminalde once
`. .\scripts\load-env.ps1` yazilir.

**Terminal 2 — Identity (kimlik, JWT, kullanicilar)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\IdentityService\IdentityService.Api --urls http://localhost:5005
```

Kontrol: http://localhost:5005/health

**Terminal 3 — Catalog (urunler, kategoriler, kuponlar)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\CatalogService\CatalogService.Api --urls http://localhost:5004
```

Kontrol: http://localhost:5004/health

**Terminal 4 — Basket (sepet, istek listesi)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\BasketService\BasketService.Api --urls http://localhost:5003
```

Kontrol: http://localhost:5003/health

**Terminal 5 — Order (siparis, saga koordinatoru)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\OrderService\OrderService.Api --urls http://localhost:5002
```

Kontrol: http://localhost:5002/health

**Terminal 6 — Payment (odeme; yalnizca kuyruk dinler)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\PaymentService\PaymentService.Api --urls http://localhost:5001
```

Kontrol: http://localhost:5001/health

**Terminal 7 — Notification (bildirim; yalnizca kuyruk dinler)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\Services\NotificationService\NotificationService --urls http://localhost:5006
```

Kontrol: http://localhost:5006/health

**Terminal 8 — Gateway (EN SON)**

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
dotnet run --project SellingBuddy\src\ApiGateways\WebApiGateway\Web.ApiGateway --urls http://localhost:5000
```

Kontrol: http://localhost:5000/health

### A.3 Frontend (Terminal 9 ve 10)

```powershell
cd D:\microservice_project\velora
pnpm install
```

**Terminal 9 — Magaza**

```powershell
cd D:\microservice_project\velora
pnpm --filter @velora/storefront dev
```

http://localhost:5173

**Terminal 10 — Admin paneli**

```powershell
cd D:\microservice_project\velora
pnpm --filter @velora/admin dev
```

http://localhost:5174 — giris: `.env` icindeki `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`

> Ikisini tek terminalde calistirmak isterseniz: `pnpm dev`

### A.4 Hepsini tek komutla (kisayol)

On terminali elle acmak yerine:

```powershell
.\scripts\run-backend.ps1
```

Her servisi kendi penceresinde baslatir, sirayi da kendisi gozetir.

### A.5 Calistigini dogrula

```powershell
. .\scripts\load-env.ps1
python scripts\verify-stack.py       # 60 kontrol: HTTP zinciri, checkout dahil
python scripts\verify-eventbus.py    # 32 kontrol: kuyruklar ve saga
```

### A.6 Durdurma

Her terminalde `Ctrl+C`. Altyapiyi da kapatmak icin:

```powershell
docker compose -f docker-compose.infrastructure.yml down
```

Veriyi de silmek icin sonuna `-v` ekleyin.

---

## YOL B — Docker Compose ile tam yigin

Tek komutla her sey. Kod degistirmeyeceksiniz; imajlar derlenir.

```powershell
cd D:\microservice_project
. .\scripts\load-env.ps1
docker compose -f docker-compose.prod.yml up -d --build
```

Ilk sefer 20-30 dakika surer (dokuz imaj derlenir). Sonraki calistirmalar
katman onbellegi sayesinde cok daha hizlidir.

| Ne | Adres |
|---|---|
| Magaza | http://localhost:8080 |
| Admin | http://localhost:8081 |
| API | http://localhost:5000 |

Izleme ve durdurma:

```powershell
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f catalog
docker compose -f docker-compose.prod.yml down
```

---

## YOL C — Kubernetes (Docker Desktop)

### C.1 Kubernetes'i ac

Docker Desktop > Settings > Kubernetes > **Enable Kubernetes** > Apply & Restart.

```powershell
kubectl get nodes     # docker-desktop  Ready
```

### C.2 Imajlari derle (ilk seferde)

```powershell
cd D:\microservice_project
bash scripts/build-local-images.sh
```

### C.3 Kur

```powershell
. .\scripts\load-env.ps1
.\scripts\velora-k8s.ps1 up
```

| Ne | Adres |
|---|---|
| Magaza | http://localhost:30080 |
| Admin | http://localhost:30081 |
| API | http://localhost:30000 |

### C.4 Yonet

```powershell
.\scripts\velora-k8s.ps1                          # durum + adresler
.\scripts\velora-k8s.ps1 logs -Service catalog    # canli log
.\scripts\velora-k8s.ps1 restart -Service catalog
.\scripts\velora-k8s.ps1 open                     # tarayicida ac
.\scripts\velora-k8s.ps1 down                     # uygulamayi kaldir
```

> Docker Desktop > Kubernetes ekraninda sol ustteki **Namespace** kutusunu
> `default`'tan **`velora-local`** yapin; yoksa ekran bos gorunur.

Ayrintilar: [deploy/README.md](../deploy/README.md)

---

## Testler

```powershell
# Backend birim testleri
dotnet test SellingBuddy.sln

# Frontend birim testleri (111 test)
cd velora
pnpm -r test
pnpm -r typecheck
pnpm -r lint

# Uctan uca (calisan yigin gerekir)
cd D:\microservice_project
. .\scripts\load-env.ps1
python scripts\verify-stack.py
python scripts\verify-eventbus.py

# Helm chart kurallari (calisan yigin gerekmez)
python scripts\verify-chart.py
```

---

## Sik karsilasilan sorunlar

| Belirti | Sebep | Cozum |
|---|---|---|
| `VELORA_SQL_PASSWORD tanimli degil` | `.env` yuklenmemis | `. .\scripts\load-env.ps1` (basta nokta) |
| `Login failed for user 'sa'` | `.env`'deki parola ile container'daki farkli | `docker compose -f docker-compose.infrastructure.yml down -v` sonra tekrar `up -d` |
| Gateway 502 doniyor | Alt servis kalkmamis | Once servisleri, en son gateway'i baslatin |
| Gateway hicbir seyi bulamiyor | Consul kaydi olusmamis | http://localhost:8500 adresinde servisleri kontrol edin |
| Kubernetes ekrani bos | Yanlis namespace | Namespace kutusunu `velora-local` yapin |
| `pnpm install` paketi bulamiyor | Lockfile eskimis | `pnpm install --no-frozen-lockfile` |
| Port kullanimda | Onceki calistirma kapanmamis | `netstat -ano \| findstr :5000` ile bulup kapatin |
