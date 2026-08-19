namespace OrderService.Application.Features.Queries.ViewModels
{
    public class OrderDetailViewModel
    {
        public Guid Id { get; set; }

        /// <summary>Customer facing reference, e.g. "VLR-240819-4F2A".</summary>
        public string Ordernumber { get; set; } = default!;

        public DateTime Date { get; set; }

        public int StatusId { get; set; }

        public string Status { get; set; } = default!;

        public string? Description { get; set; }

        public string? UserId { get; set; }

        public string? UserName { get; set; }

        public string? Street { get; set; }

        public string? City { get; set; }

        public string? State { get; set; }

        public string? Zipcode { get; set; }

        public string? Country { get; set; }

        public string? CouponCode { get; set; }

        public decimal DiscountAmount { get; set; }

        public decimal Subtotal { get; set; }

        public decimal Total { get; set; }

        public DateTime? PaidAtUtc { get; set; }

        public DateTime? ShippedAtUtc { get; set; }

        public DateTime? CancelledAtUtc { get; set; }

        public string? CancelReason { get; set; }

        public List<Orderitem> Orderitems { get; set; } = new();
    }

    public class Orderitem
    {
        public int ProductId { get; set; }

        public string Productname { get; set; } = default!;

        public int Units { get; set; }

        public decimal Unitprice { get; set; }

        public string? Pictureurl { get; set; }

        public int? VariantId { get; set; }

        public string? VariantLabel { get; set; }

        public decimal LineTotal { get; set; }
    }
}
