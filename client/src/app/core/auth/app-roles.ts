/** Built-in roles — keep in sync with backend AppRoles.cs */
export const AppRole = {
  Owner: 'Owner',
  Manager: 'Manager',
  Salesman: 'Salesman',
  StoreKeeper: 'StoreKeeper',
  Accountant: 'Accountant',
} as const;

export type AppRoleName = (typeof AppRole)[keyof typeof AppRole];

export const ALL_APP_ROLES: readonly AppRoleName[] = [
  AppRole.Owner,
  AppRole.Manager,
  AppRole.Salesman,
  AppRole.StoreKeeper,
  AppRole.Accountant,
];

const O = AppRole.Owner;
const M = AppRole.Manager;
const S = AppRole.Salesman;
const K = AppRole.StoreKeeper;
const A = AppRole.Accountant;

/** Who may open each route (view). Keys match router paths without leading slash. */
export const ROUTE_ROLES: Record<string, readonly AppRoleName[]> = {
  dashboard: ALL_APP_ROLES,

  'inventory/items': [O, M, K],
  'inventory/categories': [O, M, K],
  'inventory/units': [O, M, K],

  'stock/levels': [O, M, K],
  'stock/adjustments': [O, M, K],
  'stock/transfers': [O, M],

  'parties/customers': [O, M, S, A],
  'parties/suppliers': [O, M, K, A],

  'sales/invoices': [O, M, S],
  'sales/invoices/:id/print': [O, M, S],
  'sales/challans': [O, M, S],
  'sales/challans/:id/print': [O, M, S],
  'sales/quotations': [O, M, S],
  'sales/receipts': [O, M, S, A],
  'sales/returns': [O, M, S],
  'sales/receivables': [O, M, S, A],
  'sales/ledger': [O, M, S, A],

  'purchasing/invoices': [O, M, K, A],
  'purchasing/orders': [O, M, K],
  'purchasing/grns': [O, M, K],
  'purchasing/payments': [O, M, A],
  'purchasing/returns': [O, M, K, A],
  'purchasing/payables': [O, M, A],
  'purchasing/ledger': [O, M, A],

  expenses: [O, M, A],
  'expenses/categories': [O, M],

  'finance/cash-book': [O, M, A],
  'finance/day-book': [O, M, A],

  reports: ALL_APP_ROLES,
  'reports/profit-loss': [O, M, A],
  'reports/sales': [O, M, S, A],
  'reports/purchases': [O, M, K, A],
  'reports/expenses': [O, M, A],
  'reports/stock-valuation': [O, M, K],
  'reports/receivables-ageing': [O, M, S, A],
  'reports/payables-ageing': [O, M, A],

  'settings/company': [O, M],
  'settings/godowns': [O, M],
  'settings/users': [O, M],
  'settings/audit-log': [O, M],
};

/** Who may create / post on a route (matches API POST roles). */
export const ROUTE_WRITE_ROLES: Record<string, readonly AppRoleName[]> = {
  'inventory/items': [O, M, K],
  'inventory/categories': [O, M, K],
  'inventory/units': [O, M, K],

  'stock/levels': [O, M, K],
  'stock/adjustments': [O, M, K],
  'stock/transfers': [O, M],

  'parties/customers': [O, M, S],
  'parties/suppliers': [O, M],

  'sales/invoices': [O, M, S],
  'sales/challans': [O, M, S],
  'sales/quotations': [O, M, S],
  'sales/receipts': [O, M, S, A],
  'sales/returns': [O, M, S],

  'purchasing/invoices': [O, M, K, A],
  'purchasing/orders': [O, M],
  'purchasing/grns': [O, M],
  'purchasing/payments': [O, M, A],
  'purchasing/returns': [O, M, K, A],

  expenses: [O, M, A],
  'expenses/categories': [O, M],

  'settings/company': [O, M],
  'settings/godowns': [O, M],
  'settings/users': [O, M],
};

/** Who may delete records on a route (matches API DELETE roles). */
export const ROUTE_DELETE_ROLES: Record<string, readonly AppRoleName[]> = {
  'inventory/items': [O, M],
  'inventory/categories': [O, M],
  'inventory/units': [O, M],

  'stock/levels': [O, M],

  'parties/customers': [O, M],
  'parties/suppliers': [O, M],

  expenses: [O, M],
  'expenses/categories': [O, M],

  'settings/godowns': [O, M],
};

export interface NavItemDef {
  label: string;
  path: string;
  icon: string;
  routeKey: string;
}

export interface NavGroupDef {
  title: string;
  items: NavItemDef[];
}

export interface QuickLinkDef {
  label: string;
  actionLabel: string;
  path: string;
  routeKey: string;
  icon: string;
  primary?: boolean;
  openNew?: boolean;
}

/** High-frequency daily actions — shown in sidebar and on dashboard. */
export const APP_QUICK_LINKS: QuickLinkDef[] = [
  { label: 'Invoices', actionLabel: 'New invoice', path: '/sales/invoices', routeKey: 'sales/invoices', icon: '↗', primary: true, openNew: true },
  { label: 'Receipts', actionLabel: 'Record receipt', path: '/sales/receipts', routeKey: 'sales/receipts', icon: '₨', primary: true, openNew: true },
  { label: 'Receivables', actionLabel: 'Receivables', path: '/sales/receivables', routeKey: 'sales/receivables', icon: '◷' },
  { label: 'Customers', actionLabel: 'Customers', path: '/parties/customers', routeKey: 'parties/customers', icon: '☺' },
];

