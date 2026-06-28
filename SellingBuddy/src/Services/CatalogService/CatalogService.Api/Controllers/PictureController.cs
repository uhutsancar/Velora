using CatalogService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;
using System.Threading.Tasks;

namespace CatalogService.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PicController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly CatalogContext _catalogContext;

        public PicController(IWebHostEnvironment env, CatalogContext catalogContext)
        {
            _env = env;
            _catalogContext = catalogContext;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            return Ok("App and Running");
        }

        [HttpGet]
        [Route("api/v1/catalog/items/{catalogItemId:int}/pic")]
        [ProducesResponseType((int)System.Net.HttpStatusCode.NotFound)]
        [ProducesResponseType((int)System.Net.HttpStatusCode.BadRequest)]
        // GET: /<controller>/
        public async Task<ActionResult> GetImageAsync(int catalogItemId)
        {
            if (catalogItemId <= 0)
            {
                return BadRequest();
            }

            var item = await _catalogContext.CatalogItems
                .SingleOrDefaultAsync(ci => ci.Id == catalogItemId);

            if (item != null)
            {
                // KANKA DİKKAT: Videodaki adam WebRootPath (wwwroot) kullanmış.
                // Biz seninle Pics klasörünü ana dizine kurduğumuz için ContentRootPath kullanıyoruz ki resimleri bulabilsin.
                var webRoot = _env.ContentRootPath;
                var path = Path.Combine(webRoot, "Pics", item.PictureFileName);

                string imageFileExtension = Path.GetExtension(item.PictureFileName);
                string mimetype = GetImageMimeTypeFromImageFileExtension(imageFileExtension);

                // Resmi fiziksel klasörden byte olarak okuyoruz
                var buffer = await System.IO.File.ReadAllBytesAsync(path);

                return File(buffer, mimetype);
            }

            return NotFound();
        }

 
        private string GetImageMimeTypeFromImageFileExtension(string extension)
        {
            string mimetype;

            switch (extension.ToLower())
            {
                case ".png":
                    mimetype = "image/png";
                    break;
                case ".gif":
                    mimetype = "image/gif";
                    break;
                case ".jpg":
                case ".jpeg":
                    mimetype = "image/jpeg";
                    break;
                case ".bmp":
                    mimetype = "image/bmp";
                    break;
                case ".tiff":
                    mimetype = "image/tiff";
                    break;
                case ".wmf":
                    mimetype = "image/wmf";
                    break;
                case ".jp2":
                    mimetype = "image/jp2";
                    break;
                case ".svg":
                    mimetype = "image/svg+xml";
                    break;
                default:
                    mimetype = "application/octet-stream";
                    break;
            }

            return mimetype;
        }
    }
}