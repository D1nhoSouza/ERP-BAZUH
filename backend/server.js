
const express = require('express')
const cors = require('cors')
const db = require('./database/db')

// ============================================
// CONFIGURAÇÃO DO SERVIDOR
// ============================================

const app = express()
const PORT = process.env.BAZUH_ENV === 'test' ? 3002 : 3001

app.use(cors())
app.use(express.json())

// ============================================
// STATUS DO BACKEND
// ============================================

app.get('/api/status', (req, res) => {
  res.json({
    sistema: 'BAZUH PDV',
    status: 'online',
    mensagem: 'Backend funcionando corretamente!'
  })
})

// ============================================
// API DE PRODUTOS
// ============================================

// Consultar produtos
app.get('/api/produtos', (req, res) => {
  try {
    const products = db
      .prepare('SELECT * FROM products ORDER BY name ASC')
      .all()

    res.json(products)
  } catch (error) {
    console.error('Erro ao consultar produtos:', error)

    res.status(500).json({
      erro: 'Não foi possível consultar os produtos.'
    })
  }
})

// Cadastrar produto
app.post('/api/produtos', (req, res) => {
  try {
    const {
      id,
      code,
      name,
      category,
      description = '',
      costPrice,
      salePrice,
      stock,
      minStock,
      createdAt
    } = req.body ?? {}

    if (
      typeof id !== 'string' || !id.trim() ||
      typeof code !== 'string' || !code.trim() ||
      typeof name !== 'string' || !name.trim() ||
      typeof category !== 'string' || !category.trim() ||
      typeof description !== 'string' ||
      typeof createdAt !== 'string' || !createdAt.trim() ||
      !Number.isFinite(costPrice) || costPrice < 0 ||
      !Number.isFinite(salePrice) || salePrice < 0 ||
      !Number.isSafeInteger(stock) || stock < 0 ||
      !Number.isSafeInteger(minStock) || minStock < 0
    ) {
      return res.status(400).json({
        erro: 'Dados do produto inválidos.'
      })
    }

    const statement = db.prepare(`
      INSERT INTO products (
        id, code, name, category, description,
        costPrice, salePrice, stock, minStock, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    statement.run(
      id, code, name, category, description,
      costPrice, salePrice, stock, minStock, createdAt
    )

    res.status(201).json({
      mensagem: 'Produto cadastrado com sucesso!',
      id,
      code,
      name
    })
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error)

    if (
      error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    ) {
      return res.status(409).json({
        erro: 'ID ou código de produto já cadastrado.'
      })
    }

    res.status(500).json({
      erro: 'Não foi possível cadastrar o produto.'
    })
  }
})

// Atualizar produto
app.put('/api/produtos/:id', (req, res) => {
  try {
    const { id } = req.params

    const {
      code,
      name,
      category,
      description = '',
      costPrice,
      salePrice,
      stock,
      minStock
    } = req.body ?? {}

    if (
      typeof code !== 'string' || !code.trim() ||
      typeof name !== 'string' || !name.trim() ||
      typeof category !== 'string' || !category.trim() ||
      typeof description !== 'string' ||
      !Number.isFinite(costPrice) || costPrice < 0 ||
      !Number.isFinite(salePrice) || salePrice < 0 ||
      !Number.isSafeInteger(stock) || stock < 0 ||
      !Number.isSafeInteger(minStock) || minStock < 0
    ) {
      return res.status(400).json({
        erro: 'Dados do produto inválidos.'
      })
    }

    const result = db.prepare(`
      UPDATE products
      SET
        code = ?,
        name = ?,
        category = ?,
        description = ?,
        costPrice = ?,
        salePrice = ?,
        stock = ?,
        minStock = ?
      WHERE id = ?
    `).run(
      code, name, category, description,
      costPrice, salePrice, stock, minStock, id
    )

    if (result.changes === 0) {
      return res.status(404).json({
        erro: 'Produto não encontrado.'
      })
    }

    res.json({
      mensagem: 'Produto atualizado com sucesso!',
      id
    })
  } catch (error) {
    console.error('Erro ao atualizar produto:', error)

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        erro: 'Código de produto já cadastrado.'
      })
    }

    res.status(500).json({
      erro: 'Não foi possível atualizar o produto.'
    })
  }
})

// Excluir produto
app.delete('/api/produtos/:id', (req, res) => {
  try {
    const { id } = req.params

    const result = db.prepare(`
      DELETE FROM products
      WHERE id = ?
    `).run(id)

    if (result.changes === 0) {
      return res.status(404).json({
        erro: 'Produto não encontrado.'
      })
    }

    res.json({
      mensagem: 'Produto excluído com sucesso!',
      id
    })
  } catch (error) {
    console.error('Erro ao excluir produto:', error)

    res.status(500).json({
      erro: 'Não foi possível excluir o produto.'
    })
  }
})

// ============================================
// API DE VENDAS — BAZUH PDV
// ============================================

// Consultas SQL
const insertSale = db.prepare(`
  INSERT INTO sales (
    id, total, paymentMethod,
    amountReceived, change, date
  ) VALUES (?, ?, ?, ?, ?, ?)
`)

const insertSaleItem = db.prepare(`
  INSERT INTO sale_items (
    saleId, productId, productCode,
    productName, quantity, unitPrice, subtotal
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const decreaseProductStock = db.prepare(`
  UPDATE products
  SET stock = stock - ?
  WHERE id = ? AND stock >= ?
`)

const findSaleProduct = db.prepare(`
  SELECT id, code, name, salePrice, stock
  FROM products
  WHERE id = ?
`)

const findExistingSale = db.prepare(`
  SELECT id FROM sales WHERE id = ?
`)

// ============================================
// TRANSAÇÃO DE VENDAS
// ============================================

// A transação está preparada, mas ainda
// não é executada pela rota da API.

const registerSaleTransaction = db.transaction((sale) => {
  const {
    id,
    items,
    paymentMethod,
    amountReceived,
    date
  } = sale

  // Impedir venda duplicada
  if (findExistingSale.get(id)) {
    throw new Error('VENDA_DUPLICADA')
  }

  const quantities = new Map()

  // Agrupar quantidades
  for (const item of items) {
    const productId = item.product.id

    if (
      typeof productId !== 'string' ||
      !productId.trim() ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error('ITEM_INVALIDO')
    }

    const quantity =
      (quantities.get(productId) ?? 0) + item.quantity

    if (!Number.isSafeInteger(quantity)) {
      throw new Error('ITEM_INVALIDO')
    }

    quantities.set(productId, quantity)
  }

  const saleItems = []
  let totalCents = 0

  // Verificar preços e estoque
  for (const [productId, quantity] of quantities) {
    const product = findSaleProduct.get(productId)

    if (!product) {
      throw new Error('PRODUTO_NAO_ENCONTRADO')
    }

    if (product.stock < quantity) {
      throw new Error('ESTOQUE_INSUFICIENTE')
    }

    const priceCents = Math.round(product.salePrice * 100)

    if (
      !Number.isFinite(product.salePrice) ||
      !Number.isSafeInteger(priceCents) ||
      priceCents < 0
    ) {
      throw new Error('PRECO_INVALIDO')
    }

    const subtotalCents = priceCents * quantity

    if (!Number.isSafeInteger(subtotalCents)) {
      throw new Error('VALOR_INVALIDO')
    }

    totalCents += subtotalCents

    if (!Number.isSafeInteger(totalCents)) {
      throw new Error('VALOR_INVALIDO')
    }

    saleItems.push({
      product,
      quantity,
      unitPrice: priceCents / 100,
      subtotal: subtotalCents / 100
    })
  }

  const total = totalCents / 100

  // ============================================
  // VALIDAR PAGAMENTO
  // ============================================

  if (
    !Number.isFinite(amountReceived) ||
    amountReceived < 0
  ) {
    throw new Error('PAGAMENTO_INVALIDO')
  }

  const receivedCents =
    paymentMethod === 'Dinheiro'
      ? Math.round(amountReceived * 100)
      : totalCents

  if (!Number.isSafeInteger(receivedCents)) {
    throw new Error('PAGAMENTO_INVALIDO')
  }

  if (
    paymentMethod === 'Dinheiro' &&
    receivedCents < totalCents
  ) {
    throw new Error('PAGAMENTO_INSUFICIENTE')
  }

  const changeCents =
    paymentMethod === 'Dinheiro'
      ? receivedCents - totalCents
      : 0

  if (!Number.isSafeInteger(changeCents)) {
    throw new Error('PAGAMENTO_INVALIDO')
  }

  // ============================================
  // REGISTRAR VENDA NO SQLITE
  // ============================================

  insertSale.run(
    id,
    total,
    paymentMethod,
    receivedCents / 100,
    changeCents / 100,
    date
  )

  // Registrar itens e diminuir estoque
  for (const item of saleItems) {
    const {
      product,
      quantity,
      unitPrice,
      subtotal
    } = item

    insertSaleItem.run(
      id,
      product.id,
      product.code,
      product.name,
      quantity,
      unitPrice,
      subtotal
    )

    const result = decreaseProductStock.run(
      quantity,
      product.id,
      quantity
    )

    if (result.changes !== 1) {
      throw new Error('ESTOQUE_INSUFICIENTE')
    }
  }

  return {
    id,
    total,
    paymentMethod,
    amountReceived: receivedCents / 100,
    change: changeCents / 100,
    date
  }
})

// ============================================
// TRATAMENTO DE ERROS DAS VENDAS
// ============================================

function handleSaleError(error, res) {
  const errors = {
    VENDA_DUPLICADA: [
      409,
      'Esta venda já foi registrada.'
    ],
    ITEM_INVALIDO: [
      400,
      'Produto ou quantidade inválida.'
    ],
    PRODUTO_NAO_ENCONTRADO: [
      404,
      'Produto não encontrado.'
    ],
    ESTOQUE_INSUFICIENTE: [
      409,
      'Estoque insuficiente.'
    ],
    PRECO_INVALIDO: [
      422,
      'Preço do produto inválido.'
    ],
    VALOR_INVALIDO: [
      422,
      'Valor total da venda inválido.'
    ],
    PAGAMENTO_INVALIDO: [
      400,
      'Pagamento inválido.'
    ],
    PAGAMENTO_INSUFICIENTE: [
      400,
      'Valor recebido insuficiente.'
    ]
  }

  const knownError = errors[error.message]

  if (knownError) {
    return res.status(knownError[0]).json({
      erro: knownError[1]
    })
  }

  console.error('Erro ao registrar venda:', error)

  return res.status(500).json({
    erro: 'Não foi possível registrar a venda.'
  })
}

// ============================================
// ROTA POST /api/vendas
// ============================================

app.post('/api/vendas', (req, res) => {
  const {
    id,
    items,
    paymentMethod,
    amountReceived,
    date
  } = req.body ?? {}

  // Validar dados obrigatórios
  if (
    typeof id !== 'string' ||
    !id.trim() ||
    !Array.isArray(items) ||
    items.length === 0 ||
    !['Dinheiro', 'PIX', 'Débito', 'Crédito'].includes(paymentMethod)
  ) {
    return res.status(400).json({
      erro: 'Dados da venda inválidos.'
    })
  }

  // Validar itens
  const invalidItem = items.some(item => (
    !item ||
    typeof item !== 'object' ||
    typeof item.product?.id !== 'string' ||
    !item.product.id.trim() ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity <= 0
  ))

  if (invalidItem) {
    return res.status(400).json({
      erro: 'Produto ou quantidade inválida na venda.'
    })
  }

  // Validar valor recebido
  if (
    amountReceived !== undefined &&
    (
      !Number.isFinite(amountReceived) ||
      amountReceived < 0
    )
  ) {
    return res.status(400).json({
      erro: 'Valor recebido inválido.'
    })
  }

  // Validar data
  if (
    date !== undefined &&
    (
      typeof date !== 'string' ||
      !Number.isFinite(Date.parse(date))
    )
  ) {
    return res.status(400).json({
      erro: 'Data da venda inválida.'
    })
  }

  // Agrupar quantidades
  const quantities = new Map()

  for (const item of items) {
    const productId = item.product.id

    const requestedQuantity =
      (quantities.get(productId) ?? 0) + item.quantity

    if (!Number.isSafeInteger(requestedQuantity)) {
      return res.status(400).json({
        erro: 'Quantidade total inválida na venda.'
      })
    }

    quantities.set(productId, requestedQuantity)
  }

  // Verificar produtos e estoque
  try {
    for (const [productId, requestedQuantity] of quantities) {
      const product = findSaleProduct.get(productId)

      if (!product) {
        return res.status(404).json({
          erro: 'Produto não encontrado no banco de dados.',
          productId
        })
      }

      if (requestedQuantity > product.stock) {
        return res.status(409).json({
          erro: 'Estoque insuficiente para realizar a venda.',
          produto: product.name,
          estoqueDisponivel: product.stock,
          quantidadeSolicitada: requestedQuantity
        })
      }
    }
  } catch (error) {
    console.error('Erro ao verificar estoque:', error)

    return res.status(500).json({
      erro: 'Não foi possível verificar os produtos da venda.'
    })
  }

  // Preparar dados
  const saleData = {
    id,
    items,
    paymentMethod,
    amountReceived: amountReceived ?? 0,
    date: date ?? new Date().toISOString()
  }

  // ============================================
  // PROTEÇÃO DO AMBIENTE DE PRODUÇÃO
  // ============================================

  if (process.env.BAZUH_ENV !== 'test') {
    return res.status(501).json({
      erro: 'Registro de vendas ainda desativado em produção.'
    })
  }

  // ============================================
  // AMBIENTE DE TESTES
  // ============================================

  // A transação ainda NÃO será executada.
  // Na próxima etapa conectaremos a função
  // registerSaleTransaction com tratamento
  // de erros, somente no ambiente de testes.


  try {
    const registeredSale = registerSaleTransaction(saleData)

    return res.status(201).json({
      mensagem: 'Venda de teste registrada com sucesso!',
      venda: registeredSale
    })
  } catch (error) {
    return handleSaleError(error, res)
  }

})


app.get('/api/vendas', (req, res) => {
  if (process.env.BAZUH_ENV !== 'test') {
    return res.status(501).json({
      erro: 'Consulta de vendas desativada em producao.'
    })
  }

  try {
    const columns = db.prepare(
      'PRAGMA table_info(sales)'
    ).all().map(column => column.name)

    if (
      !columns.includes('status') ||
      !columns.includes('cancelledAt')
    ) {
      return res.status(503).json({
        erro: 'Banco ainda nao preparado para historico.'
      })
    }

    const sales = db.prepare(`
      SELECT
        id, total, paymentMethod,
        amountReceived, change, date,
        status, cancelledAt
      FROM sales
      ORDER BY date DESC
    `).all()

    const getItems = db.prepare(`
      SELECT
        productId, productCode, productName,
        quantity, unitPrice, subtotal
      FROM sale_items
      WHERE saleId = ?
      ORDER BY id
    `)

    const history = sales.map(sale => ({
      ...sale,
      items: getItems.all(sale.id)
    }))

    return res.json(history)
  } catch (error) {
    console.error('Erro ao consultar vendas:', error)

    return res.status(500).json({
      erro: 'Erro interno ao consultar historico.'
    })
  }
})


// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, '127.0.0.1', () => {
  console.log(
    `BAZUH Backend rodando em http://127.0.0.1:${PORT}`
  )
})
