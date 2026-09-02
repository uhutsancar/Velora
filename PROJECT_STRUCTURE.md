> ### ⚠️ Bu doküman Velora öncesi durumu anlatır
>
> Aşağıdaki analiz, **Velora dönüşümünden önceki** SellingBuddy kod tabanını belgeler
> (commit `0c1afee`). Bölüm 16'da listelenen kritik hataların tamamı düzeltilmiş,
> servisler genişletilmiş ve iki React uygulaması eklenmiştir.
>
> Güncel mimari, API haritası, kurulum ve doğrulama için **[README.md](README.md)** dosyasına bakın.
> Bu dosya, nereden başlandığının kaydı olarak korunmaktadır.

---

# SellingBuddy — Proje Yapısı ve Mimari Dokümanı

> **Kapsam:** `d:\microservice_project` deposundaki tüm backend kaynak kodunun (16 proje, 121 `.cs` dosyası, ~5.955 satır) dosya dosya taranmasıyla üretilmiştir.
> **Doküman tarihi:** 2026-08-18 · **Branch:** `main` · **Son commit:** `0c1afee`

---

## İÇİNDEKİLER

1. [Genel Bakış](#1-genel-bakış)
2. [Teknoloji Yığını](#2-teknoloji-yığını)
3. [Fiziksel Dizin Haritası](#3-fiziksel-dizin-haritası)
4. [Mimari Katmanlar ve Desenler](#4-mimari-katmanlar-ve-desenler)
5. [Altyapı Bileşenleri (Docker)](#5-altyapı-bileşenleri-docker)
6. [Port ve Adres Tablosu](#6-port-ve-adres-tablosu)
7. [BuildingBlocks — EventBus Detaylı Analizi](#7-buildingblocks--eventbus-detaylı-analizi)
8. [Servis Servis Detaylı Analiz](#8-servis-servis-detaylı-analiz)
9. [Uçtan Uca İş Akışı (Checkout Sagası)](#9-uçtan-uca-iş-akışı-checkout-sagası)
10. [Integration Event Kataloğu](#10-integration-event-kataloğu)
11. [Veri Modeli ve Veritabanı Şemaları](#11-veri-modeli-ve-veritabanı-şemaları)
12. [Kimlik Doğrulama Akışı](#12-kimlik-doğrulama-akışı)
13. [Service Discovery ve API Gateway Yönlendirme](#13-service-discovery-ve-api-gateway-yönlendirme)
14. [Test Projesi](#14-test-projesi)
15. [Geliştirme Kronolojisi (Git Geçmişi)](#15-geliştirme-kronolojisi-git-geçmişi)
16. [Tespit Edilen Sorunlar ve Teknik Borç](#16-tespit-edilen-sorunlar-ve-teknik-borç)
17. [Çalıştırma Rehberi (Runbook)](#17-çalıştırma-rehberi-runbook)

---

## 1. GENEL BAKIŞ

**SellingBuddy**, .NET 8 üzerinde kurulmuş bir **e-ticaret mikroservis referans uygulamasıdır**. eShopOnContainers mimarisinden esinlenmiş; ürün kataloğu, sepet, sipariş, ödeme ve bildirim akışını birbirinden bağımsız servislerle çözer.

**Sistemin özeti:**

- **6 çalışan uygulama:** 1 API Gateway + 5 mikroservis (biri Console App)
- **Servisler arası haberleşme:** Senkron HTTP yok — tamamen **asenkron event-driven** (RabbitMQ üzerinden pub/sub)
- **İstemciye bakan tek kapı:** Ocelot API Gateway (`:5000`)
- **Servis keşfi:** Consul (`:8500`) — gateway servisleri isimle bulur, sabit port bilmez
- **Veri:** SQL Server (Catalog + Order) ve Redis (Basket)
- **Kimlik:** JWT Bearer, simetrik HMAC-SHA256 imza

**Mimari felsefe:** Her servis kendi olgunluk seviyesinde tasarlanmış — CatalogService basit CRUD (Anemic Model), BasketService sade Clean Architecture, **OrderService ise tam DDD + CQRS + Domain Events** ile 4 ayrı projeye bölünmüş.

```
                              ┌────────────────┐
                              │  Blazor WASM   │  (şablon, henüz bağlı değil)
                              └───────┬────────┘
                                      │ HTTP
                              ┌───────▼────────┐         ┌──────────────┐
                              │  Ocelot API    │◄───────►│    Consul    │
                              │  Gateway :5000 │ discover│    :8500     │
                              └───────┬────────┘         └──────▲───────┘
                    ┌─────────────────┼─────────────────┐       │
                    │                 │                 │       │ register
            ┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐│
            │   Catalog    │  │   Identity   │  │    Basket    ├┘
            │    :5004     │  │    :5005     │  │    :5003     │
            │  SQL Server  │  │  JWT üretir  │  │    Redis     │
            └──────────────┘  └──────────────┘  └───────┬──────┘
                                                        │ publish
      ┌─────────────────────────────────────────────────▼─────────────────┐
      │            RabbitMQ  —  Exchange: "SellingBuddyEventBus" (direct)  │
      └───┬──────────────────────────┬────────────────────────┬───────────┘
          │ OrderCreated             │ OrderStarted           │ OrderPayment*
   ┌──────▼───────┐           ┌──────▼───────┐         ┌──────▼────────┐
   │    Order     │           │   Payment    │         │ Notification  │
   │    :5002     │           │    :5001     │         │  Console App  │
   │  SQL Server  │           │  (fake pay)  │         │  (log yazar)  │
   │  DDD + CQRS  │           │              │         │               │
   └──────────────┘           └──────────────┘         └───────────────┘
```

---

## 2. TEKNOLOJİ YIĞINI

### 2.1 Platform

| Bileşen | Sürüm |
|---|---|
| .NET / TargetFramework | **net8.0** (tüm 16 projede) |
| Dil özellikleri | `ImplicitUsings=enable`, `Nullable=enable`, minimal hosting API |
| Solution | `SellingBuddy.sln` — 16 proje + 20 solution klasörü |

### 2.2 NuGet Paket Envanteri

| Paket | Sürüm | Kullanan Projeler | Amaç |
|---|---|---|---|
| **Ocelot** | 23.3.3 | Web.ApiGateway | API Gateway / reverse proxy |
| **Ocelot.Provider.Consul** | 23.3.3 | Web.ApiGateway | Gateway'in Consul'dan servis çözmesi |
| **Consul** | 1.8.0 | Catalog, Basket, Identity, Order | Servis kayıt/keşif istemcisi |
| **RabbitMQ.Client** | 6.8.1 | EventBus.RabbitMQ, NotificationService | AMQP istemcisi |
| **Microsoft.Azure.ServiceBus** | 5.2.0 | EventBus.AzureServiceBus | Alternatif mesaj broker |
| **Polly** | 8.7.0 | EventBus.RabbitMQ, Catalog, Order.Api, Order.Infrastructure | Retry / resilience politikaları |
| **StackExchange.Redis** | 3.0.11 | BasketService.Api | Redis istemcisi |
| **MediatR** | 14.1.0 | Order.Domain, Order.Application | CQRS + in-process domain event dispatch |
| **AutoMapper** | 16.1.1 | Order.Application | Entity ↔ ViewModel eşleme |
| **Microsoft.EntityFrameworkCore(.SqlServer/.Relational/.Tools)** | 8.0.0 (Catalog) / 8.0.6 (Order) | Catalog.Api, Order.Infrastructure, Order.Api | ORM |
| **Microsoft.Data.SqlClient** | 5.2.0 (Catalog) / 7.0.2 (Order.Api) | Catalog, Order.Api | SqlException yakalama |
| **Microsoft.AspNetCore.Authentication.JwtBearer** | 8.0.10 | Basket, Order.Api | JWT doğrulama |
| **System.IdentityModel.Tokens.Jwt** | 8.19.1 | IdentityService | JWT üretimi |
| **Microsoft.IdentityModel.Tokens** | 8.19.1 | Identity, Basket | İmzalama anahtarları |
| **Newtonsoft.Json** | 13.0.4 | EventBus.Base (+ Basket) | Event serileştirme |
| **Swashbuckle.AspNetCore** | 6.4.0 | Tüm Web API'ler | Swagger/OpenAPI |
| **Microsoft.Extensions.Hosting / DependencyInjection** | 10.0.9 | NotificationService, EventBus.Base | Generic Host, DI |
| **MSTest** | 4.0.2 | EventBus.UnitTest | Test framework |
| **Microsoft.AspNetCore.Components.WebAssembly** | 8.0.8 | WebApp (Blazor) | WASM istemci |

> ⚠️ **Sürüm tutarsızlığı:** `Microsoft.Extensions.*` paketlerinde **10.0.9** ile **8.0.x** karışık kullanılıyor. `Microsoft.Data.SqlClient` de 5.2.0 / 7.0.2 olarak ayrışıyor. Tek sürüme hizalanması önerilir (`Directory.Packages.props` ile merkezî paket yönetimi).

---

## 3. FİZİKSEL DİZİN HARİTASI

```
d:\microservice_project\
│
├── SellingBuddy.sln                  ← 16 projeyi barındıran solution
├── docker-compose.yml                ← sadece Consul (kök seviyede)
├── ServiceUrls.txt                   ← port referans notu
├── .gitignore                        ← bin/obj/.vs/node_modules vb.
├── CatalogBrand.cs                   ← ⚠️ ARTIK DOSYA (içinde boş `Class1`)
├── .github/workflows/                ← ⚠️ BOŞ (CI/CD tanımlı değil)
├── TestResults/                      ← test çıktıları
│
└── SellingBuddy\
    │
    ├── docker-compose-files\         ← her altyapı bileşeni için ayrı compose
    │   ├── consul\docker-compose.yml
    │   ├── rabbitmq\docker-compose.yml
    │   ├── redis\docker-compose.yml
    │   └── sqlserver\docker-compose.yml
    │
    ├── src\
    │   │
    │   ├── ApiGateways\WebApiGateway\Web.ApiGateway\
    │   │   ├── Program.cs                    ← Ocelot + Consul bootstrap
    │   │   ├── Configurations\ocelot.json    ← rota tanımları
    │   │   ├── Controllers\WeatherForecastController.cs  ← ⚠️ şablon kalıntısı
    │   │   └── WeatherForecast.cs                        ← ⚠️ şablon kalıntısı
    │   │
    │   ├── BuildingBlocks\EventBus\          ← ★ SİSTEMİN KALBİ
    │   │   ├── EventBus.Base\                ← soyutlamalar + ortak davranış
    │   │   │   ├── Abstraction\
    │   │   │   │   ├── IEventBus.cs
    │   │   │   │   ├── IEventBusSubscriptionManager.cs
    │   │   │   │   └── IIntegrationEventHandler.cs
    │   │   │   ├── Events\
    │   │   │   │   ├── IntegrationEvent.cs   ← tüm eventlerin atası
    │   │   │   │   └── BaseEventBus.cs       ← abstract template
    │   │   │   ├── SubManagers\
    │   │   │   │   └── InMemoryEventBusSubscriptionManager.cs
    │   │   │   ├── EventBusConfig.cs
    │   │   │   └── SubscriptionInfo.cs
    │   │   ├── EventBus.RabbitMQ\
    │   │   │   ├── EventBusRabbitMQ.cs
    │   │   │   └── RabbitMQPersistentConnection.cs
    │   │   ├── EventBus.AzureServiceBus\
    │   │   │   └── EventBusServiceBus.cs
    │   │   └── EventBus.Factory\
    │   │       └── EventBusFactory.cs        ← Factory Pattern
    │   │
    │   ├── Clients\BlazorWebApp\WebApp\      ← ⚠️ default şablon, entegre değil
    │   │
    │   └── Services\
    │       ├── CatalogService\CatalogService.Api\      (tek proje, katmanlı klasör)
    │       ├── BasketService\BasketService.Api\        (tek proje, Core/Infrastructure)
    │       ├── IdentityService\IdentityService.Api\    (tek proje, en sade)
    │       ├── OrderService\                           ★ 4 PROJEYE BÖLÜNMÜŞ
    │       │   ├── OrderService.Domain\                ← DDD çekirdek
    │       │   ├── OrderService.Application\           ← CQRS/MediatR
    │       │   ├── OrderService.Infrastructure\        ← EF Core/Repository
    │       │   └── OrderService.Api\                   ← HTTP + Integration Events
    │       ├── PaymentService\PaymentService.Api\      (sadece event handler)
    │       └── NotificationService\NotificationService\ (Console App)
    │
    └── tests\BuildingBlocks\EventBus.UnitTest\
```

---

## 4. MİMARİ KATMANLAR VE DESENLER

### 4.1 Uygulanan Desenler — Nerede, Nasıl

| Desen | Uygulandığı Yer | Somut Kanıt |
|---|---|---|
| **Microservices** | Tüm `src/Services` | Her servis kendi process, kendi veri deposu |
| **API Gateway** | `Web.ApiGateway` | Ocelot `ocelot.json` rota tablosu |
| **Service Discovery** | Tüm servisler | `ConsulRegistration.cs` — `AgentServiceRegistration` |
| **Publish/Subscribe** | EventBus | RabbitMQ `direct` exchange + servis başına kuyruk |
| **Abstract Factory** | `EventBusFactory` | `EventBusType` enum'a göre RabbitMQ/Azure seçimi |
| **Template Method** | `BaseEventBus` | `ProcessEvent()` somut, `Publish/Subscribe` abstract |
| **Repository** | Basket, Order | `IBasketRepository`, `IGenericRepository<T>` |
| **Unit of Work** | Order | `OrderDbContext : IUnitOfWork` |
| **CQRS** | Order.Application | `CreateOrderCommand` / `GetOrderDetailsQuery` + MediatR |
| **Mediator** | Order | MediatR — hem komut hem domain event dağıtımı |
| **Domain Events** | Order.Domain | `BaseEntity.AddDomainEvent()` + `MediatorExtension` |
| **Aggregate Root** | Order.Domain | `Order`, `Buyer` → `IAggregateRoot` |
| **Value Object** | Order.Domain | `Address` (C# `record`), `ValueObject` base sınıfı |
| **Enumeration Pattern** | Order.Domain | `OrderStatus`, `CardType` (enum yerine sınıf) |
| **Options Pattern** | Catalog | `CatalogSettings` + `IOptionsSnapshot` |
| **Retry / Resilience** | Polly | DB migration, RabbitMQ bağlantı, seed işlemleri |
| **Extension Method Registration** | Tüm servisler | `ConfigureConsul()`, `ConfigureAuth()`, `ConfigureDbContext()` |
| **Seeding Strategy** | Catalog, Order | Dosyadan oku → yoksa hardcoded fallback |

### 4.2 OrderService'in Katman Bağımlılık Grafiği

```
  OrderService.Api  ──────────────┐
      │                           │
      ├──► OrderService.Infrastructure
      │           │               │
      ├───────────┴──► OrderService.Application
      │                       │   │
      └───────────────────────┴──►│
                                  ▼
                        OrderService.Domain   (altyapı bağımlılığı YOK, sadece MediatR)
                                  ▲
                                  │
                          EventBus.Base ◄──── Api, Application
                          EventBus.Factory ◄── Api
```

**Bağımlılıklar içe doğru akıyor** (Clean Architecture kuralı korunmuş): Domain hiçbir altyapıya bağımlı değil, yalnızca `MediatR`'ın `INotification` arayüzünü kullanıyor.

---

## 5. ALTYAPI BİLEŞENLERİ (DOCKER)

Her bileşen **ayrı bir compose dosyasında** — hepsi tek tek ayağa kaldırılıyor.

| Dosya | Image | Container | Port Eşlemesi | Notlar |
|---|---|---|---|---|
| `docker-compose-files/consul/` | `hashicorp/consul:latest` | `local-consul` | `8500:8500`, `8600:8600/udp` | `agent -dev -ui -client=0.0.0.0 -node=localhost` |
| `docker-compose-files/rabbitmq/` | `rabbitmq:3-management` | `local-rabbitmq` | `5672:5672`, `15672:15672` | Yönetim UI dahil, guest/guest |
| `docker-compose-files/redis/` | `redis:latest` | `local-redis` | `6379:6379` | Persistence yapılandırması yok |
| `docker-compose-files/sqlserver/` | `mcr.microsoft.com/mssql/server:2022-latest` | `local-sqlserver` | **`1444:1433`** | `SA_PASSWORD=${SQL_SA_PASSWORD}` |
| `./docker-compose.yml` (kök) | `hashicorp/consul:latest` | `local-consul` | `8500`, `8600/udp` | `-node` parametresi **yok** (eski sürüm) |

> 📌 **SQL Server portu 1433 değil 1444'tür.** Bu, working tree'de yapılmış (henüz commit edilmemiş) bir değişikliktir — parola artik kodda tutulmuyor; `.env` dosyasindaki `SQL_SA_PASSWORD` degiskeninden gelir.
>
> 📌 **Uygulamalar için Docker imajı yoktur.** Servisler Visual Studio / `dotnet run` ile host makinede çalışır; sadece bağımlılıklar konteynerdedir. Bu yüzden tüm adresler `localhost`'tur.

---

## 6. PORT VE ADRES TABLOSU

| Uygulama | HTTP Port | IIS Express | Swagger | Consul Servis Adı |
|---|---|---|---|---|
| **Web.ApiGateway** | `5000` | 13926 / 44363 | `/swagger` | — (kaydolmaz, keşfeder) |
| **PaymentService.Api** | `5001` | — | `/swagger` | — (kaydolmaz) |
| **OrderService.Api** | `5002` | 5499 / 44374 | `/swagger` | `OrderService` |
| **BasketService.Api** | `5003` | 1312 / 44367 | `/swagger` | `BasketService` |
| **CatalogService.Api** | `5004` | 44358 / 44303 | `/swagger` | `CatalogService` |
| **IdentityService.Api** | `5005` | 21604 / 44332 | `/swagger` | `IdentityService` |
| **NotificationService** | — | — | — | — (Console App) |

| Altyapı | Adres |
|---|---|
| Consul UI | `http://localhost:8500` |
| RabbitMQ UI | `http://localhost:15672` (guest/guest) |
| RabbitMQ AMQP | `localhost:5672` |
| Redis | `localhost:6379` |
| SQL Server | `localhost,1444` (sa / `.env: SQL_SA_PASSWORD`) |

---

## 7. BUILDINGBLOCKS — EVENTBUS DETAYLI ANALİZİ

Bu, projenin **en özenle tasarlanmış** parçası ve tüm servislerin ortak dili.

### 7.1 Proje Yapısı ve Sorumluluklar

```
EventBus.Base ────────► sadece soyutlama + ortak mantık (broker bilmez)
     ▲     ▲
     │     └── EventBus.RabbitMQ        ──► RabbitMQ'ya özgü implementasyon
     │     └── EventBus.AzureServiceBus ──► Azure SB'ye özgü implementasyon
     │
EventBus.Factory ─────► ikisini de referans alır, runtime'da seçer
```

### 7.2 `IntegrationEvent` — Tüm Eventlerin Atası

```csharp
public class IntegrationEvent
{
    [JsonPropertyName("id")]          public Guid Id { get; private set; }
    [JsonPropertyName("createdDate")] public DateTime CreatedDate { get; private set; }

    public IntegrationEvent() { Id = Guid.NewGuid(); CreatedDate = DateTime.Now; }

    [JsonConstructor]
    public IntegrationEvent(Guid id, DateTime createdDate) { ... }
}
```

Her event otomatik olarak benzersiz `Id` ve zaman damgası taşır — idempotency ve izlenebilirlik için temel.

### 7.3 `EventBusConfig` — Merkezî Ayar Nesnesi

| Alan | Varsayılan | Açıklama |
|---|---|---|
| `ConnectionRetryCount` | `5` | Polly retry sayısı |
| `DefaultTopicName` | `"SellingBuddyEventBus"` | RabbitMQ exchange adı / Azure topic adı |
| `EventBusConnectionString` | `""` | Azure SB için |
| `SubscriberClientAppName` | `""` | **Kuyruk adının öneki** (`BasketService.OrderCreated`) |
| `EventNamePrefix` | `""` | Event adından kırpılacak ön ek |
| `EventNameSuffix` | `"IntegrationEvent"` | Event adından kırpılacak son ek |
| `EventBusType` | `RabbitMQ` | `RabbitMQ` \| `AzureServiceBus` |
| `Connection` | `null` | RabbitMQ `ConnectionFactory` nesnesi |

### 7.4 İsim Dönüşümü — Sistemin Anahtarı

`BaseEventBus.ProcessEventName()` sınıf adını **routing key**'e çevirir:

```
OrderCreatedIntegrationEvent  ──ProcessEventName──►  "OrderCreated"   ← routing key
                                                          │
              GetSubName() ──► "BasketService.OrderCreated" ← kuyruk adı
                          ──► "OrderService.OrderCreated"   ← kuyruk adı
```

Bu sayede **farklı assembly'lerdeki, farklı namespace'lerdeki aynı isimli sınıflar aynı event olarak kabul edilir.** BasketService'in `OrderCreatedIntegrationEvent`'i ile OrderService'inki fiziksel olarak farklı tiplerdir ama routing key aynı olduğu için mesaj yerine ulaşır.

> ⚠️ **Kırılgan nokta:** Kırpma `TrimEnd(string.ToArray())` ile yapılıyor — bu **karakter kümesi** kırpar, alt dize değil. `"IntegrationEvent"` kümesi `{I,n,t,e,g,r,a,o,E,v}`'dir. Mevcut event adları şans eseri güvenli (`OrderCreated` → `d` kümede yok), ancak `...PriceChangeIntegrationEvent` gibi bir isim `OrderPriceChang` olarak bozulur.

### 7.5 `InMemoryEventBusSubscriptionManager` — Abonelik Kayıt Defteri

```csharp
Dictionary<string, List<SubscriptionInfo>> _handlers;  // "OrderCreated" → [HandlerType, ...]
List<Type> _eventTypes;                                 // deserialize için gerçek tip
event EventHandler<string> OnEventRemoved;              // son handler silinince kuyruk unbind
```

Bellek içi çalışır — **servis yeniden başlarsa abonelikler `Program.cs`'ten yeniden kurulur.**

### 7.6 `BaseEventBus.ProcessEvent()` — Mesaj Tüketim Motoru

```
Mesaj gelir → routing key normalize edilir
            → SubsManager'da handler var mı?
            → var: her handler için
                 ├─ DI'dan handler örneği al
                 ├─ eventName'den gerçek Type'ı bul
                 ├─ JsonConvert.DeserializeObject(message, eventType)
                 ├─ Reflection ile IIntegrationEventHandler<T>.Handle() bul
                 └─ await Invoke(handler, [event])
```

> 🐞 **Kritik hata:** `using (var scope = ServiceProvider.CreateScope())` ile scope açılıyor ama handler `ServiceProvider.GetService(...)` ile **root provider'dan** çözülüyor — `scope.ServiceProvider` kullanılmıyor. Scoped bağımlılık içeren handler'lar (Basket'in `IBasketRepository`'si, Order'ın `IMediator`/`DbContext`'i) runtime'da `InvalidOperationException` fırlatır. Bkz. Bölüm 16, Sorun #1.

### 7.7 `EventBusRabbitMQ` — RabbitMQ Uygulaması

| Metot | Davranış |
|---|---|
| **ctor** | `ConnectionFactory` al (yoksa varsayılan) → `RabbitMQPersistentConnection` kur → consumer channel oluştur → `OnEventRemoved` aboneliği |
| **`Publish`** | Bağlantı kontrolü → Polly retry (exponential backoff `2^n` sn) → `ExchangeDeclare(direct)` → JSON serialize → `BasicPublish(DeliveryMode=2 kalıcı, mandatory:true)` |
| **`Subscribe<T,TH>`** | `QueueDeclare(durable:true, exclusive:false, autoDelete:false)` → `QueueBind(exchange, routingKey)` → `SubsManager.AddSubscription` → `StartBasicConsume` |
| **`StartBasicConsume`** | `EventingBasicConsumer` + `BasicConsume(autoAck:false)` — **manuel ACK** |
| **`Consumer_Received`** | Mesajı UTF-8 çöz → `ProcessEvent` → try/catch → `BasicAck` |

**Mesajlaşma topolojisi:**

```
Exchange: "SellingBuddyEventBus"  (type: direct, durable)
   │
   ├─routingKey "OrderCreated"────┬──► queue "BasketService.OrderCreated"  (sepeti temizler)
   │                              └──► queue "OrderService.OrderCreated"   (siparişi oluşturur)
   ├─routingKey "OrderStarted"───────► queue "PaymentService.OrderStarted"
   ├─routingKey "OrderPaymentSuccess"► queue "NotificationService.OrderPaymentSuccess"
   └─routingKey "OrderPaymentFailed"─► queue "NotificationService.OrderPaymentFailed"
```

Direct exchange + aynı routing key'e bağlı **birden fazla kuyruk** = fan-out davranışı. Her servis mesajın kendi kopyasını alır.

### 7.8 `RabbitMQPersistentConnection` — Dayanıklı Bağlantı

- `lock` ile thread-safe `TryConnect()`
- Polly: `SocketException` / `BrokerUnreachableException` → exponential backoff
- Olay abonelikleri: `ConnectionShutdown`, `CallbackException`, `ConnectionBlocked` → **otomatik yeniden bağlanma**

> 🐞 **Hata:** Constructor `retryCount` parametresini alıyor ama **alan atanmıyor** (`this.retryCount = retryCount;` satırı eksik). `readonly int retryCount` = `0` kalır → `WaitAndRetry(0)` = **hiç retry yok**.

### 7.9 `EventBusServiceBus` — Azure Service Bus Uygulaması

RabbitMQ'dan farklı olarak:

- `ManagementClient` ile **topic/subscription otomatik oluşturma**
- `CorrelationFilter { Label = eventName }` ile **kural (rule) tabanlı filtreleme**
- Varsayılan `$Default` kuralı silinir, event'e özgü kural eklenir
- `RegisterMessageHandler` + `MaxConcurrentCalls = 10`, `AutoComplete = false`
- Başarılı işlemede `CompleteAsync(LockToken)`

Bu implementasyon **yazılmış ama üretimde kullanılmıyor** — tüm servisler `EventBusType.RabbitMQ` ile yapılandırılmış. Sadece unit testte Azure yolu deneniyor.

---

## 8. SERVİS SERVİS DETAYLI ANALİZ

---

### 8.1 🌐 Web.ApiGateway (`:5000`)

**Sorumluluk:** Dış dünyaya açılan tek kapı. İstekleri Consul'dan çözdüğü servislere yönlendirir.

**Program.cs akışı:**

```csharp
builder.Configuration.AddJsonFile("Configurations/ocelot.json", optional: false, reloadOnChange: true);
builder.Services.AddOcelot().AddConsul();      // ← Consul provider
...
await app.UseOcelot();                          // ← pipeline'ın sonunda
```

**`ocelot.json` rota tablosu:**

| Upstream (istemci çağırır) | Metotlar | ServiceName | Downstream (servise gider) |
|---|---|---|---|
| `/catalog/{everything}` | GET, POST, DELETE, PUT | `CatalogService` | `/api/catalog/{everything}` |
| `/auth` | POST | `IdentityService` | `/api/auth` |
| `/basket/{everything}` | GET, POST, DELETE, PUT | `BasketService` | `/api/Basket/{everything}` |

**GlobalConfiguration:** `BaseUrl: http://localhost:5000`, `ServiceDiscoveryProvider: Consul @ localhost:8500`

> ⚠️ **OrderService gateway'de tanımlı DEĞİL.** OrderService Consul'a kaydoluyor ama `ocelot.json`'da rotası yok — dışarıdan `:5002` ile doğrudan erişilmesi gerekir.
>
> ⚠️ Gateway'de **JWT doğrulama yok**. `AuthenticationOptions` tanımlanmamış; token doğrulama her servise bırakılmış (Basket ve Order kendi içinde yapıyor). Token gateway'den şeffaf şekilde geçer.
>
> ⚠️ `WeatherForecastController.cs` ve `WeatherForecast.cs` şablon kalıntısı — silinmeli.

---

### 8.2 🔐 IdentityService.Api (`:5005`)

**Sorumluluk:** JWT token üretmek. Sistemdeki en sade servis.

**Dosya yapısı:**

```
Application/Models/LoginRequestModel.cs    { UserName, Password }
Application/Models/LoginResponseModel.cs   { UserName, UserToken }
Application/Services/IIdentityService.cs   Task<LoginResponseModel> Login(...)
Application/Services/IdentityService.cs    ← token üretimi
Controllers/AuthController.cs              POST api/auth
Extensions/Registration/ConsulRegistration.cs
```

**Token üretim mantığı (`IdentityService.Login`):**

```csharp
// DB Process will be here.  ← henüz yok
var claims = new Claim[] {
    new Claim(ClaimTypes.NameIdentifier, requestModel.UserName),
    new Claim(ClaimTypes.Name, "Uhut Sancar"),          // ← sabit
};
var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("<redacted-legacy-signing-key>"));
var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
var expiry = DateTime.Now.AddDays(10);
var token  = new JwtSecurityToken(claims: claims, expires: expiry,
                                  signingCredentials: creds, notBefore: DateTime.Now);
```

**Endpoint:**

| Metot | Yol | Body | Yanıt |
|---|---|---|---|
| POST | `/api/auth` | `{ "userName": "...", "password": "..." }` | `{ "userName": "...", "userToken": "eyJ..." }` |

> 🔴 **Kritik:** Şifre **hiç kontrol edilmiyor**. Herhangi bir `userName`/`password` ile geçerli token üretilir. Kullanıcı deposu (DB) yok. Bu bilinçli bir "ileride yapılacak" durumu (kod yorumunda belirtilmiş) ama **üretim için kabul edilemez**.
>
> ⚠️ İmzalama anahtarı hem `appsettings.json`'da (`AuthConfig:Secret`) hem de kod içinde **hardcoded** — kod içindeki kazanıyor, config okunmuyor.

---

### 8.3 📦 CatalogService.Api (`:5004`)

**Sorumluluk:** Ürün kataloğu CRUD + görsel servisi. EventBus'a **bağlı değil** (tek bağımsız servis).

**Klasör yapısı** (dikkat: `Infastructure` — klasör adında yazım hatası):

```
Core/Domain/                  CatalogItem.cs, CatalogBrand.cs, CatalogType.cs  ← Anemic model
Core/Application/ViewModels/  PaginatedItemsViewModel<T>.cs
Infastructure/                CatalogSettings.cs
  Context/                    CatalogContext.cs, CatalogContextSeed.cs, CatalogContextDesignFactory.cs
  EntityConfigurations/       3 adet IEntityTypeConfiguration
  Setup/SeedFiles/            BrandsTextFile.txt, CatalogTypes.txt, CatalogItems.txt
Extensions/                   ConsulRegistration.cs, DbContextRegistration.cs, HostExtension.cs
Controllers/                  CatalogController.cs, PictureController.cs
Pics/                         ← ürün görselleri (boş)
```

**Domain modeli (`CatalogItem`):**

```
Id, Name, Description, Price, PictureFileName, PictureUri (Ignored),
CatalogTypeId → CatalogType, CatalogBrandId → CatalogBrand,
AvailableStock, OnReorder
```

**EF yapılandırması:**

- Şema: **`catalog`**
- Tablolar: `catalog.Catalog`, `catalog.CatalogBrand`, `catalog.CatalogType`
- **HiLo sequence** ile Id üretimi: `catalog_hilo`, `catalog_brand_hilo`, `catalog_type_hilo`
- `PictureUri` **Ignore** edilir — runtime'da `PicBaseUrl + PictureFileName` ile hesaplanır

**REST API (`CatalogController` — `/api/Catalog`):**

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `items?pageSize=10&pageIndex=0&ids=1,2,3` | Sayfalı liste veya id listesiyle filtre |
| GET | `items/{id:int}` | Tek ürün (PictureUri hesaplanır) |
| GET | `items/withname/{name}?pageSize&pageIndex` | İsimle başlayan ürünler |
| GET | `items/type/{catalogTypeId}/brand/{catalogBrandId?}` | Tip + marka filtresi |
| GET | `items/type/all/brand/{catalogBrandId?}` | Sadece marka filtresi |
| GET | `catalogtypes` | Tüm tipler |
| GET | `catalogbrands` | Tüm markalar |
| POST | `items` | Yeni ürün |
| PUT | `items` | Ürün güncelle |
| DELETE | `{id}` | Ürün sil |

Constructor'da `context.ChangeTracker.QueryTrackingBehavior = NoTracking` — okuma performansı için.

**`PicController` (`/api/Pic`):** Fiziksel dosyadan byte okuyup MIME tipiyle döner. `_env.ContentRootPath/Pics/{fileName}`. Desteklenen tipler: png, gif, jpg/jpeg, bmp, tiff, wmf, jp2, svg.

**Bootstrap (`Program.cs`) sırası:**

```
AddControllers → Configure<CatalogSettings> → ConfigureDbContext → ConfigureConsul
→ Swagger → Build → MigrateDbContext<CatalogContext>(seed) → Swagger UI
→ HttpsRedirection → Authorization → MapControllers → RegisterWithConsul → Run
```

**`HostExtension.MigrateDbContext`:** Polly ile 3/5/8 sn retry → `EnsureCreated()` + `Migrate()` + seeder.

**`CatalogContextSeed`:** Marka → Tip → Ürün sırasıyla, tablo boşsa dosyadan yükler. Ürün dosyası CSV formatında (`CatalogTypeName,CatalogBrandName,Description,Name,Price,PictureFileName,availablestock,onreorder`), tip/marka adlarını Id'ye dictionary lookup ile çevirir. Sonra `CatalogItems.zip` varsa `Pics/` klasörüne açar.

> 🔴 **Servis şu haliyle başlamaz:** `DbContextRegistration` `configuration.GetConnectionString("CatalogConnection")` okur, ama `appsettings.json`'da bu anahtar **yorum satırında**. Mevcut olan `ConnectionStrings:OrderDbConnectionString` (kopyala-yapıştır kalıntısı, Catalog'un işine yaramaz). Connection string `null` gelir.
>
> 🔴 **Seed dosyaları bulunamaz:** Seeder `ContentRootPath/**Infrastructure**/Setup/SeedFiles` yolunu arar, gerçek klasör `**Infastructure**` (yazım hatası). Dosyalar bulunamaz → sessizce hardcoded fallback'e düşer (2 marka, 2 tip, 1 ürün).
>
> ⚠️ `CatalogContextDesignFactory` **boş bir sınıf** — `IDesignTimeDbContextFactory<>` implement etmiyor, `dotnet ef` komutları için işe yaramaz.
>
> ⚠️ `PicController`'daki ikinci action'ın route'u relative olduğu için gerçek URL `api/Pic/api/v1/catalog/items/{id}/pic` olur.
>
> ⚠️ Fiyat değişiminde `ProductPriceChangedIntegrationEvent` yayınlama kodu **yorum satırında** — Catalog henüz EventBus'a bağlanmamış.

---

### 8.4 🛒 BasketService.Api (`:5003`)

**Sorumluluk:** Kullanıcı sepetini Redis'te tutmak, checkout'ta `OrderCreatedIntegrationEvent` yayınlamak.

**Klasör yapısı:**

```
Core/Domain/Models/              BasketItem.cs, CustomerBasket.cs, BasketCheckout.cs
Core/Application/Repository/     IBasketRepository.cs
Core/Application/Services/       IIdentityService.cs, IdentityService.cs
Infrastructure/Repository/       BasketRepository.cs (RedisBasketRepository)
Infrastructure/Services/         ← boş klasör
Extensions/                      AuthRegistration.cs, RedisRegistration.cs, ConsulRegistration.cs
IntegrationEvents/Events/        OrderCreatedIntegrationEvent.cs
IntegrationEvents/EventHandlers/ OrderCreatedIntegrationEventHandler.cs
Controllers/                     BasketController.cs
```

**Veri modeli:**

```csharp
CustomerBasket { string BuyerId; List<BasketItem> Items; }

BasketItem : IValidatableObject { Id, ProductId, ProductName, UnitPrice,
                                 OldUnitPrice, Quantity, PictureUrl }
    → Validate(): Quantity < 1 ise "Invalid number of units"

BasketCheckout { City, Street, State, Country, ZipCode, CardNumber, CardHolderName,
                 CardExpiration, CardSecurityNumber, CardTypeId, Buyer }
```

**`RedisBasketRepository`** — Redis'te **key = BuyerId, value = JSON**:

| Metot | Redis komutu |
|---|---|
| `GetBasketAsync(customerId)` | `StringGetAsync(customerId)` → `JsonConvert.DeserializeObject<CustomerBasket>` |
| `UpdateBasketAsync(basket)` | `StringSetAsync(basket.BuyerId, JSON)` → tekrar okuyup döner |
| `DeleteBasketAsync(id)` | `KeyDeleteAsync(id)` |
| `GetUsers()` | `server.Keys()` — ⚠️ üretimde `KEYS` komutu tehlikeli |

**`IdentityService` (Basket içindeki):** `HttpContext.User.FindFirst(ClaimTypes.NameIdentifier).Value` — JWT'den kullanıcı adını çeker.

**REST API (`/api/Basket`, tüm controller `[Authorize]`):**

| Metot | Yol | Açıklama |
|---|---|---|
| GET | `/` | Health check ("Basket Service is Up and Running") |
| GET | `/{id}` | Sepeti getir (yoksa boş `CustomerBasket`) |
| POST | `/update` | Sepeti komple değiştir |
| POST | `/additem` | Token'dan userId alıp ürün ekle |
| POST | `/checkout` | ★ `OrderCreatedIntegrationEvent` **yayınlar** |
| DELETE | `/{id}` | Sepeti sil |

**Checkout akışı (`CheckoutAsync`):**

```
1. userId = basketCheckout.Buyer
2. basket = repository.GetBasketAsync(userId)     → null ise 400
3. userName = identityService.GetUserName()        → JWT claim'den
4. eventMessage = new OrderCreatedIntegrationEvent(userId, userName, adres..., kart..., basket)
5. _eventBus.Publish(eventMessage)                 → routing key "OrderCreated"
6. return Accepted() (202)
```

`[FromHeader(Name = "x-request-id")] string requestId` parametresi alınıyor ama **kullanılmıyor** (idempotency için tasarlanmış, uygulanmamış).

**JWT yapılandırması (`AuthRegistration`):**

```csharp
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();   // claim adlarının bozulmaması için
TokenValidationParameters {
    ValidateIssuer = false, ValidateAudience = false,
    ValidateLifetime = false,                      // ⚠️ süre kontrolü KAPALI
    ValidateIssuerSigningKey = true,
    IssuerSigningKey = SymmetricSecurityKey("<redacted-legacy-signing-key>")  // ⚠️ hardcoded
}
options.UseSecurityTokenValidators = true;
```

Ayrıca `JwtBearerEvents` içinde `OnMessageReceived` / `OnAuthenticationFailed` / `OnTokenValidated` ile **konsola debug çıktısı** basılıyor.

**Bootstrap:** `ConfigureAuth → ConfigureConsul → Redis(Singleton) → HttpContextAccessor → IBasketRepository(Scoped) → IIdentityService(Transient) → OrderCreatedIntegrationEventHandler(Transient) → IEventBus(Singleton)`

**Abonelik:** `eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>()` — **kendi yayınladığı event'i kendi dinler** (kasıtlı: sipariş oluşunca sepeti temizler).

**`OrderCreatedIntegrationEventHandler`:** `_repository.DeleteBasketAsync(@event.UserId)` — sepeti siler.

> ⚠️ İki adet **debug middleware** pipeline'da: Authorization header'ının ilk 20 karakterini ve 401 durumunda tüm header'ları konsola yazıyor. `IsDevelopment()` kontrolü yok — **her ortamda çalışır**, token sızıntısı riski.
>
> 🔴 `IBasketRepository` **Scoped**, handler **Transient**, EventBus **Singleton** → `ProcessEvent` root provider'dan handler çözmeye çalışınca Scoped bağımlılık nedeniyle hata alır (Bölüm 16, Sorun #1).

---

### 8.5 📋 OrderService — 4 Projelik DDD Yapısı (`:5002`)

Projedeki **mimari olarak en olgun** servis. Domain-Driven Design + CQRS + Domain Events.

#### 8.5.1 `OrderService.Domain` — Çekirdek İş Kuralları

**SeedWork (DDD altyapı sınıfları):**

| Dosya | İçerik |
|---|---|
| `BaseEntity.cs` | `Guid Id`, `DateTime CreateDate`, `List<INotification> domainEvents`, `AddDomainEvent()`, `RemoveDomainEvent()`, `ClearDomainEvents()`, `IsTransient()`, kimlik temelli `Equals`/`GetHashCode` (`Id.GetHashCode() ^ 31`), `==`/`!=` operatörleri |
| `IAggregateRoot.cs` | Marker interface |
| `IRepository<T>.cs` | `IUnitOfWork UnitOfWork { get; }` |
| `IUnitOfWork.cs` | `SaveChangesAsync()`, `SaveEntitiesAsync()` |
| `Enumeration.cs` | Enum yerine sınıf: `Id`, `Name`, `GetAll<T>()` (reflection), `FromValue<T>()`, `FromDisplayName<T>()`, `AbsoluteDifference()`, `IComparable` |
| `ValueObject.cs` | `GetEqualityComponents()` soyut, `SequenceEqual` tabanlı eşitlik, `GetCopy()` |

**Order Aggregate:**

```csharp
public class Order : BaseEntity, IAggregateRoot
{
    DateTime OrderDate;  int Quantity;  string Description;
    Guid? BuyerId;  Buyer Buyer;
    Address Address;                        // Value Object (record)
    private int orderStatusId;              // shadow-benzeri private alan
    OrderStatus OrderStatus;
    private readonly List<OrderItem> _orderItems;
    public IReadOnlyCollection<OrderItem> OrderItems => _orderItems;   // ← kapsülleme
    Guid? PaymentMethodId;

    protected Order() { Id = Guid.NewGuid(); _orderItems = new(); }

    public Order(userName, address, cardTypeId, cardNumber, cardSecurityNumber,
                 cardHolderName, cardExpiration, paymentMethodId, buyerId = null) : this()
    {
        orderStatusId = OrderStatus.Submitted.Id;
        OrderDate = DateTime.UtcNow;
        ...
        AddOrderStartedDomainEvent(...);     // ★ Domain Event tetiklenir
    }

    public void AddOrderItem(productId, productName, unitPrice, pictureUrl, units = 1);
    public void SetBuyerId(Guid buyerId);
    public void SetPaymentMethodId(Guid paymentMethodId);
}
```

**DDD kuralı korunmuş:** `_orderItems` private, dışarıya `IReadOnlyCollection` olarak açılıyor; ekleme sadece `AddOrderItem()` üzerinden.

**Diğer domain tipleri:**

| Tip | Açıklama |
|---|---|
| `OrderItem : BaseEntity, IValidatableObject` | `ProductId, ProductName, PictureUrl, UnitPrice, Units`; `Units <= 0` doğrulaması |
| `Address` (C# `record`) | `Street, City, State, Country, ZipCode` — immutable Value Object |
| `OrderStatus : Enumeration` | `Submitted(1)`, `AwaitingValidation(2)`, `StockConfirmed(3)`, `Paid(4)`, `Shipped(5)`, `Cancelled(6)` + `FromName()`, `From(id)` |
| `Buyer : BaseEntity, IAggregateRoot` | `Name`, private `List<PaymentMethod>`, **`VerifyOrAddPaymentMethod()`** ← iş kuralı burada |
| `PaymentMethod : BaseEntity` | `Alias, CardNumber, SecurityNumber, CardHolderName, Expiration, CardTypeId`; ctor'da **guard clause**'lar (`OrderingDomainException`), `expiration < UtcNow` kontrolü, `IsEqualTo()` |
| `CardType : Enumeration` | `Amex(1)`, `Visa(2)`, `MasterCard(3)` |
| `OrderingDomainException` | Domain kuralı ihlali özel istisnası |
| `Models/CustomerBasket`, `Models/BasketItem` | Basket'ten gelen event payload'unu karşılamak için DTO kopyası |

**Domain Events:**

- `OrderStartedDomainEvent : INotification` — sipariş oluşturulunca; `Order`, `UserName`, kart bilgileri taşır
- `BuyerAndPaymentMethodVerifiedDomainEvent : INotification` — alıcı+ödeme yöntemi doğrulanınca; `Buyer`, `PaymentMethod`, `OrderId`

**`Buyer.VerifyOrAddPaymentMethod()` iş mantığı:**

```
mevcut kart var mı? (cardTypeId + cardNumber + expiration eşleşiyor mu)
  ├─ VAR  → BuyerAndPaymentMethodVerifiedDomainEvent yayınla, mevcut kartı döndür
  └─ YOK  → yeni PaymentMethod oluştur, listeye ekle, aynı event'i yayınla, yeni kartı döndür
```

#### 8.5.2 `OrderService.Application` — CQRS Katmanı

**Yapı:**

```
Features/Commands/CreateOrder/        CreateOrderCommand.cs, CreateOrderCommandHandler.cs
Features/Queries/GetOrderDetailById/  GetOrderDetailsQuery.cs, GetOrderDetailsQueryHandler.cs
Features/Queries/ViewModels/          OrderDetailViewModel.cs
DomainEventHandlers/                  OrderStartedDomainEventHandler.cs
                                      UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler.cs
IntegrationEvents/                    OrderStartedIntegrationEvent.cs
Interfaces/Repositories/              IGenericRepository<T>, IOrderRepository, IBuyerRepository
Mapping/OrderMapping/                 OrderMappingProfile.cs
ServiceRegistration.cs
Dtos/                                 ← boş klasör
```

**`CreateOrderCommand : IRequest<bool>`** — `BasketItem` listesini `OrderItemDTO` listesine çeviren zengin constructor içerir.

**`CreateOrderCommandHandler` akışı:**

```
1. Address value object oluştur
2. new Order(...)                       → ctor içinde OrderStartedDomainEvent kuyruğa girer
3. her OrderItemDTO için AddOrderItem()
4. orderRepository.AddAsync(dbOrder)
5. orderRepository.UnitOfWork.SaveEntitiesAsync()   → ★ domain event'ler burada dağıtılır
6. eventBus.Publish(new OrderStartedIntegrationEvent(request.UserName))
7. return true
```

**`GetOrderDetailsQueryHandler`:** `orderRepository.GetByIdAsync(id, i => i.OrderItems)` → AutoMapper ile `OrderDetailViewModel`.

**`OrderMappingProfile` (AutoMapper):**

```csharp
Order ↔ CreateOrderCommand
OrderItem ↔ OrderItemDTO
Order → OrderDetailViewModel:
    City/Country/Street/Zipcode ← Address.*     (flattening)
    Date        ← OrderDate
    Ordernumber ← Id.ToString()
    Status      ← OrderStatus.Name
    Total       ← OrderItems.Sum(i => i.Units * i.UnitPrice)   ← hesaplanan alan
OrderItem → Orderitem
```

**Domain Event Handler'lar:**

`OrderStartedDomainEventHandler` (sipariş başlayınca alıcıyı hazırlar):

```
cardTypeId = event.CardTypeId != 0 ? event.CardTypeId : 1
buyer = buyerRepository.GetSingleAsync(b => b.Name == userName, b => b.PaymentMethods)
buyer yoksa → new Buyer(userName)
buyer.VerifyOrAddPaymentMethod(...)    → ikinci domain event'i tetikler
var → Update(buyer) / yok → AddAsync(buyer)
buyerRepository.UnitOfWork.SaveEntitiesAsync()
```

`UpdateOrderWhenBuyerAndPaymentMethodVerifiedDomainEventHandler` (siparişi alıcıya bağlar):

```
order = orderRepository.GetByIdAsync(event.OrderId)
order.SetBuyerId(event.Buyer.Id)
order.SetPaymentMethodId(event.Payment.Id)
```

> ⚠️ Burada `SaveChanges` çağrılmıyor — değişikliğin kalıcı olması EF change tracker'ın aynı scope'ta olmasına bağlı.

**`ServiceRegistration.AddApplicationRegistration()`:** `AddAutoMapper(assembly)` + `AddMediatR(RegisterServicesFromAssembly)`.

#### 8.5.3 `OrderService.Infrastructure` — Kalıcılık Katmanı

**`OrderDbContext : DbContext, IUnitOfWork`**

```csharp
public const string DEFAULT_SCHEMA = "ordering";
DbSet<Order> Orders;  DbSet<OrderItem> OrderItems;  DbSet<PaymentMethod> Payments;
DbSet<Buyer> Buyers;  DbSet<CardType> CardTypes;    DbSet<OrderStatus> OrderStatus;

public async Task<bool> SaveEntitiesAsync(CancellationToken ct = default)
{
    await mediator.DispatchDomainEventsAsync(this);   // ★ ÖNCE event'ler
    await base.SaveChangesAsync(ct);                   // SONRA kayıt
    return true;
}
```

**`MediatorExtension.DispatchDomainEventsAsync()` — Domain Event dağıtım motoru:**

```
ChangeTracker.Entries<BaseEntity>()  →  DomainEvents dolu olanları bul
   → tüm event'leri topla
   → entity'lerin event listelerini TEMİZLE (sonsuz döngü önlemi)
   → her event için mediator.Publish(domainEvent)
```

**Repository'ler:**

`GenericRepository<T>` — `AddAsync`, `GetAll`, `GetById`, `GetByIdAsync(id, includes)`, `GetSingleAsync(expr, includes)`, iki aşırı yüklenmiş `Get()` (expression-includes ve string-includeProperties+orderBy), `Update`. Tüm metotlar `virtual`.

`OrderRepository : GenericRepository<Order>, IOrderRepository` — `GetByIdAsync` override: DB'de bulamazsa `dbContext.Orders.Local`'a bakar (**aynı transaction içinde henüz kaydedilmemiş siparişi bulmak için** — domain event handler zinciri için kritik).

`BuyerRepository : GenericRepository<Buyer>, IBuyerRepository` — sade türev.

**EF Entity Configuration'ları:**

| Konfigürasyon | Tablo | Öne çıkan ayarlar |
|---|---|---|
| `OrderEntityConfiguration` | `ordering.orders` | `Ignore(DomainEvents)`, `OwnsOne(Address)`, shadow property `orderStatusId` (`PropertyAccessMode.Field`), `OrderItems` navigation → Field access, FK'ler |
| `OrderItemEntityConfiguration` | `ordering.orderItems` | `Ignore(DomainEvents)`, `Property<int>("OrderId")` shadow FK |
| `BuyerEntityConfiguration` | `ordering.buyers` | `Name` → `varchar(100)`, `HasMany(PaymentMethods).WithOne().HasForeignKey(i => i.Id)`, Field access |
| `PaymentMethodEntityConfiguration` | `ordering.paymentmethods` | `Property<int>("BuyerId")`, `CardHolderName(200)`, `Alias(200)`, `CardNumber(25)`, FK → CardType |
| `OrderStatusEntityConfiguration` | `ordering.orderstatus` | `HasDefaultValue(1)`, `ValueGeneratedNever()`, `Name(200)` |
| `CardTypeEntityConfiguration` | `ordering.cardtypes` | `HasDefaultValue(1)`, `ValueGeneratedNever()`, `Name(200)` |

**`ServiceRegistration.AddPersistenceRegistration()`:**

```csharp
services.AddDbContext<OrderDbContext>(opt => {
    opt.UseSqlServer(configuration["OrderDbConnectionString"]);
    opt.EnableSensitiveDataLogging();          // ⚠️ hassas veri loglanıyor
});
services.AddScoped<IBuyerRepository, BuyerRepository>();
services.AddScoped<IOrderRepository, OrderRepository>();

// DI kurulumu sırasında senkron migration:
using var dbContext = new OrderDbContext(optionsBuilder.Options, null);
dbContext.Database.EnsureCreated();
dbContext.Database.Migrate();
```

**`OrderDbContextDesignFactory : IDesignTimeDbContextFactory<OrderDbContext>`** — `dotnet ef` için. İçinde tüm metotları no-op olan `NoMediator : IMediator` sınıfı var (tasarım zamanında MediatR gerekmesin diye).

**`OrderDbContextSeed`:** Polly retry (3×5sn) → `Migrate()` → `CardTypes` boşsa `Enumeration.GetAll<CardType>()` → `OrderStatus` boşsa 6 sabit statü. `useCustomizationData = false` olduğu için `Seeding/Setup/*.txt` dosyaları **kullanılmıyor**.

#### 8.5.4 `OrderService.Api` — HTTP + Event Katmanı

**REST API (`/api/Order`):**

| Metot | Yol | İşlem |
|---|---|---|
| GET | `/{id}` (Guid) | `mediator.Send(new GetOrderDetailsQuery(id))` |

> Sipariş oluşturma **HTTP endpoint'i yoktur** — sadece `OrderCreatedIntegrationEvent` ile tetiklenir. Bu bilinçli bir event-driven tasarım tercihi.

**Integration Events:**

- `OrderCreatedIntegrationEvent` (**tüketilen**) — Basket'ten gelir, `Guid RequestId` alanı **fazladan** içerir
- `OrderStartedIntegrationEvent` (`Event/` klasöründe, `userId`+`orderId`) — ⚠️ **tanımlı ama kullanılmıyor**; publish edilen `Application` katmanındaki (`userName`) versiyondur

**`OrderCreatedIntegrationEventHandler`:** Event → `CreateOrderCommand` → `mediator.Send(...)`

**Extensions:**

- `HostExtension.MigrateDbContext<T>()` — Polly 3/5/8 sn retry + `EnsureCreated` + `Migrate` + seeder
- `AuthRegistration.ConfigureAuth()` — JWT; **`AuthConfig:Secret` config'den okunur** (Basket'ten farklı olarak), `ClockSkew = TimeSpan.Zero`, `RequireExpirationTime = true`, ⚠️ `Encoding.ASCII` (Basket `UTF8` kullanıyor)
- `EventHandlerRegistration.ConfigureEventHandlers()` — handler'ları Transient kaydeder
- `ConsulRegistration` — ⚠️ **namespace'i `BasketService.Api.Extensions`** (kopyala-yapıştır kalıntısı)

**Bootstrap sırası:**

```
AddControllers → Swagger → Console logging
→ AddApplicationRegistration → AddPersistenceRegistration  (burada DB migrate olur)
→ ConfigureAuth → ConfigureEventHandlers → ConfigureConsul
→ IEventBus (Singleton, RabbitMQ, SubscriberClientAppName="OrderService")
→ AddMediatR (2 assembly)                     ⚠️ Application'da zaten kaydedilmişti
→ Build → Swagger UI → Authentication → Authorization → MapControllers
→ RegisterWithConsul
→ eventBus.Subscribe<OrderCreatedIntegrationEvent, OrderCreatedIntegrationEventHandler>()
→ MigrateDbContext<OrderDbContext>(seed)      ⚠️ ikinci kez migration
→ Run
```

---

### 8.6 💳 PaymentService.Api (`:5001`)

**Sorumluluk:** `OrderStarted` event'ini dinleyip sahte ödeme kararı üretmek. HTTP endpoint'i yoktur (Controllers klasörü boş).

**Yapı:**

```
IntegrationEvents/Events/         OrderStartedIntegrationEvent.cs         (tüketilen)
                                  OrderPaymentSuccessIntegrationEvent.cs  (yayınlanan)
                                  OrderPaymentFailedIntegrationEvent.cs   (yayınlanan)
IntegrationEvents/EventHandlers/  OrderStartedIntegrationEventHandler.cs
Program.cs
```

**`OrderStartedIntegrationEventHandler` mantığı:**

```csharp
bool paymentSuccessFlag = configuration.GetValue<bool>("PaymentSuccess");   // appsettings: true

IntegrationEvent paymentEvent = paymentSuccessFlag
    ? new OrderPaymentSuccessIntegrationEvent(@event.OrderId)
    : new OrderPaymentFailedIntegrationEvent(@event.OrderId, "This is a fake error message");

eventBus.Publish(paymentEvent);
```

Ödeme sonucu **`appsettings.json`'daki `"PaymentSuccess": true`** bayrağıyla belirlenir — gerçek ödeme entegrasyonu yok, test/demo amaçlı.

**EventBus config:** `Connection = new ConnectionFactory()` **açıkça veriliyor** (Basket/Order'da verilmiyor, varsayılana düşüyor).

> 🔴 **Sözleşme uyumsuzluğu:** PaymentService `OrderStartedIntegrationEvent { int OrderId }` bekliyor, ancak OrderService `OrderStartedIntegrationEvent { string UserName }` yayınlıyor. Deserialize sırasında `OrderId` eşleşmez → **her zaman `0`** gelir. Ödeme akışı çalışır ama sipariş kimliği kaybolur.

---

### 8.7 🔔 NotificationService (Console App)

**Sorumluluk:** Ödeme sonucu event'lerini dinleyip bildirim (şimdilik log) üretmek. `Microsoft.NET.Sdk` + `OutputType=Exe` — Web API değil, **Generic Host** ile çalışan konsol uygulaması.

**Program.cs:**

```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddTransient<OrderPaymentFailedIntegrationEventHandler>();
builder.Services.AddTransient<OrderPaymentSuccessIntegrationEventHandler>();
builder.Services.AddSingleton<IEventBus>(sp => EventBusFactory.Create(new EventBusConfig {
    ConnectionRetryCount = 5, EventNameSuffix = "IntegrationEvent",
    SubscriberClientAppName = "NotificationService", EventBusType = EventBusType.RabbitMQ,
    Connection = new ConnectionFactory()
}, sp));

var host = builder.Build();
var eventBus = host.Services.GetRequiredService<IEventBus>();
eventBus.Subscribe<OrderPaymentFailedIntegrationEvent,  OrderPaymentFailedIntegrationEventHandler>();
eventBus.Subscribe<OrderPaymentSuccessIntegrationEvent, OrderPaymentSuccessIntegrationEventHandler>();
Console.WriteLine("NotificationService is Running and Listening to RabbitMQ....");
host.Run();
```

**Handler'lar:** ikisi de sadece `logger.LogInformation(...)` yazar — gerçek e-posta/SMS gönderimi **yapılmamış** (kod yorumunda `//send Fail Email/Notification(sms email)` olarak işaretli).

> 📌 **Dikkat çekici tasarım:** Event sınıfları PaymentService'ten **kopyalanmış** (`PaymentService.Api.IntegrationEvents.Events` namespace'i aynen korunmuş) ama proje referansı **yok**. EventBus sınıf adına göre routing yaptığı için bu çalışır. Bu, mikroservislerde "shared contract" yerine "duplicate contract" yaklaşımıdır — servisler arası bağımlılığı azaltır ama senkronizasyon riski taşır.

---

### 8.8 🖥️ WebApp (Blazor WebAssembly)

`Microsoft.NET.Sdk.BlazorWebAssembly`, .NET 8. İçerik: `App.razor`, `MainLayout.razor`, `NavMenu.razor`, `Home.razor`, `Counter.razor`, `Weather.razor`, `wwwroot/sample-data/weather.json`.

**Tamamen varsayılan Blazor şablonu** — hiçbir backend servisine bağlanmıyor, `HttpClient` sadece kendi base address'ini kullanıyor. Backend geliştirmesi tamamlandıktan sonra doldurulmak üzere iskelet olarak bırakılmış.

---

## 9. UÇTAN UCA İŞ AKIŞI (CHECKOUT SAGASI)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ADIM 1 — KİMLİK DOĞRULAMA                                                    │
│ İstemci ──POST /auth {userName, password}──► Gateway ──► IdentityService      │
│ ◄── { userToken: "eyJhbGciOiJIUzI1NiIs..." }                                 │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│ ADIM 2 — SEPETE ÜRÜN EKLEME                                                  │
│ İstemci ──POST /basket/additem  (Bearer token)──► Gateway ──► BasketService   │
│   BasketService: JWT'den NameIdentifier claim'ini okur → userId               │
│   Redis: SET userId = JSON(CustomerBasket)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│ ADIM 3 — CHECKOUT                                                            │
│ İstemci ──POST /basket/checkout {adres, kart, buyer}──► BasketService         │
│   Redis'ten sepeti oku → OrderCreatedIntegrationEvent oluştur                 │
│   eventBus.Publish(event)  →  routingKey: "OrderCreated"                      │
│   ◄── 202 Accepted                                                            │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │  RabbitMQ exchange "SellingBuddyEventBus" (direct)       │
        └────────┬──────────────────────────────────┬─────────────┘
                 │                                  │
   ┌─────────────▼──────────────┐    ┌──────────────▼───────────────────────────┐
   │ ADIM 4a — SEPET TEMİZLİĞİ  │    │ ADIM 4b — SİPARİŞ OLUŞTURMA              │
   │ queue: BasketService.      │    │ queue: OrderService.OrderCreated          │
   │        OrderCreated        │    │                                           │
   │ BasketService kendi        │    │ OrderCreatedIntegrationEventHandler        │
   │ event'ini dinler           │    │   → CreateOrderCommand                     │
   │ → DeleteBasketAsync(userId)│    │   → mediator.Send()                        │
   └────────────────────────────┘    └──────────────┬───────────────────────────┘
                                                     │
   ┌─────────────────────────────────────────────────▼───────────────────────────┐
   │ ADIM 5 — DOMAIN EVENT ZİNCİRİ (OrderService içi, in-process / MediatR)       │
   │                                                                              │
   │  CreateOrderCommandHandler                                                   │
   │    ├─ new Order(...)  ──────► OrderStartedDomainEvent kuyruğa girer          │
   │    ├─ AddOrderItem() × N                                                     │
   │    ├─ orderRepository.AddAsync(order)                                        │
   │    └─ UnitOfWork.SaveEntitiesAsync()                                         │
   │          └─► DispatchDomainEventsAsync()                                     │
   │                 └─► OrderStartedDomainEventHandler                           │
   │                        ├─ Buyer bul / oluştur                                │
   │                        ├─ buyer.VerifyOrAddPaymentMethod()                   │
   │                        │     └─► BuyerAndPaymentMethodVerifiedDomainEvent    │
   │                        │            └─► UpdateOrderWhenBuyerAndPayment...    │
   │                        │                   ├─ order.SetBuyerId()             │
   │                        │                   └─ order.SetPaymentMethodId()     │
   │                        └─ buyerRepository.SaveEntitiesAsync()                │
   │                                                                              │
   │  Sonra: eventBus.Publish(new OrderStartedIntegrationEvent(userName))         │
   └─────────────────────────────────┬────────────────────────────────────────────┘
                                     │ routingKey: "OrderStarted"
   ┌─────────────────────────────────▼────────────────────────────────────────────┐
   │ ADIM 6 — ÖDEME (queue: PaymentService.OrderStarted)                          │
   │   OrderStartedIntegrationEventHandler                                        │
   │     config["PaymentSuccess"] == true                                         │
   │       ? OrderPaymentSuccessIntegrationEvent(orderId)                         │
   │       : OrderPaymentFailedIntegrationEvent(orderId, "fake error")            │
   │   eventBus.Publish(paymentEvent)                                             │
   └─────────────────────────────────┬────────────────────────────────────────────┘
                                     │ routingKey: "OrderPaymentSuccess" / "OrderPaymentFailed"
   ┌─────────────────────────────────▼────────────────────────────────────────────┐
   │ ADIM 7 — BİLDİRİM (queue: NotificationService.OrderPayment*)                 │
   │   OrderPaymentSuccessIntegrationEventHandler → log                            │
   │   OrderPaymentFailedIntegrationEventHandler  → log                            │
   │   (gerçek e-posta/SMS entegrasyonu henüz yok)                                 │
   └──────────────────────────────────────────────────────────────────────────────┘
```

**Saga tipi:** Koreografi (Choreography) — merkezî orkestratör yok, her servis kendi event'ini dinleyip bir sonrakini yayınlıyor.

**Eksik halka:** Ödeme sonucu OrderService'e geri dönmüyor. `OrderPaymentSuccess` geldiğinde sipariş statüsünün `Paid`'e çekilmesi gerekirdi — bu handler **henüz yazılmamış**. Sipariş sonsuza dek `Submitted` statüsünde kalır.

---

## 10. INTEGRATION EVENT KATALOĞU

| Event (routing key) | Yayınlayan | Dinleyen(ler) | Payload | Durum |
|---|---|---|---|---|
| **`OrderCreated`** | BasketService | BasketService (sepet temizler), OrderService (sipariş açar) | userId, userName, adres (5 alan), kart (5 alan), cardTypeId, buyer, `CustomerBasket` | ✅ Çalışıyor |
| **`OrderStarted`** | OrderService | PaymentService | `{ userName }` yayınlanıyor / `{ orderId }` bekleniyor | ⚠️ Uyumsuz |
| **`OrderPaymentSuccess`** | PaymentService | NotificationService | `{ orderId }` | ✅ Çalışıyor |
| **`OrderPaymentFailed`** | PaymentService | NotificationService | `{ orderId, errorMessage }` | ✅ Çalışıyor |
| `ProductPriceChanged` | *(Catalog — yorum satırında)* | — | — | ❌ Yazılmamış |

**Event sınıflarının fiziksel dağılımı (aynı isim, farklı assembly):**

| Sınıf adı | Kopyalar |
|---|---|
| `OrderCreatedIntegrationEvent` | `BasketService.Api.IntegrationEvents.Events`, `OrderService.Api.IntegrationEvents.Events`, `EventBus.UnitTest.Events.Events` |
| `OrderStartedIntegrationEvent` | `OrderService.Application.IntegrationEvents`, `OrderService.Api.IntegrationEvents.Event`, `PaymentService.Api.IntegrationEvents.Events` |
| `OrderPaymentSuccessIntegrationEvent` | PaymentService projesi + NotificationService projesi (aynı namespace, kopya dosya) |
| `OrderPaymentFailedIntegrationEvent` | Aynı şekilde 2 kopya |

---

## 11. VERİ MODELİ VE VERİTABANI ŞEMALARI

### 11.1 SQL Server — `catalog` şeması (CatalogService)

```
catalog.CatalogBrand               catalog.CatalogType
├── Id      int PK (HiLo)          ├── Id    int PK (HiLo)
└── Brand   nvarchar(100) NOT NULL └── Type  nvarchar(100) NOT NULL
        ▲                                  ▲
        │ CatalogBrandId                   │ CatalogTypeId
        └──────────┬───────────────────────┘
                   │
        catalog.Catalog
        ├── Id               int PK (HiLo: catalog_hilo)
        ├── Name             nvarchar(50)  NOT NULL
        ├── Description      nvarchar(max)
        ├── Price            decimal       NOT NULL
        ├── PictureFileName  nvarchar(max) NULL
        ├── CatalogTypeId    int FK
        ├── CatalogBrandId   int FK
        ├── AvailableStock   int
        └── OnReorder        bit
        (PictureUri → Ignore, runtime'da hesaplanır)
```

### 11.2 SQL Server — `ordering` şeması (OrderService)

```
ordering.cardtypes                 ordering.orderstatus
├── id    int PK (never generated) ├── Id   int PK (never generated)
└── Name  nvarchar(200)            └── Name nvarchar(200)
      ▲                                  ▲
      │ CardTypeId                       │ orderStatusId (shadow)
      │                                  │
ordering.paymentmethods            ordering.orders
├── id              PK             ├── Id              Guid PK
├── Alias           nvarchar(200)  ├── OrderDate       datetime
├── CardNumber      nvarchar(25)   ├── Quantity        int
├── SecurityNumber                 ├── Description
├── CardHolderName  nvarchar(200)  ├── BuyerId         Guid FK ──┐
├── Expiration      NOT NULL       ├── OrderStatusId   int FK    │
├── CardTypeId      FK             ├── PaymentMethodId Guid      │
└── BuyerId         (shadow)       └── Address_* (OwnsOne):      │
      ▲                                Street/City/State/        │
      │                                Country/ZipCode           │
ordering.buyers ◄─────────────────────────────────────────────────┘
├── Id    Guid PK
└── Name  varchar(100)
                                   ordering.orderItems
                                   ├── Id          Guid PK
                                   ├── ProductId   int
                                   ├── ProductName
                                   ├── PictureUrl
                                   ├── UnitPrice   decimal
                                   ├── Units       int
                                   └── OrderId     (shadow FK)
```

> ⚠️ **Şema tip uyumsuzlukları:** `Property<int>("OrderId")` ve `Property<int>("BuyerId")` shadow FK'leri **int** olarak tanımlı, ancak hedef PK'lar `Guid`. Ayrıca `BuyerEntityConfiguration` içinde `HasForeignKey(i => i.Id)` — `PaymentMethod`'un **kendi PK'sını** FK olarak gösteriyor. Bunlar migration/runtime hatalarına yol açar.
>
> ⚠️ **EF Migration dosyası yok.** Hiçbir projede `Migrations/` klasörü bulunmuyor. Şema `EnsureCreated()` ile oluşturuluyor, ardından `Migrate()` çağrılıyor — `EnsureCreated` migration geçmişi tablosu oluşturmadığı için bu kombinasyon problemlidir.

### 11.3 Redis (BasketService)

```
Key:   {BuyerId}                  (JWT NameIdentifier claim'i / BasketCheckout.Buyer)
Value: JSON serileştirilmiş CustomerBasket
       { "BuyerId": "...", "Items": [ { "Id","ProductId","ProductName",
                                        "UnitPrice","OldUnitPrice","Quantity","PictureUrl" } ] }
TTL:   yok (süresiz)
```

---

## 12. KİMLİK DOĞRULAMA AKIŞI

```
1. POST /auth {userName, password}
       ↓
2. IdentityService.Login()
   claims = [ NameIdentifier = userName, Name = "Uhut Sancar" ]
   key    = HMACSHA256("<redacted-legacy-signing-key>")
   expiry = now + 10 gün
       ↓
3. JWT döner ──► istemci saklar
       ↓
4. Sonraki isteklerde: Authorization: Bearer eyJ...
       ↓
5. Gateway token'ı DOĞRULAMADAN geçirir (pass-through)
       ↓
6. BasketService / OrderService kendi içinde doğrular
```

**Doğrulama parametreleri karşılaştırması:**

| Parametre | BasketService | OrderService |
|---|---|---|
| Anahtar kaynağı | **Kod içinde hardcoded** | `configuration["AuthConfig:Secret"]` |
| Encoding | `UTF8` | **`ASCII`** |
| `ValidateIssuer` | `false` | `false` |
| `ValidateAudience` | `false` | `false` |
| `ValidateLifetime` | **`false`** (süre kontrolü kapalı) | varsayılan `true` |
| `ValidateIssuerSigningKey` | `true` | `true` |
| `ClockSkew` | varsayılan (5 dk) | `TimeSpan.Zero` |
| `RequireExpirationTime` | — | `true` |
| Ek | `DefaultInboundClaimTypeMap.Clear()`, `UseSecurityTokenValidators=true`, debug event'leri | `RequireHttpsMetadata=false`, `SaveToken=true` |

> 🔴 **Encoding uyumsuzluğu kritik:** Identity token'ı **UTF8** ile imzalıyor, OrderService **ASCII** ile doğruluyor. Anahtar tamamen ASCII karakterlerden oluştuğu için şu an aynı byte dizisini üretiyorlar — ancak anahtara Türkçe/Unicode bir karakter eklendiği anda **OrderService tüm token'ları reddeder**.

---

## 13. SERVICE DISCOVERY VE API GATEWAY YÖNLENDİRME

### 13.1 Consul Kayıt Deseni

Her servis `ConsulRegistration.cs` ile aynı deseni uygular:

```csharp
// 1. DI kaydı
services.AddSingleton<IConsulClient, ConsulClient>(p => new ConsulClient(cfg =>
    cfg.Address = new Uri(configuration["ConsulConfig:Address"])));

// 2. Uygulama ayağa kalkınca kaydol
lifetime.ApplicationStarted.Register(() => {
    var addresses = app.Properties["server.Features"]
                       .Get<IServerAddressesFeature>();
    var uri = new Uri(addresses.Addresses.First());
    var registration = new AgentServiceRegistration {
        ID = "XService", Name = "XService",
        Address = ..., Port = uri.Port, Tags = new[] { ... }
    };
    consulClient.Agent.ServiceDeregister(registration.ID).Wait();   // eski kaydı temizle
    consulClient.Agent.ServiceRegister(registration).Wait();
});

// 3. Kapanırken kaydı sil
lifetime.ApplicationStopping.Register(() => consulClient.Agent.ServiceDeregister(id).Wait());
```

**Kayıt tablosu:**

| Servis | Consul ID/Name | Address kaynağı | Tags |
|---|---|---|---|
| CatalogService | `CatalogService` | **sabit `"localhost"`** | `Catalog Service`, `Catalog` |
| IdentityService | `IdentityService` | **sabit `"localhost"`** | `Identity Service`, `Identity`, `Token`, `JWT` |
| BasketService | `BasketService` | `uri.Host` (dinamik) | `Basket Service`, `Basket` |
| OrderService | `OrderService` | `uri.Host` (dinamik) | `Ordering Service`, `Order` |

**Farklılıklar:**

- Basket ve Order **null-safe** kontrol yapıyor (`addresses?.Addresses.FirstOrDefault()` + erken çıkış), Catalog ve Identity `.First()` kullanıyor
- Basket ve Order `ApplicationStopping` kaydını **`ApplicationStarted` içinde iç içe** yapıyor; Catalog ve Identity dışarıda
- OrderService'in `ConsulRegistration` dosyası **`BasketService.Api.Extensions` namespace'inde** (kopyala-yapıştır)
- **Health check tanımlı değil** — Consul servisleri "passing" kabul eder, gerçekten ayakta olup olmadığını kontrol etmez

### 13.2 Ocelot Yönlendirme

Gateway `ServiceName` ile Consul'a sorar, dönen `Address:Port` ile downstream isteği kurar:

```
İstemci                Gateway (:5000)          Consul (:8500)        Servis
  │  GET /catalog/items    │                          │                  │
  ├───────────────────────►│                          │                  │
  │                        │  "CatalogService" nerede?│                  │
  │                        ├─────────────────────────►│                  │
  │                        │◄──── localhost:5004 ─────┤                  │
  │                        │  GET localhost:5004/api/catalog/items       │
  │                        ├────────────────────────────────────────────►│
  │◄───────────────────────┤◄────────────────────────────────────────────┤
```

---

## 14. TEST PROJESİ

**`tests/BuildingBlocks/EventBus.UnitTest`** — MSTest 4.0.2, tek test sınıfı.

| Test | Ne yapar | Gerçek bağımlılık |
|---|---|---|
| `subscribe_event_on_rabbitmq_test` | RabbitMQ'ya abone olur | ✅ Çalışan RabbitMQ gerekir |
| `subscribe_event_on_azure_test` | Azure SB'ye abone olur + 2 sn bekler | ✅ Azure aboneliği gerekir |
| `send_message_to_rabbitmq_test` | `OrderCreatedIntegrationEvent(1)` yayınlar | ✅ Çalışan RabbitMQ gerekir |
| `send_message_to_azure_test` | Aynısını Azure'a yayınlar | ✅ Azure aboneliği gerekir |

**Test event'i:** `EventBus.UnitTest.Events.Events.OrderCreatedIntegrationEvent { int Id }`
**Test handler'ı:** `Console.WriteLine("Handle method worked: with id:" + @event.Id)`

**Değerlendirme:**

- Bunlar **unit test değil, entegrasyon/duman testleridir** — gerçek broker'a bağlanırlar
- **Hiç `Assert` yoktur** — sadece exception fırlatmadığını doğrularlar
- 🔴 **Gerçek Azure Service Bus SAS anahtarı kod içinde açıkça yazılı** (`velora-servicebus.servicebus.windows.net` + `SharedAccessKey=...`) — **repoda sızmış kimlik bilgisi**, derhal iptal edilmeli
- Domain mantığı, CQRS handler'ları, repository'ler, controller'lar **hiç test edilmemiş** — test kapsamı yalnızca EventBus'ın bağlanabilirliği

---

## 15. GELİŞTİRME KRONOLOJİSİ (GIT GEÇMİŞİ)

| # | Tarih | Commit | Yapılan İş |
|---|---|---|---|
| 1 | 2026-06-25 | `d8c3515` | `.gitignore` eklendi |
| 2 | 2026-06-25 | `176b2fd` | **"Velora projesi tüm dosyalar eklendi"** — ilk iskelet (projenin eski adı: *Velora*) |
| 3 | 2026-06-26 | `83449f0` | Azure Service Bus + RabbitMQ implementasyonları yazıldı |
| 4 | 2026-06-26 | `c4bc2c5` | `EventBusFactory` ile broker seçim mekanizması |
| 5 | 2026-06-28 | `4d469e6` | EventBus unit/entegrasyon testleri |
| 6 | 2026-06-29 | `28e7d1e` | **CatalogService** kodlandı (EF Core, seed, HiLo, controller'lar) |
| 7 | 2026-06-29 | `35393f6` | **PaymentService** kodlandı (fake ödeme + event handler) |
| 8 | 2026-06-29 | `0459d57` | **NotificationService** + RabbitMQ pub/sub entegrasyonu |
| 9 | 2026-06-29 | `c1b14f8` | **IdentityService** + JWT üretimi |
| 10 | 2026-06-30 | `978b07c` | **Ocelot API Gateway** + Consul service discovery (Catalog & Identity rotaları) |
| 11 | 2026-07-02 | `412e35e` | **BasketService**: Identity + Gateway + Redis entegrasyonu |
| 12 | 2026-07-02 | `2e70d57` | **OrderService.Domain**: DDD çekirdek (aggregate, event, seedwork) |
| 13 | 2026-07-02 | `9c5337e` | **OrderService.Application**: CQRS, event handler'lar, AutoMapper profilleri |
| 14 | 2026-07-03 | `4de1da5` | **OrderService.Infrastructure**: EF Core, DbContext, repository'ler |
| 15 | 2026-07-03 | `0c1afee` | **OrderService.Api**: EventBus, CQRS bağlantısı, DB migration |

**Gelişim çizgisi:** Önce ortak altyapı (EventBus) → sonra basit servisler (Catalog, Payment, Notification, Identity) → sonra gateway → sonra Redis'li Basket → en son en karmaşık servis (Order, katman katman).

**Commit mesaj stili:** İlk 5 commit serbest Türkçe/İngilizce, 6. commit'ten sonra **Conventional Commits** (`feat:`, `feat(scope):`) formatına geçilmiş.

### Commit Edilmemiş Değişiklikler (working tree)

| Dosya | Değişiklik |
|---|---|
| `docker-compose-files/sqlserver/docker-compose.yml` | Port `1433:1433` → **`1444:1433`**, parola **`${SQL_SA_PASSWORD}`** (.env) |
| Çok sayıda `bin/` ve `obj/` dosyası | ⚠️ `.gitignore`'a rağmen **takip ediliyor** (ignore kuralı eklenmeden önce commit'lendikleri için). `git rm -r --cached` ile temizlenmeli |

---

## 16. TESPİT EDİLEN SORUNLAR VE TEKNİK BORÇ

Aşağıdakiler kod okunarak tespit edilmiştir; öncelik sırasına göre listelenmiştir.

### 🔴 Kritik (sistemi çalışmaz hale getirir)

| # | Sorun | Konum | Etki |
|---|---|---|---|
| **1** | `ProcessEvent` scope oluşturur ama handler'ı **root provider'dan** çözer (`scope.ServiceProvider` kullanılmıyor) | `EventBus.Base/Events/BaseEventBus.cs` | Scoped bağımlılık içeren tüm handler'lar (`IBasketRepository`, `IMediator`, `DbContext`) `InvalidOperationException` fırlatır → **event işleme tamamen kırılır** |
| **2** | `GenericRepository.UnitOfWork` property'si hiç atanmıyor (`public IUnitOfWork UnitOfWork { get; }` → `null`) | `OrderService.Infrastructure/Repositories/GenericRepository.cs` | `orderRepository.UnitOfWork.SaveEntitiesAsync()` → **NullReferenceException** → sipariş oluşturma çöker |
| **3** | Catalog connection string anahtarı yok: kod `"CatalogConnection"` okuyor, appsettings'te yorum satırında | `CatalogService.Api/Extensions/DbContextRegistration.cs` + `appsettings.json` | CatalogService **başlatılamaz** |
| **4** | Kimlik bilgileri repoda açık: JWT secret, SA parolası, **gerçek Azure SAS anahtarı** | `EventBusTests.cs`, `IdentityService.cs`, `AuthRegistration.cs`, `appsettings.json`, `docker-compose.yml` | **Kimlik bilgisi sızıntısı** — SAS anahtarı ve SA parolası derhal iptal/rotasyon gerektirir |

### 🟠 Yüksek (işlevsellik bozuk / veri kaybı)

| # | Sorun | Konum | Etki |
|---|---|---|---|
| **5** | `OrderStartedIntegrationEvent` sözleşme uyumsuzluğu: yayınlanan `{userName}`, beklenen `{orderId}` | `OrderService.Application/IntegrationEvents/` ↔ `PaymentService.Api/.../Events/` | Ödeme her zaman `OrderId = 0` ile işlenir |
| **6** | Ödeme sonucu OrderService'e dönmüyor — `OrderPaymentSuccess/Failed` handler'ı Order'da yok | — | Sipariş sonsuza dek `Submitted` statüsünde kalır, saga yarım |
| **7** | `RabbitMQPersistentConnection` ctor'da `retryCount` atanmıyor | `EventBus.RabbitMQ/RabbitMQPersistentConnection.cs` | `WaitAndRetry(0)` → **retry devre dışı**, geçici bağlantı hatalarında anında düşer |
| **8** | Shadow FK tip uyumsuzlukları: `Property<int>("OrderId")`, `Property<int>("BuyerId")` ama PK'lar `Guid` | `OrderItemEntityConfiguration.cs`, `PaymentMethodEntityConfiguration.cs` | Model oluşturma / migration hataları |
| **9** | `BuyerEntityConfiguration.HasForeignKey(i => i.Id)` — PaymentMethod'un kendi PK'sını FK gösteriyor | `BuyerEntityConfiguration.cs` | Yanlış ilişki, kaskad silme riski |
| **10** | Hiç **EF Migration** yok; `EnsureCreated()` + `Migrate()` birlikte çağrılıyor | Catalog & Order | Şema evrimi yönetilemez, `Migrate()` etkisiz/hatalı |
| **11** | Catalog seed yolu yanlış: `"Infrastructure"` aranıyor, klasör `"Infastructure"` | `CatalogContextSeed.cs` | Seed dosyaları bulunamaz, 2 marka + 2 tip + 1 ürünlük fallback'e düşer |

### 🟡 Orta (güvenlik / bakım)

| # | Sorun | Konum |
|---|---|---|
| **12** | IdentityService **şifreyi doğrulamıyor** — herkes token alabilir | `IdentityService.cs` |
| **13** | BasketService `ValidateLifetime = false` — süresi dolmuş token kabul edilir | `AuthRegistration.cs` |
| **14** | Debug middleware'ler token'ı konsola yazıyor, ortam kontrolü yok | `BasketService/Program.cs` |
| **15** | Encoding uyumsuzluğu: Identity `UTF8`, Order `ASCII` ile aynı anahtarı işliyor | `IdentityService.cs` ↔ `AuthRegistration.cs` |
| **16** | Gateway'de JWT doğrulama yok — token şeffaf geçiyor | `ocelot.json` |
| **17** | OrderService `ocelot.json`'da tanımlı değil | `ocelot.json` |
| **18** | `EnableSensitiveDataLogging()` açık | `OrderService.Infrastructure/ServiceRegistration.cs` |
| **19** | Consul'da **health check tanımlı değil** | tüm `ConsulRegistration.cs` |
| **20** | `RedisBasketRepository.GetUsers()` `KEYS` komutu kullanıyor (O(n), üretimde bloklar) | `BasketRepository.cs` |
| **21** | Redis'te sepetler için **TTL yok** — süresiz büyür | `BasketRepository.cs` |
| **22** | `x-request-id` header'ı alınıp kullanılmıyor — **idempotency uygulanmamış** | `BasketController.CheckoutAsync` |
| **23** | `bin/`/`obj/` dosyaları git'te takip ediliyor | repo geneli |
| **24** | `.github/workflows/` boş — **CI/CD yok** | `.github/` |

### 🔵 Düşük (kod hijyeni)

| # | Sorun | Konum |
|---|---|---|
| **25** | `ProcessEventName` karakter kümesi kırpıyor (`TrimEnd(string.ToArray())`), alt dize değil | `BaseEventBus.cs` |
| **26** | Klasör adı yazım hatası: `Infastructure` → `Infrastructure` | CatalogService |
| **27** | `OrderService.Api/Extensions/.../ConsulRegistration.cs` namespace'i `BasketService.Api.Extensions` | OrderService.Api |
| **28** | `OrderRepository`/`OrderItemEntityConfiguration` vb. `OrderService.Persistence.*` namespace'inde, proje adı `OrderService.Infrastructure` | OrderService.Infrastructure |
| **29** | `CatalogContextDesignFactory` boş sınıf, `IDesignTimeDbContextFactory` implement etmiyor | CatalogService |
| **30** | Kök dizindeki `CatalogBrand.cs` içinde boş `Class1` — artık dosya | repo kökü |
| **31** | Gateway'de `WeatherForecastController`/`WeatherForecast` şablon kalıntısı | Web.ApiGateway |
| **32** | Boş klasörler: `Dtos/`, `Infrastructure/Services/`, `PaymentService/Controllers/`, `Pics/` | çeşitli |
| **33** | `AddMediatR` iki kez çağrılıyor (Application + Api) | `OrderService.Api/Program.cs` |
| **34** | DB migration iki kez tetikleniyor (`AddPersistenceRegistration` + `MigrateDbContext`) | `OrderService.Api` |
| **35** | Yorum satırına alınmış eski kod blokları (Consul, GenericRepository, HostExtension, ServiceRegistration'da 50+ satır) | çeşitli |
| **36** | `Order.Description` ve `Order.Quantity` hiç doldurulmuyor | `Order.cs` |
| **37** | `PicController` route birleşmesi: `api/Pic/api/v1/catalog/items/{id}/pic` | CatalogService |
| **38** | `EventBusRabbitMQ` tek `consumerChannel`'ı hem publish hem consume için paylaşıyor (thread-safety) | `EventBusRabbitMQ.cs` |
| **39** | `Consumer_Received` `async void` — yakalanmamış istisna process'i düşürebilir | `EventBusRabbitMQ.cs` |
| **40** | Hata durumunda `BasicAck` yine de çağrılıyor → **başarısız mesaj kayboluyor** (DLQ yok) | `EventBusRabbitMQ.cs` |
| **41** | Blazor WebApp varsayılan şablon, entegre değil | `Clients/BlazorWebApp` |
| **42** | Paket sürüm karmaşası (`Microsoft.Extensions.*` 10.0.9 vs 8.0.x) | tüm csproj'lar |
| **43** | Sipariş oluşturma için HTTP endpoint yok (yalnızca event ile) | `OrderController.cs` |
| **44** | `UpdateOrderWhenBuyerAndPaymentMethodVerified...` handler'ında `SaveChanges` çağrılmıyor | Order.Application |

---

## 17. ÇALIŞTIRMA REHBERİ (RUNBOOK)

### Adım 1 — Altyapıyı ayağa kaldır

```bash
cd d:\microservice_project\SellingBuddy\docker-compose-files

docker compose -f consul/docker-compose.yml    up -d
docker compose -f rabbitmq/docker-compose.yml  up -d
docker compose -f redis/docker-compose.yml     up -d
docker compose -f sqlserver/docker-compose.yml up -d
```

**Doğrulama:**

- Consul UI → http://localhost:8500
- RabbitMQ UI → http://localhost:15672 (guest / guest)
- SQL Server → `localhost,1444` (sa / `.env: SQL_SA_PASSWORD`)
- Redis → `localhost:6379`

### Adım 2 — Servisleri başlat (sıra önemli)

```
1. IdentityService.Api   (:5005)   ← token üretici, önce ayakta olmalı
2. CatalogService.Api    (:5004)
3. BasketService.Api     (:5003)
4. OrderService.Api      (:5002)
5. PaymentService.Api    (:5001)
6. NotificationService   (Console)
7. Web.ApiGateway        (:5000)   ← en son, servisler Consul'a kaydolduktan sonra
```

Visual Studio'da **Multiple Startup Projects** ile veya her biri için:

```bash
dotnet run --project SellingBuddy\src\Services\IdentityService\IdentityService.Api
```

### Adım 3 — Uçtan uca test

```bash
# 1) Token al
curl -X POST http://localhost:5000/auth \
     -H "Content-Type: application/json" \
     -d '{"userName":"uhut","password":"123"}'

# 2) Sepete ürün ekle
curl -X POST http://localhost:5000/basket/additem \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"productId":1,"productName":"Test","unitPrice":10,"quantity":2}'

# 3) Checkout — event zincirini tetikler
curl -X POST http://localhost:5000/basket/checkout \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     -H "x-request-id: 11111111-1111-1111-1111-111111111111" \
     -d '{"city":"Istanbul","street":"X","state":"Y","country":"TR","zipCode":"34000",
          "cardNumber":"4111111111111111","cardHolderName":"UHUT SANCAR",
          "cardExpiration":"2030-01-01","cardSecurityNumber":"123",
          "cardTypeId":2,"buyer":"uhut"}'
```

**Beklenen gözlemler:**

- RabbitMQ UI'da `SellingBuddyEventBus` exchange'i ve 5 kuyruk
- OrderService konsolunda `Handling integration event...`
- PaymentService konsolunda `...PaymentSuccess: True...`
- NotificationService konsolunda `Order Payment success with OrderId: ...`
- SQL Server `order` veritabanı `ordering` şemasında yeni kayıt

> ⚠️ **Not:** Bölüm 16'daki Sorun #1 (DI scope) ve #2 (`UnitOfWork` null) düzeltilmeden bu akış **Adım 4b'de kırılır**. Kod okumasına göre önce bu iki düzeltme gereklidir.

### Adım 4 — Önerilen ilk düzeltmeler

```csharp
// 1) BaseEventBus.ProcessEvent — scope'tan çöz
using (var scope = ServiceProvider.CreateScope())
{
    foreach (var subscription in subscriptions)
    {
        var handler = scope.ServiceProvider.GetService(subscription.HandlerType);  // ← scope
        ...
    }
}

// 2) GenericRepository — UnitOfWork'ü bağla
public IUnitOfWork UnitOfWork => dbContext;

// 3) RabbitMQPersistentConnection ctor
this.retryCount = retryCount;

// 4) CatalogService appsettings.json
"ConnectionStrings": {
  "CatalogConnection": "Data Source=localhost,1444;Initial Catalog=catalog;User ID=sa;Password=...;TrustServerCertificate=True;"
}

// 5) CatalogContextSeed — klasör adını düzelt
Path.Combine(env.ContentRootPath, "Infastructure", "Setup", "SeedFiles")
```

---

## ÖZET DEĞERLENDİRME

**Güçlü yönler:**

- EventBus soyutlaması gerçekten iyi tasarlanmış — broker değiştirmek tek satırlık config değişikliği
- OrderService'te DDD tavizsiz uygulanmış: aggregate kapsüllemesi, value object, enumeration pattern, domain event zinciri
- Katman bağımlılıkları doğru yönde akıyor (Domain hiçbir altyapıya bağlı değil)
- Polly ile dayanıklılık desenleri her kritik I/O noktasında var
- Servisler gerçekten bağımsız — hiçbir servis diğerine senkron HTTP çağrısı yapmıyor

**Zayıf yönler:**

- Test kapsamı neredeyse sıfır (yalnızca EventBus bağlanabilirlik testleri, hiç `Assert` yok)
- Kimlik bilgileri repoda açık (SA parolası, JWT secret, Azure SAS anahtarı)
- IdentityService gerçek bir kimlik doğrulama yapmıyor
- Ödeme sonucu siparişe yansımıyor — saga yarım kalmış
- EF Migration yok, şema `EnsureCreated` ile üretiliyor
- DI scope hatası nedeniyle event işleme hattı mevcut haliyle çalışmıyor
- CI/CD yok, uygulama Docker imajları yok

**Olgunluk seviyesi:** Öğrenme/portföy projesi olarak **mimari açıdan güçlü**, üretim açısından **kimlik yönetimi, test, migration ve DI düzeltmeleri gerektiriyor**.

---

*Bu doküman `d:\microservice_project` deposundaki tüm kaynak dosyaların okunmasıyla üretilmiştir. Kod değiştikçe güncellenmelidir.*
