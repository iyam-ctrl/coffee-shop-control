export type AppRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'ACCOUNTING'

export type Database = {
  public: {
    Tables: {
      businesses: Record<string, unknown>
      stores: Record<string, unknown>
      user_profiles: Record<string, unknown>
      business_members: Record<string, unknown>
      store_members: Record<string, unknown>
      product_categories: Record<string, unknown>
      products: Record<string, unknown>
      units: Record<string, unknown>
      ingredients: Record<string, unknown>
      recipes: Record<string, unknown>
      recipe_items: Record<string, unknown>
      sales: Record<string, unknown>
      sale_items: Record<string, unknown>
      payments: Record<string, unknown>
      inventory_balances: Record<string, unknown>
      inventory_movements: Record<string, unknown>
      goods_receipts: Record<string, unknown>
      goods_receipt_items: Record<string, unknown>
      stock_opnames: Record<string, unknown>
      stock_opname_items: Record<string, unknown>
      waste_records: Record<string, unknown>
      shifts: Record<string, unknown>
      cash_deposits: Record<string, unknown>
      expenses: Record<string, unknown>
      audit_logs: Record<string, unknown>
    }
  }
}
