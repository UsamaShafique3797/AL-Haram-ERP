namespace AlHaram.Domain.Enums;

public enum PurchaseOrderStatus
{
    Draft = 1,
    Sent = 2,
    PartiallyReceived = 3,
    Received = 4,
    Cancelled = 5
}

public enum GrnStatus
{
    Posted = 1,
    Cancelled = 2
}

public enum QuotationStatus
{
    Draft = 1,
    Sent = 2,
    Accepted = 3,
    Rejected = 4,
    Converted = 5
}

public enum DeliveryChallanStatus
{
    Posted = 1,
    Cancelled = 2
}

public enum StockTransferStatus
{
    Draft = 1,
    Completed = 2,
    Cancelled = 3
}
