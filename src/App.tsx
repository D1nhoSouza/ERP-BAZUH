import History from './pages/History'
import { useEffect, useState } from 'react'
import Sales from './pages/Sales'
import Products from './pages/Products'
import Payments from './pages/Payments'
import Settings from './pages/Settings'
import './App.css'

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'products', label: 'Produtos', icon: '□' },
  { id: 'sales', label: 'PDV', icon: '🛍' },
  { id: 'payments', label: 'Pagamentos', icon: '▤' },
  { id: 'history', label: 'Histórico de vendas', icon: '◷' },
  { id: 'settings', label: 'Configurações', icon: '⚙' },
]

function App() {
  const [activePage, setActivePage] = useState('dashboard')

  const [productCount, setProductCount] = useState(0)
  const [stockCount, setStockCount] = useState(0)
  const [lowStockCount, setLowStockCount] = useState(0)

  const [todaySales, setTodaySales] = useState(0)
  const [monthSales, setMonthSales] = useState(0)
  const [salesCount, setSalesCount] = useState(0)
  const [recentSales, setRecentSales] = useState<any[]>([])

  useEffect(() => {
    function updateProductStats() {
      try {
        const saved = localStorage.getItem('bazuh-pdv-products')
        const products = saved ? JSON.parse(saved) : []

        setProductCount(products.length)

        setStockCount(
          products.reduce(
            (total: number, product: { stock: number }) =>
              total + product.stock,
            0,
          ),
        )

        setLowStockCount(
          products.filter(
            (product: { stock: number; minStock: number }) =>
              product.stock <= product.minStock,
          ).length,
        )

        const savedSales = localStorage.getItem('bazuh-pdv-sales')
        const sales = savedSales ? JSON.parse(savedSales) : []

        const now = new Date()

        const todayTotal = sales
       .filter((sale: any) => {
        const date = new Date(sale.date)

       return date.toDateString() === now.toDateString()
       })
      .reduce((total: number, sale: any) => total + sale.total, 0)

      const monthTotal = sales
      .filter((sale: any) => {
      const date = new Date(sale.date)

      return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
      )
  })
  .reduce((total: number, sale: any) => total + sale.total, 0)

      setTodaySales(todayTotal)
      setMonthSales(monthTotal)
      setSalesCount(sales.length)
      setRecentSales([...sales].reverse().slice(0, 5))

      } catch {
        setProductCount(0)
        setStockCount(0)
        setLowStockCount(0)
      }
    }

    updateProductStats()
  }, [activePage])

  const currentPage = menuItems.find(
    (item) => item.id === activePage,
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"></div>
          <div>
            <h1>BAZUH</h1>
            <br />
            <span>ERP COMERCIAL</span>
          </div>
        </div>

        <div className="menu-label">MENU PRINCIPAL</div>

        <nav className="navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={
                activePage === item.id
                  ? 'nav-item active'
                  : 'nav-item'
              }
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <div>
            <strong>Sistema online</strong>
            <span>Versão 0.1.0</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Bazuh / Sistema</span>
            <h2>{currentPage?.label ?? 'Dashboard'}</h2>
          </div>

          <div className="user-profile">
            <div className="user-avatar">V</div>
            <div className="user-info">
              <strong>Administrador</strong>
              <span>Gestão da loja</span>
            </div>
          </div>
        </header>

        <section className="page-content">
          {activePage === 'dashboard' ? (
            <>
              <div className="welcome-section">
                <div>
                  <h2>Visão geral</h2>
                  <p>
                    Acompanhe os principais indicadores da sua loja.
                  </p>
                </div>
              </div>

              <section className="stats-grid">
               <div className="stat-card">
               <div className="stat-icon purple">▤</div>
               <span>Vendas de hoje</span>

               <strong>
               {todaySales.toLocaleString('pt-BR', {
               style: 'currency',
               currency: 'BRL',
              })}
              </strong>

              <small>{salesCount} venda(s) registrada(s)</small>
              </div>

                <div className="stat-card">
                  <div className="stat-icon green">↗</div>
                  <span>Vendas no mês</span>
                  <strong>
                  {monthSales.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  })}
                  </strong>
                  <small>Faturamento mensal</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon blue">□</div>
                  <span>Produtos cadastrados</span>
                  <strong>{productCount}</strong>
                  <small>Itens no catálogo</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon blue">📦</div>
                  <span>Unidades em estoque</span>
                  <strong>{stockCount}</strong>
                  <small>Total de unidades disponíveis</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">⚠</div>
                  <span>Estoque baixo</span>
                  <strong>{lowStockCount}</strong>
                  
                  <small>Produtos para verificar</small>
                </div>
              </section>

              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Vendas recentes</h3>
                      <p>Acompanhe as últimas movimentações</p>
                    </div>

                    <button
                      className="text-button"
                      onClick={() => setActivePage('history')}
                    >
                      Ver histórico →
                    </button>
                  </div>

                 {recentSales.length === 0 ? (
                 <div className="empty-state">
                 <div className="empty-icon">▤</div>
                 <strong>Nenhuma venda por enquanto</strong>
                 <p>
                 Quando você realizar uma venda, ela aparecerá aqui.
                 </p>
                <button
                className="primary-button"
                onClick={() => setActivePage('sales')}
                >
                + Nova venda
                </button>
                </div>
                ) : (
                <div>
                {recentSales.map((sale) => (
               <div
               key={sale.id}
               style={{
               display: 'flex',
               justifyContent: 'space-between',
               alignItems: 'center',
               gap: '16px',
               padding: '14px 0',
               borderBottom: '1px solid #e5e7eb',
               flexWrap: 'wrap',
               }}
               >
               <div>
               <strong>Venda #{sale.id.slice(0, 8)}</strong>
               <p>
              {new Date(sale.date).toLocaleString('pt-BR')}
               </p>
               <small>{sale.paymentMethod}</small>
              </div>

              <strong>
              {sale.total.toLocaleString('pt-BR', {
               style: 'currency',
               currency: 'BRL',
              })}
              </strong>
              </div>
              ))  }
              </div>
              )}
                </section>

                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Acesso rápido</h3>
                      <p>Atalhos para suas tarefas</p>
                    </div>
                  </div>

                  <button
                    className="quick-action"
                    onClick={() => setActivePage('products')}
                  >
                    <div className="quick-icon purple">□</div>
                    <div>
                      <strong>Cadastrar produto</strong>
                      <span>Adicione itens ao catálogo</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>

                  <button
                    className="quick-action"
                    onClick={() => setActivePage('sales')}
                  >
                    <div className="quick-icon green">＋</div>
                    <div>
                      <strong>Registrar venda</strong>
                      <span>Inicie uma nova operação</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>

                  <button
                    className="quick-action"
                    onClick={() => setActivePage('history')}
                  >
                    <div className="quick-icon blue">◷</div>
                    <div>
                      <strong>Consultar histórico</strong>
                      <span>Confira as vendas anteriores</span>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                </section>
              </div>
            </>
          ) : activePage === 'products' ? (
             <Products />
          ) : activePage === 'sales' ? (
             <Sales />
          ) : activePage === 'payments' ? (
             <Payments />
          ) : activePage === 'history' ? (
             <History />
          ) : activePage === 'settings' ? (
             <Settings />
          ) : (
            <section className="panel placeholder-panel">
              <div className="empty-icon">⚙</div>
              <h3>{currentPage?.label}</h3>
              <p>
                Esta seção será desenvolvida na próxima etapa.
              </p>
              <button
                className="primary-button"
                onClick={() => setActivePage('dashboard')}
              >
                Voltar ao dashboard
              </button>
            </section>
          )}
        </section>

        <footer className="app-footer">
          <span>BAZUH PDV © 2026</span>
          <span>Gestão simples, controle inteligente.</span>
        </footer>
      </main>
    </div>
  )
}

export default App
