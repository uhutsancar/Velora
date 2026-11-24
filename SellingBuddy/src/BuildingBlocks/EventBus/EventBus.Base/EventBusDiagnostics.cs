using System.Diagnostics;

namespace EventBus.Base;

public static class EventBusDiagnostics
{
    public const string ActivitySourceName = "Velora.EventBus";
    public static readonly ActivitySource ActivitySource = new(ActivitySourceName);
}
