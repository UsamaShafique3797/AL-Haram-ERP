namespace AlHaram.Domain.Enums;

public enum ProductionOrderStatus
{
    Draft = 1,
    Completed = 2,
    Cancelled = 3
}

public enum ProductionLineType
{
    Consume = 1,
    Produce = 2,
    Scrap = 3
}

public enum JobWorkOrderStatus
{
    Open = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}
