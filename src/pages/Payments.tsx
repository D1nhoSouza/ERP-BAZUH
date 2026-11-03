
import { useEffect, useMemo, useState } from 'react'

type Sale = {
  id: string
  total: number
  paymentMethod: string
  amountReceived: number
  change: number
  date: string
  items: {
    product: {
      id: string
      code: string
      name: string
      salePrice: number
    }
    quantity: number
  }[]
}

const SALES_STORAGE_KEY = 'bazuh-pdv-sales'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('pt-BR')
}

export default function Payments() {
  const [sales, setSales] = useState<Sale[]>([])
  const [period, setPeriod] = useState('month')
  const [method, setMethod] = useState('all')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SALES_STORAGE_KEY)
      setSales(saved ? JSON.parse(saved) : [])
    } catch {
      setSales([])
    }
  }, [])

  const filteredSales = useMemo(() => {
    const now = new Date()

    return sales.filter((sale) => {
      const saleDate = new Date(sale.date)

      const matchesPeriod =
        period === 'all' ||
        (period === 'today' &&
          saleDate.toDateString() === now.toDateString()) ||
        (period === 'month' &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear())

      const matchesMethod =
        method === 'all' || sale.paymentMethod === method

      return matchesPeriod && matchesMethod
    }).sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [sales, period, method])

  const totalReceived = filteredSales.reduce(
    (total, sale) => total + sale.total,
    0
  )

  const paymentMethods = ['Pix', 'Dinheiro', 'Débito', 'Crédito']

  const totalsByMethod = paymentMethods.map((paymentMethod) => ({
    name: paymentMethod,
    total: filteredSales
      .filter((sale) => sale.paymentMethod === paymentMethod)
      .reduce((total, sale) => total + sale.total, 0),
    count: filteredSales.filter(
      (sale) => sale.paymentMethod === paymentMethod
    ).length,
  }))

  return (
    <div className="page-content">
      <div className="welcome-section">
        <div>
          <h2>Pagamentos</h2>
          <p>
            Acompanhe os recebimentos e as formas de pagamento da loja.
          </p>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">R$</div>
          <span>Total recebido</span>
          <strong>{formatCurrency(totalReceived)}</strong>
          <small>{filteredSales.length} pagamento(s)</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">↗</div>
          <span>Pix</span>
          <strong>{formatCurrency(totalsByMethod[0].total)}</strong>
          <small>{totalsByMethod[0].count} pagamento(s)</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">▤</div>
          <span>Dinheiro</span>
          <strong>{formatCurrency(totalsByMethod[1].total)}</strong>
          <small>{totalsByMethod[1].count} pagamento(s)</small>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">▣</div>
          <span>Cartões</span>
          <strong>
            {formatCurrency(
              totalsByMethod[2].total + totalsByMethod[3].total
            )}
          </strong>
          <small>
            {totalsByMethod[2].count + totalsByMethod[3].count} pagamento(s)
          </small>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Resumo por modalidade</h3>
            <p>Valores recebidos em cada forma de pagamento.</p>
          </div>
        </div>

        {totalsByMethod.map((item) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderBottom: '1px solid #e5e7eb',
              gap: '12px',
            }}
          >
            <div>
              <strong>{item.name}</strong>
              <p>{item.count} pagamento(s)</p>
            </div>
            <strong>{formatCurrency(item.total)}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Histórico de recebimentos</h3>
            <p>Consulte os pagamentos registrados no PDV.</p>
          </div>
        </div>

        <div className="product-filters">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="today">Hoje</option>
            <option value="month">Este mês</option>
            <option value="all">Todo o período</option>
          </select>

          <select
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="all">Todas as modalidades</option>
            {paymentMethods.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {filteredSales.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum pagamento encontrado.</p>
            <span>Experimente alterar os filtros.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Data</th>
                  <th>Modalidade</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>#{sale.id.slice(0, 8)}</td>
                    <td>{formatDate(sale.date)}</td>
                    <td>{sale.paymentMethod}</td>
                    <td>
                      <strong>{formatCurrency(sale.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
