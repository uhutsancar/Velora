# Velora uretime hazirlik durumu

Son guncelleme: **24 Kasim 2026**

Bu belge, `VELORA_URETIME_HAZIRLIK_VE_EKSIKLER (3).md` revizyon 2'deki
bulgulari mevcut kod ve calisan yerel ortamla eslestirir. Kaynak denetim eski
bir commit'i inceliyordu; asagidaki tablo bugunku depoyu esas alir.

## Sonuc

Velora'nin **yerel sandbox satis akisi** Docker Compose ve Kubernetes'te
calisiyor. Bununla birlikte sistem henuz **gercek kartla uretim satisina acilmaz**.
Son calisan ortam kanitlari ve gecikme degerleri
[`CANLI-TEST-SONUCLARI-2026-11-24.md`](CANLI-TEST-SONUCLARI-2026-11-24.md)
belgesindedir.
En onemli kalan yayin kapilari sunlardir:

1. Gercek PSP adapteri, imzali webhook ve saglayici mutabakati.
2. Odeme iade/iptal durumlari ve yetkili operasyon akisi.
3. Checkout kabul kaydi ile ilk outbox mesajinin ayni kalici transaction'da olmasi.
4. Her tuketici icin is etkisiyle ayni transaction'da kalici inbox kaydi.
5. Uretim TLS/secret rotasyonu, yedekten donus tatbikati ve urun sahibinin
   onayladigi SLO/yuk esikleri.

`Tamam`, kodun uygulanip yerel calisan ortamda dogrulandigini ifade eder.
`Kismi`, onemli korumanin var oldugunu fakat denetimdeki kabul olcutunun tam
karsilanmadigini ifade eder. `Dis/Acik`, gercek saglayici veya uretim
operasyonu olmadan kapatilamayacak isi ifade eder.

## P0 yayin kapilari

| Madde | Durum | Bugunku kanit / kalan is |
|---|---|---|
| P0-01 Sunucu fiyat/indirim | Tamam | Catalog yetkili checkout quote uretir; Basket fiyat, varyant, stok ve kuponu tekrar dogrular. |
| P0-02 Kart verisi ve gercek odeme | Kismi / Dis | PAN/CVV/son kullanma tarihi domain, DB ve olaylardan kaldirildi; token referansi kullaniliyor. Gercek PSP, imzali webhook ve mutabakat yok; Production bilincli olarak fail-closed. |
| P0-03 Stok rezervasyonu | Tamam | SQL'de benzersiz rezervasyon, transaction, onay/red, odemeden sonra tuketim, red/timeout telafisi var. |
| P0-04 Durum makinesi ve para | Kismi | Tekrar ve gecersiz gecisler engelleniyor; Paid siparis dogrudan iptal edilemiyor. PSP iade/authorization/capture durumlari ve audit'li iade operasyonu yok. |
| P0-05 Kalici checkout kimligi | Kismi | Istemci UUID, istek hash'i, Redis AOF kaydi, dagitik kilit ve ayni anahtar/farkli icerik icin 409 var. Kabul kaydi ilk mesajla ayni SQL transaction'inda degil. |
| P0-06 Transactional outbox | Kismi | Order ve Catalog is verisiyle olayi ayni SQL transaction'inda outbox'a yazar; confirm sonrasi isaretler. Basket checkout siniri Redis + confirmed publish kullaniyor. |
| P0-07 Kalici tuketici tekillestirme | Kismi | Siparis, stok, kupon ve durum gecislerinde business-key/unique constraint idempotency var. Tum handler'lar icin ortak transactional inbox yok. |
| P0-08 Broker onayi/toparlanma | Tamam | Publisher confirm, mandatory/return, retry, otomatik kanal/baglanti toparlama, yeniden abonelik ve servis bazli DLQ var. Canli broker restart sonrasi 15/15 consumer ve 34/34 mesaj testi yeniden gecti. |
| P0-09 Desteklenen runtime | Tamam | 17 proje .NET 10, SDK `global.json` ile sabit, container ve CI .NET 10. |

## P1 maddeleri

