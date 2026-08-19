using IdentityService.Api.Core.Domain;

namespace IdentityService.Api.Application.Services
{
    public record AccessToken(string Value, DateTime ExpiresAtUtc);

    public record IssuedRefreshToken(string RawValue, RefreshToken Entity);

    public interface ITokenService
    {
        AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> roles, IReadOnlyCollection<string> permissions);

        IssuedRefreshToken CreateRefreshToken(Guid userId, string? ipAddress);

        string HashRefreshToken(string rawValue);
    }
}
