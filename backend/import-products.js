
const fs = require('node:fs')
const path = require('node:path')
const db = require('./database/db')


const backupPath = path.resolve(
  __dirname,
  'backups/backup-produtos-bazuh-2026-11-05.json'
)


const products = JSON.parse(
  fs.readFileSync(backupPath, 'utf8')
)

if (!Array.isArray(products) || products.length === 0) {
  throw new Error('Backup vazio ou inválido.')
}

const insert = db.prepare(`
  INSERT INTO products (
    id, code, name, category, description,
    costPrice, salePrice, stock, minStock, createdAt
  ) VALUES (
    @id, @code, @name, @category, @description,
    @costPrice, @salePrice, @stock, @minStock, @createdAt
  )
`)

const importProducts = db.transaction((items) => {
  const existing = db.prepare(
    'SELECT COUNT(*) AS total FROM products'
  ).get()

  if (existing.total !== 0) {
    throw new Error(
      'Importação cancelada: o banco já contém produtos.'
    )
  }

  for (const product of items) {
    insert.run({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      description: product.description ?? '',
      costPrice: product.costPrice,
      salePrice: product.salePrice,
      stock: product.stock,
      minStock: product.minStock,
      createdAt: product.createdAt
    })
  }
})

importProducts(products)

console.log(
  `BAZUH: ${products.length} produtos importados com sucesso!`
)
