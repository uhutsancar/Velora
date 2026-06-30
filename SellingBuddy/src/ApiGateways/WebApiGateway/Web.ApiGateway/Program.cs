using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Ocelot.Provider.Consul;

var builder = WebApplication.CreateBuilder(args);

// 1. Ocelot'un haritasý olan json dosyasýný projeye dahil ediyoruz
builder.Configuration.AddJsonFile("Configurations/ocelot.json", optional: false, reloadOnChange: true);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. Ocelot servislerini builder'a ekliyoruz (Consul service discovery dahil)
builder.Services.AddOcelot()
    .AddConsul();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

// 3. Ocelot'un gelen istekleri yönlendirmesi için Middleware'i ayaða kaldýrýyoruz
await app.UseOcelot();

app.Run();