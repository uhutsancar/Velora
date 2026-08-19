namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// Editorial/merchandising campaign shown on the storefront (hero slides,
    /// landing strips). Optionally scoped to a category and carrying a headline discount.
    /// </summary>
    public class Campaign
    {
        public int Id { get; set; }

        public string Name { get; set; } = default!;

        public string Slug { get; set; } = default!;

        public string? Description { get; set; }

        /// <summary>Square/portrait artwork used in grids.</summary>
        public string? ImageUrl { get; set; }

        /// <summary>Wide artwork used for hero and banner slots.</summary>
        public string? BannerUrl { get; set; }

        public string? CtaLabel { get; set; }

        public string? CtaUrl { get; set; }

        /// <summary>Headline discount advertised by the campaign; 0 when it is purely editorial.</summary>
        public decimal DiscountPercentage { get; set; }

        public int? CategoryId { get; set; }

        public Category? Category { get; set; }

        public CampaignPlacement Placement { get; set; } = CampaignPlacement.Home;

        public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime EndsAtUtc { get; set; } = DateTime.UtcNow.AddMonths(1);

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public bool IsLive(DateTime nowUtc) => IsActive && StartsAtUtc <= nowUtc && EndsAtUtc >= nowUtc;
    }

    public enum CampaignPlacement
    {
        Home = 0,
        Hero = 1,
        Banner = 2,
        Collection = 3
    }
}
