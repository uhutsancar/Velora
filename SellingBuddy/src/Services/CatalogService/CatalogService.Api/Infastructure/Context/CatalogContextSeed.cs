using CatalogService.Api.Core.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Polly;
using Velora.Shared.Text;

namespace CatalogService.Api.Infrastructure.Context
{
    /// <summary>
    /// Seeds the Velora demo catalogue: category tree, house brands, products with
    /// galleries and variants, reviews, campaigns and coupons. Idempotent - each
    /// block only runs when its table is still empty, so restarting never
    /// duplicates data.
    /// </summary>
    public class CatalogContextSeed
    {
        /// <summary>
        /// Deterministic placeholder photography. Replace with real asset URLs (or upload
        /// through the admin media endpoint) before going live.
        /// </summary>
        private static string Photo(string seed, int width = 1200, int height = 1500)
            => $"https://picsum.photos/seed/velora-{seed}/{width}/{height}";

        /// <summary>
        /// Fixed seed so a rebuilt database produces the same demo numbers.
        /// Random.Shared would make every environment show different sales figures,
        /// which turns any dashboard screenshot into a lie.
        /// </summary>
        private static readonly Random Rng = new(20260901);

        public async Task SeedAsync(CatalogContext context, IWebHostEnvironment env, ILogger<CatalogContextSeed> logger)
        {
            var policy = Policy.Handle<SqlException>()
                .WaitAndRetryAsync(
                    retryCount: 3,
                    sleepDurationProvider: _ => TimeSpan.FromSeconds(5),
                    onRetry: (exception, _, retry, _) =>
                        logger.LogWarning(exception, "[CatalogContextSeed] attempt {Retry} of 3 failed", retry));

            await policy.ExecuteAsync(() => ProcessSeeding(context, logger));
        }

        private async Task ProcessSeeding(CatalogContext context, ILogger logger)
        {
            var brands = await SeedBrands(context);
            var types = await SeedTypes(context);
            var categories = await SeedCategories(context);

            await SeedProducts(context, brands, types, categories, logger);
            await SeedReviews(context, logger);
            await SeedCampaigns(context, categories);
            await SeedCoupons(context);
            await BackfillSlugs(context, logger);
        }

        /* ---------------------------------------------------------------- */
        /* Taxonomy                                                          */
        /* ---------------------------------------------------------------- */

        private static async Task<Dictionary<string, CatalogBrand>> SeedBrands(CatalogContext context)
        {
            if (await context.CatalogBrands.AnyAsync())
                return await context.CatalogBrands.ToDictionaryAsync(b => b.Brand);

            var brands = new[]
            {
                new CatalogBrand { Brand = "Velora Atelier", Description = "El yapımı, numaralı deri koleksiyonu", IsFeatured = true, DisplayOrder = 1 },
                new CatalogBrand { Brand = "Velora Signature", Description = "İkonik Velora silüetleri", IsFeatured = true, DisplayOrder = 2 },
                new CatalogBrand { Brand = "Velora Studio", Description = "Günlük kullanım için modern tasarımlar", IsFeatured = true, DisplayOrder = 3 },
                new CatalogBrand { Brand = "Velora Travel", Description = "Seyahat ve yolculuk serisi", IsFeatured = true, DisplayOrder = 4 },
                new CatalogBrand { Brand = "Velora Essentials", Description = "Zamansız temel parçalar", DisplayOrder = 5 },
                new CatalogBrand { Brand = "Velora Noir", Description = "Akşam ve davet parçaları", DisplayOrder = 6 },
                new CatalogBrand { Brand = "Velora Heritage", Description = "Arşivden yeniden üretilen modeller", DisplayOrder = 7 },
                new CatalogBrand { Brand = "Velora Office", Description = "Masa ve iş hayatı için deri", DisplayOrder = 8 }
            };

            foreach (var brand in brands) brand.Slug = Slug.From(brand.Brand);

            context.CatalogBrands.AddRange(brands);
            await context.SaveChangesAsync();

            return brands.ToDictionary(b => b.Brand);
        }

        private static async Task<Dictionary<string, CatalogType>> SeedTypes(CatalogContext context)
        {
            if (await context.CatalogTypes.AnyAsync())
                return await context.CatalogTypes.ToDictionaryAsync(t => t.Type);

            var types = new[]
                {
                    "Çanta", "Cüzdan", "Kartlık", "Kemer", "Ayakkabı", "Seyahat",
                    "Aksesuar", "Eldiven", "Şal", "Ofis", "Bakım"
                }
                .Select(t => new CatalogType { Type = t })
                .ToArray();

            context.CatalogTypes.AddRange(types);
            await context.SaveChangesAsync();

            return types.ToDictionary(t => t.Type);
        }

