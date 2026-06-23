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

export interface UpdateStockLevelRequest {
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

// ===== Phase 2 — Sales & Receivables =====

export enum PaymentMode {
  Cash = 1,
  Bank = 2,
  Cheque = 3,
}

export const PaymentModeLabels: Record<number, string> = {
  [PaymentMode.Cash]: 'Cash',
  [PaymentMode.Bank]: 'Bank',
  [PaymentMode.Cheque]: 'Cheque',
};

export enum PaymentAccountType {
  Cash = 1,
  Bank = 2,
}

export const PaymentAccountTypeLabels: Record<number, string> = {
  [PaymentAccountType.Cash]: 'Cash',
  [PaymentAccountType.Bank]: 'Bank',
};

export enum SalesDocStatus {
  Draft = 1,
  Posted = 2,
  Cancelled = 3,
}

export interface PaymentAccountDto {
  id: string;
  name: string;
  type: PaymentAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface SalesInvoiceLineDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  rate: number;
  discount: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
}

export interface SalesInvoiceDto {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  godownId: string;
  godownName: string;
  status: SalesDocStatus;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  amountAllocated: number;
  balance: number;
  paymentAccountId?: string | null;
  paymentAccountName?: string | null;
  costOfGoodsSold: number;
  notes?: string | null;
  lines: SalesInvoiceLineDto[];
}

export interface SaveSalesInvoiceLineRequest {
  itemId: string;
  unitId: string;
  quantity: number;
  rate: number;
  discount: number;
}

export interface SaveSalesInvoiceRequest {
  date: string;
  customerId: string;
  godownId: string;
  discount: number;
  taxRate: number;
  paidAmount: number;
  paymentAccountId?: string | null;
  notes?: string | null;
  lines: SaveSalesInvoiceLineRequest[];
}

export interface OpenInvoiceDto {
  id: string;
  number: string;
  date: string;
  total: number;
  amountAllocated: number;
  balance: number;
}

export interface SalesReturnLineDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  rate: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
}

export interface SalesReturnDto {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  godownId: string;
  godownName: string;
  salesInvoiceId: string;
  salesInvoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  reason?: string | null;
  notes?: string | null;
  lines: SalesReturnLineDto[];
}

export interface SaveSalesReturnLineRequest {
  salesInvoiceLineId: string;
  quantity: number;
}

export interface SaveSalesReturnRequest {
  date: string;
  salesInvoiceId: string;
  reason?: string | null;
  notes?: string | null;
  lines: SaveSalesReturnLineRequest[];
}

export interface ReceiptAllocationDto {
  id: string;
  salesInvoiceId: string;
  salesInvoiceNumber: string;
  amount: number;
}

export interface CustomerReceiptDto {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  paymentAccountId: string;
  paymentAccountName: string;
  mode: PaymentMode;
  amount: number;
  amountAllocated: number;
  unallocated: number;
  reference?: string | null;
  notes?: string | null;
  allocations: ReceiptAllocationDto[];
}

export interface SaveReceiptAllocationRequest {
  salesInvoiceId: string;
  amount: number;
}

export interface SaveCustomerReceiptRequest {
  date: string;
  customerId: string;
  paymentAccountId: string;
  mode: PaymentMode;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  allocations: SaveReceiptAllocationRequest[];
}

export interface CustomerLedgerEntryDto {
  date: string;
  documentType: string;
  documentNumber: string;
  documentId?: string | null;
  reference?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface CustomerLedgerDto {
  customerId: string;
  customerName: string;
  openingBalance: number;
  openingBalanceAsOf?: string | null;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: CustomerLedgerEntryDto[];
}

export interface ReceivableDto {
  customerId: string;
  customerName: string;
  phone?: string | null;
  openingBalance: number;
  invoiced: number;
  returned: number;
  received: number;
  outstanding: number;
}

// ===== Phase 3 — Purchasing & Payables =====

export enum PurchaseDocStatus {
  Draft = 1,
  Posted = 2,
  Cancelled = 3,
}

export interface PurchaseInvoiceLineDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  rate: number;
  discount: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
}

