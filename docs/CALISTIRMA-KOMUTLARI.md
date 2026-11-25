# Velora — calistirma komutlari

Yalnizca komut listesi. Gerekce, sorun giderme ve Docker/Kubernetes yollari icin
[LOKAL-CALISTIRMA.md](LOKAL-CALISTIRMA.md).

Tum komutlar depo kokunden, PowerShell'de calisir. Docker Desktop acik olmali ve
`.env` dosyasi hazir olmali.

---

## 0. Hazirlik (bir kerelik)

1. Bagimliliklari kur

   ```powershell
   cd D:\microservice_project
   pnpm --dir velora install
   ```

2. `.env` yoksa uret ve doldur

   ```powershell
   New-Item -ItemType File -Path .env -ErrorAction SilentlyContinue
   notepad .env
   ```

   Depoda env sablonu tutulmaz; degerleri guvenli yapilandirma kaynagindan alin.

---

## 1. Altyapi

Consul, RabbitMQ, Redis ve SQL Server. Bu terminal isi bitince kapatilabilir.

1. ```powershell
   cd D:\microservice_project
   .\scripts\start-infrastructure.ps1
   ```

---

## 2. Backend servisleri

Her komut **ayri bir terminal penceresinde** calisir ve acik kalir. Sira onemli:
Identity, Catalog, Basket ve Order kendilerini Consul'a kaydeder, gateway onlari
isimle cozer, bu yuzden gateway en sona kalir.

Her pencere once `.env`'i yukler; yoksa veritabani parolasi ve JWT imzalama
anahtari bulunamaz ve servis acilmaz.

1. **Identity** — `:5005`

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\IdentityService\IdentityService.Api --urls http://localhost:5005
   ```

2. **Catalog** — `:5004`

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\CatalogService\CatalogService.Api --urls http://localhost:5004
   ```

3. **Basket** — `:5003`

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\BasketService\BasketService.Api --urls http://localhost:5003
   ```

4. **Order** — `:5002`

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\OrderService\OrderService.Api --urls http://localhost:5002
   ```

5. **Payment** — `:5001`

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\PaymentService\PaymentService.Api --urls http://localhost:5001
   ```

6. **Notification** — kuyrugu dinler, `:5006` uzerinden health probe sunar

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\Services\NotificationService\NotificationService --urls http://localhost:5006
   ```

7. **API Gateway** — `:5000`, en son

   ```powershell
   cd D:\microservice_project; . .\scripts\load-env.ps1; dotnet run --project SellingBuddy\src\ApiGateways\WebApiGateway\Web.ApiGateway --urls http://localhost:5000
   ```

Catalog ilk acilista semayi kurar ve katalogu tohumlar. O pencerede
`Seeded 47 Velora products` satirini gorene kadar bekleyin.

### Kisayol

Yukaridaki yedi pencereyi sirasiyla acan hazir script:

```powershell
cd D:\microservice_project
.\scripts\run-backend.ps1
```

Altyapi zaten ayaktaysa:

```powershell
.\scripts\run-backend.ps1 -SkipInfrastructure
```

---

## 3. Frontend

1. Ikisi birden, tek terminal

   ```powershell
   cd D:\microservice_project\velora
   pnpm dev
   ```

Ayri ayri isterseniz iki terminal:

1. **Storefront** — `:5173`

   ```powershell
   cd D:\microservice_project\velora; pnpm dev:store
   ```

2. **Admin** — `:5174`

   ```powershell
   cd D:\microservice_project\velora; pnpm dev:admin
   ```

---

## 4. Tarayicida acilacak adresler

| Ne | Adres |
|---|---|
| Magaza | http://localhost:5173 |
| Yonetim paneli | http://localhost:5174 |
| API Gateway saglik ucu | http://localhost:5000/health |
| Catalog Swagger | http://localhost:5004/swagger |
| Identity Swagger | http://localhost:5005/swagger |
| Basket Swagger | http://localhost:5003/swagger |
| Order Swagger | http://localhost:5002/swagger |
| Payment Swagger | http://localhost:5001/swagger |
| Notification health | http://localhost:5006/health |
| Consul UI | http://localhost:8500 |
| RabbitMQ UI | http://localhost:15672 |

Panele giris bilgileri `.env` icindeki `SEED_ADMIN_EMAIL` ve
`SEED_ADMIN_PASSWORD` degerleridir.

Magazadaki icerik sayfalari dogrudan acilir: `/hakkimizda`, `/atolye`,
`/surdurulebilirlik`, `/iletisim`, `/yardim`, `/yardim/sss`, `/yardim/kargo`,
`/yardim/iade`, `/yardim/bakim`, `/gizlilik`, `/kosullar`, `/kvkk`, `/cerez`.

---

## 5. Dogrulama

Her seyin ayakta oldugunu tek komutla kontrol eder:

```powershell
cd D:\microservice_project
python scripts\verify-stack.py
```

Kubernetes'te RabbitMQ paneli ve canli mesaj/yuk testleri:

```powershell
.\scripts\velora-k8s.ps1 rabbit
$env:VELORA_GATEWAY = 'http://127.0.0.1:30000'
$env:VELORA_RABBITMQ = 'http://127.0.0.1:15672'
python scripts\verify-eventbus.py
python scripts\verify-live-load.py
```

---

## 6. Kapatma

1. Backend ve frontend pencerelerinde `Ctrl+C`.

2. Altyapiyi durdur (veriler korunur)

   ```powershell
   cd D:\microservice_project
   docker compose -f docker-compose.infrastructure.yml down
   ```

3. Veritabanlarini da silmek isterseniz

   ```powershell
   docker compose -f docker-compose.infrastructure.yml down -v
   ```
