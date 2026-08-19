using CatalogService.Api.Core.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Polly;
using Velora.Shared.Text;

namespace CatalogService.Api.Infrastructure.Context
{
    /// <summary>
    /// Seeds the Velora demo catalogue: category tree, house brands, products with
    /// galleries and variants, campaigns and coupons. Idempotent - each block only
    /// runs when its table is still empty, so restarting never duplicates data.
    /// </summary>
    public class CatalogContextSeed
    {
        /// <summary>
        /// Deterministic placeholder photography. Replace with real asset URLs (or upload
        /// through the admin media endpoint) before going live.
        /// </summary>
        private static string Photo(string seed, int width = 1200, int height = 1500)
            => $"https://picsum.photos/seed/velora-{seed}/{width}/{height}";

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
            await SeedCampaigns(context, categories);
            await SeedCoupons(context);
            await BackfillSlugs(context, logger);
        }

        private static async Task<Dictionary<string, CatalogBrand>> SeedBrands(CatalogContext context)
        {
            if (await context.CatalogBrands.AnyAsync())
                return await context.CatalogBrands.ToDictionaryAsync(b => b.Brand);

            var brands = new[]
            {
                new CatalogBrand { Brand = "Velora Atelier", Description = "El yapımı deri koleksiyonu", IsFeatured = true, DisplayOrder = 1 },
                new CatalogBrand { Brand = "Velora Signature", Description = "İkonik Velora silüetleri", IsFeatured = true, DisplayOrder = 2 },
                new CatalogBrand { Brand = "Velora Studio", Description = "Günlük kullanım için modern tasarımlar", IsFeatured = true, DisplayOrder = 3 },
                new CatalogBrand { Brand = "Velora Travel", Description = "Seyahat ve yolculuk serisi", DisplayOrder = 4 },
                new CatalogBrand { Brand = "Velora Essentials", Description = "Zamansız temel parçalar", DisplayOrder = 5 }
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

            var types = new[] { "Çanta", "Cüzdan", "Kartlık", "Kemer", "Ayakkabı", "Seyahat", "Aksesuar" }
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
                new Category { Name = "Kadın", Slug = "kadin", DisplayOrder = 1, IsFeatured = true, ImageUrl = Photo("cat-kadin", 900, 1100), Description = "Kadın deri çanta, cüzdan ve aksesuar koleksiyonu" },
                new Category { Name = "Erkek", Slug = "erkek", DisplayOrder = 2, IsFeatured = true, ImageUrl = Photo("cat-erkek", 900, 1100), Description = "Erkek deri çanta, cüzdan ve kemer koleksiyonu" },
                new Category { Name = "Aksesuar", Slug = "aksesuar", DisplayOrder = 3, IsFeatured = true, ImageUrl = Photo("cat-aksesuar", 900, 1100), Description = "Kartlık, anahtarlık ve küçük deri aksesuarlar" },
                new Category { Name = "Seyahat", Slug = "seyahat", DisplayOrder = 4, IsFeatured = true, ImageUrl = Photo("cat-seyahat", 900, 1100), Description = "Seyahat çantaları ve yol arkadaşları" }
            };

            context.Categories.AddRange(roots);
            await context.SaveChangesAsync();

            var byRoot = roots.ToDictionary(c => c.Slug);

            var children = new[]
            {
                new Category { Name = "Omuz Çantası", Slug = "kadin-omuz-cantasi", ParentId = byRoot["kadin"].Id, DisplayOrder = 1 },
                new Category { Name = "El Çantası", Slug = "kadin-el-cantasi", ParentId = byRoot["kadin"].Id, DisplayOrder = 2 },
                new Category { Name = "Cüzdan", Slug = "kadin-cuzdan", ParentId = byRoot["kadin"].Id, DisplayOrder = 3 },
                new Category { Name = "Evrak Çantası", Slug = "erkek-evrak-cantasi", ParentId = byRoot["erkek"].Id, DisplayOrder = 1 },
                new Category { Name = "Sırt Çantası", Slug = "erkek-sirt-cantasi", ParentId = byRoot["erkek"].Id, DisplayOrder = 2 },
                new Category { Name = "Cüzdan", Slug = "erkek-cuzdan", ParentId = byRoot["erkek"].Id, DisplayOrder = 3 },
                new Category { Name = "Kemer", Slug = "erkek-kemer", ParentId = byRoot["erkek"].Id, DisplayOrder = 4 },
                new Category { Name = "Kartlık", Slug = "kartlik", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 1 },
                new Category { Name = "Anahtarlık", Slug = "anahtarlik", ParentId = byRoot["aksesuar"].Id, DisplayOrder = 2 },
                new Category { Name = "Valiz", Slug = "valiz", ParentId = byRoot["seyahat"].Id, DisplayOrder = 1 },
                new Category { Name = "Weekender", Slug = "weekender", ParentId = byRoot["seyahat"].Id, DisplayOrder = 2 }
            };

            context.Categories.AddRange(children);
            await context.SaveChangesAsync();

            return await context.Categories.ToDictionaryAsync(c => c.Slug);
        }

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
                int daysAgo = 0)
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
                    IsPublished = true,
                    IsFeatured = featured,
                    MetaTitle = $"{name} | Velora",
                    MetaDescription = shortDescription,
                    Tags = tags,
                    PictureFileName = string.Empty,
                    PictureUri = Photo(slug),
                    CreatedAtUtc = now.AddDays(-daysAgo),
                    SoldCount = Random.Shared.Next(4, 180),
                    ViewCount = Random.Shared.Next(50, 4000)
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

                colors ??= new[] { ("Siyah", "#12100E"), ("Taba", "#8B5A2B") };
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
                                Stock = Random.Shared.Next(0, 25),
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
                            Stock = Random.Shared.Next(2, 30),
                            DisplayOrder = order++
                        });
                    }
                }

                products.Add(product);
            }

            // --- Kadın ---
            Add("Aurora Omuz Çantası", "kadin-omuz-cantasi", "Velora Atelier", "Çanta", 4890, 3990, 1850, 24,
                "Yumuşak dana derisinden el yapımı omuz çantası.",
                "Aurora, günlük kullanım ile özel günler arasındaki çizgiyi silen bir omuz çantası. Tam tabaklanmış dana derisinden üretilir, iç astarı pamuk kanvastır. Ayarlanabilir omuz askısı ve mıknatıslı kapama detayı ile günün her saatine uyum sağlar.",
                "yeni,cok-satan,deri", featured: true,
                colors: new[] { ("Siyah", "#12100E"), ("Kum", "#D8C3A5"), ("Bordo", "#5C1F2B") }, daysAgo: 3);

            Add("Lumen El Çantası", "kadin-el-cantasi", "Velora Signature", "Çanta", 6250, null, 2400, 12,
                "Mimari formlu, yapılandırılmış el çantası.",
                "Lumen'in keskin hatları, Velora'nın imza silüetini tanımlar. Sert yapılı gövdesi formunu yıllarca korur; altın rengi metal aksesuarları elde parlatılmıştır.",
                "premium,el-yapimi", featured: true,
                colors: new[] { ("Siyah", "#12100E"), ("Fildişi", "#EFE7DA") }, daysAgo: 8);

            Add("Sera Mini Çanta", "kadin-omuz-cantasi", "Velora Studio", "Çanta", 2790, 2290, 980, 40,
                "Zincir askılı kompakt akşam çantası.",
                "Sera, akşam davetleri için tasarlanmış kompakt bir çantadır. Çıkarılabilir zincir askısı sayesinde clutch olarak da kullanılabilir.",
                "indirim,yeni",
                colors: new[] { ("Siyah", "#12100E"), ("Gümüş", "#C8CCD0"), ("Bordo", "#5C1F2B") }, daysAgo: 2);

            Add("Mira Deri Cüzdan", "kadin-cuzdan", "Velora Essentials", "Cüzdan", 1590, null, 520, 60,
                "On iki kart bölmeli fermuarlı cüzdan.",
                "Mira, günlük taşımanın tüm ihtiyacını karşılayan ince bir cüzdandır. RFID korumalı kart bölmeleri ve ayrı bozuk para gözü bulunur.",
                "cok-satan",
                colors: new[] { ("Siyah", "#12100E"), ("Taba", "#8B5A2B"), ("Yeşil", "#243D30") }, daysAgo: 30);

            Add("Nova Tote", "kadin-omuz-cantasi", "Velora Studio", "Çanta", 3890, null, 1350, 18,
                "15 inç dizüstü bilgisayar alan geniş tote.",
                "Nova, iş ve şehir hayatı için tasarlanmış geniş bir tote çantadır. Yumuşak deri gövde, laptop bölmesi ve iç organizasyon cepleri içerir.",
                "cok-satan,ofis", featured: true,
                colors: new[] { ("Siyah", "#12100E"), ("Kum", "#D8C3A5") }, daysAgo: 45);

            Add("Iris Bucket Çanta", "kadin-omuz-cantasi", "Velora Atelier", "Çanta", 4290, 3490, 1600, 9,
                "Büzgülü kapamalı yumuşak bucket çanta.",
                "Iris'in yumuşak gövdesi kullandıkça size uyum sağlar. Büzgülü ip kapama ve iç astar cebi ile pratik bir günlük seçenektir.",
                "indirim,deri",
                colors: new[] { ("Taba", "#8B5A2B"), ("Siyah", "#12100E") }, daysAgo: 60);

            // --- Erkek ---
            Add("Atlas Evrak Çantası", "erkek-evrak-cantasi", "Velora Signature", "Çanta", 7450, 6290, 2900, 8,
                "Tam tabaklanmış deriden profesyonel evrak çantası.",
                "Atlas, toplantıdan toplantıya geçen günler için tasarlandı. 16 inç laptop bölmesi, ayrı belge gözü ve gizli fermuarlı arka cebi vardır.",
                "premium,ofis,cok-satan", featured: true,
                colors: new[] { ("Kahve", "#4A2C1A"), ("Siyah", "#12100E") }, daysAgo: 15);

            Add("Orion Sırt Çantası", "erkek-sirt-cantasi", "Velora Studio", "Çanta", 4990, null, 1750, 26,
                "Deri ve teknik kumaş birleşimli sırt çantası.",
                "Orion, şehir içi kullanım ve kısa seyahatler için üretildi. Su itici teknik kumaş gövdesi deri detaylarla birleşir; sırt kısmı havalandırmalıdır.",
                "yeni,gunluk", featured: true,
                colors: new[] { ("Siyah", "#12100E"), ("Haki", "#3F4A3C") }, daysAgo: 5);

            Add("Kaan Deri Cüzdan", "erkek-cuzdan", "Velora Essentials", "Cüzdan", 1290, 990, 380, 85,
                "İnce yapılı, sekiz kart bölmeli cüzdan.",
                "Kaan, cebi şişirmeyen ince yapısı ile günlük kullanım için idealdir. RFID korumalıdır.",
                "indirim,cok-satan",
                colors: new[] { ("Siyah", "#12100E"), ("Kahve", "#4A2C1A") }, daysAgo: 90);

            Add("Vera Deri Kemer", "erkek-kemer", "Velora Essentials", "Kemer", 1190, null, 340, 54,
                "Tokası değiştirilebilir tam deri kemer.",
                "Vera, klasik takım elbise ile de günlük pantolon ile de kullanılabilen 3,5 cm genişliğinde bir kemerdir.",
                "gunluk",
                colors: new[] { ("Siyah", "#12100E"), ("Kahve", "#4A2C1A") },
                sizes: new[] { "90", "95", "100", "105", "110" }, daysAgo: 120);

            Add("Hektor Postacı Çantası", "erkek-evrak-cantasi", "Velora Atelier", "Çanta", 5290, null, 1950, 4,
                "Çapraz askılı klasik postacı çantası.",
                "Hektor, el yapımı dikişleri ve solid pirinç aksesuarları ile yıllara meydan okuyan bir tasarımdır.",
                "el-yapimi,premium",
                colors: new[] { ("Kahve", "#4A2C1A") }, daysAgo: 40);

            // --- Aksesuar ---
            Add("Piko Kartlık", "kartlik", "Velora Essentials", "Kartlık", 690, null, 180, 120,
                "Dört bölmeli minimal deri kartlık.",
                "Piko, sadece gerekli olanı taşımak isteyenler için. Tek parça deriden üretilir ve zamanla eşsiz bir patina kazanır.",
                "cok-satan,hediye",
                colors: new[] { ("Siyah", "#12100E"), ("Taba", "#8B5A2B"), ("Yeşil", "#243D30"), ("Bordo", "#5C1F2B") }, daysAgo: 75);

            Add("Nod Anahtarlık", "anahtarlik", "Velora Essentials", "Aksesuar", 390, 290, 95, 200,
                "Solid pirinç halkalı deri anahtarlık.",
                "Nod, küçük ama iyi düşünülmüş bir hediye. Deri gövde ve pirinç halka.",
                "indirim,hediye",
                colors: new[] { ("Siyah", "#12100E"), ("Taba", "#8B5A2B") }, daysAgo: 100);

            Add("Lira Pasaportluk", "kartlik", "Velora Travel", "Aksesuar", 1090, null, 320, 35,
                "Pasaport ve bilet için seyahat kılıfı.",
                "Lira, pasaportunuzu, biniş kartınızı ve iki kredi kartını tek bir yerde toplar.",
                "seyahat,hediye",
                colors: new[] { ("Lacivert", "#1D2B44"), ("Kahve", "#4A2C1A") }, daysAgo: 55);

            // --- Seyahat ---
            Add("Meridian Weekender", "weekender", "Velora Travel", "Seyahat", 8900, 7490, 3400, 6,
                "Hafta sonu kaçamakları için deri seyahat çantası.",
                "Meridian, iki günlük bir yolculuğun tüm ihtiyacını alır. Ayakkabı bölmesi, çıkarılabilir omuz askısı ve valiz kayışı geçidi vardır.",
                "premium,seyahat,cok-satan", featured: true,
                colors: new[] { ("Kahve", "#4A2C1A"), ("Siyah", "#12100E") }, daysAgo: 20);

            Add("Kompas Kabin Valizi", "valiz", "Velora Travel", "Seyahat", 6490, null, 2450, 15,
                "Alüminyum çerçeveli kabin boyu valiz.",
                "Kompas, kabin ölçülerine uygun sert kabuklu bir valizdir. TSA kilidi ve 360 derece dönen tekerlekleri bulunur.",
                "yeni,seyahat",
                colors: new[] { ("Antrasit", "#2E3134"), ("Şampanya", "#C6B79B") }, daysAgo: 10);

            Add("Rota Laptop Kılıfı", "seyahat", "Velora Studio", "Aksesuar", 1490, null, 460, 44,
                "Keçe astarlı 14 inç laptop kılıfı.",
                "Rota, dizüstü bilgisayarınızı çantanızın içinde korur. Dış yüzey deri, iç astar yumuşak keçedir.",
                "ofis,gunluk",
                colors: new[] { ("Siyah", "#12100E"), ("Gri", "#6E7276") }, daysAgo: 35);

            context.CatalogItems.AddRange(products);
            await context.SaveChangesAsync();

            logger.LogInformation("Seeded {Count} Velora products.", products.Count);
        }

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