export interface PurchaseInvoiceDto {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  supplierName: string;
  godownId: string;
  godownName: string;
  status: PurchaseDocStatus;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  amountAllocated: number;
  balance: number;
  paymentAccountId?: string | null;
  paymentAccountName?: string | null;
  notes?: string | null;
  lines: PurchaseInvoiceLineDto[];
}

export interface SavePurchaseInvoiceLineRequest {
  itemId: string;
  unitId: string;
  quantity: number;
  rate: number;
  discount: number;
}

export interface SavePurchaseInvoiceRequest {
  date: string;
  supplierId: string;
  godownId: string;
  discount: number;
  taxRate: number;
  paidAmount: number;
  paymentAccountId?: string | null;
  notes?: string | null;
  lines: SavePurchaseInvoiceLineRequest[];
}

export interface OpenPurchaseInvoiceDto {
  id: string;
  number: string;
  date: string;
  total: number;
  amountAllocated: number;
  balance: number;
}

export interface PaymentAllocationDto {
  id: string;
  purchaseInvoiceId: string;
  purchaseInvoiceNumber: string;
  amount: number;
}

export interface SupplierPaymentDto {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  supplierName: string;
  paymentAccountId: string;
  paymentAccountName: string;
  mode: PaymentMode;
  amount: number;
  amountAllocated: number;
  unallocated: number;
  reference?: string | null;
  notes?: string | null;
  allocations: PaymentAllocationDto[];
}

export interface SavePaymentAllocationRequest {
  purchaseInvoiceId: string;
  amount: number;
}

export interface SaveSupplierPaymentRequest {
  date: string;
  supplierId: string;
  paymentAccountId: string;
  mode: PaymentMode;
  amount: number;
  reference?: string | null;
  notes?: string | null;
  allocations: SavePaymentAllocationRequest[];
}

export interface PurchaseReturnLineDto {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId: string;
  unitCode: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  rate: number;
  lineTotal: number;
  unitCost: number;
  lineCost: number;
}

export interface PurchaseReturnDto {
  id: string;
  number: string;
  date: string;
  supplierId: string;
  supplierName: string;
  godownId: string;
  godownName: string;
  purchaseInvoiceId: string;
  purchaseInvoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  reason?: string | null;
  notes?: string | null;
  lines: PurchaseReturnLineDto[];
}

export interface SavePurchaseReturnLineRequest {
  purchaseInvoiceLineId: string;
  quantity: number;
}

export interface SavePurchaseReturnRequest {
  date: string;
  purchaseInvoiceId: string;
  reason?: string | null;
  notes?: string | null;
  lines: SavePurchaseReturnLineRequest[];
}

