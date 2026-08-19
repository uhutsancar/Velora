using IdentityService.Api.Application.Models;
using IdentityService.Api.Application.Services;
using IdentityService.Api.Core.Domain;
using IdentityService.Api.Infrastructure.Context;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Velora.Shared.Security;

namespace IdentityService.Api.Controllers
{
    /// <summary>Customer address book. Every action is scoped to the caller.</summary>
    [Route("api/addresses")]
    [ApiController]
    [Authorize]
    public class AddressesController : ControllerBase
    {
        private readonly IdentityDbContext db;

        public AddressesController(IdentityDbContext db)
        {
            this.db = db;
        }

        [HttpGet]
        public async Task<IReadOnlyCollection<AddressModel>> List(CancellationToken ct)
        {
            var userId = User.GetUserId();

            var rows = await db.UserAddresses
                .AsNoTracking()
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault).ThenByDescending(a => a.CreatedAtUtc)
                .ToListAsync(ct);

            return rows.Select(Map).ToList();
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<AddressModel>> GetById(Guid id, CancellationToken ct)
        {
            var userId = User.GetUserId();

            var address = await db.UserAddresses.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);

            return address is null ? NotFound() : Map(address);
        }

        [HttpPost]
        public async Task<ActionResult<AddressModel>> Create([FromBody] AddressRequestModel model, CancellationToken ct)
        {
            var userId = User.GetUserId();

            var address = new UserAddress
            {
                UserId = userId,
                Title = model.Title.Trim(),
                FirstName = model.FirstName.Trim(),
                LastName = model.LastName.Trim(),
                Phone = model.Phone.Trim(),
                Street = model.Street.Trim(),
                City = model.City.Trim(),
                State = model.State.Trim(),
                Country = model.Country.Trim(),
                ZipCode = model.ZipCode.Trim(),
                IsDefault = model.IsDefault
            };

            // First address is always the default one.
            var hasAny = await db.UserAddresses.AnyAsync(a => a.UserId == userId, ct);
            if (!hasAny) address.IsDefault = true;

            if (address.IsDefault) await ClearDefaults(userId, ct);

            db.UserAddresses.Add(address);
            await db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = address.Id }, Map(address));
        }

        [HttpPut("{id:guid}")]
        public async Task<ActionResult<AddressModel>> Update(Guid id, [FromBody] AddressRequestModel model, CancellationToken ct)
        {
            var userId = User.GetUserId();

            var address = await db.UserAddresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
            if (address is null) return NotFound();

            address.Title = model.Title.Trim();
            address.FirstName = model.FirstName.Trim();
            address.LastName = model.LastName.Trim();
            address.Phone = model.Phone.Trim();
            address.Street = model.Street.Trim();
            address.City = model.City.Trim();
            address.State = model.State.Trim();
            address.Country = model.Country.Trim();
            address.ZipCode = model.ZipCode.Trim();

            if (model.IsDefault && !address.IsDefault)
            {
                await ClearDefaults(userId, ct);
                address.IsDefault = true;
            }

            await db.SaveChangesAsync(ct);

            return Map(address);
        }

        [HttpPut("{id:guid}/default")]
        public async Task<IActionResult> SetDefault(Guid id, CancellationToken ct)
        {
            var userId = User.GetUserId();

            var address = await db.UserAddresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
            if (address is null) return NotFound();

            await ClearDefaults(userId, ct);
            address.IsDefault = true;
            await db.SaveChangesAsync(ct);

            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        {
            var userId = User.GetUserId();

            var address = await db.UserAddresses.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId, ct);
            if (address is null) return NotFound();

            db.UserAddresses.Remove(address);
            await db.SaveChangesAsync(ct);

            // Promote another address so the account never ends up without a default.
            if (address.IsDefault)
            {
                var next = await db.UserAddresses
                    .Where(a => a.UserId == userId)
                    .OrderByDescending(a => a.CreatedAtUtc)
                    .FirstOrDefaultAsync(ct);

                if (next is not null)
                {
                    next.IsDefault = true;
                    await db.SaveChangesAsync(ct);
                }
            }

            return NoContent();
        }

        private Task ClearDefaults(Guid userId, CancellationToken ct) =>
            db.UserAddresses
                .Where(a => a.UserId == userId && a.IsDefault)
                .ExecuteUpdateAsync(s => s.SetProperty(a => a.IsDefault, false), ct);

        private static AddressModel Map(UserAddress a) => new()
        {
            Id = a.Id,
            Title = a.Title,
            FirstName = a.FirstName,
            LastName = a.LastName,
            Phone = a.Phone,
            Street = a.Street,
            City = a.City,
            State = a.State,
            Country = a.Country,
            ZipCode = a.ZipCode,
            IsDefault = a.IsDefault
        };
    }
}
