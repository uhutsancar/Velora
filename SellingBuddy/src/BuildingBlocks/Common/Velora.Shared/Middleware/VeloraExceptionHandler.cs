using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Velora.Shared.Middleware;

/// <summary>RFC 9457 error boundary shared by every HTTP service and the gateway.</summary>
public sealed class VeloraExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService problemDetails;
    private readonly IHostEnvironment environment;
    private readonly ILogger<VeloraExceptionHandler> logger;

    public VeloraExceptionHandler(
        IProblemDetailsService problemDetails,
        IHostEnvironment environment,
        ILogger<VeloraExceptionHandler> logger)
    {
        this.problemDetails = problemDetails;
        this.environment = environment;
        this.logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (status, code, title, detail) = exception switch
        {
            IApiException api => (api.StatusCode, api.Code, "Request rejected", exception.Message),
            UnauthorizedAccessException => (401, "unauthorized", "Unauthorized", "Authentication is required."),
            KeyNotFoundException => (404, "not_found", "Resource not found", exception.Message),
            ArgumentException => (400, "bad_request", "Invalid request", exception.Message),
            _ => (500, "internal_error", "Internal server error", "An unexpected error occurred.")
        };

        if (status >= 500)
            logger.LogError(exception, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
        else
            logger.LogWarning("Request failed on {Method} {Path}: {Code}", context.Request.Method, context.Request.Path, code);

        var payload = new ProblemDetails
        {
            Type = $"https://velora.example/problems/{code}",
            Title = title,
            Status = status,
            Detail = status >= 500 && !environment.IsDevelopment() ? "An unexpected error occurred." : detail,
            Instance = context.Request.Path
        };
        payload.Extensions["code"] = code;
        payload.Extensions["traceId"] = context.TraceIdentifier;

        context.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = payload,
            Exception = exception
        });
    }
}

public static class VeloraProblemDetailsRegistration
{
    public static IServiceCollection AddVeloraProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails();
        services.AddExceptionHandler<VeloraExceptionHandler>();
        return services;
    }
}

public static class VeloraExceptionHandlingExtensions
{
    public static IApplicationBuilder UseVeloraExceptionHandling(this IApplicationBuilder app) =>
        app.UseExceptionHandler();
}