export interface SupplierLedgerEntryDto {
  date: string;
  documentType: string;
  documentNumber: string;
  documentId?: string | null;
  reference?: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface SupplierLedgerDto {
  supplierId: string;
  supplierName: string;
  openingBalance: number;
  openingBalanceAsOf?: string | null;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: SupplierLedgerEntryDto[];
}

export interface PayableDto {
  supplierId: string;
  supplierName: string;
  phone?: string | null;
  openingBalance: number;
  invoiced: number;
  returned: number;
  paid: number;
  outstanding: number;
}

// ===== Phase 4 — Expenses, Finance & Reports =====

export interface ExpenseCategoryDto {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  isActive: boolean;
  expenseCount: number;
}

export type SaveExpenseCategoryRequest = Omit<ExpenseCategoryDto, 'id' | 'expenseCount'>;

export interface ExpenseDto {
  id: string;
  number: string;
  date: string;
  expenseCategoryId: string;
  expenseCategoryName: string;
  amount: number;
  paymentAccountId: string;
  paymentAccountName: string;
  notes?: string | null;
  attachmentPath?: string | null;
}

export interface SaveExpenseRequest {
  date: string;
  expenseCategoryId: string;
  amount: number;
  paymentAccountId: string;
  notes?: string | null;
  attachmentPath?: string | null;
}

export interface CashBookEntryDto {
  date: string;
  source: string;
  reference?: string | null;
  notes?: string | null;
  moneyIn: number;
  moneyOut: number;
  balance: number;
}

export interface CashBookDto {
  paymentAccountId: string;
  paymentAccountName: string;
  accountType: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  entries: CashBookEntryDto[];
}

export interface DayBookEntryDto {
  paymentAccountId: string;
  paymentAccountName: string;
  accountType: string;
  date: string;
  source: string;
  reference?: string | null;
  notes?: string | null;
  moneyIn: number;
  moneyOut: number;
}

export interface DayBookDto {
  date: string;
  totalIn: number;
  totalOut: number;
  netMovement: number;
  entries: DayBookEntryDto[];
}

export interface ProfitLossCategoryBreakdownDto {
  name: string;
  amount: number;
}

export interface ProfitLossItemBreakdownDto {
  itemId: string;
  itemCode: string;
  itemName: string;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export interface ProfitLossDto {
  from: string;
  to: string;
  revenue: number;
  salesReturns: number;
  netRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  expenseByCategory: ProfitLossCategoryBreakdownDto[];
  itemBreakdown: ProfitLossItemBreakdownDto[];
}

export interface SalesReportLineDto {
  invoiceId: string;
  number: string;
  date: string;
  customerName: string;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balance: number;
  costOfGoodsSold: number;
  grossProfit: number;
}

export interface SalesReportDto {
  from: string;
  to: string;
  invoiceCount: number;
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  lines: SalesReportLineDto[];
}

export interface ExpenseReportLineDto {
  expenseId: string;
  number: string;
  date: string;
  categoryName: string;
  paymentAccountName: string;
  amount: number;
  notes?: string | null;
}

export interface ExpenseReportDto {
  from: string;
  to: string;
  expenseCount: number;
  totalAmount: number;
  lines: ExpenseReportLineDto[];
  byCategory: ProfitLossCategoryBreakdownDto[];
}

export interface DashboardSummaryDto {
  salesMonth: number;
  purchasesMonth: number;
  expensesMonth: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  payables: number;
  netProfitMonth: number;
}

// ===== Phase 5 — Production / Fabrication =====

export enum ProductionOrderStatus {
  Draft = 1,
  Completed = 2,
  Cancelled = 3,
}

export const ProductionOrderStatusLabels: Record<number, string> = {
  [ProductionOrderStatus.Draft]: 'Draft',
  [ProductionOrderStatus.Completed]: 'Completed',
  [ProductionOrderStatus.Cancelled]: 'Cancelled',
};

export enum ProductionLineType {
  Consume = 1,
  Produce = 2,
  Scrap = 3,
}

export const ProductionLineTypeLabels: Record<number, string> = {
  [ProductionLineType.Consume]: 'Consume',
  [ProductionLineType.Produce]: 'Produce',
  [ProductionLineType.Scrap]: 'Scrap',
};

export enum JobWorkOrderStatus {
  Open = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
}

export const JobWorkOrderStatusLabels: Record<number, string> = {
  [JobWorkOrderStatus.Open]: 'Open',
  [JobWorkOrderStatus.InProgress]: 'In progress',
  [JobWorkOrderStatus.Completed]: 'Completed',
  [JobWorkOrderStatus.Cancelled]: 'Cancelled',
};

export interface BomComponentDto {
  id: string;
  rawItemId: string;
  rawItemCode: string;
  rawItemName: string;
  quantityPerUnit: number;
  notes?: string | null;
}

export interface BillOfMaterialsDto {
  id: string;
  finishedItemId: string;
  finishedItemCode: string;
  finishedItemName: string;
  name?: string | null;
  notes?: string | null;
  isActive: boolean;
  components: BomComponentDto[];
}

export interface SaveBomComponentRequest {
  rawItemId: string;
  quantityPerUnit: number;
  notes?: string | null;
}

export interface SaveBillOfMaterialsRequest {
  finishedItemId: string;
  name?: string | null;
  notes?: string | null;
  isActive: boolean;
  components: SaveBomComponentRequest[];
}

export interface ProductionOrderLineDto {
  id: string;
  lineType: ProductionLineType;
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  lineCost: number;
}

export interface ProductionOrderDto {
  id: string;
  number: string;
  date: string;
  godownId: string;
  godownName: string;
  billOfMaterialsId: string;
  finishedItemId: string;
  finishedItemCode: string;
  finishedItemName: string;
  quantity: number;
  laborOverhead: number;
  status: ProductionOrderStatus;
  rawMaterialCost: number;
  finishedUnitCost: number;
  totalCost: number;
  scrapItemId?: string | null;
  scrapItemCode?: string | null;
  scrapItemName?: string | null;
  scrapQuantity: number;
  notes?: string | null;
  lines: ProductionOrderLineDto[];
}

export interface SaveProductionOrderRequest {
  date: string;
  godownId: string;
  billOfMaterialsId: string;
  quantity: number;
  laborOverhead: number;
  scrapItemId?: string | null;
  scrapQuantity: number;
  notes?: string | null;
}

export interface JobWorkOrderDto {
  id: string;
  number: string;
  date: string;
  customerId: string;
  customerName: string;
  description: string;
  laborCharge: number;
  status: JobWorkOrderStatus;
  notes?: string | null;
}

export interface SaveJobWorkOrderRequest {
  date: string;
  customerId: string;
  description: string;
  laborCharge: number;
  status: JobWorkOrderStatus;
  notes?: string | null;
}

// ===== Phase 6 — Remaining features =====

export enum DeliveryChallanStatus { Posted = 1, Cancelled = 2 }
export enum PurchaseOrderStatus { Draft = 1, Sent = 2, PartiallyReceived = 3, Received = 4, Cancelled = 5 }
export enum GrnStatus { Posted = 1, Cancelled = 2 }
export enum QuotationStatus { Draft = 1, Sent = 2, Accepted = 3, Rejected = 4, Converted = 5 }
export enum StockTransferStatus { Draft = 1, Completed = 2, Cancelled = 3 }

export const PurchaseOrderStatusLabels: Record<number, string> = {
  1: 'Draft', 2: 'Sent', 3: 'Partially received', 4: 'Received', 5: 'Cancelled',
};
export const QuotationStatusLabels: Record<number, string> = {
  1: 'Draft', 2: 'Sent', 3: 'Accepted', 4: 'Rejected', 5: 'Converted',
};
export const StockTransferStatusLabels: Record<number, string> = {
  1: 'Draft', 2: 'Completed', 3: 'Cancelled',
};

export interface DeliveryChallanLineDto {
  id: string; itemId: string; itemCode: string; itemName: string;
  unitId: string; unitCode: string; quantity: number; conversionFactor: number; baseQuantity: number;
}
export interface DeliveryChallanDto {
  id: string; number: string; date: string; customerId: string; customerName: string;
  godownId: string; godownName: string; salesInvoiceId?: string | null; salesInvoiceNumber?: string | null;
  status: DeliveryChallanStatus; vehicleNo?: string | null; driverName?: string | null; notes?: string | null;
  lines: DeliveryChallanLineDto[];
}
export interface SaveDeliveryChallanLineRequest { itemId: string; unitId: string; quantity: number; }
export interface SaveDeliveryChallanRequest {
  date: string; customerId: string; godownId: string; salesInvoiceId?: string | null;
  vehicleNo?: string | null; driverName?: string | null; notes?: string | null;
  lines: SaveDeliveryChallanLineRequest[];
}

export interface PurchaseOrderLineDto {
  id: string; itemId: string; itemCode: string; itemName: string; unitId: string; unitCode: string;
  quantity: number; conversionFactor: number; baseQuantity: number; rate: number; discount: number;
  lineTotal: number; receivedQuantity: number; pendingQuantity: number;
}
export interface PurchaseOrderDto {
  id: string; number: string; date: string; expectedDate?: string | null;
  supplierId: string; supplierName: string; godownId: string; godownName: string;
  status: PurchaseOrderStatus; subtotal: number; discount: number; taxRate: number;
  taxAmount: number; total: number; notes?: string | null; lines: PurchaseOrderLineDto[];
}
export interface SavePurchaseOrderLineRequest { itemId: string; unitId: string; quantity: number; rate: number; discount: number; }
export interface SavePurchaseOrderRequest {
  date: string; expectedDate?: string | null; supplierId: string; godownId: string;
  discount: number; taxRate: number; notes?: string | null; lines: SavePurchaseOrderLineRequest[];
}

export interface GrnLineDto {
  id: string; itemId: string; itemCode: string; itemName: string; unitId: string; unitCode: string;
  quantity: number; conversionFactor: number; baseQuantity: number; unitCost: number; lineCost: number;
}
export interface GrnDto {
  id: string; number: string; date: string; supplierId: string; supplierName: string;
  godownId: string; godownName: string; purchaseOrderId?: string | null; purchaseOrderNumber?: string | null;
  status: GrnStatus; notes?: string | null; lines: GrnLineDto[];
}
export interface SaveGrnLineRequest { itemId: string; unitId: string; quantity: number; unitCost: number; purchaseOrderLineId?: string | null; }
export interface SaveGrnRequest {
  date: string; supplierId: string; godownId: string; purchaseOrderId?: string | null;
  notes?: string | null; lines: SaveGrnLineRequest[];
}

export interface QuotationLineDto {
  id: string; itemId: string; itemCode: string; itemName: string; unitId: string; unitCode: string;
  quantity: number; conversionFactor: number; baseQuantity: number; rate: number; discount: number; lineTotal: number;
}
export interface QuotationDto {
  id: string; number: string; date: string; validUntil?: string | null; customerId: string; customerName: string;
  status: QuotationStatus; subtotal: number; discount: number; taxRate: number; taxAmount: number; total: number;
  convertedSalesInvoiceId?: string | null; convertedSalesInvoiceNumber?: string | null;
  notes?: string | null; lines: QuotationLineDto[];
}
export interface SaveQuotationLineRequest { itemId: string; unitId: string; quantity: number; rate: number; discount: number; }
export interface SaveQuotationRequest {
  date: string; validUntil?: string | null; customerId: string; discount: number; taxRate: number;
  notes?: string | null; lines: SaveQuotationLineRequest[];
}

export interface StockTransferLineDto {
  id: string; itemId: string; itemCode: string; itemName: string; quantity: number; unitCost: number;
}
export interface StockTransferDto {
  id: string; number: string; date: string; fromGodownId: string; fromGodownName: string;
  toGodownId: string; toGodownName: string; status: StockTransferStatus; notes?: string | null;
  lines: StockTransferLineDto[];
}
export interface SaveStockTransferLineRequest { itemId: string; quantity: number; }
export interface SaveStockTransferRequest {
  date: string; fromGodownId: string; toGodownId: string; notes?: string | null; lines: SaveStockTransferLineRequest[];
}

export interface AgeingBucketDto { label: string; daysFrom: number; daysTo?: number | null; amount: number; invoiceCount: number; }
export interface ReceivableAgeingDto {
  customerId: string; customerName: string; phone?: string | null; totalOutstanding: number; buckets: AgeingBucketDto[];
}
export interface PayableAgeingDto {
  supplierId: string; supplierName: string; phone?: string | null; totalOutstanding: number; buckets: AgeingBucketDto[];
}

export interface AuditLogDto {
  id: string; createdAt: string; action: string; entityType: string; entityId?: string | null;
  entityNumber?: string | null; userName?: string | null; details?: string | null;
}

export interface PurchaseReportLineDto {
  invoiceId: string; number: string; date: string; supplierName: string;
  subtotal: number; discount: number; taxAmount: number; total: number; paidAmount: number; balance: number;
}
export interface PurchaseReportDto {
  from: string; to: string; message: string; invoiceCount: number; totalAmount: number; lines: PurchaseReportLineDto[];
}

export interface StockValuationLineDto {
  itemId: string; itemCode: string; itemName: string; categoryName: string;
  quantity: number; unitCode: string; averageCost: number; stockValue: number;
}
export interface StockValuationReportDto {
  asOf: string; totalValue: number; itemCount: number; lines: StockValuationLineDto[];
}
