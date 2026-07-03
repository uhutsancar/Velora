//using Microsoft.EntityFrameworkCore;
//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Logging;
//using Microsoft.Extensions.Hosting;
//using System;
//using Polly;
//using Microsoft.Data.SqlClient;



//namespace OrderService.Api.Extensions
//{
//    public static class HostExtension
//    {
//        public static IWebHost MigrateDbContext<TContext>(this IWebHost host, Action<TContext, IServiceProvider> seeder)
//            where TContext : DbContext
//        {
//            using (var scope = host.Services.CreateScope())
//            {
//                var services = scope.ServiceProvider;

//                var logger = services.GetRequiredService<ILogger<TContext>>();

//                var context = services.GetRequiredService<TContext>();

//                try
//                {
//                    logger.LogInformation("Migrating database associated with context {DbContextName}", typeof(TContext).Name);

//                    var retry = Policy.Handle<SqlException>()
//                        .WaitAndRetry(new TimeSpan[]
//                        {
//                            TimeSpan.FromSeconds(3),
//                            TimeSpan.FromSeconds(5),
//                            TimeSpan.FromSeconds(8)
//                        });

//                    retry.Execute(() => InvokeSeeder(seeder, context, services));
//                }
//                catch (Exception ex)
//                {
//                    logger.LogError(ex, "An error occured while migration the database used on context {DbContextName}",
//                        typeof(TContext).Name);
//                }
//            }


//            return host;
//        }


//        private static void InvokeSeeder<TContext>(Action<TContext, IServiceProvider> seeder, TContext context, IServiceProvider services)
//            where TContext : DbContext
//        {
//            context.Database.EnsureCreated();
//            context.Database.Migrate();

//            seeder(context, services);
//        }
//    } 
//} 











using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting; 
using System;
using Polly;
using Microsoft.Data.SqlClient;

namespace OrderService.Api.Extensions
{
    public static class HostExtension
    {
        
        public static IHost MigrateDbContext<TContext>(this IHost host, Action<TContext, IServiceProvider> seeder)
            where TContext : DbContext
        {
            using (var scope = host.Services.CreateScope())
            {
                var services = scope.ServiceProvider;

                var logger = services.GetRequiredService<ILogger<TContext>>();

                var context = services.GetRequiredService<TContext>();

                try
                {
                    logger.LogInformation("Migrating database associated with context {DbContextName}", typeof(TContext).Name);

                    var retry = Policy.Handle<SqlException>()
                        .WaitAndRetry(new TimeSpan[]
                        {
                            TimeSpan.FromSeconds(3),
                            TimeSpan.FromSeconds(5),
                            TimeSpan.FromSeconds(8)
                        });

                    retry.Execute(() => InvokeSeeder(seeder, context, services));
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "An error occured while migration the database used on context {DbContextName}",
                        typeof(TContext).Name);
                }
            }

            return host;
        }

        private static void InvokeSeeder<TContext>(Action<TContext, IServiceProvider> seeder, TContext context, IServiceProvider services)
            where TContext : DbContext
        {
            context.Database.EnsureCreated();
            context.Database.Migrate();

            seeder(context, services);
        }
    }
}