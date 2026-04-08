import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Icon from './Icon'

const NAV = [
  { to: '/dashboard', icon: 'home',      label: 'Home' },
  { to: '/customers', icon: 'users',     label: 'Customers' },
  { to: '/map',       icon: 'map',       label: 'Map' },
  { to: '/products',  icon: 'package',   label: 'Products' },
  { to: '/orders',    icon: 'inbox',     label: 'Orders' },
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
        <NavLink key={to} to={to} end={to === '/'} className="nav-item">
          {({ isActive }) => (
            <>
              <span className="nav-icon" style={{ position: 'relative', display: 'inline-block' }}>
                <Icon
                  name={icon}
                  size={22}
                  color={isActive ? 'var(--blue)' : 'var(--text-muted)'}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {icon === 'inbox' && pendingOrders > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6,
                    background: 'var(--red)', color: 'white',
                    borderRadius: '50%', minWidth: 16, height: 16,
                    fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px', lineHeight: 1,
                  }}>
                    {pendingOrders > 9 ? '9+' : pendingOrders}
                  </span>
                )}
              </span>
              <span className="nav-label" style={{ color: isActive ? 'var(--blue)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 500 }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
