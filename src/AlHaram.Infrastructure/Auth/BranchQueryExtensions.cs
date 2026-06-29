using AlHaram.Application.Common;
using AlHaram.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AlHaram.Infrastructure.Auth;

public static class BranchQueryExtensions
{
    public static IQueryable<SalesInvoice> ForBranch(this IQueryable<SalesInvoice> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<PurchaseInvoice> ForBranch(this IQueryable<PurchaseInvoice> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<SalesReturn> ForBranch(this IQueryable<SalesReturn> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<PurchaseReturn> ForBranch(this IQueryable<PurchaseReturn> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<GoodsReceivedNote> ForBranch(this IQueryable<GoodsReceivedNote> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<PurchaseOrder> ForBranch(this IQueryable<PurchaseOrder> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<DeliveryChallan> ForBranch(this IQueryable<DeliveryChallan> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<StockItem> ForBranch(this IQueryable<StockItem> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<StockAdjustment> ForBranch(this IQueryable<StockAdjustment> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<StockTransfer> ForBranch(this IQueryable<StockTransfer> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g
            ? q.Where(x => x.FromGodownId == g || x.ToGodownId == g)
            : q;

    public static IQueryable<Godown> ForBranch(this IQueryable<Godown> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.Id == g) : q;

    public static IQueryable<CashBankTransaction> ForBranch(this IQueryable<CashBankTransaction> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<CustomerReceipt> ForBranch(this IQueryable<CustomerReceipt> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<SupplierPayment> ForBranch(this IQueryable<SupplierPayment> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;

    public static IQueryable<Expense> ForBranch(this IQueryable<Expense> q, IBranchScope b) =>
        b.EffectiveGodownId is Guid g ? q.Where(x => x.GodownId == g) : q;
}
