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
import HomepagePage from './pages/HomepagePage'
import NicheLandingPage from './pages/NicheLandingPage'
import AdminStorePage from './pages/AdminStorePage'
// import LandingPage from './pages/LandingPage' -- replaced by HomepagePage
// import AdminLandingPage from './pages/AdminLandingPage' -- replaced
import PriceListsPage from './pages/PriceListsPage'
import PublicPriceListPage from './pages/PublicPriceListPage'
import OrdersPage from './pages/OrdersPage'
import PurchasesPage from './pages/PurchasesPage'
import BottomNav from './components/BottomNav'

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
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <HomepagePage />} />
        <Route path="/admin/landing" element={<PrivateRoute><AdminStorePage /></PrivateRoute>} />
        <Route path="/store/:slug" element={<NicheLandingPage />} />
        <Route path="/admin/store" element={<PrivateRoute><AdminStorePage /></PrivateRoute>} />
        <Route path="/price-lists" element={<PrivateRoute><PriceListsPage /></PrivateRoute>} />
        <Route path="/pl/:userId/:slug" element={<PublicPriceListPage />} />
        <Route path="/customers" element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
        <Route path="/customers/:id" element={<PrivateRoute><CustomerDetailPage /></PrivateRoute>} />
        <Route path="/customers/:id/edit" element={<PrivateRoute><AddEditCustomerPage /></PrivateRoute>} />
        <Route path="/customers/new" element={<PrivateRoute><AddEditCustomerPage /></PrivateRoute>} />
        <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
        <Route path="/route" element={<PrivateRoute><RoutePlannerPage /></PrivateRoute>} />
        <Route path="/visit/:customerId" element={<PrivateRoute><VisitLogPage /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
        <Route path="/products/new" element={<PrivateRoute><AddEditProductPage /></PrivateRoute>} />
        <Route path="/products/:id" element={<PrivateRoute><ProductDetailPage /></PrivateRoute>} />
        <Route path="/products/:id/edit" element={<PrivateRoute><AddEditProductPage /></PrivateRoute>} />
        <Route path="/purchases" element={<PrivateRoute><PurchasesPage /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
        <Route path="/territory" element={<PrivateRoute><TerritoryPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/compress-images" element={<PrivateRoute><CompressImagesPage /></PrivateRoute>} />
        <Route path="/backup" element={<PrivateRoute><BackupPage /></PrivateRoute>} />
        <Route path="/shared-catalog" element={<PrivateRoute><SharedCatalogPage /></PrivateRoute>} />
        <Route path="/admin/inventory" element={<PrivateRoute><AdminInventoryPage /></PrivateRoute>} />
        <Route path="/pricelist" element={<PriceListPage />} />
        <Route path="/u/:username/pricelist" element={<PriceListPage />} />
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
