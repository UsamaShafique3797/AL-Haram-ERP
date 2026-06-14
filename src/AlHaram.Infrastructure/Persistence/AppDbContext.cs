using AlHaram.Domain.Common;
using AlHaram.Domain.Entities;
using AlHaram.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Godown> Godowns => Set<Godown>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<ItemUnit> ItemUnits => Set<ItemUnit>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<StockItem> StockItems => Set<StockItem>();
    public DbSet<StockMovement> StockMovements => Set<StockMovement>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();
    public DbSet<StockAdjustmentLine> StockAdjustmentLines => Set<StockAdjustmentLine>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Friendlier Identity table names
        builder.Entity<ApplicationUser>().ToTable("Users");
        builder.Entity<ApplicationRole>().ToTable("Roles");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserRole<Guid>>().ToTable("UserRoles");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserClaim<Guid>>().ToTable("UserClaims");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserLogin<Guid>>().ToTable("UserLogins");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        builder.Entity<Microsoft.AspNetCore.Identity.IdentityUserToken<Guid>>().ToTable("UserTokens");

        // Money/quantity precision default
        foreach (var property in builder.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(4);
        }

        // Global soft-delete filter for domain entities
        builder.Entity<Company>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Godown>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Category>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Unit>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Item>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ItemUnit>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Customer>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Supplier>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockItem>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockMovement>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockAdjustment>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockAdjustmentLine>().HasQueryFilter(e => !e.IsDeleted);

        ConfigureInventory(builder);
    }

    private static void ConfigureInventory(ModelBuilder builder)
    {
        builder.Entity<Category>(e =>
        {
            e.Property(c => c.Name).IsRequired().HasMaxLength(120);
            e.Property(c => c.Code).HasMaxLength(40);
            e.HasIndex(c => c.Name);
        });

        builder.Entity<Unit>(e =>
        {
            e.Property(u => u.Name).IsRequired().HasMaxLength(60);
            e.Property(u => u.Code).IsRequired().HasMaxLength(20);
        });

        builder.Entity<Item>(e =>
        {
            e.Property(i => i.Code).IsRequired().HasMaxLength(60);
            e.Property(i => i.Name).IsRequired().HasMaxLength(200);
            e.Property(i => i.Grade).HasMaxLength(60);
            e.HasIndex(i => i.Code).IsUnique();

            e.HasOne(i => i.Category)
                .WithMany(c => c.Items)
                .HasForeignKey(i => i.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.BaseUnit)
                .WithMany()
                .HasForeignKey(i => i.BaseUnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ItemUnit>(e =>
        {
            e.HasOne(iu => iu.Item)
                .WithMany(i => i.ItemUnits)
                .HasForeignKey(iu => iu.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(iu => iu.Unit)
                .WithMany()
                .HasForeignKey(iu => iu.UnitId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(iu => new { iu.ItemId, iu.UnitId }).IsUnique();
        });

        builder.Entity<Customer>(e =>
        {
            e.Property(c => c.Name).IsRequired().HasMaxLength(200);
            e.Property(c => c.Code).HasMaxLength(40);
            e.HasIndex(c => c.Name);
        });

        builder.Entity<Supplier>(e =>
        {
            e.Property(s => s.Name).IsRequired().HasMaxLength(200);
            e.Property(s => s.Code).HasMaxLength(40);
            e.HasIndex(s => s.Name);
        });

        builder.Entity<StockItem>(e =>
        {
            e.HasOne(s => s.Item)
                .WithMany()
                .HasForeignKey(s => s.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(s => s.Godown)
                .WithMany()
                .HasForeignKey(s => s.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(s => new { s.ItemId, s.GodownId }).IsUnique();
        });

        builder.Entity<StockMovement>(e =>
        {
            e.HasOne(m => m.Item)
                .WithMany()
                .HasForeignKey(m => m.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(m => m.Godown)
                .WithMany()
                .HasForeignKey(m => m.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(m => new { m.ItemId, m.GodownId, m.Date });
        });

        builder.Entity<StockAdjustment>(e =>
        {
            e.Property(a => a.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(a => a.Number).IsUnique();

            e.HasOne(a => a.Godown)
                .WithMany()
                .HasForeignKey(a => a.GodownId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StockAdjustmentLine>(e =>
        {
            e.HasOne(l => l.StockAdjustment)
                .WithMany(a => a.Lines)
                .HasForeignKey(l => l.StockAdjustmentId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditAndSoftDelete();
        return base.SaveChanges();
    }

    private void ApplyAuditAndSoftDelete()
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
                case EntityState.Deleted:
                    // Convert hard deletes into soft deletes
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    break;
            }
        }
    }
}
