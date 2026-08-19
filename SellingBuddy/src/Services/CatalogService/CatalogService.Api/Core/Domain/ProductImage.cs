namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// A product has many images; the storefront uses the primary one for cards and
    /// the ordered list for the detail gallery.
    /// </summary>
    public class ProductImage
    {
        public int Id { get; set; }

        public int CatalogItemId { get; set; }

        public CatalogItem CatalogItem { get; set; } = default!;

        /// <summary>Absolute URL or a path relative to the media root ("/media/...").</summary>
        public string Url { get; set; } = default!;

        public string? AltText { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsPrimary { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
