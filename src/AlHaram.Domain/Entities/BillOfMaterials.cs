using AlHaram.Domain.Common;

namespace AlHaram.Domain.Entities;

/// <summary>
/// Defines how one unit of a finished item is fabricated from raw materials.
/// </summary>
public class BillOfMaterials : BaseEntity
{
    public Guid FinishedItemId { get; set; }
    public Item? FinishedItem { get; set; }

    public string? Name { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<BomComponent> Components { get; set; } = new List<BomComponent>();
}

/// <summary>
/// One raw-material component per finished unit in a <see cref="BillOfMaterials"/>.
/// </summary>
public class BomComponent : BaseEntity
{
    public Guid BillOfMaterialsId { get; set; }
    public BillOfMaterials? BillOfMaterials { get; set; }

    public Guid RawItemId { get; set; }
    public Item? RawItem { get; set; }

    /// <summary>Raw quantity consumed to produce one finished unit (base units).</summary>
    public decimal QuantityPerUnit { get; set; }

    public string? Notes { get; set; }
}
