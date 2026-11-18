
const API_URL = 'http://127.0.0.1:3003'

export type ApiSaleItem = {
  productId: string
  productCode: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type ApiSale = {
  id: string
  items: ApiSaleItem[]
  total: number
  paymentMethod: string
  amountReceived: number
  change: number
  date: string
  status?: 'completed' | 'cancelled'
  cancelledAt?: string | null
}

export async function getMigrationSales(): Promise<ApiSale[]> {
  const response = await fetch(`${API_URL}/api/vendas`)

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar vendas: HTTP ${response.status}`
    )
  }

  const data: unknown = await response.json()

  if (!Array.isArray(data)) {
    throw new Error('Formato inválido de vendas retornado pela API')
  }

  return data as ApiSale[]
}
