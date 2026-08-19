namespace IdentityService.Api.Application.Services
{
    public interface IPasswordHasher
    {
        string Hash(string password);

        bool Verify(string password, string encodedHash);
    }
}
