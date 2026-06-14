namespace AlHaram.Domain.Enums;

/// <summary>
/// Classifies a stock movement so reports can group by source document type.
/// Quantity sign on the movement determines whether stock went in (+) or out (-).
/// </summary>
public enum MovementType
{
    OpeningStock = 1,
    Purchase = 2,
    Sale = 3,
    PurchaseReturn = 4,
    SalesReturn = 5,
    AdjustmentIncrease = 6,
    AdjustmentDecrease = 7,
    TransferIn = 8,
    TransferOut = 9,
    Production = 10
}

/// <summary>
/// Direction of a stock adjustment line.
/// </summary>
public enum AdjustmentDirection
{
    Increase = 1,
    Decrease = 2
}

/// <summary>
/// Customer classification for pricing and reporting.
/// </summary>
public enum CustomerType
{
    Retail = 1,
    Wholesale = 2,
    Contractor = 3
}
