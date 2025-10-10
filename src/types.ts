export type PropertyType = 'residential' | 'commercial'
export type ResidentialSubtype = 'etw' | 'mfh'
export type CommercialSubtype = 'retail' | 'office' | 'logistics' | 'hospitality' | 'other'

export interface AnalysisInput {
  property_type: PropertyType
  residential_subtype?: ResidentialSubtype
  commercial_subtype?: CommercialSubtype
  year_built?: number

  purchase_price: number
  state:
    | 'BW'|'BY'|'BE'|'BB'|'HB'|'HH'|'HE'|'MV'|'NI'|'NW'|'RP'|'SL'|'SN'|'ST'|'SH'|'TH'
  building_share: number
  notary_rate: number
  broker_rate: number

  cold_rent_month: number
  vacancy_rate: number
  other_costs_month: number
  maintenance_month: number
  admin_month: number

  equity: number
  interest_rate_pct: number
  redemption_rate_pct: number

  afa_years?: number
  tax_rate_pct: number

  // commercial
  non_recoverable_costs_year: number
  avg_lease_term_years?: number
  lease_indexation_pct?: number
  vacancy_rate_com?: number
  vat_option: boolean
}

export interface AnalysisResult {
  grunderwerb_rate: number
  closing_costs: number
  total_cost: number
  loan_amount: number
  annuity_year: number

  net_rent_year: number
  operating_costs_year: number

  afa_year: number
  tax_savings_year: number

  cashflow_year: number
  cashflow_month: number
  gross_yield_pct: number
  net_yield_pct: number
  roe_pct: number

  // commercial
  noi_year?: number | null
  niy_pct?: number | null
  dscr?: number | null
  walt_years?: number | null

  score: 'BUY' | 'CHECK' | 'NO'
  notes?: string | null
}

export interface SensitivityResponse {
  baseline: AnalysisResult
  interest_up: AnalysisResult
  interest_down: AnalysisResult
  rent_up: AnalysisResult
  rent_down: AnalysisResult
}