| Madde | Durum | Bugunku durum |
|---|---|---|
| P1-01 Olay sozlesmesi/surum | Kismi | EventId, correlation, causation, zaman ve trace header'lari var; paylasilan surumlu contract paketi/AsyncAPI gecisi yok. |
| P1-02 Retry ve DLQ | Kismi | Sinirli retry ve servis bazli DLX/DLQ var; yetkili replay operasyonu ve hata siniflandirma runbook'u eksik. |
| P1-03 Kapasite/kapanis | Kismi | Prefetch 16, consumer ACK/NACK ve connection recovery var; gercek uzun sureli yukta graceful shutdown esigi ayrica olculmeli. |
| P1-04 Sepet CAS/temizlik | Tamam | Redis optimistic CAS ve snapshot surumu, checkout sonrasi yalniz ilgili surumun temizlenmesi var. |
| P1-05 Kupon kotasi | Tamam | SQL transaction, siparis+kupon benzersiz kullanim ve odemeye bagli tuketim var. |
| P1-06 Surec/zaman asimi | Kismi | Kalici siparis durumlari ve stok rezervasyon expiry worker var; gercek PSP belirsiz sonuc sorgusu yok. |
| P1-07 Bagimlilik sinirlari | Tamam | Gateway timeout, servis health/readiness, sinirli retry ve ayrik DB sahipligi var; kesinti testi yayin oncesi tekrarlanir. |
| P1-08 Servis bazli SQL/broker yetkisi | Acik | Yerel ortam ortak altyapi hesabi kullaniyor. Prod'da servis/migration hesabi ve Rabbit vhost permission ayri kurulacak. |
| P1-09 Tarayici/admin oturumu | Kismi | Servis ve gateway JWT kontrolu, rol/policy testleri var. BFF/HttpOnly cookie, asimetrik anahtar, MFA ve anlik rol iptali yok. |
| P1-10 Refresh rotation | Kismi | Rotation ve reuse kontrolu var; cok replica/iki sekme DB race testi ve token-family politikasi eksik. |
| P1-11 Yetki/audit | Kismi | Musteri/admin negatif yetki akislari E2E testte; fiyat, kupon, rol ve durum degisikligi icin tam audit defteri yok. |
| P1-12 Rate limit/proxy | Kismi | Gercek `/auth`, `/basket/checkout`, medya ve genel yollar icin gateway limitleri, trusted proxy ve body/timeout siniri var. Limit deposu replika basina bellekte. |
| P1-13 Medya | Acik | Boyut/tur kontrolleri ve kalici Compose volume var; decode/re-encode, malware tarama ve ortak object storage yok. |
| P1-14 TLS/secret/ortam | Kismi / Dis | K8s Secret, ExternalSecret sablonu, NetworkPolicy ve ic port izolasyonu var. Canli TLS ve secret rotation tatbikati ortama bagli. |
| P1-15 Kisisel veri/saklama | Kismi | Kart verisi kaldirildi, telemetry hassas alan testi var. Kurumsal veri envanteri, anonimlestirme ve retention otomasyonu eksik. |
| P1-16 Tekrarlanabilir performans | Kismi | `verify-live-load.py` p50/p95/p99, stok yarisi, kuyruk ve DLQ olcer. Uretim hacmi/SLO hedefi urun sahibi ve staging ile belirlenmeli. |
| P1-17 Checkout durum ekrani | Kismi | Kalici request-id ve siparis sonucu sorgusu var; 202 response icinde status URL ve yenilemede otomatik ayni isleme donus eksik. |
| P1-18 Bildirim/operasyon | Kismi | Olaylar idempotent Notification consumer'a ulasiyor; gercek e-posta/SMS saglayicisi ve teslim takibi yok. |
| P1-19 Hesap kurtarma | Acik | Saglayicili e-posta dogrulama/sifre sifirlama ve destek oturum iptali akisi yok. |
| P1-20 Gozlemlenebilirlik/uyari | Kismi | HTTP+AMQP OpenTelemetry, metrik ve correlation var. Harici APM panosu ve otomatik pager alarmi kurulacak. |
| P1-21 K8s probe/ariza | Tamam (yerel) | Startup/liveness/readiness ayrik; 12 workload podu Ready ve 3 migration job'i tamam. Broker restart sonrasi consumer recovery canli testte gecti. |
| P1-22 Yedek/geri donus | Dis/Acik | Compose yerel volume kaliciligi var; yerel K8s veri katmani bilincli olarak gecici. Yonetilen SQL PITR ve olculmus restore/DR tatbikati yok. |
| P1-23 Surum/migration | Kismi | Ayrik migration Job ve rollout kapisi var; staging expand/contract rollback tatbikati ve prod digest policy eksik. |
| P1-24 Test/CI kapisi | Kismi | Unit, frontend, chart, full-stack, eventbus, security/SBOM/image taramalari var. Test cesitliligi artti; tum servisler icin ayrik integration test projesi yok. |
| P1-25 Telemetry platformu | Kismi | Ortak `AddVeloraObservability`, OTLP, ASP.NET/HTTP/EF/AMQP izleri ve hassas veri testi var. Collector/backend bu yerel kurulumun disinda. |
| P1-26 Global hata sozlesmesi | Tamam | Ortak RFC 9457 ProblemDetails, kod/traceId ve uretimde ayrinti gizleme var. |
| P1-27 Gateway guvenligi/kesif | Kismi | JWT on kontrol, gercek rota bazli rate-limit, timeout, K8s DNS ve route parity kontrolu var. Compose halen Consul kullaniyor. |
| P1-28 Repo hijyeni | Kismi | Artiklar temizlendi, ignore/analyzer/CI sertlestirildi. Branch protection, CODEOWNERS ve kurum politikasi repo disi ayar ister. |
| P1-29 Lisans | Kismi | AutoMapper kaldirildi, NuGet/npm audit ve SBOM var. Kurum onayli lisans allow-list kapisi ayrica tanimlanmali. |
| P1-30 API contract/surum | Acik | OpenAPI mevcut; formal `/v1`, oasdiff kapisi ve uretilmis TypeScript istemci yok. |
| P1-31 Mimari dokuman | Kismi | Bu durum belgesi, calistirma ve K8s dokumani var. ADR/C4/AsyncAPI/STRIDE ve alarm runbook seti tamam degil. |

