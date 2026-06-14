export interface CompanyDto {
  id: string;
  name: string;
  legalName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  logoUrl?: string | null;
  currency: string;
  defaultTaxRate: number;
}

export type UpdateCompanyRequest = Omit<CompanyDto, 'id'>;

export interface GodownDto {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export type SaveGodownRequest = Omit<GodownDto, 'id'>;

// ===== Phase 1 — Inventory & Masters =====

export interface CategoryDto {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  itemCount: number;
}

export type SaveCategoryRequest = Omit<CategoryDto, 'id' | 'itemCount'>;

export interface UnitDto {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export type SaveUnitRequest = Omit<UnitDto, 'id'>;

export interface ItemUnitDto {
  unitId: string;
  unitName: string;
  unitCode: string;
  conversionFactor: number;
  isBaseUnit: boolean;
}

export interface ItemDto {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brand?: string | null;
  hsCode?: string | null;
  baseUnitId: string;
  baseUnitCode: string;
  defaultPurchaseRate: number;
  defaultSaleRate: number;
  reorderLevel: number;
  diameter?: number | null;
  grade?: string | null;
  length?: number | null;
  weightPerPiece?: number | null;
  trackInventory: boolean;
  isActive: boolean;
  stockOnHand: number;
  stockValue: number;
  isLowStock: boolean;
  units: ItemUnitDto[];
}

export interface SaveItemUnitRequest {
  unitId: string;
  conversionFactor: number;
}

export interface SaveItemRequest {
  code: string;
  name: string;
  categoryId: string;
  brand?: string | null;
  hsCode?: string | null;
  baseUnitId: string;
  defaultPurchaseRate: number;
  defaultSaleRate: number;
  reorderLevel: number;
  diameter?: number | null;
  grade?: string | null;
  length?: number | null;
  weightPerPiece?: number | null;
  trackInventory: boolean;
  isActive: boolean;
  additionalUnits: SaveItemUnitRequest[];
}

export enum CustomerType {
  Retail = 1,
  Wholesale = 2,
  Contractor = 3,
}

export const CustomerTypeLabels: Record<number, string> = {
  [CustomerType.Retail]: 'Retail',
  [CustomerType.Wholesale]: 'Wholesale',
  [CustomerType.Contractor]: 'Contractor',
};

export interface CustomerDto {
  id: string;
  name: string;
  code?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  type: CustomerType;
  creditLimit: number;
  paymentTermsDays: number;
  openingBalance: number;
  openingBalanceAsOf?: string | null;
  isActive: boolean;
}

export type SaveCustomerRequest = Omit<CustomerDto, 'id'>;

export interface SupplierDto {
  id: string;
  name: string;
  code?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  paymentTermsDays: number;
  openingBalance: number;
  openingBalanceAsOf?: string | null;
  isActive: boolean;
}

export type SaveSupplierRequest = Omit<SupplierDto, 'id'>;

export interface StockLevelDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  baseUnitCode: string;
  godownId: string;
  godownName: string;
  quantity: number;
  averageCost: number;
  stockValue: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface StockMovementDto {
  id: string;
  date: string;
  type: string;
  itemId: string;
  itemName: string;
  godownId: string;
  godownName: string;
  quantity: number;
  unitCost: number;
  quantityAfter: number;
  averageCostAfter: number;
  reference?: string | null;
  notes?: string | null;
}

export interface OpeningStockRequest {
  itemId: string;
  godownId: string;
  quantity: number;
  unitCost: number;
  date: string;
  notes?: string | null;
}

export enum AdjustmentDirection {
  Increase = 1,
  Decrease = 2,
}

export interface StockAdjustmentLineDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  direction: AdjustmentDirection;
  quantity: number;
  unitCost: number;
  notes?: string | null;
}

export interface StockAdjustmentDto {
  id: string;
  number: string;
  date: string;
  godownId: string;
  godownName: string;
  reason?: string | null;
  notes?: string | null;
  lines: StockAdjustmentLineDto[];
}

export interface SaveStockAdjustmentLineRequest {
  itemId: string;
  direction: AdjustmentDirection;
  quantity: number;
  unitCost: number;
  notes?: string | null;
}

export interface SaveStockAdjustmentRequest {
  date: string;
  godownId: string;
  reason?: string | null;
  notes?: string | null;
  lines: SaveStockAdjustmentLineRequest[];
}