        private static async Task<Dictionary<string, Category>> SeedCategories(CatalogContext context)
        {
            if (await context.Categories.AnyAsync())
                return await context.Categories.ToDictionaryAsync(c => c.Slug);

            var roots = new[]
            {
                new Category { Name = "Kadın", Slug = "kadin", DisplayOrder = 1, IsFeatured = true, ImageUrl = Photo("cat-kadin", 900, 1100), Description = "Kadın deri çanta, cüzdan, ayakkabı ve aksesuar koleksiyonu" },
                new Category { Name = "Erkek", Slug = "erkek", DisplayOrder = 2, IsFeatured = true, ImageUrl = Photo("cat-erkek", 900, 1100), Description = "Erkek deri çanta, cüzdan, kemer ve ayakkabı koleksiyonu" },
                new Category { Name = "Aksesuar", Slug = "aksesuar", DisplayOrder = 3, IsFeatured = true, ImageUrl = Photo("cat-aksesuar", 900, 1100), Description = "Kartlık, eldiven, şal ve küçük deri aksesuarlar" },
                new Category { Name = "Seyahat", Slug = "seyahat", DisplayOrder = 4, IsFeatured = true, ImageUrl = Photo("cat-seyahat", 900, 1100), Description = "Valiz, weekender ve yol arkadaşları" },
                new Category { Name = "Ofis", Slug = "ofis", DisplayOrder = 5, IsFeatured = true, ImageUrl = Photo("cat-ofis", 900, 1100), Description = "Laptop çantaları, evrak dosyaları ve masa aksesuarları" }
            };

            context.Categories.AddRange(roots);
            await context.SaveChangesAsync();

            var byRoot = roots.ToDictionary(c => c.Slug);

            var children = new[]
            {
                // Kadın
                new Category { Name = "Omuz Çantası", Slug = "kadin-omuz-cantasi", ParentId = byRoot["kadin"].Id, DisplayOrder = 1 },
                new Category { Name = "El Çantası", Slug = "kadin-el-cantasi", ParentId = byRoot["kadin"].Id, DisplayOrder = 2 },
                new Category { Name = "Sırt Çantası", Slug = "kadin-sirt-cantasi", ParentId = byRoot["kadin"].Id, DisplayOrder = 3 },
                new Category { Name = "Cüzdan", Slug = "kadin-cuzdan", ParentId = byRoot["kadin"].Id, DisplayOrder = 4 },
                new Category { Name = "Ayakkabı", Slug = "kadin-ayakkabi", ParentId = byRoot["kadin"].Id, DisplayOrder = 5 },
                new Category { Name = "Kemer", Slug = "kadin-kemer", ParentId = byRoot["kadin"].Id, DisplayOrder = 6 },

                // Erkek
                new Category { Name = "Evrak Çantası", Slug = "erkek-evrak-cantasi", ParentId = byRoot["erkek"].Id, DisplayOrder = 1 },
                new Category { Name = "Sırt Çantası", Slug = "erkek-sirt-cantasi", ParentId = byRoot["erkek"].Id, DisplayOrder = 2 },
                new Category { Name = "Postacı Çantası", Slug = "erkek-postaci-cantasi", ParentId = byRoot["erkek"].Id, DisplayOrder = 3 },
                new Category { Name = "Cüzdan", Slug = "erkek-cuzdan", ParentId = byRoot["erkek"].Id, DisplayOrder = 4 },
                new Category { Name = "Kemer", Slug = "erkek-kemer", ParentId = byRoot["erkek"].Id, DisplayOrder = 5 },
                new Category { Name = "Ayakkabı", Slug = "erkek-ayakkabi", ParentId = byRoot["erkek"].Id, DisplayOrder = 6 },

                // Aksesuar
                new Category { Name = "Kartlık", Slug = "kartlik", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 1 },
                new Category { Name = "Anahtarlık", Slug = "anahtarlik", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 2 },
                new Category { Name = "Eldiven", Slug = "eldiven", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 3 },
                new Category { Name = "Şal ve Fular", Slug = "sal-fular", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 4 },
                new Category { Name = "Deri Bakımı", Slug = "deri-bakimi", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 5 },

                // Seyahat
                new Category { Name = "Valiz", Slug = "valiz", ParentId = byRoot["seyahat"].Id, DisplayOrder = 1 },
                new Category { Name = "Weekender", Slug = "weekender", ParentId = byRoot["seyahat"].Id, DisplayOrder = 2 },
                new Category { Name = "Seyahat Aksesuarı", Slug = "seyahat-aksesuari", ParentId = byRoot["seyahat"].Id, DisplayOrder = 3 },

                // Ofis
                new Category { Name = "Laptop Çantası", Slug = "laptop-cantasi", ParentId = byRoot["ofis"].Id, DisplayOrder = 1 },
                new Category { Name = "Evrak Dosyası", Slug = "evrak-dosyasi", ParentId = byRoot["ofis"].Id, DisplayOrder = 2 },
                new Category { Name = "Masa Aksesuarı", Slug = "masa-aksesuari", ParentId = byRoot["ofis"].Id, DisplayOrder = 3 }
            };

            context.Categories.AddRange(children);
            await context.SaveChangesAsync();

            return await context.Categories.ToDictionaryAsync(c => c.Slug);
        }

        /* ---------------------------------------------------------------- */
        /* Products                                                          */
        /* ---------------------------------------------------------------- */

