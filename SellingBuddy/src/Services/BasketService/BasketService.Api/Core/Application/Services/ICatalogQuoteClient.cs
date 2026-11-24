using BasketService.Api.Core.Domain.Models;

namespace BasketService.Api.Core.Application.Services;

public interface ICatalogQuoteClient
{
    Task<CatalogQuote> CreateQuoteAsync(CustomerBasket basket, string? couponCode, CancellationToken ct = default);
}

public sealed class CatalogQuote
{
    public Guid QuoteId { get; set; }
    public DateTime ValidUntilUtc { get; set; }
    public string Currency { get; set; } = "TRY";
    public string? CouponCode { get; set; }
    public decimal DiscountAmount { get; set; }
    public List<CatalogQuoteLine> Lines { get; set; } = new();
}

public sealed class CatalogQuoteLine
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = default!;
    public string? Slug { get; set; }
    public int? VariantId { get; set; }
    public string? VariantLabel { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public int AvailableStock { get; set; }
    public string? PictureUrl { get; set; }
}