## P2 maddeleri

| Madde | Durum | Bugunku durum |
|---|---|---|
| P2-01 Katalog sorgu/facet | Acik | Islevsel testler geciyor; buyuk veri execution-plan ve cursor pagination calismasi yok. |
| P2-02 Admin raporu | Acik | Dogruluk E2E testte; buyuk veri aggregate/read-model ve izolasyon yuk testi yok. |
| P2-03 Cache/on yuz butcesi | Kismi | Lazy route, RTK cache, production build ve sunucu fiyat dogrulamasi var; gercek mobil Web Vitals butcesi yok. |
| P2-04 Broker/DB olcekleme | Kismi | HPA/PDB ve canli kucuk contention testi var; queue-age tabanli autoscaling ve prod connection budget yok. |
| P2-05 Erisilebilirlik/mobil | Acik | Bilesen testleri var; ekran okuyucu, gercek cihaz ve tam klavye kabul kaydi yok. |
| P2-06 Ticari kapsam | Dis/Acik | Para birimi, teslimat, iade ve operasyon sahipligi urun/operasyon karari gerektirir. |
| P2-07 Bakim plani | Kismi | Gitleaks, Trivy, NuGet/npm audit, SBOM ve Cosign CI'da; patch SLA ve sahiplik kurumca tanimlanmali. |
| P2-08 Config/secret | Kismi / Dis | Validate-on-start ve ortam values dosyalari var; prod vault/ESO ve GitOps kurulumu hedef ortama bagli. |

## Dogrulama komutlari

```powershell
. .\scripts\load-env.ps1

# Kubernetes API ve RabbitMQ UI
.\scripts\velora-k8s.ps1 status
.\scripts\velora-k8s.ps1 rabbit

$env:VELORA_GATEWAY = 'http://127.0.0.1:30000'
$env:VELORA_RABBITMQ = 'http://127.0.0.1:15672'
$env:VELORA_RABBITMQ_USER = $env:RABBITMQ_USER
$env:VELORA_RABBITMQ_PASSWORD = $env:RABBITMQ_PASSWORD

python scripts\verify-stack.py
python scripts\verify-eventbus.py
python scripts\verify-live-load.py
```

Bu testler gercek calisan servisleri ve veritabanlarini kullanir; test kullanicisi,
siparis ve stok/kupon hareketi olusturur. Yuk testi gecici urununu sonunda siler,
fakat olusan siparis snapshot'lari denetim icin kalir.
