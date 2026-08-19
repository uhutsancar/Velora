namespace CatalogService.Api.Core.Domain
{
    public class ProductReview
    {
        public int Id { get; set; }

        public int CatalogItemId { get; set; }

        public CatalogItem CatalogItem { get; set; } = default!;

        /// <summary>Identity service user id taken from the access token, never from the request body.</summary>
        public Guid UserId { get; set; }

        public string UserName { get; set; } = default!;

        /// <summary>1 to 5.</summary>
        public int Rating { get; set; }

        public string? Title { get; set; }

        public string Comment { get; set; } = default!;

        /// <summary>Reviews are published immediately but can be unpublished from the back office.</summary>
        public bool IsApproved { get; set; } = true;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
