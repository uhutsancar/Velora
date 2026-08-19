namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// Brand. The original <see cref="Brand"/> column name is preserved so the legacy
    /// /api/catalog/catalogbrands contract does not change.
    /// </summary>
    public class CatalogBrand
    {
        public int Id { get; set; }

        public string Brand { get; set; } = default!;

        public string? Slug { get; set; }

        public string? Description { get; set; }

        public string? LogoUrl { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsFeatured { get; set; }

        public int DisplayOrder { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
