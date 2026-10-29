
export interface Product {
  id: string
  code: string
  name: string
  category: string
  description: string
  costPrice: number
  salePrice: number
  stock: number
  minStock: number
  createdAt: string
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt'>
