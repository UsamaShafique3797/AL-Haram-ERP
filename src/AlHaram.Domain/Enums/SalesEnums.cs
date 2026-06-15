namespace AlHaram.Domain.Enums;

/// <summary>
/// How a payment was tendered (used by receipts, refunds, expenses).
/// </summary>
public enum PaymentMode
{
    Cash = 1,
    Bank = 2,
    Cheque = 3
}

/// <summary>
/// Type of cash/bank book account.
/// </summary>
public enum PaymentAccountType
{
    Cash = 1,
    Bank = 2
}

/// <summary>
/// Sales document lifecycle. Phase 2 only uses Posted &amp; Cancelled; Draft is reserved.
/// </summary>
public enum SalesDocStatus
{
    Draft = 1,
    Posted = 2,
    Cancelled = 3
}

/// <summary>
/// Classifies a cash/bank book entry so reports can group money in vs out by source.
/// Sign of <c>Amount</c> still drives in (+) vs out (-).
/// </summary>
public enum CashBankSource
{
    SalesReceipt = 1,
    CashSale = 2,
    SalesRefund = 3,
    SupplierPayment = 4,   // reserved for Phase 3
    PurchaseRefund = 5,    // reserved for Phase 3
    Expense = 6,           // reserved for Phase 4
    Transfer = 7,
    OpeningBalance = 8,
    Other = 99
}
