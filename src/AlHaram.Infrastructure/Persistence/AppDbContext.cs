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

    // Phase 2 — Sales & Receivables
    public DbSet<PaymentAccount> PaymentAccounts => Set<PaymentAccount>();
    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
    public DbSet<SalesInvoiceLine> SalesInvoiceLines => Set<SalesInvoiceLine>();
    public DbSet<SalesReturn> SalesReturns => Set<SalesReturn>();
    public DbSet<SalesReturnLine> SalesReturnLines => Set<SalesReturnLine>();
    public DbSet<CustomerReceipt> CustomerReceipts => Set<CustomerReceipt>();
    public DbSet<ReceiptAllocation> ReceiptAllocations => Set<ReceiptAllocation>();
    public DbSet<CashBankTransaction> CashBankTransactions => Set<CashBankTransaction>();

    // Phase 3 — Purchasing & Payables
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
    public DbSet<PurchaseInvoiceLine> PurchaseInvoiceLines => Set<PurchaseInvoiceLine>();
    public DbSet<SupplierPayment> SupplierPayments => Set<SupplierPayment>();
    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();
    public DbSet<PurchaseReturn> PurchaseReturns => Set<PurchaseReturn>();
    public DbSet<PurchaseReturnLine> PurchaseReturnLines => Set<PurchaseReturnLine>();

    // Phase 4 — Expenses & Finance
    public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
    public DbSet<Expense> Expenses => Set<Expense>();

    // Phase 5 — Production / Fabrication
    public DbSet<BillOfMaterials> BillOfMaterials => Set<BillOfMaterials>();
    public DbSet<BomComponent> BomComponents => Set<BomComponent>();
    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<ProductionOrderLine> ProductionOrderLines => Set<ProductionOrderLine>();
    public DbSet<JobWorkOrder> JobWorkOrders => Set<JobWorkOrder>();

    // Phase 6+ — Remaining features
    public DbSet<DeliveryChallan> DeliveryChallans => Set<DeliveryChallan>();
    public DbSet<DeliveryChallanLine> DeliveryChallanLines => Set<DeliveryChallanLine>();
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();
    public DbSet<GoodsReceivedNote> GoodsReceivedNotes => Set<GoodsReceivedNote>();
    public DbSet<GoodsReceivedNoteLine> GoodsReceivedNoteLines => Set<GoodsReceivedNoteLine>();
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationLine> QuotationLines => Set<QuotationLine>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferLine> StockTransferLines => Set<StockTransferLine>();

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
        builder.Entity<PaymentAccount>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SalesInvoice>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SalesInvoiceLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SalesReturn>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SalesReturnLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<CustomerReceipt>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ReceiptAllocation>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<CashBankTransaction>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseInvoice>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseInvoiceLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<SupplierPayment>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PaymentAllocation>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseReturn>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseReturnLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ExpenseCategory>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Expense>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<BillOfMaterials>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<BomComponent>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ProductionOrder>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<ProductionOrderLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<JobWorkOrder>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<DeliveryChallan>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<DeliveryChallanLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseOrder>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<PurchaseOrderLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<GoodsReceivedNote>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<GoodsReceivedNoteLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<Quotation>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<QuotationLine>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<AuditLog>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockTransfer>().HasQueryFilter(e => !e.IsDeleted);
        builder.Entity<StockTransferLine>().HasQueryFilter(e => !e.IsDeleted);

        ConfigureInventory(builder);
        ConfigureSales(builder);
        ConfigurePurchasing(builder);
        ConfigureFinance(builder);
        ConfigureProduction(builder);
        ConfigureDocuments(builder);
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

    private static void ConfigureSales(ModelBuilder builder)
    {
        builder.Entity<PaymentAccount>(e =>
        {
            e.Property(p => p.Name).IsRequired().HasMaxLength(120);
            e.Property(p => p.AccountNumber).HasMaxLength(60);
            e.Property(p => p.BankName).HasMaxLength(120);
            e.HasIndex(p => p.Name);
        });

        builder.Entity<SalesInvoice>(e =>
        {
            e.Property(i => i.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(i => i.Number).IsUnique();

            e.HasOne(i => i.Customer)
                .WithMany()
                .HasForeignKey(i => i.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Godown)
                .WithMany()
                .HasForeignKey(i => i.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.PaymentAccount)
                .WithMany()
                .HasForeignKey(i => i.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(i => new { i.CustomerId, i.Date });
        });

        builder.Entity<SalesInvoiceLine>(e =>
        {
            e.HasOne(l => l.SalesInvoice)
                .WithMany(i => i.Lines)
                .HasForeignKey(l => l.SalesInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Unit)
                .WithMany()
                .HasForeignKey(l => l.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<SalesReturn>(e =>
        {
            e.Property(r => r.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(r => r.Number).IsUnique();

            e.HasOne(r => r.Customer)
                .WithMany()
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Godown)
                .WithMany()
                .HasForeignKey(r => r.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.SalesInvoice)
                .WithMany()
                .HasForeignKey(r => r.SalesInvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<SalesReturnLine>(e =>
        {
            e.HasOne(l => l.SalesReturn)
                .WithMany(r => r.Lines)
                .HasForeignKey(l => l.SalesReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Unit)
                .WithMany()
                .HasForeignKey(l => l.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CustomerReceipt>(e =>
        {
            e.Property(r => r.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(r => r.Number).IsUnique();

            e.HasOne(r => r.Customer)
                .WithMany()
                .HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.PaymentAccount)
                .WithMany()
                .HasForeignKey(r => r.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(r => new { r.CustomerId, r.Date });
        });

        builder.Entity<ReceiptAllocation>(e =>
        {
            e.HasOne(a => a.CustomerReceipt)
                .WithMany(r => r.Allocations)
                .HasForeignKey(a => a.CustomerReceiptId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.SalesInvoice)
                .WithMany()
                .HasForeignKey(a => a.SalesInvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<CashBankTransaction>(e =>
        {
            e.HasOne(t => t.PaymentAccount)
                .WithMany()
                .HasForeignKey(t => t.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(t => new { t.PaymentAccountId, t.Date });
        });
    }

    private static void ConfigurePurchasing(ModelBuilder builder)
    {
        builder.Entity<PurchaseInvoice>(e =>
        {
            e.Property(i => i.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(i => i.Number).IsUnique();

            e.HasOne(i => i.Supplier)
                .WithMany()
                .HasForeignKey(i => i.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.Godown)
                .WithMany()
                .HasForeignKey(i => i.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(i => i.PaymentAccount)
                .WithMany()
                .HasForeignKey(i => i.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(i => new { i.SupplierId, i.Date });
        });

        builder.Entity<PurchaseInvoiceLine>(e =>
        {
            e.HasOne(l => l.PurchaseInvoice)
                .WithMany(i => i.Lines)
                .HasForeignKey(l => l.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Unit)
                .WithMany()
                .HasForeignKey(l => l.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<SupplierPayment>(e =>
        {
            e.Property(r => r.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(r => r.Number).IsUnique();

            e.HasOne(r => r.Supplier)
                .WithMany()
                .HasForeignKey(r => r.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.PaymentAccount)
                .WithMany()
                .HasForeignKey(r => r.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(r => new { r.SupplierId, r.Date });
        });

        builder.Entity<PaymentAllocation>(e =>
        {
            e.HasOne(a => a.SupplierPayment)
                .WithMany(r => r.Allocations)
                .HasForeignKey(a => a.SupplierPaymentId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(a => a.PurchaseInvoice)
                .WithMany()
                .HasForeignKey(a => a.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseReturn>(e =>
        {
            e.Property(r => r.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(r => r.Number).IsUnique();

            e.HasOne(r => r.Supplier)
                .WithMany()
                .HasForeignKey(r => r.SupplierId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.Godown)
                .WithMany()
                .HasForeignKey(r => r.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(r => r.PurchaseInvoice)
                .WithMany()
                .HasForeignKey(r => r.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseReturnLine>(e =>
        {
            e.HasOne(l => l.PurchaseReturn)
                .WithMany(r => r.Lines)
                .HasForeignKey(l => l.PurchaseReturnId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(l => l.Unit)
                .WithMany()
                .HasForeignKey(l => l.UnitId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureFinance(ModelBuilder builder)
    {
        builder.Entity<ExpenseCategory>(e =>
        {
            e.Property(c => c.Name).IsRequired().HasMaxLength(120);
            e.Property(c => c.Code).HasMaxLength(40);
            e.HasIndex(c => c.Name);
        });

        builder.Entity<Expense>(e =>
        {
            e.Property(x => x.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(x => x.Number).IsUnique();

            e.HasOne(x => x.ExpenseCategory)
                .WithMany(c => c.Expenses)
                .HasForeignKey(x => x.ExpenseCategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.PaymentAccount)
                .WithMany()
                .HasForeignKey(x => x.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            e.Property(x => x.AttachmentPath).HasMaxLength(500);
            e.HasIndex(x => new { x.ExpenseCategoryId, x.Date });
        });
    }

    private static void ConfigureProduction(ModelBuilder builder)
    {
        builder.Entity<BillOfMaterials>(e =>
        {
            e.Property(b => b.Name).HasMaxLength(200);

            e.HasOne(b => b.FinishedItem)
                .WithMany()
                .HasForeignKey(b => b.FinishedItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(b => b.FinishedItemId).IsUnique();
        });

        builder.Entity<BomComponent>(e =>
        {
            e.HasOne(c => c.BillOfMaterials)
                .WithMany(b => b.Components)
                .HasForeignKey(c => c.BillOfMaterialsId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.RawItem)
                .WithMany()
                .HasForeignKey(c => c.RawItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(c => new { c.BillOfMaterialsId, c.RawItemId }).IsUnique();
        });

        builder.Entity<ProductionOrder>(e =>
        {
            e.Property(o => o.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(o => o.Number).IsUnique();

            e.HasOne(o => o.Godown)
                .WithMany()
                .HasForeignKey(o => o.GodownId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.BillOfMaterials)
                .WithMany()
                .HasForeignKey(o => o.BillOfMaterialsId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.FinishedItem)
                .WithMany()
                .HasForeignKey(o => o.FinishedItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(o => o.ScrapItem)
                .WithMany()
                .HasForeignKey(o => o.ScrapItemId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(o => new { o.GodownId, o.Date });
        });

        builder.Entity<ProductionOrderLine>(e =>
        {
            e.HasOne(l => l.ProductionOrder)
                .WithMany(o => o.Lines)
                .HasForeignKey(l => l.ProductionOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(l => l.Item)
                .WithMany()
                .HasForeignKey(l => l.ItemId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<JobWorkOrder>(e =>
        {
            e.Property(j => j.Number).IsRequired().HasMaxLength(40);
            e.Property(j => j.Description).IsRequired().HasMaxLength(500);
            e.HasIndex(j => j.Number).IsUnique();

            e.HasOne(j => j.Customer)
                .WithMany()
                .HasForeignKey(j => j.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(j => new { j.CustomerId, j.Date });
        });
    }

    private static void ConfigureDocuments(ModelBuilder builder)
    {
        builder.Entity<DeliveryChallan>(e =>
        {
            e.Property(c => c.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(c => c.Number).IsUnique();
            e.HasOne(c => c.Customer).WithMany().HasForeignKey(c => c.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.Godown).WithMany().HasForeignKey(c => c.GodownId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(c => c.SalesInvoice).WithMany().HasForeignKey(c => c.SalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
            e.Property(c => c.VehicleNo).HasMaxLength(40);
            e.Property(c => c.DriverName).HasMaxLength(120);
        });

        builder.Entity<DeliveryChallanLine>(e =>
        {
            e.HasOne(l => l.DeliveryChallan).WithMany(c => c.Lines).HasForeignKey(l => l.DeliveryChallanId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Item).WithMany().HasForeignKey(l => l.ItemId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Unit).WithMany().HasForeignKey(l => l.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseOrder>(e =>
        {
            e.Property(o => o.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(o => o.Number).IsUnique();
            e.HasOne(o => o.Supplier).WithMany().HasForeignKey(o => o.SupplierId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(o => o.Godown).WithMany().HasForeignKey(o => o.GodownId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseOrderLine>(e =>
        {
            e.HasOne(l => l.PurchaseOrder).WithMany(o => o.Lines).HasForeignKey(l => l.PurchaseOrderId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Item).WithMany().HasForeignKey(l => l.ItemId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Unit).WithMany().HasForeignKey(l => l.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<GoodsReceivedNote>(e =>
        {
            e.Property(g => g.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(g => g.Number).IsUnique();
            e.HasOne(g => g.Supplier).WithMany().HasForeignKey(g => g.SupplierId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(g => g.Godown).WithMany().HasForeignKey(g => g.GodownId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(g => g.PurchaseOrder).WithMany().HasForeignKey(g => g.PurchaseOrderId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<GoodsReceivedNoteLine>(e =>
        {
            e.HasOne(l => l.GoodsReceivedNote).WithMany(g => g.Lines).HasForeignKey(l => l.GoodsReceivedNoteId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.PurchaseOrderLine).WithMany().HasForeignKey(l => l.PurchaseOrderLineId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Item).WithMany().HasForeignKey(l => l.ItemId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Unit).WithMany().HasForeignKey(l => l.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Quotation>(e =>
        {
            e.Property(q => q.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(q => q.Number).IsUnique();
            e.HasOne(q => q.Customer).WithMany().HasForeignKey(q => q.CustomerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(q => q.ConvertedSalesInvoice).WithMany().HasForeignKey(q => q.ConvertedSalesInvoiceId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<QuotationLine>(e =>
        {
            e.HasOne(l => l.Quotation).WithMany(q => q.Lines).HasForeignKey(l => l.QuotationId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Item).WithMany().HasForeignKey(l => l.ItemId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(l => l.Unit).WithMany().HasForeignKey(l => l.UnitId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditLog>(e =>
        {
            e.Property(a => a.Action).IsRequired().HasMaxLength(60);
            e.Property(a => a.EntityType).IsRequired().HasMaxLength(60);
            e.Property(a => a.EntityNumber).HasMaxLength(40);
            e.Property(a => a.UserName).HasMaxLength(120);
            e.HasIndex(a => a.CreatedAt);
        });

        builder.Entity<StockTransfer>(e =>
        {
            e.Property(t => t.Number).IsRequired().HasMaxLength(40);
            e.HasIndex(t => t.Number).IsUnique();
            e.HasOne(t => t.FromGodown).WithMany().HasForeignKey(t => t.FromGodownId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(t => t.ToGodown).WithMany().HasForeignKey(t => t.ToGodownId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<StockTransferLine>(e =>
        {
            e.HasOne(l => l.StockTransfer).WithMany(t => t.Lines).HasForeignKey(l => l.StockTransferId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(l => l.Item).WithMany().HasForeignKey(l => l.ItemId).OnDelete(DeleteBehavior.Restrict);
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
