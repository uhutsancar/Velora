using BasketService.Api.Core.Application.Services;
using BasketService.Api.Core.Domain.Models;
using System.Net.Http.Json;
using Velora.Shared.Middleware;

namespace BasketService.Api.Infrastructure.Clients;

public sealed class CatalogQuoteClient : ICatalogQuoteClient
{
    private readonly HttpClient http;

    public CatalogQuoteClient(HttpClient http) => this.http = http;

    public async Task<CatalogQuote> CreateQuoteAsync(CustomerBasket basket, string? couponCode, CancellationToken ct = default)
    {
        var request = new
        {
            CouponCode = couponCode,
            Lines = basket.Items.Select(line => new { line.ProductId, line.VariantId, line.Quantity })
        };

        using var response = await http.PostAsJsonAsync("api/internal/checkout-quotes", request, ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new ApiException(
                "Catalog could not create an authoritative checkout quote.",
                (int)response.StatusCode,
                "checkout_quote_rejected");
        }

        return await response.Content.ReadFromJsonAsync<CatalogQuote>(cancellationToken: ct)
            ?? throw new ApiException("Catalog returned an empty checkout quote.", 502, "empty_checkout_quote");
    }
}
