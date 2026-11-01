import { useEffect, useState } from 'react'

type Product = {
  id: string
  code: string
  name: string
  category: string
  salePrice: number
  stock: number
}

type CartItem = {
  product: Product
  quantity: number
}

type Sale = {
  id: string
  items: CartItem[]
  total: number
  paymentMethod: string
  amountReceived: number
  change: number
  date: string
}

const STORAGE_KEY = 'bazuh-pdv-products'
const SALES_STORAGE_KEY = 'bazuh-pdv-sales'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function Sales() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('')
  const [amountReceived, setAmountReceived] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      setProducts(saved ? JSON.parse(saved) : [])
    } catch {
      setProducts([])
    }
  }, [])

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase()

    return (
      product.name.toLowerCase().includes(term) ||
      product.code.toLowerCase().includes(term)
    )
  })

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      alert('Este produto não possui estoque disponível.')
      return
    }

    const existingItem = cart.find(
      (item) => item.product.id === product.id,
    )

    if (existingItem && existingItem.quantity >= product.stock) {
      alert('A quantidade no carrinho não pode ultrapassar o estoque.')
      return
    }

    setCart((currentCart) => {
      const item = currentCart.find(
        (entry) => entry.product.id === product.id,
      )

      if (item) {
        return currentCart.map((entry) =>
          entry.product.id === product.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        )
      }

      return [...currentCart, { product, quantity: 1 }]
    })
  }

  function changeQuantity(productId: string, quantity: number) {
    const item = cart.find(
      (entry) => entry.product.id === productId,
    )

    if (!item) return

    if (quantity <= 0) {
      setCart((currentCart) =>
        currentCart.filter(
          (entry) => entry.product.id !== productId,
        ),
      )
      return
    }

    if (quantity > item.product.stock) {
      alert('A quantidade não pode ultrapassar o estoque disponível.')
      return
    }

    setCart((currentCart) =>
      currentCart.map((entry) =>
        entry.product.id === productId
          ? { ...entry, quantity }
          : entry,
      ),
    )
  }

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  const totalPrice = cart.reduce(
    (total, item) =>
      total + item.product.salePrice * item.quantity,
    0,
  )

  const receivedValue = Number(amountReceived) || 0
  const change = receivedValue - totalPrice

  const canFinalize =
    cart.length > 0 &&
    paymentMethod !== '' &&
    (paymentMethod !== 'Dinheiro' || receivedValue >= totalPrice)

  function finalizeSale() {
  if (!canFinalize) return

  try {
    const savedProducts = localStorage.getItem(STORAGE_KEY)
    const currentProducts: Product[] = savedProducts
      ? JSON.parse(savedProducts)
      : []

    // Confere se ainda existe estoque suficiente
    for (const item of cart) {
      const currentProduct = currentProducts.find(
        (product) => product.id === item.product.id,
      )

      if (!currentProduct || currentProduct.stock < item.quantity) {
        alert(`Estoque insuficiente para: ${item.product.name}`)
        setProducts(currentProducts)
        return
      }
    }

    // Calcula o novo estoque
    const updatedProducts = currentProducts.map((product) => {
      const cartItem = cart.find(
        (item) => item.product.id === product.id,
      )

      if (!cartItem) return product

      return {
        ...product,
        stock: product.stock - cartItem.quantity,
      }
    })

    const savedSales = localStorage.getItem(SALES_STORAGE_KEY)
    const sales: Sale[] = savedSales
      ? JSON.parse(savedSales)
      : []

    const sale: Sale = {
      id: crypto.randomUUID(),
      items: cart.map((item) => ({
        product: { ...item.product },
        quantity: item.quantity,
      })),
      total: totalPrice,
      paymentMethod,
      amountReceived:
        paymentMethod === 'Dinheiro' ? receivedValue : totalPrice,
      change: paymentMethod === 'Dinheiro' ? change : 0,
      date: new Date().toISOString(),
    }

    sales.push(sale)

    // Salva a venda e o estoque atualizado
    localStorage.setItem(
      SALES_STORAGE_KEY,
      JSON.stringify(sales),
    )

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedProducts),
    )

    // Atualiza os produtos na tela imediatamente
    setProducts(updatedProducts)

    alert('Venda registrada com sucesso!')

    setCart([])
    setPaymentMethod('')
    setAmountReceived('')
  } catch (error) {
    console.error('Erro ao registrar venda:', error)
    alert('Não foi possível registrar a venda.')
  }
}

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Nova venda</h1>
          <p>Selecione os produtos para iniciar uma venda.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-heading">
          <div>
            <h3>Pagamento</h3>
            <br />
            <p>Selecione como o cliente vai pagar.</p>
            <br />
          </div>
        </div>

        <div className="products-toolbar">
          <select
            value={paymentMethod}
            onChange={(event) => {
              setPaymentMethod(event.target.value)
              setAmountReceived('')
            }}
          >
            <option value="">Selecione a forma de pagamento</option>
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Débito">Cartão de débito</option>
            <option value="Crédito">Cartão de crédito</option>
          </select>
        </div>

        {paymentMethod === 'Dinheiro' && (
          <div style={{ marginTop: '16px' }}>
            <label htmlFor="amountReceived">
              Valor recebido
              <br />
              <br />
            </label>

            <input
              id="amountReceived"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={amountReceived}
              onChange={(event) =>
                setAmountReceived(event.target.value)
              }
            />

            <p>
              Troco:{' '}
              <strong>
                {formatCurrency(Math.max(0, change))}
              </strong>
            </p>

            {receivedValue < totalPrice &&
              amountReceived !== '' && (
                <p style={{ color: '#dc2626' }}>
                  O valor recebido é menor que o total da venda.
                </p>
              )}
          </div>
        )}
      </div>

      <div className="products-toolbar">
        <input
          type="text"
          placeholder="Buscar produto por nome ou código..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="products-grid">
        {filteredProducts.length === 0 ? (
          <p>Nenhum produto encontrado.</p>
        ) : (
          filteredProducts.map((product) => (
            <div className="product-card" key={product.id}>
              <h3>{product.name}</h3>
              <p>Código: {product.code}</p>
              <p>Categoria: {product.category}</p>
              <p>Estoque: {product.stock}</p>

              <strong>{formatCurrency(product.salePrice)}</strong>

              <button
                type="button"
                className="primary-button"
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
              >
                Adicionar ao carrinho
              </button>
            </div>
          ))
        )}
      </div>

      <section
        className="panel"
        style={{ marginTop: '24px' }}
      >
        <div className="panel-heading">
          <div>
            <h3>Carrinho da venda</h3>
            <p>{totalItems} unidade(s) selecionada(s)</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhum produto adicionado</strong>
            <p>Selecione um produto acima para começar.</p>
          </div>
        ) : (
          <div>
            {cart.map((item) => (
              <div
                key={item.product.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: '1px solid #e5e7eb',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <strong>{item.product.name}</strong>
                  <p>
                    {formatCurrency(item.product.salePrice)} por
                    unidade
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      changeQuantity(
                        item.product.id,
                        item.quantity - 1,
                      )
                    }
                  >
                    −
                  </button>

                  <strong>{item.quantity}</strong>

                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      changeQuantity(
                        item.product.id,
                        item.quantity + 1,
                      )
                    }
                    disabled={item.quantity >= item.product.stock}
                  >
                    +
                  </button>
                </div>

                <strong>
                  {formatCurrency(
                    item.product.salePrice * item.quantity,
                  )}
                </strong>

                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    changeQuantity(item.product.id, 0)
                  }
                >
                  Remover
                </button>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                paddingTop: '20px',
                flexWrap: 'wrap',
              }}
            >
              <strong>Total da venda</strong>
              <strong style={{ fontSize: '1.4rem' }}>
                {formatCurrency(totalPrice)}
              </strong>
            </div>

            <button
              type="button"
              className="text-button"
              style={{ marginTop: '16px' }}
              onClick={() => setCart([])}
            >
              Limpar carrinho
            </button>

            <button
              type="button"
              className="primary-button"
              style={{ marginTop: '16px', marginLeft: '12px' }}
              disabled={!canFinalize}
              onClick={finalizeSale}
            >
              Finalizar venda
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default Sales
