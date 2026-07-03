//using MediatR;
//using Microsoft.Extensions.DependencyInjection;
//using OrderService.Application.Features.Commands.CreateOrder;
//using System;
//using System.Reflection;

//namespace OrderService.Application
//{
//    public static class ServiceRegistration
//    {
//        public static IServiceCollection AddApplicationRegistration(this IServiceCollection services, Type startup)
//        {
//            var assm = Assembly.GetExecutingAssembly();

//            services.AddAutoMapper(assm);
//            services.AddMediatR(assm);

//            return services;
//        }
//    }
//}


using MediatR;
using Microsoft.Extensions.DependencyInjection;
using OrderService.Application.Features.Commands.CreateOrder;
using System;
using System.Reflection;

namespace OrderService.Application
{
    public static class ServiceRegistration
    {
        public static IServiceCollection AddApplicationRegistration(this IServiceCollection services, Type startup)
        {
            var assm = Assembly.GetExecutingAssembly();

            services.AddAutoMapper(cfg => { }, assm);
            services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assm));

            return services;
        }
    }
}