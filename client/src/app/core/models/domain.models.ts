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
