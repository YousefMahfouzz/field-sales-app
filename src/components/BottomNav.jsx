import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Icon from './Icon'

const NAV = [
  { to: '/dashboard', icon: 'home',    label: 'Home' },
  { to: '/customers', icon: 'users',   label: 'Customers' },
  { to: '/map',       icon: 'map',     label: 'Map' },
  { to: '/products',  icon: 'package', label: 'Products' },
  { to: '/orders',    icon: 'orders',  label: 'Orders' },
]

export default function BottomNav() {
  const { user } = useAuth()
  const [pendingOrders, setPendingOrders] = useState(0)

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
      } catch {}
    }
    check()
    const iv = setInterval(check, 60000)
    return () => clearInterval(iv)
  }, [user])

  return (
    <nav className="bottom-nav">
      {NAV.map(({ to, icon, label }) => (
        <NavLink key={to} to={to} end={to === '/dashboard'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-icon" style={{ position: 'relative' }}>
            <Icon name={icon} size={22} />
            {label === 'Orders' && pendingOrders > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: '#ef4444', color: 'white',
                borderRadius: '50%', width: 15, height: 15,
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid white',
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
