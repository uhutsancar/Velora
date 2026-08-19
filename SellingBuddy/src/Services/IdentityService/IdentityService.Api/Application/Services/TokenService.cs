using IdentityService.Api.Core.Domain;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace IdentityService.Api.Application.Services
{
    public sealed class AuthOptions
    {
        public const string SectionName = "AuthConfig";

        public string Secret { get; set; } = default!;
        public string Issuer { get; set; } = "velora-identity";
        public string Audience { get; set; } = "velora-clients";
        public int AccessTokenMinutes { get; set; } = 60;
        public int RefreshTokenDays { get; set; } = 14;
    }

    public sealed class TokenService : ITokenService
    {
        /// <summary>Custom claim type carrying a single permission code.</summary>
        public const string PermissionClaimType = Velora.Shared.Security.VeloraPermissions.ClaimType;

        private readonly AuthOptions options;

        public TokenService(Microsoft.Extensions.Options.IOptions<AuthOptions> options)
        {
            this.options = options.Value;
        }

        public AccessToken CreateAccessToken(User user, IReadOnlyCollection<string> roles, IReadOnlyCollection<string> permissions)
        {
            var expires = DateTime.UtcNow.AddMinutes(options.AccessTokenMinutes);

            var claims = new List<Claim>
            {
                // NameIdentifier carries the user id: BasketService keys the Redis cart on it.
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new(ClaimTypes.Name, user.FullName),
                new(ClaimTypes.Email, user.Email),
                new("username", user.UserName)
            };

            claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
            claims.AddRange(permissions.Select(p => new Claim(PermissionClaimType, p)));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: options.Issuer,
                audience: options.Audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: expires,
                signingCredentials: credentials);

            return new AccessToken(new JwtSecurityTokenHandler().WriteToken(token), expires);
        }

        public IssuedRefreshToken CreateRefreshToken(Guid userId, string? ipAddress)
        {
            var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

            var entity = new RefreshToken
            {
                UserId = userId,
                TokenHash = HashRefreshToken(raw),
                ExpiresAtUtc = DateTime.UtcNow.AddDays(options.RefreshTokenDays),
                CreatedByIp = ipAddress
            };

            return new IssuedRefreshToken(raw, entity);
        }

        public string HashRefreshToken(string rawValue)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawValue));
            return Convert.ToHexString(bytes);
        }
    }
}
