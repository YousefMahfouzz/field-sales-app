import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/customers', icon: '👥', label: 'Customers' },
  { to: '/map', icon: '🗺️', label: 'Map' },
  { to: '/products', icon: '📦', label: 'Products' },
  { to: '/orders', icon: '📋', label: 'Orders' },
]

export default function BottomNav() {
  const { user } = useAuth()
  const [pendingOrders, setPendingOrders] = useState(0)

  // Poll for new orders every 60 seconds
  useEffect(() => {
    if (!user) return
    const check = async () => {
      try {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('seller_user_id', user.id)
          .eq('status', 'pending')
        setPendingOrders(count || 0)
      } catch { /* silently ignore - Supabase may be briefly unavailable */ }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <nav className="bottom-nav">
      {NAV.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className="nav-item">
          <span className="nav-icon" style={{ position: 'relative', display: 'inline-block' }}>
            {icon}
            {label === 'Orders' && pendingOrders > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: '#dc2626', color: 'white',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {pendingOrders > 9 ? '9+' : pendingOrders}
              </span>
            )}
          </span>
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
