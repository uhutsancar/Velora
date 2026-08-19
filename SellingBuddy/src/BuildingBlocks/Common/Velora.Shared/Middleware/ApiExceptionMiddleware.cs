using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Velora.Shared.Middleware
{
    /// <summary>Normalised error body: every Velora service fails the same way.</summary>
    public sealed class ApiErrorResponse
    {
        public string Code { get; set; } = "internal_error";

        public string Message { get; set; } = "An unexpected error occurred.";

        public IDictionary<string, string[]>? Errors { get; set; }

        public string? TraceId { get; set; }
    }

    /// <summary>
    /// Marker for expected, client-facing failures. Services throw their own
    /// exception types and map them via <see cref="ApiExceptionMiddleware"/>.
    /// </summary>
    public interface IApiException
    {
        int StatusCode { get; }

        string Code { get; }
    }

    public class ApiException : Exception, IApiException
    {
        public ApiException(string message, int statusCode = 400, string code = "bad_request") : base(message)
        {
            StatusCode = statusCode;
            Code = code;
        }

        public int StatusCode { get; }

        public string Code { get; }
    }

    public sealed class ApiExceptionMiddleware
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly RequestDelegate next;
        private readonly ILogger<ApiExceptionMiddleware> logger;
        private readonly IHostEnvironment environment;

        public ApiExceptionMiddleware(RequestDelegate next, ILogger<ApiExceptionMiddleware> logger, IHostEnvironment environment)
        {
            this.next = next;
            this.logger = logger;
            this.environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await next(context);
            }
            catch (Exception ex)
            {
                await WriteError(context, ex);
            }
        }

        private async Task WriteError(HttpContext context, Exception ex)
        {
            if (context.Response.HasStarted)
            {
                logger.LogError(ex, "Response already started, cannot write error body.");
                throw ex;
            }

            var (status, code, message) = ex switch
            {
                IApiException api => (api.StatusCode, api.Code, ex.Message),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "unauthorized", "Authentication is required."),
                KeyNotFoundException => (StatusCodes.Status404NotFound, "not_found", ex.Message),
                ArgumentException => (StatusCodes.Status400BadRequest, "bad_request", ex.Message),
                _ => (StatusCodes.Status500InternalServerError, "internal_error", "An unexpected error occurred.")
            };

            if (status >= 500)
                logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            else
                logger.LogWarning("Request failed on {Method} {Path}: {Message}", context.Request.Method, context.Request.Path, ex.Message);

            context.Response.Clear();
            context.Response.StatusCode = status;
            context.Response.ContentType = "application/json";

            var payload = new ApiErrorResponse
            {
                Code = code,
                // Never leak internal exception details outside development.
                Message = status >= 500 && !environment.IsDevelopment() ? "An unexpected error occurred." : message,
                TraceId = context.TraceIdentifier
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions));
        }
    }

    public static class ApiExceptionMiddlewareExtensions
    {
        public static IApplicationBuilder UseVeloraExceptionHandling(this IApplicationBuilder app) =>
            app.UseMiddleware<ApiExceptionMiddleware>();
    }
}
