# Build context is the repository root:
#   docker build -f SellingBuddy/src/Services/OrderService/OrderService.Api/Dockerfile -t velora/order:latest .
# The whole solution is copied because the service project references the shared
# BuildingBlocks projects; .dockerignore keeps the context small.

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SellingBuddy.sln ./
COPY SellingBuddy/ ./SellingBuddy/

RUN dotnet restore "SellingBuddy/src/Services/OrderService/OrderService.Api/OrderService.Api.csproj"
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
