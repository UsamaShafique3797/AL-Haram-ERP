using System.Text;
using AlHaram.Application.Auth;
using AlHaram.Application.Categories;
using AlHaram.Application.Common;
using AlHaram.Application.Common.Models;
using AlHaram.Application.Companies;
using AlHaram.Application.Customers;
using AlHaram.Application.Finance;
using AlHaram.Application.Godowns;
using AlHaram.Application.Items;
using AlHaram.Application.Purchasing;
using AlHaram.Application.Sales;
using AlHaram.Application.Stock;
using AlHaram.Application.Suppliers;
using AlHaram.Application.Messaging;
using AlHaram.Application.Units;
using AlHaram.Application.WhatsApp;
using AlHaram.Application.Documents;
using AlHaram.Infrastructure.Auth;
using AlHaram.Infrastructure.Identity;
using AlHaram.Infrastructure.Documents;
using AlHaram.Infrastructure.Persistence;
using AlHaram.Infrastructure.WhatsApp;
using AlHaram.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace AlHaram.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("DefaultConnection");
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(connectionString, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.Password.RequiredLength = 6;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequireUppercase = false;
                options.User.RequireUniqueEmail = false;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

        var jwtSettings = new JwtSettings();
        config.GetSection(JwtSettings.SectionName).Bind(jwtSettings);
        services.Configure<JwtSettings>(config.GetSection(JwtSettings.SectionName));
        services.Configure<WhatsAppSettings>(config.GetSection(WhatsAppSettings.SectionName));

        services.AddHttpClient<IWhatsAppService, MetaWhatsAppService>();
        services.AddScoped<IInvoicePdfService, InvoicePdfService>();
        services.AddScoped<ICustomerMessagingService, CustomerMessagingService>();

        services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddHttpContextAccessor();
        services.AddScoped<IBranchScope, BranchScope>();

        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<ICompanyService, CompanyService>();
        services.AddScoped<IGodownService, GodownService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IUnitService, UnitService>();
        services.AddScoped<IItemService, ItemService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IStockService, StockService>();

        // Phase 2 — Sales & Receivables
        services.AddScoped<IPaymentAccountService, PaymentAccountService>();
        services.AddScoped<ISalesInvoiceService, SalesInvoiceService>();
        services.AddScoped<ISalesReturnService, SalesReturnService>();
        services.AddScoped<ICustomerReceiptService, CustomerReceiptService>();
        services.AddScoped<ICustomerLedgerService, CustomerLedgerService>();

        // Phase 3 — Purchasing & Payables
        services.AddScoped<IPurchaseInvoiceService, PurchaseInvoiceService>();
        services.AddScoped<ISupplierPaymentService, SupplierPaymentService>();
        services.AddScoped<IPurchaseReturnService, PurchaseReturnService>();
        services.AddScoped<ISupplierLedgerService, SupplierLedgerService>();

        // Phase 4 — Expenses, Cash/Bank & P&L
        services.AddScoped<IExpenseCategoryService, ExpenseCategoryService>();
        services.AddScoped<IExpenseService, ExpenseService>();
        services.AddScoped<ICashBookService, CashBookService>();
        services.AddScoped<IDayBookService, DayBookService>();
        services.AddScoped<IProfitLossService, ProfitLossService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IDashboardService, DashboardService>();

        // Remaining features
        services.AddScoped<IAuditLogService, AuditLogService>();
        services.AddScoped<IDeliveryChallanService, DeliveryChallanService>();
        services.AddScoped<IQuotationService, QuotationService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<IGrnService, GrnService>();
        services.AddScoped<IAgeingService, AgeingService>();
        services.AddScoped<IStockTransferService, StockTransferService>();

        return services;
    }
}
