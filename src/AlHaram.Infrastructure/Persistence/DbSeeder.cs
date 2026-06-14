using AlHaram.Domain.Constants;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AlHaram.Infrastructure.Persistence;

public static class DbSeeder
{
    public const string DefaultAdminUserName = "admin";
    public const string DefaultAdminPassword = "Admin@123";

    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var sp = scope.ServiceProvider;

        var db = sp.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var roleManager = sp.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = sp.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var role in AppRoles.All)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new ApplicationRole(role));
        }

        if (await userManager.FindByNameAsync(DefaultAdminUserName) is null)
        {
            var admin = new ApplicationUser
            {
                UserName = DefaultAdminUserName,
                FullName = "Administrator",
                Email = "admin@alharam.local",
                EmailConfirmed = true,
                IsActive = true
            };
            var result = await userManager.CreateAsync(admin, DefaultAdminPassword);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(admin, AppRoles.Owner);
        }

        if (!await db.Companies.AnyAsync())
        {
            db.Companies.Add(new Company
            {
                Name = "Al-Haram Steel",
                Currency = "PKR",
                DefaultTaxRate = 0m
            });
        }

        if (!await db.Godowns.AnyAsync())
        {
            db.Godowns.Add(new Godown
            {
                Name = "Main Godown",
                Code = "MAIN",
                IsActive = true,
                IsDefault = true
            });
        }

        await db.SaveChangesAsync();
    }
}
