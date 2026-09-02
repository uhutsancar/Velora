namespace Velora.Shared.Configuration
{
    /// <summary>
    /// Yerel gelistirme sirlarinin tek kaynagi.
    ///
    /// Bu depoda parolalar bir sure kaynak koda gomulu durdu (baglanti dizeleri,
    /// design-time factory'ler, seed). Depo herkese acik oldugu icin bu degerler
    /// fiilen yayindaydi. Artik hicbiri kodda yer almiyor: hepsi ortam
    /// degiskeninden okunur, .env dosyasi da .gitignore tarafindan disarida
    /// tutulur.
    ///
    /// Deger yoksa BILEREK istisna atilir. Sessiz bir varsayilan, gunun birinde
    /// yine kodda bir parola olmasi demektir; mesajin kendisi ne yapilacagini
    /// soyler, bu yuzden ilk kurulum da yavaslamis olmaz.
    /// </summary>
    public static class LocalDevSecrets
    {
        private const string SqlPasswordVariable = "VELORA_SQL_PASSWORD";
        private const string AdminPasswordVariable = "VELORA_SEED_ADMIN_PASSWORD";

        /// <summary>Yerel SQL Server'in sa parolasi.</summary>
        public static string SqlPassword => Require(SqlPasswordVariable);

        /// <summary>Gelistirmede ilk admin kullanicisinin parolasi.</summary>
        public static string? SeedAdminPassword => Environment.GetEnvironmentVariable(AdminPasswordVariable);

        /// <summary>
        /// Compose ile ayaga kalkan yerel SQL Server icin baglanti dizesi uretir.
        /// Yalnizca veritabani adi degistigi icin dize tek yerde tanimlanir.
        /// </summary>
        public static string SqlConnection(string database) =>
            $"Data Source=localhost,1444;Initial Catalog={database};Persist Security Info=True;" +
            $"User ID=sa;Password={SqlPassword};TrustServerCertificate=True;";

        private static string Require(string variable)
        {
            var value = Environment.GetEnvironmentVariable(variable);

            if (!string.IsNullOrWhiteSpace(value)) return value;

            throw new InvalidOperationException(
                $"{variable} tanimli degil. Yerel gelistirme sirlari depoda tutulmaz.\n" +
                "Cozum: depo kokundeki .env dosyasini olusturun (ornek: .env.example) ve\n" +
                "kabugunuza yukleyin. PowerShell icin: ./scripts/load-env.ps1");
        }
    }
}
