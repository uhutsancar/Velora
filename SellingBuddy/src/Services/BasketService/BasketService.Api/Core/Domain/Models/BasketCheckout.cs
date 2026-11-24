using System.ComponentModel.DataAnnotations;

namespace BasketService.Api.Core.Domain.Models
{
    public class BasketCheckout
    {
        [Required, MaxLength(128)]
        public string City { get; set; } = string.Empty;

        [Required, MaxLength(256)]
        public string Street { get; set; } = string.Empty;

        [Required, MaxLength(128)]
        public string State { get; set; } = string.Empty;

        [Required, MaxLength(128)]
        public string Country { get; set; } = string.Empty;

        [Required, MaxLength(16)]
        public string ZipCode { get; set; } = string.Empty;

        /// <summary>Opaque reference created by the payment provider's hosted/tokenized form.</summary>
        [Required, MinLength(8), MaxLength(512)]
        public string PaymentMethodToken { get; set; } = string.Empty;

        [Required, MinLength(2), MaxLength(64)]
        public string PaymentProvider { get; set; } = string.Empty;
    }
}
