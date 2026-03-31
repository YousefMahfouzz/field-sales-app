import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
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
import OrdersPage from './pages/OrdersPage'
import PurchasesPage from './pages/PurchasesPage'
import BottomNav from './components/BottomNav'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontSize:24 }}>⏳</div>
  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  const isPricelist = location.pathname.includes('/pricelist')
  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
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
