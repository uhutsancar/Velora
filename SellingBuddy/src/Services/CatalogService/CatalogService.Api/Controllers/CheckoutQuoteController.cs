using CatalogService.Api.Core.Domain;
using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using Velora.Shared.Middleware;

namespace CatalogService.Api.Controllers;

/// <summary>
/// Server-authoritative checkout pricing. This route is intended for BasketService;
/// it accepts identifiers and quantities only and never trusts a client-supplied price.
/// </summary>
[ApiController]
[Route("api/internal/checkout-quotes")]
public sealed class CheckoutQuoteController : ControllerBase
{
    private static readonly TimeSpan QuoteLifetime = TimeSpan.FromMinutes(5);
    private readonly CatalogContext db;

    public CheckoutQuoteController(CatalogContext db) => this.db = db;

    [HttpPost]
    public async Task<CheckoutQuoteResponse> Create([FromBody] CheckoutQuoteRequest request, CancellationToken ct)
    {
        if (request.Lines.Count is 0 or > 100)
            throw new ApiException("Checkout must contain between 1 and 100 lines.", 400, "invalid_quote_lines");

        var requestedLines = request.Lines
            .GroupBy(line => new { line.ProductId, line.VariantId })
            .Select(group => new CheckoutQuoteLineRequest
            {
                ProductId = group.Key.ProductId,
                VariantId = group.Key.VariantId,
                Quantity = group.Sum(line => line.Quantity)
            })
            .ToList();

        if (requestedLines.Any(line => line.ProductId <= 0 || line.Quantity is <= 0 or > 20))
            throw new ApiException("A quote line has an invalid product or quantity.", 400, "invalid_quote_line");

        var productIds = requestedLines.Select(line => line.ProductId).Distinct().ToList();
        var products = await db.CatalogItems
            .AsNoTracking()
            .Include(product => product.Variants)
            .Include(product => product.Images)
            .Where(product => productIds.Contains(product.Id))
            .ToDictionaryAsync(product => product.Id, ct);

        var quotedLines = new List<CheckoutQuoteLineResponse>(requestedLines.Count);
        foreach (var line in requestedLines)
        {
            if (!products.TryGetValue(line.ProductId, out var product) || !product.IsPublished)
                throw new ApiException($"Product {line.ProductId} is not available.", 409, "product_unavailable");

            ProductVariant? variant = null;
            var availableStock = product.AvailableStock;
            var unitPrice = product.EffectivePrice;

            if (line.VariantId is { } variantId)
            {
                variant = product.Variants.SingleOrDefault(candidate => candidate.Id == variantId && candidate.IsActive);
                if (variant is null)
                    throw new ApiException($"Variant {variantId} is not available.", 409, "variant_unavailable");

                availableStock = variant.Stock;
                unitPrice += variant.PriceAdjustment;
            }
            else if (product.Variants.Any(candidate => candidate.IsActive))
            {
                throw new ApiException($"Product {line.ProductId} requires a variant.", 409, "variant_required");
            }

            if (availableStock < line.Quantity)
                throw new ApiException($"Product {line.ProductId} does not have enough stock.", 409, "insufficient_stock");

            quotedLines.Add(new CheckoutQuoteLineResponse
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Slug = product.Slug,
                VariantId = variant?.Id,
                VariantLabel = variant is null ? null : string.Join(" / ", new[] { variant.Color, variant.Size }.Where(value => !string.IsNullOrWhiteSpace(value))),
                Quantity = line.Quantity,
                UnitPrice = Math.Round(unitPrice, 2),
                AvailableStock = availableStock,
                PictureUrl = product.Images.OrderBy(image => image.DisplayOrder).Select(image => image.Url).FirstOrDefault()
                    ?? product.PictureUri
            });
        }

        var subtotal = quotedLines.Sum(line => line.UnitPrice * line.Quantity);
        var couponCode = string.IsNullOrWhiteSpace(request.CouponCode)
            ? null
            : request.CouponCode.Trim().ToUpperInvariant();
        var discount = 0m;

        if (couponCode is not null)
        {
            var coupon = await db.Coupons.AsNoTracking().SingleOrDefaultAsync(candidate => candidate.Code == couponCode, ct);
            if (coupon is null || !coupon.IsRedeemable(DateTime.UtcNow))
                throw new ApiException("Coupon is not valid.", 409, "coupon_invalid");

            discount = coupon.CalculateDiscount(subtotal);
            if (discount <= 0)
                throw new ApiException("Coupon is not applicable to this basket.", 409, "coupon_not_applicable");
        }

        return new CheckoutQuoteResponse
        {
            QuoteId = Guid.NewGuid(),
            ValidUntilUtc = DateTime.UtcNow.Add(QuoteLifetime),
            Currency = "TRY",
            CouponCode = couponCode,
            DiscountAmount = discount,
            Lines = quotedLines
        };
    }
}

public sealed class CheckoutQuoteRequest
{
    [Required]
    public List<CheckoutQuoteLineRequest> Lines { get; set; } = new();
    [MaxLength(64)]
    public string? CouponCode { get; set; }
}

public sealed class CheckoutQuoteLineRequest
{
    public int ProductId { get; set; }
    public int? VariantId { get; set; }
    public int Quantity { get; set; }
}

public sealed class CheckoutQuoteResponse
{
    public Guid QuoteId { get; set; }
    public DateTime ValidUntilUtc { get; set; }
    public string Currency { get; set; } = "TRY";
    public string? CouponCode { get; set; }
    public decimal DiscountAmount { get; set; }
    public List<CheckoutQuoteLineResponse> Lines { get; set; } = new();
}

public sealed class CheckoutQuoteLineResponse
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