        private static async Task SeedProducts(
            CatalogContext context,
            Dictionary<string, CatalogBrand> brands,
            Dictionary<string, CatalogType> types,
            Dictionary<string, Category> categories,
            ILogger logger)
        {
            if (await context.CatalogItems.AnyAsync()) return;

            var now = DateTime.UtcNow;
            var products = new List<CatalogItem>();

            // Colour swatches reused across the catalogue, so the same "Taba" is
            // the same hex on every product card.
            var black = ("Siyah", "#12100E");
            var tan = ("Taba", "#8B5A2B");
            var brown = ("Kahve", "#4A2C1A");
            var sandColour = ("Kum", "#D8C3A5");
            var burgundy = ("Bordo", "#5C1F2B");
            var forest = ("Yeşil", "#243D30");
            var navy = ("Lacivert", "#1D2B44");
            var ivory = ("Fildişi", "#EFE7DA");
            var grey = ("Gri", "#6E7276");
            var cognac = ("Konyak", "#A65E2E");

            void Add(
                string name,
                string categorySlug,
                string brandName,
                string typeName,
                decimal price,
                decimal? discountPrice,
                decimal costPrice,
                int stock,
                string shortDescription,
                string description,
                string tags,
                bool featured = false,
                (string Color, string Hex)[]? colors = null,
                string[]? sizes = null,
                int daysAgo = 0,
                bool published = true)
            {
                var slug = Slug.From(name);

                // Build the SKU from the slug's alphanumerics only; slicing by the
                // slug length would overrun once the dashes are removed.
                var skuBody = new string(slug.Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
                var sku = $"VLR-{skuBody[..Math.Min(10, skuBody.Length)]}";

                var product = new CatalogItem
                {
                    Name = name,
                    Slug = slug,
                    Description = description,
                    ShortDescription = shortDescription,
                    Price = price,
                    DiscountPrice = discountPrice,
                    CostPrice = costPrice,
                    Sku = sku,
                    CategoryId = categories[categorySlug].Id,
                    CatalogBrandId = brands[brandName].Id,
                    CatalogTypeId = types[typeName].Id,
                    AvailableStock = stock,
                    RestockThreshold = 5,
                    IsPublished = published,
                    IsFeatured = featured,
                    MetaTitle = $"{name} | Velora",
                    MetaDescription = shortDescription,
                    Tags = tags,
                    PictureFileName = string.Empty,
                    PictureUri = Photo(slug),
                    CreatedAtUtc = now.AddDays(-daysAgo),
                    SoldCount = Rng.Next(4, 180),
                    ViewCount = Rng.Next(50, 4000)
                };

                for (var i = 0; i < 4; i++)
                {
                    product.Images.Add(new ProductImage
                    {
                        Url = Photo($"{slug}-{i}"),
                        AltText = $"{name} görseli {i + 1}",
                        DisplayOrder = i,
                        IsPrimary = i == 0
                    });
                }

                colors ??= new[] { black, tan };
                var order = 0;

                foreach (var (color, hex) in colors)
                {
                    if (sizes is { Length: > 0 })
                    {
                        foreach (var size in sizes)
                        {
                            product.Variants.Add(new ProductVariant
                            {
                                Sku = $"{product.Sku}-{Slug.From(color).ToUpperInvariant()}-{size}",
                                Color = color,
                                ColorHex = hex,
                                Size = size,
                                Stock = Rng.Next(0, 25),
                                DisplayOrder = order++
                            });
                        }
                    }
                    else
                    {
                        product.Variants.Add(new ProductVariant
                        {
                            Sku = $"{product.Sku}-{Slug.From(color).ToUpperInvariant()}",
                            Color = color,
                            ColorHex = hex,
                            Stock = Rng.Next(2, 30),
                            DisplayOrder = order++
                        });
                    }
                }

                products.Add(product);
            }

            // ---------------------------------------------------------------
            // Kadın — çanta
            // ---------------------------------------------------------------
            Add("Aurora Omuz Çantası", "kadin-omuz-cantasi", "Velora Atelier", "Çanta", 4890, 3990, 1850, 24,
                "Yumuşak dana derisinden el yapımı omuz çantası.",
                "Aurora, günlük kullanım ile özel günler arasındaki çizgiyi silen bir omuz çantasıdır. Tam tabaklanmış dana derisinden üretilir, iç astarı pamuk kanvastır. Ayarlanabilir omuz askısı ve mıknatıslı kapama detayı ile günün her saatine uyum sağlar.",
                "yeni,cok-satan,deri", featured: true,
                colors: new[] { black, sandColour, burgundy }, daysAgo: 3);

            Add("Lumen El Çantası", "kadin-el-cantasi", "Velora Signature", "Çanta", 6250, null, 2400, 12,
                "Mimari formlu, yapılandırılmış el çantası.",
                "Lumen'in keskin hatları Velora'nın imza silüetini tanımlar. Sert yapılı gövdesi formunu yıllarca korur; altın rengi metal aksesuarları elde parlatılmıştır. İç bölme, telefon ve kart gözleriyle ayrılmıştır.",
                "premium,el-yapimi", featured: true,
                colors: new[] { black, ivory }, daysAgo: 8);

            Add("Sera Mini Çanta", "kadin-omuz-cantasi", "Velora Noir", "Çanta", 2790, 2290, 980, 40,
                "Zincir askılı kompakt akşam çantası.",
                "Sera, akşam davetleri için tasarlanmış kompakt bir çantadır. Çıkarılabilir zincir askısı sayesinde clutch olarak da kullanılabilir. İç astarı ipek karışımıdır.",
                "indirim,yeni,davet",
                colors: new[] { black, ("Gümüş", "#C8CCD0"), burgundy }, daysAgo: 2);

            Add("Nova Tote", "kadin-omuz-cantasi", "Velora Studio", "Çanta", 3890, null, 1350, 18,
                "15 inç dizüstü bilgisayar alan geniş tote.",
                "Nova, iş ve şehir hayatı için tasarlanmış geniş bir tote çantadır. Yumuşak deri gövde, yastıklı laptop bölmesi ve iç organizasyon cepleri içerir. Omuzda kaymayan geniş askı yapısı vardır.",
                "cok-satan,ofis", featured: true,
                colors: new[] { black, sandColour }, daysAgo: 45);

            Add("Iris Bucket Çanta", "kadin-omuz-cantasi", "Velora Atelier", "Çanta", 4290, 3490, 1600, 9,
                "Büzgülü kapamalı yumuşak bucket çanta.",
                "Iris'in yumuşak gövdesi kullandıkça size uyum sağlar. Büzgülü ip kapama ve iç astar cebi ile pratik bir günlük seçenektir. Askı boyu iki kademede ayarlanabilir.",
                "indirim,deri",
                colors: new[] { tan, black }, daysAgo: 60);

            Add("Alba Baget Çanta", "kadin-omuz-cantasi", "Velora Signature", "Çanta", 3590, null, 1240, 22,
                "Koltuk altı taşınan ince baget silüet.",
                "Alba, doksanların baget çantasını bugünün ölçüleriyle yeniden yorumlar. Kısa askısı koltuk altına oturur, uzun askısı çapraz kullanıma izin verir.",
                "yeni,trend",
                colors: new[] { black, cognac, ivory }, daysAgo: 6);

            Add("Vela Şehir Sırt Çantası", "kadin-sirt-cantasi", "Velora Studio", "Çanta", 4190, null, 1480, 16,
                "Hafif yapılı, günlük deri sırt çantası.",
                "Vela, omuz yükünü dengeleyen geniş askıları ve 13 inç laptop bölmesiyle şehir içi kullanım için tasarlandı. Arka gizli fermuarlı cebi kalabalıkta güven verir.",
                "gunluk,ofis",
                colors: new[] { black, tan }, daysAgo: 18);

            Add("Mira Deri Cüzdan", "kadin-cuzdan", "Velora Essentials", "Cüzdan", 1590, null, 520, 60,
                "On iki kart bölmeli fermuarlı cüzdan.",
                "Mira, günlük taşımanın tüm ihtiyacını karşılayan ince bir cüzdandır. RFID korumalı kart bölmeleri, iki banknot gözü ve ayrı bozuk para bölmesi bulunur.",
                "cok-satan,hediye",
                colors: new[] { black, tan, forest }, daysAgo: 30);

            Add("Elia Küçük Cüzdan", "kadin-cuzdan", "Velora Essentials", "Cüzdan", 990, 790, 310, 75,
                "Cebe giren, katlanabilir mini cüzdan.",
                "Elia, küçük çantalarda yer kaplamayan altı kart bölmeli bir cüzdandır. Çıt çıt kapaması tek elle açılır.",
                "indirim,hediye",
                colors: new[] { black, burgundy, sandColour }, daysAgo: 52);

            Add("Selin Deri Kemer", "kadin-kemer", "Velora Essentials", "Kemer", 1090, null, 320, 48,
                "İnce yapılı, altın tokalı kadın kemeri.",
                "Selin, 2,5 cm genişliğinde ince bir kemerdir. Elbise ve yüksek bel pantolonlarla kullanılmak üzere tasarlandı; tokası pirinçtir ve zamanla mat bir ton alır.",
                "gunluk",
                colors: new[] { black, tan },
                sizes: new[] { "75", "80", "85", "90", "95" }, daysAgo: 88);

            Add("Bella Deri Babet", "kadin-ayakkabi", "Velora Atelier", "Ayakkabı", 3290, null, 1150, 20,
                "Deri astarlı, esnek tabanlı klasik babet.",
                "Bella, gün boyu giyilmek üzere üretilmiş bir babettir. Üst deri, astar ve iç taban tamamen deridir; taban esnek kauçuktur ve değiştirilebilir.",
                "yeni,konfor",
                colors: new[] { black, ivory, burgundy },
                sizes: new[] { "36", "37", "38", "39", "40" }, daysAgo: 12);

            Add("Roma Deri Loafer", "kadin-ayakkabi", "Velora Signature", "Ayakkabı", 4590, 3890, 1620, 14,
                "Metal detaylı, kalıcı formlu loafer.",
                "Roma, klasik loafer kalıbını daha yumuşak bir deriyle üretir. Ayak sırtındaki pirinç detay elde monte edilir; taban çift dikişlidir.",
                "indirim,premium",
                colors: new[] { black, cognac },
                sizes: new[] { "36", "37", "38", "39", "40" }, daysAgo: 26);

            // ---------------------------------------------------------------
            // Erkek
            // ---------------------------------------------------------------
            Add("Atlas Evrak Çantası", "erkek-evrak-cantasi", "Velora Signature", "Çanta", 7450, 6290, 2900, 8,
                "Tam tabaklanmış deriden profesyonel evrak çantası.",
                "Atlas, toplantıdan toplantıya geçen günler için tasarlandı. 16 inç laptop bölmesi, ayrı belge gözü ve gizli fermuarlı arka cebi vardır. Taşıma sapları çift kat deriden dikilir.",
                "premium,ofis,cok-satan", featured: true,
                colors: new[] { brown, black }, daysAgo: 15);

            Add("Orion Sırt Çantası", "erkek-sirt-cantasi", "Velora Studio", "Çanta", 4990, null, 1750, 26,
                "Deri ve teknik kumaş birleşimli sırt çantası.",
                "Orion, şehir içi kullanım ve kısa seyahatler için üretildi. Su itici teknik kumaş gövdesi deri detaylarla birleşir; sırt kısmı havalandırmalıdır ve valiz kayışı geçidi bulunur.",
                "yeni,gunluk", featured: true,
                colors: new[] { black, ("Haki", "#3F4A3C") }, daysAgo: 5);

            Add("Hektor Postacı Çantası", "erkek-postaci-cantasi", "Velora Atelier", "Çanta", 5290, null, 1950, 4,
                "Çapraz askılı klasik postacı çantası.",
                "Hektor, el yapımı dikişleri ve solid pirinç aksesuarları ile yıllara meydan okuyan bir tasarımdır. Kapak altında iki ayrı bölme ve kalem yuvaları vardır.",
                "el-yapimi,premium",
                colors: new[] { brown }, daysAgo: 40);

            Add("Baros Gövde Çantası", "erkek-postaci-cantasi", "Velora Studio", "Çanta", 2290, 1890, 760, 34,
                "Tek askılı kompakt gövde çantası.",
                "Baros, telefon, cüzdan ve anahtarı taşımak için yeterli olan kompakt bir gövde çantasıdır. Askı boyu tek hareketle ayarlanır.",
                "indirim,gunluk",
                colors: new[] { black, ("Haki", "#3F4A3C") }, daysAgo: 21);

            Add("Kaan Deri Cüzdan", "erkek-cuzdan", "Velora Essentials", "Cüzdan", 1290, 990, 380, 85,
                "İnce yapılı, sekiz kart bölmeli cüzdan.",
                "Kaan, cebi şişirmeyen ince yapısı ile günlük kullanım için idealdir. RFID korumalıdır ve tek parça deriden katlanarak üretilir.",
                "indirim,cok-satan",
                colors: new[] { black, brown }, daysAgo: 90);

            Add("Demir Bozuk Para Cüzdanı", "erkek-cuzdan", "Velora Essentials", "Cüzdan", 1490, null, 440, 52,
                "Bozuk para gözlü, klasik kesim cüzdan.",
                "Demir, banknot, kart ve bozuk parayı tek yerde toplar. Bozuk para bölmesi çıt çıt kapamalıdır ve tek elle açılır.",
                "hediye",
                colors: new[] { brown, black }, daysAgo: 110);

            Add("Vera Deri Kemer", "erkek-kemer", "Velora Essentials", "Kemer", 1190, null, 340, 54,
                "Tokası değiştirilebilir tam deri kemer.",
                "Vera, klasik takım elbise ile de günlük pantolon ile de kullanılabilen 3,5 cm genişliğinde bir kemerdir. Toka vidalı bağlantılıdır ve ayrıca satılan tokalarla değiştirilebilir.",
                "gunluk",
                colors: new[] { black, brown },
                sizes: new[] { "90", "95", "100", "105", "110" }, daysAgo: 120);

            Add("Tunç Örgü Kemer", "erkek-kemer", "Velora Heritage", "Kemer", 1390, null, 420, 30,
                "Elde örülmüş, deliksiz ayar sağlayan kemer.",
                "Tunç, örgü yapısı sayesinde tokayı her noktadan geçirmeye izin verir; bu yüzden ayarı deliklerle sınırlı değildir. Yazlık pantolonlarla kullanılmak üzere tasarlandı.",
                "yeni,gunluk",
                colors: new[] { brown, navy },
                sizes: new[] { "90", "95", "100", "105" }, daysAgo: 9);

            Add("Kastor Deri Derby", "erkek-ayakkabi", "Velora Atelier", "Ayakkabı", 6890, null, 2450, 11,
                "Goodyear dikişli, tabanı yenilenebilir derby.",
                "Kastor, Goodyear yöntemiyle dikilir; bu, tabanı aşındığında üst kısmına zarar vermeden yenilenebileceği anlamına gelir. Üst deri bitkisel tabaklanmıştır.",
                "premium,el-yapimi", featured: true,
                colors: new[] { black, brown },
                sizes: new[] { "40", "41", "42", "43", "44", "45" }, daysAgo: 33);

            Add("Ege Süet Loafer", "erkek-ayakkabi", "Velora Studio", "Ayakkabı", 4290, 3590, 1520, 17,
                "Süet üst, esnek kauçuk tabanlı loafer.",
                "Ege, hafif yapısı ve yumuşak süet üstü ile yazlık kullanım için tasarlandı. İç astarı deridir ve terlemeyi azaltır.",
                "indirim,yaz",
                colors: new[] { navy, tan },
                sizes: new[] { "40", "41", "42", "43", "44" }, daysAgo: 44);

            // ---------------------------------------------------------------
            // Aksesuar
            // ---------------------------------------------------------------
            Add("Piko Kartlık", "kartlik", "Velora Essentials", "Kartlık", 690, null, 180, 120,
                "Dört bölmeli minimal deri kartlık.",
                "Piko, sadece gerekli olanı taşımak isteyenler için. Tek parça deriden üretilir ve zamanla eşsiz bir patina kazanır.",
                "cok-satan,hediye",
                colors: new[] { black, tan, forest, burgundy }, daysAgo: 75);

            Add("Kule Mıknatıslı Kartlık", "kartlik", "Velora Studio", "Kartlık", 890, null, 240, 64,
                "Telefona yapışan, mıknatıslı kart tutucu.",
                "Kule, MagSafe uyumlu telefonların arkasına oturur ve üç kart taşır. Deri gövde, mıknatısı tamamen kapsar.",
                "yeni,teknoloji",
                colors: new[] { black, brown }, daysAgo: 4);

            Add("Nod Anahtarlık", "anahtarlik", "Velora Essentials", "Aksesuar", 390, 290, 95, 200,
                "Solid pirinç halkalı deri anahtarlık.",
                "Nod, küçük ama iyi düşünülmüş bir hediye. Deri gövde ve solid pirinç halka; halka kaplama değildir, aşındığında altından farklı bir metal çıkmaz.",
                "indirim,hediye",
                colors: new[] { black, tan }, daysAgo: 100);

            Add("Kanca Anahtar Kılıfı", "anahtarlik", "Velora Atelier", "Aksesuar", 790, null, 230, 45,
                "Anahtarları katlayarak taşıyan deri kılıf.",
                "Kanca, dört anahtara kadar toplar ve cepte ses çıkarmasını engeller. Vidaları sökülerek anahtar eklenip çıkarılabilir.",
                "hediye,el-yapimi",
                colors: new[] { brown, forest }, daysAgo: 66);

            Add("Kış Deri Eldiven", "eldiven", "Velora Atelier", "Eldiven", 2190, null, 780, 28,
                "Kaşmir astarlı kuzu derisi eldiven.",
                "Kış, ince kuzu derisinden üretilir ve kaşmir karışımı astarla beslenir. Parmak uçları dokunmatik ekran uyumludur.",
                "kis,hediye",
                colors: new[] { black, brown },
                sizes: new[] { "S", "M", "L", "XL" }, daysAgo: 14);

            Add("Rüzgâr Sürüş Eldiveni", "eldiven", "Velora Heritage", "Eldiven", 1890, 1590, 640, 22,
                "Delikli sırtı ile klasik sürüş eldiveni.",
                "Rüzgâr, direksiyon tutuşunu engellemeyen ince bir deriden üretilir. Sırt kısmındaki delikler havalandırmayı sağlar.",
                "indirim,klasik",
                colors: new[] { brown, black },
                sizes: new[] { "S", "M", "L" }, daysAgo: 58);

            Add("Ada İpek Fular", "sal-fular", "Velora Noir", "Şal", 1690, null, 560, 36,
                "El baskısı desenli, saf ipek fular.",
                "Ada, 90x90 cm ölçüsünde saf ipekten üretilir. Kenarları elde kıvrılıp dikilir; desen atölyemizde tasarlanmıştır.",
                "yeni,hediye",
                colors: new[] { burgundy, forest, navy }, daysAgo: 7);

            Add("Kışla Yün Şal", "sal-fular", "Velora Essentials", "Şal", 1290, 990, 420, 41,
                "Yumuşak yün karışımı, geniş kesim şal.",
                "Kışla, 70x200 cm ölçüsünde yün ve kaşmir karışımıdır. Boyun çevresinde ağırlık yapmadan sıcak tutar.",
                "indirim,kis",
                colors: new[] { grey, burgundy, ivory }, daysAgo: 49);

            Add("Velora Deri Bakım Seti", "deri-bakimi", "Velora Atelier", "Bakım", 890, null, 260, 70,
                "Krem, fırça ve bez içeren üç parçalı set.",
                "Renksiz bakım kremi, at kılı fırça ve pamuklu bezden oluşur. Üç ayda bir uygulandığında deriyi besler ve su itici özelliğini korur.",
                "hediye,bakim",
                colors: new[] { ("Tek renk", "#B0AAA0") }, daysAgo: 25);

            Add("Koru Su İtici Sprey", "deri-bakimi", "Velora Atelier", "Bakım", 490, null, 140, 95,
                "Süet ve deri için renksiz koruyucu.",
                "Koru, deriyi nefes almasını engellemeden su ve lekeye karşı korur. Altı ayda bir uygulanması yeterlidir.",
                "bakim",
                colors: new[] { ("Tek renk", "#B0AAA0") }, daysAgo: 71);

            // ---------------------------------------------------------------
            // Seyahat
            // ---------------------------------------------------------------
            Add("Meridian Weekender", "weekender", "Velora Travel", "Seyahat", 8900, 7490, 3400, 6,
                "Hafta sonu kaçamakları için deri seyahat çantası.",
                "Meridian, iki günlük bir yolculuğun tüm ihtiyacını alır. Ayrı ayakkabı bölmesi, çıkarılabilir omuz askısı ve valiz kayışı geçidi vardır.",
                "premium,seyahat,cok-satan", featured: true,
                colors: new[] { brown, black }, daysAgo: 20);

            Add("Kompas Kabin Valizi", "valiz", "Velora Travel", "Seyahat", 6490, null, 2450, 15,
                "Alüminyum çerçeveli kabin boyu valiz.",
                "Kompas, kabin ölçülerine uygun sert kabuklu bir valizdir. TSA kilidi, 360 derece dönen sessiz tekerlekler ve deri taşıma sapı bulunur.",
                "yeni,seyahat", featured: true,
                colors: new[] { ("Antrasit", "#2E3134"), ("Şampanya", "#C6B79B") }, daysAgo: 10);

            Add("Kompas Orta Boy Valiz", "valiz", "Velora Travel", "Seyahat", 8290, 7290, 3100, 9,
                "Bir haftalık yolculuk için sert kabuk valiz.",
                "Kompas'ın orta boyu, kabin valizinin büyük kardeşidir. İç bölmeler ayrı fermuarlıdır ve sıkıştırma kayışları içerir.",
                "indirim,seyahat",
                colors: new[] { ("Antrasit", "#2E3134"), navy }, daysAgo: 36);

            Add("Lira Pasaportluk", "seyahat-aksesuari", "Velora Travel", "Aksesuar", 1090, null, 320, 35,
                "Pasaport ve bilet için seyahat kılıfı.",
                "Lira, pasaportunuzu, biniş kartınızı ve iki kredi kartını tek bir yerde toplar. RFID korumalıdır.",
                "seyahat,hediye",
                colors: new[] { navy, brown }, daysAgo: 55);

            Add("Rota Seyahat Organizeri", "seyahat-aksesuari", "Velora Travel", "Aksesuar", 1390, null, 430, 42,
                "Kablo ve şarj aleti için bölmeli organizer.",
                "Rota, kablo, şarj başlığı ve kulaklığı ayrı lastik bantlarda tutar. Açıldığında her parçayı aynı anda gösterir.",
                "seyahat,teknoloji",
                colors: new[] { black, forest }, daysAgo: 29);

            Add("Yol Kozmetik Çantası", "seyahat-aksesuari", "Velora Studio", "Aksesuar", 1590, 1290, 480, 38,
                "Su geçirmez astarlı, asılabilir kozmetik çantası.",
                "Yol, banyo kapısına asılabilen bir askı ile gelir. İç astarı silinebilir ve döküntüye karşı korumalıdır.",
                "indirim,seyahat",
                colors: new[] { black, sandColour }, daysAgo: 62);

            // ---------------------------------------------------------------
            // Ofis
            // ---------------------------------------------------------------
            Add("Rota Laptop Kılıfı", "laptop-cantasi", "Velora Office", "Ofis", 1490, null, 460, 44,
                "Keçe astarlı 14 inç laptop kılıfı.",
                "Rota, dizüstü bilgisayarınızı çantanızın içinde korur. Dış yüzey deri, iç astar yumuşak keçedir; fermuar dişleri metale temas etmez.",
                "ofis,gunluk",
                colors: new[] { black, grey }, daysAgo: 35);

            Add("Sedir Laptop Çantası", "laptop-cantasi", "Velora Office", "Ofis", 5490, 4690, 1980, 13,
                "16 inç laptop taşıyan ince yapılı iş çantası.",
                "Sedir, gövdesi ince olmasına rağmen laptop, defter ve şarj aletini birlikte alır. Ön cebi tek hareketle açılır.",
                "indirim,ofis", featured: true,
                colors: new[] { black, brown }, daysAgo: 27);

            Add("Kâtip Evrak Dosyası", "evrak-dosyasi", "Velora Office", "Ofis", 1890, null, 610, 32,
                "A4 belge ve tablet alan ince portföy.",
                "Kâtip, toplantıya yalnızca gerekli olanla girmek isteyenler için. A4 bloknot yuvası, kalem geçidi ve tablet bölmesi vardır.",
                "ofis,hediye",
                colors: new[] { black, brown }, daysAgo: 47);

            Add("Defter Kılıfı Nota", "evrak-dosyasi", "Velora Office", "Ofis", 990, null, 300, 56,
                "A5 defterleri saran, yeniden doldurulabilir kılıf.",
                "Nota, standart A5 defterleri sarar ve defter bittiğinde yenisiyle kullanılmaya devam eder. Kalem geçidi ve kart yuvası bulunur.",
                "ofis,hediye",
                colors: new[] { forest, brown, black }, daysAgo: 68);

            Add("Masa Deri Altlık", "masa-aksesuari", "Velora Office", "Ofis", 2290, null, 720, 24,
                "Tek parça deriden 90x45 cm masa altlığı.",
                "Altlık, tek parça bitkisel tabaklanmış deriden kesilir. Kenarları yedi kat cilalanır ve zamanla masanızın rengini alır.",
                "ofis,premium",
                colors: new[] { brown, black }, daysAgo: 39);

            Add("Kalemlik Çubuk", "masa-aksesuari", "Velora Office", "Ofis", 690, 590, 210, 61,
                "Dikişsiz katlanmış deri kalemlik.",
                "Çubuk, tek parça deriden katlanır ve yapıştırıcı kullanılmadan formunu korur. Masada ses çıkarmaz.",
                "indirim,ofis",
                colors: new[] { tan, forest }, daysAgo: 81);

            Add("Mercek Gözlük Kılıfı", "masa-aksesuari", "Velora Essentials", "Aksesuar", 790, null, 240, 49,
                "Süet astarlı sert gövdeli gözlük kılıfı.",
                "Mercek, çanta içinde ezilmeyen sert bir gövdeye sahiptir. İç astarı süettir ve camı çizmez.",
                "hediye,gunluk",
                colors: new[] { black, cognac }, daysAgo: 93);

            // Sezon dışı: yayında değil, admin tarafında görünür.
            Add("Yaz Hasır Çanta", "kadin-omuz-cantasi", "Velora Studio", "Çanta", 2490, null, 820, 0,
                "Deri saplı, el örgüsü hasır plaj çantası.",
                "Hasır gövde ve deri sap birleşimiyle üretilen yazlık bir çantadır. Sezon dışında yayından kaldırılır.",
                "yaz,sezonluk",
                colors: new[] { sandColour }, daysAgo: 210, published: false);

            Add("Arşiv Postacı Çantası 1994", "erkek-postaci-cantasi", "Velora Heritage", "Çanta", 9800, null, 3600, 2,
                "Kuruluş yılının ilk modelinden sınırlı yeniden üretim.",
                "1994'te üretilen ilk Velora modelinin, orijinal kalıplarından yeniden üretilmiş sınırlı sayıdaki hâlidir. Her parça numaralıdır.",
                "premium,el-yapimi,sinirli",
                colors: new[] { brown }, daysAgo: 16);

            context.CatalogItems.AddRange(products);
            await context.SaveChangesAsync();

            logger.LogInformation("Seeded {Count} Velora products.", products.Count);
        }

        /* ---------------------------------------------------------------- */
        /* Reviews                                                           */
        /* ---------------------------------------------------------------- */

        /// <summary>
        /// Gives the catalogue a review history.
        /// </summary>
        /// <remarks>
        /// Without this every product card renders with an empty rating and the
        /// storefront looks like it launched an hour ago. Ratings are written back
        /// onto the product in the same pass, because RatingAverage and RatingCount
        /// are denormalised columns the list query reads.
        /// </remarks>
        private static async Task SeedReviews(CatalogContext context, ILogger logger)
        {
            if (await context.ProductReviews.AnyAsync()) return;

            var products = await context.CatalogItems.ToListAsync();
            if (products.Count == 0) return;

            var authors = new[]
            {
                "Ayşe K.", "Mehmet T.", "Elif D.", "Burak S.", "Zeynep A.", "Can Ö.",
                "Deniz Y.", "Selin B.", "Emre G.", "Merve U.", "Kerem N.", "Ece P."
            };

            var positive = new[]
            {
                ("Beklediğimden de iyi", "Derinin kalitesi fotoğraflardan anlaşılmıyor, elinize aldığınızda fark ediyorsunuz. Dikişler kusursuz."),
                ("İki aydır kullanıyorum", "Günlük kullanıyorum, hiçbir yerinde açılma yok. Rengi hafif koyulaştı, daha da güzel oldu."),
                ("Hediye olarak aldım", "Kutusu ve paketlemesi çok özenliydi, ayrıca hediye paketi istemeye gerek kalmadı."),
                ("Kargo hızlıydı", "Sipariş verdiğim gün kargoya verildi, ertesi gün elimdeydi. Ürün açıklamayla birebir aynı."),
                ("Boyutu tam istediğim gibi", "Ölçüler açıklamada net yazıyordu, aldığımda sürpriz olmadı. İhtiyacım olan her şeyi alıyor.")
            };

            var mixed = new[]
            {
                ("Güzel ama biraz ağır", "Ürünün kalitesi çok iyi fakat dolduğunda beklediğimden ağır oluyor. Yine de memnunum."),
                ("Rengi ekranda farklı", "Ekranda gördüğümden bir ton daha koyu geldi. Kalitesiyle ilgili bir sorun yok, dört yıldız."),
                ("İyi ürün, fiyatı yüksek", "İşçiliği hak ediyor ama fiyat biraz yüksek geldi. İndirimde alınırsa çok iyi.")
            };

            var reviews = new List<ProductReview>();
            var now = DateTime.UtcNow;

            foreach (var product in products)
            {
                // Newer products naturally have fewer reviews than the archive ones.
                var age = (now - product.CreatedAtUtc).TotalDays;
                var count = age > 60 ? Rng.Next(4, 12) : age > 20 ? Rng.Next(2, 7) : Rng.Next(0, 4);

                for (var i = 0; i < count; i++)
                {
                    // Roughly one review in five is a four-star with a caveat, which
                    // is what a real catalogue looks like. A wall of fives is not.
                    var isMixed = Rng.Next(0, 5) == 0;
                    var (title, comment) = isMixed
                        ? mixed[Rng.Next(mixed.Length)]
                        : positive[Rng.Next(positive.Length)];

                    reviews.Add(new ProductReview
                    {
                        CatalogItemId = product.Id,
                        UserId = Guid.NewGuid(),
                        UserName = authors[Rng.Next(authors.Length)],
                        Rating = isMixed ? Rng.Next(3, 5) : Rng.Next(4, 6),
                        Title = title,
                        Comment = comment,
                        IsApproved = true,
                        CreatedAtUtc = now.AddDays(-Rng.Next(1, Math.Max(2, (int)age)))
                    });
                }
            }

            if (reviews.Count == 0) return;

            context.ProductReviews.AddRange(reviews);

            foreach (var group in reviews.GroupBy(r => r.CatalogItemId))
            {
                var product = products.First(p => p.Id == group.Key);
                product.RatingCount = group.Count();
                product.RatingAverage = Math.Round((decimal)group.Average(r => r.Rating), 2);
            }

            await context.SaveChangesAsync();

            logger.LogInformation("Seeded {Count} product reviews.", reviews.Count);
        }

        /* ---------------------------------------------------------------- */
        /* Merchandising                                                     */
        /* ---------------------------------------------------------------- */

        private static async Task SeedCampaigns(CatalogContext context, Dictionary<string, Category> categories)
        {
            if (await context.Campaigns.AnyAsync()) return;

            var now = DateTime.UtcNow;

            context.Campaigns.AddRange(
                new Campaign
                {
                    Name = "Sonbahar Deri Koleksiyonu",
                    Slug = "sonbahar-deri-koleksiyonu",
                    Description = "Yeni sezon el yapımı deri parçaları keşfedin.",
                    BannerUrl = Photo("campaign-sonbahar", 2000, 1000),
                    ImageUrl = Photo("campaign-sonbahar-kare", 1000, 1000),
                    CtaLabel = "Koleksiyonu Gör",
                    CtaUrl = "/kategori/kadin",
                    DiscountPercentage = 0,
                    Placement = CampaignPlacement.Hero,
                    CategoryId = categories["kadin"].Id,
                    StartsAtUtc = now.AddDays(-7),
                    EndsAtUtc = now.AddMonths(3),
                    DisplayOrder = 1
                },
                new Campaign
                {
                    Name = "Seyahat Serisi",
                    Slug = "seyahat-serisi",
                    Description = "Yolculuğa çıkmadan önce hazır olun.",
                    BannerUrl = Photo("campaign-seyahat", 2000, 1000),
                    ImageUrl = Photo("campaign-seyahat-kare", 1000, 1000),
                    CtaLabel = "Seyahat Ürünleri",
                    CtaUrl = "/kategori/seyahat",
                    DiscountPercentage = 15,
                    Placement = CampaignPlacement.Hero,
                    CategoryId = categories["seyahat"].Id,
                    StartsAtUtc = now.AddDays(-3),
                    EndsAtUtc = now.AddMonths(2),
                    DisplayOrder = 2
                },
                new Campaign
                {
                    Name = "Masanızı Toplayın",
                    Slug = "masanizi-toplayin",
                    Description = "Ofis serisinde deri altlık, dosya ve kılıflar.",
                    BannerUrl = Photo("campaign-ofis", 2000, 1000),
                    ImageUrl = Photo("campaign-ofis-kare", 1000, 1000),
                    CtaLabel = "Ofis Serisi",
                    CtaUrl = "/kategori/ofis",
                    DiscountPercentage = 0,
                    Placement = CampaignPlacement.Hero,
                    CategoryId = categories["ofis"].Id,
                    StartsAtUtc = now.AddDays(-5),
                    EndsAtUtc = now.AddMonths(2),
                    DisplayOrder = 3
                },
                new Campaign
                {
                    Name = "İlk Siparişe Özel",
                    Slug = "ilk-siparise-ozel",
                    Description = "VELORA10 kodu ile ilk siparişinizde %10 indirim.",
                    ImageUrl = Photo("campaign-ilk-siparis", 1200, 800),
                    BannerUrl = Photo("campaign-ilk-siparis-genis", 2000, 700),
                    CtaLabel = "Alışverişe Başla",
                    CtaUrl = "/urunler",
                    DiscountPercentage = 10,
                    Placement = CampaignPlacement.Banner,
                    StartsAtUtc = now.AddDays(-30),
                    EndsAtUtc = now.AddMonths(6),
                    DisplayOrder = 1
                },
                new Campaign
                {
                    Name = "Hediye Rehberi",
                    Slug = "hediye-rehberi",
                    Description = "Sevdikleriniz için özenle seçilmiş küçük deri parçalar.",
                    ImageUrl = Photo("campaign-hediye", 1200, 900),
                    CtaLabel = "Hediyeleri Gör",
                    CtaUrl = "/urunler?tag=hediye",
                    Placement = CampaignPlacement.Collection,
                    CategoryId = categories["aksesuar"].Id,
                    StartsAtUtc = now.AddDays(-10),
                    EndsAtUtc = now.AddMonths(4),
                    DisplayOrder = 2
                },
                new Campaign
                {
                    Name = "Arşiv Koleksiyonu",
                    Slug = "arsiv-koleksiyonu",
                    Description = "1994 kalıplarından sınırlı sayıda yeniden üretim.",
                    ImageUrl = Photo("campaign-arsiv", 1200, 900),
                    CtaLabel = "Arşivi Keşfet",
                    CtaUrl = "/urunler?tag=sinirli",
                    Placement = CampaignPlacement.Collection,
                    StartsAtUtc = now.AddDays(-16),
                    EndsAtUtc = now.AddMonths(5),
                    DisplayOrder = 3
                });

            await context.SaveChangesAsync();
        }

        private static async Task SeedCoupons(CatalogContext context)
        {
            if (await context.Coupons.AnyAsync()) return;

            var now = DateTime.UtcNow;

            context.Coupons.AddRange(
                new Coupon
                {
                    Code = "VELORA10",
                    Description = "İlk siparişe özel %10 indirim",
                    DiscountType = DiscountType.Percentage,
                    DiscountValue = 10,
                    MinimumOrderAmount = 1000,
                    MaxDiscountAmount = 1500,
                    UsageLimit = 1000,
                    PerUserLimit = 1,
                    StartsAtUtc = now.AddDays(-30),
                    EndsAtUtc = now.AddMonths(6)
                },
                new Coupon
                {
                    Code = "SEYAHAT15",
                    Description = "Seyahat serisinde %15 indirim",
                    DiscountType = DiscountType.Percentage,
                    DiscountValue = 15,
                    MinimumOrderAmount = 3000,
                    MaxDiscountAmount = 2500,
                    StartsAtUtc = now.AddDays(-3),
                    EndsAtUtc = now.AddMonths(2)
                },
                new Coupon
                {
                    // The minimum here has to match COMMERCE.freeShippingThreshold
                    // in the frontend, or the basket promises a threshold the
                    // coupon will not honour.
                    Code = "KARGO",
                    Description = "Ücretsiz kargo",
                    DiscountType = DiscountType.FreeShipping,
                    DiscountValue = 0,
                    MinimumOrderAmount = 500,
                    StartsAtUtc = now.AddDays(-60),
                    EndsAtUtc = now.AddYears(1)
                },
                new Coupon
                {
                    Code = "HOSGELDIN250",
                    Description = "2500 TL üzeri alışverişe 250 TL indirim",
                    DiscountType = DiscountType.FixedAmount,
                    DiscountValue = 250,
                    MinimumOrderAmount = 2500,
                    UsageLimit = 500,
                    StartsAtUtc = now.AddDays(-15),
                    EndsAtUtc = now.AddMonths(3)
                },
                new Coupon
                {
                    Code = "OFIS20",
                    Description = "Ofis serisinde %20 indirim",
                    DiscountType = DiscountType.Percentage,
                    DiscountValue = 20,
                    MinimumOrderAmount = 1500,
                    MaxDiscountAmount = 2000,
                    UsageLimit = 300,
                    StartsAtUtc = now.AddDays(-5),
                    EndsAtUtc = now.AddMonths(2)
                });

            await context.SaveChangesAsync();
        }

        /// <summary>Gives any pre-existing row a slug so storefront URLs never break.</summary>
        private static async Task BackfillSlugs(CatalogContext context, ILogger logger)
        {
            var products = await context.CatalogItems
                .Where(p => p.Slug == null || p.Slug == string.Empty)
                .ToListAsync();

            if (products.Count == 0) return;

            var taken = (await context.CatalogItems.Select(p => p.Slug).ToListAsync())
                .Where(s => !string.IsNullOrEmpty(s))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var product in products)
            {
                product.Slug = Slug.Unique(product.Name, candidate => taken.Contains(candidate), $"urun-{product.Id}");
                taken.Add(product.Slug);
            }

            await context.SaveChangesAsync();
            logger.LogInformation("Backfilled slugs for {Count} legacy products.", products.Count);
        }
    }
}
