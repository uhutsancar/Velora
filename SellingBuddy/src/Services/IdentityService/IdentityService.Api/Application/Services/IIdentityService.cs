using IdentityService.Api.Application.Models;
using Velora.Shared.Middleware;

namespace IdentityService.Api.Application.Services
{
    /// <summary>
    /// Expected, user-facing identity failures (bad credentials, duplicate email...).
    /// Implements <see cref="IApiException"/> so the shared middleware answers with the
    /// intended status code instead of turning everything into a 500.
    /// </summary>
    public class IdentityException : Exception, IApiException
    {
        public IdentityException(string message, int statusCode = 400, string? code = null) : base(message)
        {
            StatusCode = statusCode;
            Code = code ?? CodeForStatus(statusCode);
        }

        public int StatusCode { get; }

        public string Code { get; }

        private static string CodeForStatus(int statusCode) => statusCode switch
        {
            401 => "unauthorized",
            403 => "forbidden",
            404 => "not_found",
            409 => "conflict",
            423 => "account_locked",
            _ => "bad_request"
        };
    }

    public interface IIdentityService
    {
        Task<LoginResponseModel> Login(LoginRequestModel requestModel, string? ipAddress = null, CancellationToken ct = default);

        Task<LoginResponseModel> Register(RegisterRequestModel requestModel, string? ipAddress = null, CancellationToken ct = default);

        Task<LoginResponseModel> Refresh(string refreshToken, string? ipAddress = null, CancellationToken ct = default);

        Task Logout(string refreshToken, CancellationToken ct = default);

        Task<UserProfileModel> GetProfile(Guid userId, CancellationToken ct = default);

        Task<UserProfileModel> UpdateProfile(Guid userId, UpdateProfileRequestModel model, CancellationToken ct = default);

        Task ChangePassword(Guid userId, ChangePasswordRequestModel model, CancellationToken ct = default);
    }
}
