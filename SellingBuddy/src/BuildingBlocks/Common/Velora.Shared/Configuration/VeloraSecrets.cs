using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Velora.Shared.Configuration
{
    /// <summary>
    /// Fail-fast validation for values that must never ship as defaults.
    ///
    /// The pattern across all Velora services is:
    ///   appsettings.json              - structure and non-secret defaults, secrets blank
    ///   appsettings.Development.json  - throwaway local credentials (safe to commit)
    ///   environment variables         - the real values in every other environment
    ///
    /// ASP.NET maps a nested key to an environment variable by replacing ':' with '__',
    /// so AuthConfig:Secret comes from AuthConfig__Secret.
    ///
    /// A service that starts with a blank JWT key would accept nothing and reject
    /// everything at runtime; better to refuse to start and say why.
    /// </summary>
    public static class VeloraSecrets
    {
        /// <summary>
        /// Throws when a required configuration key is missing outside Development.
        /// In Development, falls back to <paramref name="developmentFallback"/> so a fresh
        /// clone runs with no setup.
        /// </summary>
        public static string Require(
            IConfiguration configuration,
            IHostEnvironment environment,
            string key,
            string? developmentFallback = null)
        {
            var value = configuration[key];

            if (!string.IsNullOrWhiteSpace(value))
                return value;

            if (environment.IsDevelopment() && developmentFallback is not null)
                return developmentFallback;

            throw new InvalidOperationException(BuildMessage(key, environment.EnvironmentName));
        }

        /// <summary>Same contract as <see cref="Require"/> but for connection strings.</summary>
        public static string RequireConnectionString(
            IConfiguration configuration,
            IHostEnvironment environment,
            string name,
            string? developmentFallback = null)
            => RequireConnectionString(
                configuration, environment, name,
                developmentFallback is null ? null : () => developmentFallback);

        /// <summary>
        /// Yedek deger bir fonksiyon olarak alinir, cunku uretilmesi pahali ya da
        /// basarisiz olabilir: yerel yedek artik ortam degiskeninden okunuyor ve
        /// eksikse istisna atiyor. Dizeyi dogrudan parametre olarak gecmek, C#
        /// argumanlari erken degerlendirdigi icin, yapilandirmada gecerli bir
        /// baglanti dizesi VARKEN bile o istisnayi tetikliyordu.
        /// </summary>
        public static string RequireConnectionString(
            IConfiguration configuration,
            IHostEnvironment environment,
            string name,
            Func<string>? developmentFallback)
        {
            var value = configuration.GetConnectionString(name) ?? configuration[name];

            if (!string.IsNullOrWhiteSpace(value))
                return value;

            if (environment.IsDevelopment() && developmentFallback is not null)
                return developmentFallback();

            throw new InvalidOperationException(BuildMessage($"ConnectionStrings:{name}", environment.EnvironmentName));
        }

        /// <summary>
        /// Rejects a JWT signing key that is too short to be safe for HMAC-SHA256, and
        /// refuses the value shipped in the repository outside Development.
        /// </summary>
        public static string RequireSigningKey(IConfiguration configuration, IHostEnvironment environment)
        {
            const string key = "AuthConfig:Secret";
            const int minimumLength = 32;

            var value = Require(configuration, environment, key, DevelopmentSigningKey);

            if (value.Length < minimumLength)
            {
                throw new InvalidOperationException(
                    $"'{key}' must be at least {minimumLength} characters for HMAC-SHA256. " +
                    "Generate one with: openssl rand -base64 48");
            }

            if (!environment.IsDevelopment() && value == DevelopmentSigningKey)
            {
                throw new InvalidOperationException(
                    $"'{key}' is still the development placeholder. Set AuthConfig__Secret to a real secret " +
                    $"before running in {environment.EnvironmentName}.");
            }

            return value;
        }

        /// <summary>
        /// Known-throwaway key used only when ASPNETCORE_ENVIRONMENT=Development.
        /// It is rejected in every other environment by <see cref="RequireSigningKey"/>.
        /// </summary>
        public const string DevelopmentSigningKey = "velora-local-development-signing-key-do-not-use-in-production";

        private static string BuildMessage(string key, string environmentName) =>
            $"Required configuration '{key}' is not set (environment: {environmentName}). " +
            $"Provide it as the environment variable '{key.Replace(":", "__")}' " +
            "or through a secret store. See README section 'Configuration and secrets'.";
    }
}
