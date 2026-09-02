# ---------------------------------------------------------------------------
#  Katman siralamasi bilincli (plan.md B12).
#
#  Onceki hali once TUM kaynak kodu kopyalayip sonra restore ediyordu: tek bir
#  .cs satiri degisince "dotnet restore" sifirdan calisiyordu. Yedi servis x
#  ~3 dakika, yani her derlemede yaklasik yarim saat bosa gidiyordu.
#
#  Simdi once yalnizca proje dosyalari kopyalanip restore ediliyor. O katman
#  ancak bir bagimlilik degistiginde bozulur; gunluk kod degisikliklerinde
#  onbellekten gelir. Proje listesi yedi Dockerfile'da birebir ayni oldugu icin
#  BuildKit ayni katmani imajlar arasinda da paylasir.
# ---------------------------------------------------------------------------
# Build context is the repository root:
#   docker build -f SellingBuddy/src/Services/OrderService/OrderService.Api/Dockerfile -t velora/order:latest .
# The whole solution is copied because the service project references the shared
# BuildingBlocks projects; .dockerignore keeps the context small.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SellingBuddy.sln ./

# 1) Yalnizca proje dosyalari -> bagimlilik grafigi.
COPY SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway/Web.ApiGateway.csproj SellingBuddy/src/ApiGateways/WebApiGateway/Web.ApiGateway/
COPY SellingBuddy/src/BuildingBlocks/Common/Velora.Shared/Velora.Shared.csproj SellingBuddy/src/BuildingBlocks/Common/Velora.Shared/
COPY SellingBuddy/src/BuildingBlocks/EventBus/EventBus.AzureServiceBus/EventBus.AzureServiceBus.csproj SellingBuddy/src/BuildingBlocks/EventBus/EventBus.AzureServiceBus/
COPY SellingBuddy/src/BuildingBlocks/EventBus/EventBus.Base/EventBus.Base.csproj SellingBuddy/src/BuildingBlocks/EventBus/EventBus.Base/
COPY SellingBuddy/src/BuildingBlocks/EventBus/EventBus.Factory/EventBus.Factory.csproj SellingBuddy/src/BuildingBlocks/EventBus/EventBus.Factory/
COPY SellingBuddy/src/BuildingBlocks/EventBus/EventBus.RabbitMQ/EventBus.RabbitMQ.csproj SellingBuddy/src/BuildingBlocks/EventBus/EventBus.RabbitMQ/
COPY SellingBuddy/src/Clients/BlazorWebApp/WebApp/WebApp.csproj SellingBuddy/src/Clients/BlazorWebApp/WebApp/
COPY SellingBuddy/src/Services/BasketService/BasketService.Api/BasketService.Api.csproj SellingBuddy/src/Services/BasketService/BasketService.Api/
COPY SellingBuddy/src/Services/CatalogService/CatalogService.Api/CatalogService.Api.csproj SellingBuddy/src/Services/CatalogService/CatalogService.Api/
COPY SellingBuddy/src/Services/IdentityService/IdentityService.Api/IdentityService.Api.csproj SellingBuddy/src/Services/IdentityService/IdentityService.Api/
COPY SellingBuddy/src/Services/NotificationService/NotificationService/NotificationService.csproj SellingBuddy/src/Services/NotificationService/NotificationService/
COPY SellingBuddy/src/Services/OrderService/OrderService.Api/OrderService.Api.csproj SellingBuddy/src/Services/OrderService/OrderService.Api/
COPY SellingBuddy/src/Services/OrderService/OrderService.Application/OrderService.Application.csproj SellingBuddy/src/Services/OrderService/OrderService.Application/
COPY SellingBuddy/src/Services/OrderService/OrderService.Domain/OrderService.Domain.csproj SellingBuddy/src/Services/OrderService/OrderService.Domain/
COPY SellingBuddy/src/Services/OrderService/OrderService.Infrastructure/OrderService.Infrastructure.csproj SellingBuddy/src/Services/OrderService/OrderService.Infrastructure/
COPY SellingBuddy/src/Services/PaymentService/PaymentService.Api/PaymentService.Api.csproj SellingBuddy/src/Services/PaymentService/PaymentService.Api/
COPY SellingBuddy/tests/BuildingBlocks/EventBus.UnitTest/EventBus.UnitTest.csproj SellingBuddy/tests/BuildingBlocks/EventBus.UnitTest/

RUN dotnet restore "SellingBuddy/src/Services/OrderService/OrderService.Api/OrderService.Api.csproj"

# 2) Kaynak kod. Buradan sonrasi her commit'te yeniden calisir,
#    ama yukaridaki restore katmani korunur.
COPY SellingBuddy/ ./SellingBuddy/

RUN dotnet publish "SellingBuddy/src/Services/OrderService/OrderService.Api/OrderService.Api.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# The aspnet/runtime images ship a non-root user; running as root in production
# is an avoidable risk.
USER $APP_UID

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_HTTP_PORTS=8080

ENTRYPOINT ["dotnet", "OrderService.Api.dll"]
