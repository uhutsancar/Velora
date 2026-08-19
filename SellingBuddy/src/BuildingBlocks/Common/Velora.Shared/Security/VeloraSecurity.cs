namespace Velora.Shared.Security
{
    /// <summary>Role names shared by every Velora service. Issued by IdentityService.</summary>
    public static class VeloraRoles
    {
        public const string Admin = "Admin";
        public const string Manager = "Manager";
        public const string Customer = "Customer";

        public const string BackOffice = Admin + "," + Manager;
    }

    /// <summary>
    /// Canonical permission catalogue. IdentityService seeds these into the database
    /// and stamps them onto the access token; the other services only read them.
    /// </summary>
    public static class VeloraPermissions
    {
        public const string ClaimType = "permission";

        public const string ProductsRead = "products.read";
        public const string ProductsWrite = "products.write";
        public const string CategoriesWrite = "categories.write";
        public const string BrandsWrite = "brands.write";
        public const string OrdersRead = "orders.read";
        public const string OrdersWrite = "orders.write";
        public const string UsersRead = "users.read";
        public const string UsersWrite = "users.write";
        public const string CouponsWrite = "coupons.write";
        public const string CampaignsWrite = "campaigns.write";
        public const string AnalyticsRead = "analytics.read";
        public const string SettingsWrite = "settings.write";

        public static readonly IReadOnlyDictionary<string, string> All = new Dictionary<string, string>
        {
            [ProductsRead] = "View products",
            [ProductsWrite] = "Create, update and delete products",
            [CategoriesWrite] = "Manage categories",
            [BrandsWrite] = "Manage brands",
            [OrdersRead] = "View orders",
            [OrdersWrite] = "Change order status",
            [UsersRead] = "View users",
            [UsersWrite] = "Manage users and roles",
            [CouponsWrite] = "Manage coupons",
            [CampaignsWrite] = "Manage campaigns",
            [AnalyticsRead] = "View analytics dashboards",
            [SettingsWrite] = "Change system settings"
        };
    }

    /// <summary>Authorization policy names. Permission policies are "perm:{code}".</summary>
    public static class VeloraPolicies
    {
        public const string PermissionPrefix = "perm:";

        public const string AdminOnly = "AdminOnly";
        public const string BackOffice = "BackOffice";

        public static string Permission(string code) => PermissionPrefix + code;

        public const string ProductsWrite = PermissionPrefix + VeloraPermissions.ProductsWrite;
        public const string CategoriesWrite = PermissionPrefix + VeloraPermissions.CategoriesWrite;
        public const string BrandsWrite = PermissionPrefix + VeloraPermissions.BrandsWrite;
        public const string OrdersRead = PermissionPrefix + VeloraPermissions.OrdersRead;
        public const string OrdersWrite = PermissionPrefix + VeloraPermissions.OrdersWrite;
        public const string UsersRead = PermissionPrefix + VeloraPermissions.UsersRead;
        public const string UsersWrite = PermissionPrefix + VeloraPermissions.UsersWrite;
        public const string CouponsWrite = PermissionPrefix + VeloraPermissions.CouponsWrite;
        public const string CampaignsWrite = PermissionPrefix + VeloraPermissions.CampaignsWrite;
        public const string AnalyticsRead = PermissionPrefix + VeloraPermissions.AnalyticsRead;
        public const string SettingsWrite = PermissionPrefix + VeloraPermissions.SettingsWrite;
    }
}
