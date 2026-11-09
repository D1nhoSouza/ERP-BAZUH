
const fs = require('fs')
const path = require('path')

const file = path.join(
  __dirname,
  'backup-bazuh-pdv-2026-11-06T04-31-05-916Z.json'
)

const backup = JSON.parse(
  fs.readFileSync(file, 'utf8')
)

if (
  backup.app !== 'bazuh-pdv' ||
  backup.version !== 2 ||
  !Array.isArray(backup.data?.products) ||
  !Array.isArray(backup.data?.sales)
) {
  throw new Error('Backup inválido.')
}

const products = backup.data.products
const sales = backup.data.sales

const normalizePayment = (method) => {
  const value = String(method).trim().toLowerCase()

  const methods = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    débito: 'Débito',
    credito: 'Crédito',
    crédito: 'Crédito'
  }

  if (!methods[value]) {
    throw new Error(`Pagamento desconhecido: ${method}`)
  }

  return methods[value]
}

const normalizedSales = sales.map(sale => ({
  id: sale.id,
  total: sale.total,
  paymentMethod: normalizePayment(sale.paymentMethod),
  status: sale.status === 'cancelled'
    ? 'cancelled'
    : 'completed',
  cancelledAt: sale.cancelledAt ?? null,
  items: sale.items.length
}))

console.log('\nBAZUH - PRÉ-VISUALIZAÇÃO DA MIGRAÇÃO')

console.log('Produtos:', products.length)
console.log('Vendas:', normalizedSales.length)

console.log(
  'Estoque:',
  products.reduce(
    (sum, product) => sum + product.stock,
    0
  )
)

console.log('\nHistórico de vendas:')
console.table(normalizedSales)

const validSales = normalizedSales.filter(
  sale => sale.status === 'completed'
)

console.log(
  'Receita válida: R$',
  validSales.reduce(
    (sum, sale) => sum + sale.total,
    0
  ).toFixed(2)
)

console.log('\nNenhum dado foi alterado.')
