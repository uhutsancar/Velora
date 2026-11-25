namespace Velora.Shared.Middleware;

/// <summary>Contract for expected failures that can safely be returned to clients.</summary>
public interface IApiException
{
    int StatusCode { get; }

    string Code { get; }
}

public class ApiException : Exception, IApiException
{
    public ApiException(string message, int statusCode = 400, string code = "bad_request")
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
    }

    public int StatusCode { get; }

    public string Code { get; }
}
