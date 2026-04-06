import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useEffect, useRef } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import AddEditCustomerPage from './pages/AddEditCustomerPage'
import MapPage from './pages/MapPage'
import RoutePlannerPage from './pages/RoutePlannerPage'
import VisitLogPage from './pages/VisitLogPage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import AddEditProductPage from './pages/AddEditProductPage'
import TerritoryPage from './pages/TerritoryPage'
import PriceListPage from './pages/PriceListPage'
import SettingsPage from './pages/SettingsPage'
import CompressImagesPage from './pages/CompressImagesPage'
import BackupPage from './pages/BackupPage'
import SharedCatalogPage from './pages/SharedCatalogPage'
import AdminInventoryPage from './pages/AdminInventoryPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import PublicHomePage from './pages/PublicHomePage'
import AdminHomepageManager from './pages/AdminHomepageManager'
import PriceListsManagerPage from './pages/PriceListsManagerPage'
import NicheLandingPage from './pages/NicheLandingPage'
import PriceListsPage from './pages/PriceListsPage'
import PublicPriceListPage from './pages/PublicPriceListPage'
// import AdminLandingPage from './pages/AdminLandingPage' -- replaced
import OrdersPage from './pages/OrdersPage'
import PurchasesPage from './pages/PurchasesPage'
import BottomNav from './components/BottomNav'

// Routes to public homepage if not logged in, app dashboard if logged in
function PublicOrApp() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:24 }}>⏳</div>
  return user ? <DashboardPage /> : <PublicHomePage />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:24 }}>⏳</div>
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const isPricelist = location.pathname.includes('/pricelist')
  const timerRef = useRef(null)
  const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

  // Auto-logout after 30 min of inactivity (only for logged-in users, not price list)
  useEffect(() => {
    if (!user || isPricelist) return

    const reset = () => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut()
        alert('You were signed out after 30 minutes of inactivity.')
      }, TIMEOUT_MS)
    }

    const events = ['mousedown', 'touchstart', 'keydown', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset() // start timer on mount

    return () => {
      clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, reset))
    }
  }, [user, isPricelist, signOut])

  return (
    <>
              <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={<PublicOrApp />} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
          <Route path="/customers/:id" element={<PrivateRoute><CustomerDetailPage /></PrivateRoute>} />
          <Route path="/customers/:id/edit" element={<PrivateRoute><AddEditCustomerPage /></PrivateRoute>} />
          <Route path="/customers/new" element={<PrivateRoute><AddEditCustomerPage /></PrivateRoute>} />
          <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
          <Route path="/route" element={<PrivateRoute><RoutePlannerPage /></PrivateRoute>} />
          <Route path="/visit/:customerId" element={<PrivateRoute><VisitLogPage /></PrivateRoute>} />
          <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
          <Route path="/products/:id" element={<PrivateRoute><ProductDetailPage /></PrivateRoute>} />
          <Route path="/products/new" element={<PrivateRoute><AddEditProductPage /></PrivateRoute>} />
          <Route path="/products/:id/edit" element={<PrivateRoute><AddEditProductPage /></PrivateRoute>} />
          <Route path="/territory" element={<PrivateRoute><TerritoryPage /></PrivateRoute>} />
          <Route path="/u/:username/pricelist" element={<PriceListPage />} />
          <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
          <Route path="/compress" element={<PrivateRoute><CompressImagesPage /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
          <Route path="/purchases" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
          <Route path="/backup" element={<PrivateRoute><BackupPage /></PrivateRoute>} />
          <Route path="/shared-catalog" element={<PrivateRoute><SharedCatalogPage /></PrivateRoute>} />
          <Route path="/admin/inventory" element={<PrivateRoute><AdminInventoryPage /></PrivateRoute>} />
        <Route path="/admin/settings" element={<PrivateRoute><AdminSettingsPage /></PrivateRoute>} />
          <Route path="/admin/homepage" element={<PrivateRoute><AdminHomepageManager /></PrivateRoute>} />
          <Route path="/admin/price-lists" element={<PrivateRoute><PriceListsManagerPage /></PrivateRoute>} />
          <Route path="/list/:slug" element={<NicheLandingPage />} />
          <Route path="/pl/:userId/:slug" element={<PublicPriceListPage />} />
          <Route path="/price-lists" element={<PrivateRoute><PriceListsPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      {user && !isPricelist && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
