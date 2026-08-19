namespace CatalogService.Api.Core.Domain
{
    public enum DiscountType
    {
        Percentage = 0,
        FixedAmount = 1,
        FreeShipping = 2
    }

    /// <summary>
    /// Promotion code redeemed at checkout. Validation lives in the service so the
    /// storefront and the order flow cannot disagree about what a coupon is worth.
    /// </summary>
    public class Coupon
    {
        public int Id { get; set; }

        public string Code { get; set; } = default!;

        public string? Description { get; set; }

        public DiscountType DiscountType { get; set; }

        /// <summary>Percent when <see cref="DiscountType"/> is Percentage, otherwise an absolute amount.</summary>
        public decimal DiscountValue { get; set; }

        public decimal MinimumOrderAmount { get; set; }

        /// <summary>Caps percentage coupons; null means uncapped.</summary>
        public decimal? MaxDiscountAmount { get; set; }

        /// <summary>Total redemptions allowed; null means unlimited.</summary>
        public int? UsageLimit { get; set; }

        public int UsedCount { get; set; }

        public int PerUserLimit { get; set; } = 1;

        public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime EndsAtUtc { get; set; } = DateTime.UtcNow.AddMonths(1);

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public bool IsRedeemable(DateTime nowUtc) =>
            IsActive &&
            StartsAtUtc <= nowUtc &&
            EndsAtUtc >= nowUtc &&
            (UsageLimit is null || UsedCount < UsageLimit);

        /// <summary>Discount this coupon produces for a given subtotal (never more than the subtotal).</summary>
        public decimal CalculateDiscount(decimal subtotal)
        {
            if (subtotal < MinimumOrderAmount) return 0m;

            var discount = DiscountType switch
            {
                DiscountType.Percentage => subtotal * DiscountValue / 100m,
                DiscountType.FixedAmount => DiscountValue,
                _ => 0m
            };

            if (MaxDiscountAmount is { } cap && discount > cap)
                discount = cap;

            return Math.Round(Math.Min(discount, subtotal), 2);
        }
    }
}
