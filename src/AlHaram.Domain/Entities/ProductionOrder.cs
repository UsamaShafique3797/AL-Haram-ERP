using AlHaram.Domain.Common;
using AlHaram.Domain.Enums;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Fabrication order that consumes raw steel and produces finished goods when completed.
/// </summary>
public class ProductionOrder : BaseEntity
{
    public string Number { get; set; } = string.Empty;
    public DateTime Date { get; set; } = DateTime.UtcNow;

    public Guid GodownId { get; set; }
    public Godown? Godown { get; set; }

    public Guid BillOfMaterialsId { get; set; }
    public BillOfMaterials? BillOfMaterials { get; set; }

    public Guid FinishedItemId { get; set; }
    public Item? FinishedItem { get; set; }

    /// <summary>Output quantity in base units.</summary>
    public decimal Quantity { get; set; }

    /// <summary>Labor and overhead added to raw material cost.</summary>
    public decimal LaborOverhead { get; set; }

    public ProductionOrderStatus Status { get; set; } = ProductionOrderStatus.Draft;

    public decimal RawMaterialCost { get; set; }
    public decimal FinishedUnitCost { get; set; }
    public decimal TotalCost { get; set; }

    public string? Notes { get; set; }

    /// <summary>Optional scrap item produced as waste during fabrication.</summary>
    public Guid? ScrapItemId { get; set; }
    public Item? ScrapItem { get; set; }

    /// <summary>Scrap quantity in base units posted on completion.</summary>
    public decimal ScrapQuantity { get; set; }

    public ICollection<ProductionOrderLine> Lines { get; set; } = new List<ProductionOrderLine>();
}

/// <summary>
/// Planned or posted consume/produce line on a <see cref="ProductionOrder"/>.
/// </summary>
public class ProductionOrderLine : BaseEntity
{
    public Guid ProductionOrderId { get; set; }
    public ProductionOrder? ProductionOrder { get; set; }

    public ProductionLineType LineType { get; set; }

    public Guid ItemId { get; set; }
    public Item? Item { get; set; }

    /// <summary>Positive quantity in base units.</summary>
    public decimal Quantity { get; set; }

    public decimal UnitCost { get; set; }
    public decimal LineCost { get; set; }
}