export const APP_NAV: NavGroupDef[] = [
  {
    title: 'Main',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: '▦', routeKey: 'dashboard' }],
  },
  {
    title: 'Daily sales',
    items: [
      { label: 'Invoices', path: '/sales/invoices', icon: '↗', routeKey: 'sales/invoices' },
      { label: 'Receipts', path: '/sales/receipts', icon: '₨', routeKey: 'sales/receipts' },
      { label: 'Receivables', path: '/sales/receivables', icon: '◷', routeKey: 'sales/receivables' },
      { label: 'Customers', path: '/parties/customers', icon: '☺', routeKey: 'parties/customers' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Quotations', path: '/sales/quotations', icon: '✎', routeKey: 'sales/quotations' },
      { label: 'Delivery challans', path: '/sales/challans', icon: '🚚', routeKey: 'sales/challans' },
      { label: 'Returns', path: '/sales/returns', icon: '⟲', routeKey: 'sales/returns' },
      { label: 'Customer ledger', path: '/sales/ledger', icon: '☰', routeKey: 'sales/ledger' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Items', path: '/inventory/items', icon: '▣', routeKey: 'inventory/items' },
      { label: 'Categories', path: '/inventory/categories', icon: '◫', routeKey: 'inventory/categories' },
      { label: 'Units', path: '/inventory/units', icon: '⚖', routeKey: 'inventory/units' },
      { label: 'Stock on hand', path: '/stock/levels', icon: '▥', routeKey: 'stock/levels' },
      { label: 'Adjustments', path: '/stock/adjustments', icon: '⇅', routeKey: 'stock/adjustments' },
      { label: 'Transfers', path: '/stock/transfers', icon: '⇄', routeKey: 'stock/transfers' },
    ],
  },
  {
    title: 'Parties',
    items: [
      { label: 'Suppliers', path: '/parties/suppliers', icon: '⛬', routeKey: 'parties/suppliers' },
    ],
  },
  {
    title: 'Purchasing',
    items: [
      { label: 'Purchase invoices', path: '/purchasing/invoices', icon: '↘', routeKey: 'purchasing/invoices' },
      { label: 'Supplier payments', path: '/purchasing/payments', icon: '₨', routeKey: 'purchasing/payments' },
      { label: 'Payables', path: '/purchasing/payables', icon: '◷', routeKey: 'purchasing/payables' },
      { label: 'Purchase orders', path: '/purchasing/orders', icon: '📋', routeKey: 'purchasing/orders' },
      { label: 'GRN', path: '/purchasing/grns', icon: '📦', routeKey: 'purchasing/grns' },
      { label: 'Purchase returns', path: '/purchasing/returns', icon: '⟲', routeKey: 'purchasing/returns' },
      { label: 'Supplier ledger', path: '/purchasing/ledger', icon: '☰', routeKey: 'purchasing/ledger' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Expenses', path: '/expenses', icon: '₨', routeKey: 'expenses' },
      { label: 'Cash book', path: '/finance/cash-book', icon: '▤', routeKey: 'finance/cash-book' },
      { label: 'Day book', path: '/finance/day-book', icon: '☰', routeKey: 'finance/day-book' },
      { label: 'Reports', path: '/reports', icon: '◷', routeKey: 'reports' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Godowns', path: '/settings/godowns', icon: '▤', routeKey: 'settings/godowns' },
      { label: 'Users', path: '/settings/users', icon: '⚇', routeKey: 'settings/users' },
      { label: 'Audit log', path: '/settings/audit-log', icon: '📜', routeKey: 'settings/audit-log' },
      { label: 'Company', path: '/settings/company', icon: '⚙', routeKey: 'settings/company' },
    ],
  },
];

export interface ReportLinkDef {
  title: string;
  description: string;
  path: string;
  routeKey: string;
}

export const REPORT_LINKS: ReportLinkDef[] = [
  { title: 'Profit & loss', description: 'Revenue, COGS, expenses and net profit for any period.', path: '/reports/profit-loss', routeKey: 'reports/profit-loss' },
  { title: 'Sales report', description: 'Invoice listing with totals, paid amounts and gross profit.', path: '/reports/sales', routeKey: 'reports/sales' },
  { title: 'Purchase report', description: 'Supplier bills with totals and balances.', path: '/reports/purchases', routeKey: 'reports/purchases' },
  { title: 'Expense report', description: 'Expenses by date and category with totals.', path: '/reports/expenses', routeKey: 'reports/expenses' },
  { title: 'Stock valuation', description: 'On-hand quantity and value per item.', path: '/reports/stock-valuation', routeKey: 'reports/stock-valuation' },
  { title: 'Receivables ageing', description: 'Customer outstanding by age bucket.', path: '/reports/receivables-ageing', routeKey: 'reports/receivables-ageing' },
  { title: 'Payables ageing', description: 'Supplier dues by age bucket.', path: '/reports/payables-ageing', routeKey: 'reports/payables-ageing' },
  { title: 'Cash & bank book', description: 'Running statement per payment account.', path: '/finance/cash-book', routeKey: 'finance/cash-book' },
  { title: 'Day book', description: 'All money movements for a single day.', path: '/finance/day-book', routeKey: 'finance/day-book' },
];
