using CatalogService.Api.Core.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Polly;
using System;
using System.Collections.Generic;
using Microsoft.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;

namespace CatalogService.Api.Infrastructure.Context
{
    public class CatalogContextSeed
    {
        public async Task SeedAsync(CatalogContext context, IWebHostEnvironment env, ILogger<CatalogContextSeed> logger)
        {
            var policy = Policy.Handle<SqlException>().
                WaitAndRetryAsync(
                    retryCount: 3,
                    sleepDurationProvider: retry => TimeSpan.FromSeconds(5),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        logger.LogWarning(exception, "[{prefix}] Exception {ExceptionType} with message {Message} detected on attempt {retry} of {retries}", nameof(CatalogContextSeed), exception.GetType().Name, exception.Message, retry, 3);
                    }
                );

            var setupDirPath = Path.Combine(env.ContentRootPath, "Infrastructure", "Setup", "SeedFiles");
            // Kodun "pics" klasörünü projenin ana dizininde (root) arayacağını belirtiyoruz
            var picturePath = Path.Combine(env.ContentRootPath, "pics");

            await policy.ExecuteAsync(() => ProcessSeeding(context, setupDirPath, picturePath, logger));
        }

        private async Task ProcessSeeding(CatalogContext context, string setupDirPath, string picturePath, ILogger logger)
        {
            if (!context.CatalogBrands.Any())
            {
                await context.CatalogBrands.AddRangeAsync(GetCatalogBrandsFromFile(setupDirPath));
                await context.SaveChangesAsync();
            }

            if (!context.CatalogTypes.Any())
            {
                await context.CatalogTypes.AddRangeAsync(GetCatalogTypesFromFile(setupDirPath));
                await context.SaveChangesAsync();
            }

            if (!context.CatalogItems.Any())
            {
                await context.CatalogItems.AddRangeAsync(GetCatalogItemsFromFile(setupDirPath, context));
                await context.SaveChangesAsync();
            }

            GetCatalogItemPictures(setupDirPath, picturePath);
        }

        private IEnumerable<CatalogBrand> GetCatalogBrandsFromFile(string contentPath)
        {
            string fileName = Path.Combine(contentPath, "BrandsTextFile.txt");
            if (!File.Exists(fileName)) return GetPreconfiguredCatalogBrands();

            var fileContent = File.ReadAllLines(fileName);
            return fileContent.Select(i => new CatalogBrand { Brand = i.Trim('"') });
        }

        private IEnumerable<CatalogType> GetCatalogTypesFromFile(string contentPath)
        {
            string fileName = Path.Combine(contentPath, "CatalogTypes.txt");
            if (!File.Exists(fileName)) return GetPreconfiguredCatalogTypes();

            var fileContent = File.ReadAllLines(fileName);
            return fileContent.Select(i => new CatalogType { Type = i.Trim('"') });
        }

        private IEnumerable<CatalogItem> GetCatalogItemsFromFile(string contentPath, CatalogContext context)
        {
            string fileName = Path.Combine(contentPath, "CatalogItems.txt");
            if (!File.Exists(fileName)) return GetPreconfiguredItems();

            var catalogTypeIdLookup = context.CatalogTypes.ToDictionary(ct => ct.Type, ct => ct.Id);
            var catalogBrandIdLookup = context.CatalogBrands.ToDictionary(ct => ct.Brand, ct => ct.Id);

            return File.ReadAllLines(fileName).Skip(1).Select(i => i.Split(',')).Select(i => new CatalogItem
            {
                CatalogTypeId = catalogTypeIdLookup[i[0]],
                CatalogBrandId = catalogBrandIdLookup[i[1]],
                Description = i[2].Trim('"').Trim(),
                Name = i[3].Trim('"').Trim(),
                Price = Decimal.Parse(i[4].Trim('"').Trim(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture),
                PictureFileName = i[5].Trim('"').Trim(),
                AvailableStock = string.IsNullOrEmpty(i[6]) ? 0 : int.Parse(i[6]),
                OnReorder = Convert.ToBoolean(i[7])
            });
        }

        private void GetCatalogItemPictures(string contentPath, string picturePath)
        {
            // 1. Klasör yoksa oluştur
            if (!Directory.Exists(picturePath))
            {
                Directory.CreateDirectory(picturePath);
            }

            // 2. Klasör içini temizle
            DirectoryInfo directory = new DirectoryInfo(picturePath);
            foreach (FileInfo file in directory.GetFiles())
            {
                file.Delete();
            }

            // 3. ZIP'i çıkart
            string zipFileCatalogItemPictures = Path.Combine(contentPath, "CatalogItems.zip");
            if (File.Exists(zipFileCatalogItemPictures))
            {
                ZipFile.ExtractToDirectory(zipFileCatalogItemPictures, picturePath, overwriteFiles: true);
            }
        }

        // --- Yardımcı Metotlar ---
        private IEnumerable<CatalogBrand> GetPreconfiguredCatalogBrands() => new List<CatalogBrand> { new CatalogBrand { Brand = "Azure" }, new CatalogBrand { Brand = ".NET" } };
        private IEnumerable<CatalogType> GetPreconfiguredCatalogTypes() => new List<CatalogType> { new CatalogType { Type = "Mug" }, new CatalogType { Type = "T-Shirt" } };
        private IEnumerable<CatalogItem> GetPreconfiguredItems() => new List<CatalogItem> { new CatalogItem { Name = ".NET Bot Black Hoodie", Price = 19.5M, PictureFileName = "1.png" } };
    }
}