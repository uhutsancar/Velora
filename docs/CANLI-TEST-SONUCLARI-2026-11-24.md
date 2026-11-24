# Velora canli test sonuclari - 24 Kasim 2026

Bu rapor mock sinif testi degil; calisan Docker Compose ve Docker Desktop
Kubernetes ortamlari, gercek SQL Server, Redis ve RabbitMQ uzerinde alinmistir.

## Ortam

| Bilesen | Surum / adres |
|---|---|
| .NET SDK | 10.0.301 |
| Node / pnpm | 24.22.1 / 11.10.0 |
| Docker Engine | 29.9.3 |
| kubectl / Helm | 1.36.1 / 4.3.2 |
| Docker API / storefront / admin | `:5000` / `:18080` / `:8081` |
| Kubernetes API / storefront / admin | `:30000` / `:30080` / `:30081` |
| RabbitMQ yonetim | `http://127.0.0.1:15672` (sadece localhost port-forward) |

## Sonuclar

| Dogrulama | Sonuc |
|---|---|
| `dotnet build SellingBuddy.sln -c Release --no-restore` | Basarili, 0 uyari, 0 hata |
| EventBus unit/state/security testleri | 5 gecti, 0 hata, 6 harici broker testi bilincli skip |
| Frontend Vitest | 127/127 gecti (shared 80, storefront 30, admin 17) |
| Frontend production build | Storefront ve admin basarili |
| Helm/chart degismezleri | 54/54 gecti |
| Kubernetes HTTP E2E | 61/61 gecti |
| Kubernetes RabbitMQ E2E | 34/34 gecti; 15/15 consumer bagli |
| Kubernetes eszamanli checkout | 23/23 gecti |
| Docker Compose HTTP E2E | 61/61 gecti |
| Docker RabbitMQ E2E | 34/34 gecti; 15/15 consumer bagli; 0 DLQ |
| Docker RabbitMQ son durum | Servis kuyruklari 0 birikme; izleme kuyrugunda 17 mesaj |
| Azure Service Bus UI checkout | Gercek hesapla checkout gecti; siparis `paid` ve odeme basarili |
| Azure Service Bus son durum | Topic ve tum subscription'lar silinmedi; `Disabled`; Docker kullanmiyor |
| Son log taramasi | Docker ve Kubernetes uygulamalarinda kritik/fatal/unhandled hata yok |

## Canli satis zinciri

Gercek calisan zincir su sirayla dogrulandi:

1. Kullanici kaydi ve token yenileme.
2. Katalog, filtre/facet, urun ve yetkili sunucu fiyati.
3. Sepet, kupon, wishlist ve idempotent checkout.
4. `OrderCreated` ile stok rezervasyonu.
5. Stok onayindan sonra sandbox odeme.
6. Siparisin `paid` olmasi, sepetin temizlenmesi, stok ve kupon sayacinin dusmesi.
7. Bildirim consumer'lari, kuyruklarin bosalmasi ve sifir DLQ.
8. Admin CRUD degisikliklerinin storefront'a yansimasi ve negatif yetki testleri.

RabbitMQ canli testi her beklenen kuyrukta tam `+1` mesaj gordu. Broker yeniden
baslatildiktan sonra uygulama podlari yeniden baslatilmadan 15 consumer geri
baglandi ve ayni 34/34 test tekrar gecti.

## Eszamanli stok ve gecikme

Tek urunde **4 stok / 5 ayni anda checkout** senaryosu:

- 5 istek kabul edildi.
- 4 siparis `paid`, 1 siparis stok rezervasyonunda guvenli reddedildi.
- Stok `0` oldu; negatif stok veya fazla satis olmadi.
- Checkout kabul: p50 `0.100 s`, p95/p99/max `0.144 s`.
- Nihai durum: p50 `1.170 s`, p95/p99/max `1.263 s`.
- Beklenen tum mesaj sayaclari tuttu; backlog ve DLQ artisi olmadi.

Bu degerler tek makinedeki tekrar edilebilir yerel baseline'dir; uretim kapasite
ve SLO taahhudu degildir.

## Testte bulunan ve giderilen sorunlar

- Catalog urun goruntuleme sayaci request-scope `DbContext` ile fire-and-forget
  calisiyordu; islem artik await ediliyor ve hata kontrollu loglaniyor.
- RabbitMQ connection recovery sonrasinda eski publisher confirm kanali mesaj
  bekletebiliyordu; her publish denemesi taze confirm kanali kullaniyor.
- Kubernetes `up`, SQL sifirken tum uygulama podlarini bekleyerek migration'i
  kilitleyebiliyordu; artik yalniz SQL/Redis/RabbitMQ rollout'unu bekliyor.
- Yuk testi auth rate-limit kotasini checkout yukune karistiriyordu; test
  kullanicilari once hazirlaniyor ve sadece checkout eszamanli baslatiliyor.
- Production Vite build'inde gorunmeyen `paymentProvider` alani bos kaldigi icin
  checkout formu API'ye gitmeden sessizce duruyordu; sandbox adapter acikca
  secildi ve gercek tarayici checkout testiyle dogrulandi.

## Bilinen yayin kapilari

Yerel sandbox akisinin gecmesi, gercek satis onayi degildir. Gercek PSP adapteri,
imzali webhook, iade/mutabakat, tum consumer'lar icin transactional inbox,
checkout kabulunun ilk outbox kaydiyla tek transaction olmasi, prod TLS/secret
rotasyonu ve restore/DR tatbikati aciktir. Tam madde listesi
[`URETIME-HAZIRLIK-DURUMU.md`](URETIME-HAZIRLIK-DURUMU.md) icindedir.

Testler gecici yuk urununu siler. Denetim izi olarak test kullanicilari ve siparis
snapshot'lari yerel veritabaninda kalir.
