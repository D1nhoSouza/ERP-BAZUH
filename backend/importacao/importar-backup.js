
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const backupPath = path.join(
  __dirname,
  'backup-bazuh-pdv-2026-11-06T04-31-05-916Z.json'
)

const dbPath = path.resolve(
  __dirname,
  '..',
  'backups',
  'bazuh-migracao-teste.sqlite'
)

const backup = JSON.parse(
  fs.readFileSync(backupPath, 'utf8')
)

if (
  backup.app !== 'bazuh-pdv' ||
  backup.version !== 2 ||
  !Array.isArray(backup.data?.products) ||
  !Array.isArray(backup.data?.sales)
) {
  throw new Error('Formato de backup inválido.')
}

const products = backup.data.products
const sales = backup.data.sales

const normalizePayment = (method) => {
  const methods = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    débito: 'Débito',
    debito: 'Débito',
    crédito: 'Crédito',
    credito: 'Crédito'
  }

  const normalized = methods[
    String(method).trim().toLowerCase()
  ]

  if (!normalized) {
    throw new Error(
      `Forma de pagamento inválida: ${method}`
    )
  }

  return normalized
}

const db = new Database(dbPath, {
  fileMustExist: true
})

db.pragma('foreign_keys = ON')

try {
  const importTransaction = db.transaction(() => {
    for (const table of ['products', 'sales', 'sale_items']) {
      const result = db.prepare(
        `SELECT COUNT(*) AS total FROM ${table}`
      ).get()

      if (result.total !== 0) {
        throw new Error(
          `A tabela ${table} não está vazia. Importação cancelada.`
        )
      }
    }

    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, code, name, category, description,
        costPrice, salePrice, stock, minStock, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertSale = db.prepare(`
      INSERT INTO sales (
        id, total, paymentMethod, amountReceived,
        change, date, status, cancelledAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const insertItem = db.prepare(`
      INSERT INTO sale_items (
        saleId, productId, productCode,
        productName, quantity, unitPrice, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const product of products) {
      insertProduct.run(
        product.id,
        product.code,
        product.name,
        product.category,
        product.description ?? '',
        product.costPrice,
        product.salePrice,
        product.stock,
        product.minStock,
        product.createdAt
      )
    }

    for (const sale of sales) {
      const status =
        sale.status === 'cancelled'
          ? 'cancelled'
          : 'completed'

      insertSale.run(
        sale.id,
        sale.total,
        normalizePayment(sale.paymentMethod),
        sale.amountReceived,
        sale.change,
        sale.date,
        status,
        status === 'cancelled'
          ? sale.cancelledAt ?? null
          : null
      )

      for (const item of sale.items) {
        const product = item.product

        const quantity = item.quantity
        const unitPrice = product.salePrice

        insertItem.run(
          sale.id,
          product.id,
          product.code,
          product.name,
          quantity,
          unitPrice,
          Math.round(quantity * unitPrice * 100) / 100
        )
      }
    }
  })

  importTransaction()

  console.log('IMPORTAÇÃO CONCLUÍDA')

  for (const table of ['products', 'sales', 'sale_items']) {
    const result = db.prepare(
      `SELECT COUNT(*) AS total FROM ${table}`
    ).get()

    console.log(`${table}: ${result.total}`)
  }

  const stock = db.prepare(`
    SELECT COALESCE(SUM(stock), 0) AS total
    FROM products
  `).get()

  const revenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE status = 'completed'
  `).get()

  console.log('Estoque:', stock.total)
  console.log('Receita válida:', revenue.total)
  console.log(
    'Integridade:',
    db.pragma('integrity_check', { simple: true })
  )

} catch (error) {
  console.error('IMPORTAÇÃO CANCELADA:', error.message)
  process.exitCode = 1
} finally {
  db.close()
}
