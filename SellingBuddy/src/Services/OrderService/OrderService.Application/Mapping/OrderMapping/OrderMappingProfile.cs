using AutoMapper;
using OrderService.Application.Features.Commands.CreateOrder;
using OrderService.Application.Features.Queries.ViewModels;
using OrderService.Domain.AggregateModels.OrderAggregate;

namespace OrderService.Application.Mapping.OrderMapping
{
    public class OrderMappingProfile : Profile
    {
        public OrderMappingProfile()
        {
            CreateMap<OrderItem, OrderItemDTO>().ReverseMap();

            CreateMap<OrderItem, Orderitem>()
                .ForMember(d => d.Productname, o => o.MapFrom(s => s.ProductName))
                .ForMember(d => d.Unitprice, o => o.MapFrom(s => s.UnitPrice))
                .ForMember(d => d.Pictureurl, o => o.MapFrom(s => s.PictureUrl))
                .ForMember(d => d.LineTotal, o => o.MapFrom(s => s.UnitPrice * s.Units));

            CreateMap<Order, OrderDetailViewModel>()
                .ForMember(d => d.Ordernumber, o => o.MapFrom(s => s.OrderNumber))
                .ForMember(d => d.Date, o => o.MapFrom(s => s.OrderDate))
                .ForMember(d => d.StatusId, o => o.MapFrom(s => s.OrderStatusId))
                .ForMember(d => d.Status, o => o.MapFrom(s => s.OrderStatus != null ? s.OrderStatus.Name : string.Empty))
                .ForMember(d => d.Street, o => o.MapFrom(s => s.Address.Street))
                .ForMember(d => d.City, o => o.MapFrom(s => s.Address.City))
                .ForMember(d => d.State, o => o.MapFrom(s => s.Address.State))
                .ForMember(d => d.Country, o => o.MapFrom(s => s.Address.Country))
                .ForMember(d => d.Zipcode, o => o.MapFrom(s => s.Address.ZipCode))
                .ForMember(d => d.Orderitems, o => o.MapFrom(s => s.OrderItems))
                // Subtotal is the pre-discount figure; Total is what the customer paid.
                .ForMember(d => d.Subtotal, o => o.MapFrom(s => s.OrderItems.Sum(i => i.Units * i.UnitPrice)))
                .ForMember(d => d.Total, o => o.MapFrom(s => s.TotalAmount));
        }
    }
}
