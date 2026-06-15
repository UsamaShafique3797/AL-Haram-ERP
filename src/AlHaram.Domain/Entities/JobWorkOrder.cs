using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Customer-supplied material job (cutting, bending, etc.) with a service charge.
/// </summary>
public class JobWorkOrder : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public string Description { get; set; } = string.Empty;
    public decimal LaborCharge { get; set; }

    public JobWorkOrderStatus Status { get; set; } = JobWorkOrderStatus.Open;
    public string? Notes { get; set; }
}
