
import type { Product } from '../types/product'

// Endereço do backend da BAZUH
const API_URL = 'http://127.0.0.1:3001/api'

// Buscar produtos cadastrados no SQLite
export async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_URL}/produtos`)

  if (!response.ok) {
    throw new Error('Erro ao consultar produtos no servidor.')
  }


  const products: Product[] = await response.json()

  return products
}


export async function createProduct(
  product: Product
): Promise<void> {
  const response = await fetch(`${API_URL}/produtos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  })

  if (!response.ok) {
    throw new Error('Erro ao cadastrar produto no SQLite.')
  }
}


export async function updateProduct(
  product: Product
): Promise<void> {
  const response = await fetch(
    `${API_URL}/produtos/${encodeURIComponent(product.id)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    }
  )

  if (!response.ok) {
    throw new Error('Erro ao atualizar produto no SQLite.')
  }
}


export async function deleteProduct(
  id: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/produtos/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  )

  if (!response.ok) {
    throw new Error('Erro ao excluir produto do SQLite.')
  }
}
