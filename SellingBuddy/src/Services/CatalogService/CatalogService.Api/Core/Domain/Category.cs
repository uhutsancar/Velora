namespace CatalogService.Api.Core.Domain
{
    /// <summary>
    /// Self-referencing merchandising taxonomy (Kadın &gt; Giyim &gt; Ceket).
    /// Kept alongside the legacy <see cref="CatalogType"/> so existing endpoints keep working.
    /// </summary>
    public class Category
    {
        public int Id { get; set; }

        public string Name { get; set; } = default!;

        public string Slug { get; set; } = default!;

        public string? Description { get; set; }

        public int? ParentId { get; set; }

        public Category? Parent { get; set; }

        public ICollection<Category> Children { get; set; } = new List<Category>();

        public string? ImageUrl { get; set; }

        public int DisplayOrder { get; set; }

        public bool IsActive { get; set; } = true;

        /// <summary>Surfaced in the storefront mega-menu.</summary>
        public bool IsFeatured { get; set; }

        public string? MetaTitle { get; set; }

        public string? MetaDescription { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAtUtc { get; set; }

        public ICollection<CatalogItem> Products { get; set; } = new List<CatalogItem>();
    }
}
