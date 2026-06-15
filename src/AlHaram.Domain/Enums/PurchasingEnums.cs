namespace AlHaram.Domain.Enums;

/// <summary>
/// Purchase document lifecycle. Phase 3 only uses Posted &amp; Cancelled; Draft is reserved.
/// </summary>
public enum PurchaseDocStatus
{
    Draft = 1,
    Posted = 2,
    Cancelled = 3
}
