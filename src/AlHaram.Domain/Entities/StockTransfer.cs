using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

public class StockTransfer : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid FromGodownId { get; set; }
    public Godown? FromGodown { get; set; }

    public Guid ToGodownId { get; set; }
    public Godown? ToGodown { get; set; }

    public StockTransferStatus Status { get; set; } = StockTransferStatus.Draft;

    public string? Notes { get; set; }

    public ICollection<StockTransferLine> Lines { get; set; } = new List<StockTransferLine>();
}

public class StockTransferLine : BaseEntity
{
    public Guid StockTransferId { get; set; }
    public StockTransfer? StockTransfer { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
}
