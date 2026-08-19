using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Velora.Shared.Middleware;
using Velora.Shared.Security;
using Velora.Shared.Text;

namespace CatalogService.Api.Controllers.Admin
{
    public class UploadedMediaDto
    {
        public string Url { get; set; } = default!;
        public string FileName { get; set; } = default!;
        public long Size { get; set; }
    }

    /// <summary>
    /// Image upload for the admin product editor. Files land in wwwroot/media and are
    /// served as static content, so the storefront can reference them directly.
    /// </summary>
    [Route("api/admin/media")]
    [ApiController]
    [Authorize(Policy = VeloraPolicies.ProductsWrite)]
    public class MediaController : ControllerBase
    {
        private const long MaxFileSizeBytes = 5 * 1024 * 1024;

        /// <summary>Allow-list by extension AND content type: never trust one alone.</summary>
        private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = "image/jpeg",
            [".jpeg"] = "image/jpeg",
            [".png"] = "image/png",
            [".webp"] = "image/webp",
            [".avif"] = "image/avif",
            [".gif"] = "image/gif"
        };

        private readonly IWebHostEnvironment environment;
        private readonly ILogger<MediaController> logger;

        public MediaController(IWebHostEnvironment environment, ILogger<MediaController> logger)
        {
            this.environment = environment;
            this.logger = logger;
        }

        [HttpPost]
        [RequestSizeLimit(MaxFileSizeBytes)]
        public async Task<ActionResult<IReadOnlyCollection<UploadedMediaDto>>> Upload(
            [FromForm] IFormFileCollection files,
            CancellationToken ct)
        {
            if (files is null || files.Count == 0)
                throw new ApiException("En az bir dosya seçin.", 400, "no_files");

            if (files.Count > 10)
                throw new ApiException("Tek seferde en fazla 10 görsel yüklenebilir.", 400, "too_many_files");

            var mediaRoot = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "media");
            Directory.CreateDirectory(mediaRoot);

            var uploaded = new List<UploadedMediaDto>();

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                if (file.Length > MaxFileSizeBytes)
                    throw new ApiException($"{file.FileName} 5 MB sınırını aşıyor.", 400, "file_too_large");

                var extension = Path.GetExtension(file.FileName);

                if (!AllowedTypes.TryGetValue(extension, out var expectedContentType) ||
                    !string.Equals(file.ContentType, expectedContentType, StringComparison.OrdinalIgnoreCase))
                {
                    throw new ApiException($"{file.FileName} desteklenmeyen bir görsel türü.", 400, "unsupported_media_type");
                }

                // Generated name only: the client filename never reaches the file system.
                var safeName = $"{Slug.From(Path.GetFileNameWithoutExtension(file.FileName))}-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
                var absolutePath = Path.Combine(mediaRoot, safeName);

                await using (var stream = System.IO.File.Create(absolutePath))
                {
                    await file.CopyToAsync(stream, ct);
                }

                uploaded.Add(new UploadedMediaDto
                {
                    Url = $"/media/{safeName}",
                    FileName = safeName,
                    Size = file.Length
                });
            }

            logger.LogInformation("{Count} media files uploaded by {User}.", uploaded.Count, User.Identity?.Name);

            return uploaded;
        }

        [HttpDelete("{fileName}")]
        public IActionResult Delete(string fileName)
        {
            // Reject anything that is not a plain file name (path traversal guard).
            if (fileName.Contains('/') || fileName.Contains('\\') || fileName.Contains(".."))
                throw new ApiException("Geçersiz dosya adı.", 400, "invalid_file_name");

            var mediaRoot = Path.Combine(environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot"), "media");
            var absolutePath = Path.Combine(mediaRoot, fileName);

            if (!System.IO.File.Exists(absolutePath)) return NotFound();

            System.IO.File.Delete(absolutePath);

            return NoContent();
        }
    }
}
