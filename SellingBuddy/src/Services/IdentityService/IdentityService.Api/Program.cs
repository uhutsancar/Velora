using IdentityService.Api.Application.Services;
using IdentityServer.Application.Services;
using IdentityService.Api.Extensions.Registration;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();


builder.Services.ConfigureConsul(builder.Configuration);

builder.Services.AddScoped<IIdentityService, IdentityServer.Application.Services.IdentityService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();


app.RegisterWithConsul(app.Lifetime);

app.Run();