// All UI strings — English + Arabic
export const t = {
  en: {
    // Nav
    home: 'Home', customers: 'Customers', map: 'Map',
    products: 'Products', orders: 'Orders',
    // Dashboard
    today: 'Today', thisWeek: 'This Week', visits: 'Visits',
    added: 'Added', revenue: 'Revenue', profit: 'Profit',
    revenueToday: 'Revenue Today', profitToday: 'Profit Today',
    analytics: 'Analytics', quickActions: 'Quick Actions',
    addCustomer: 'Add Customer', recordPurchase: 'Record Purchase',
    viewOrders: 'View Orders', openMap: 'Open Map',
    overdueVisit: 'overdue visit', overdueVisits: 'overdue visits',
    dueToday: 'visit due today', dueTodayPlural: 'visits due today',
    recentActivity: 'Recent Activity', customers_label: 'Customers',
    active: 'Active', dueToday2: 'Due Today', overdue: 'Overdue',
    reschedule: 'Reschedule',
    // Customers
    searchCustomers: 'Search customers...', all: 'All',
    priority: 'Priority', followUp: 'Follow Up', avoid: '⛔ Avoid',
    doNotVisit: 'Do Not Visit',
    addNewCustomer: '+ Add Customer',
    // Products
    addProduct: '+ Add', view: '👁️ View', share: '🔗 Share',
    lists: '📋 Lists', catalog: '📦 Catalog', featured: '🏠 Featured',
    shared: '👑 Shared', archive: '📦 Archive', archived: 'Archived',
    restore: '↩ Restore', costValue: 'Cost Value', sellValue: 'Sell Value',
    potentialProfit: 'Potential Profit', margin: 'Margin',
    inStock: 'In Stock', lowStock: 'Low Stock', outOfStock: 'Out of Stock',
    // Settings
    settings: 'Settings', darkMode: 'Dark Mode', language: 'Language',
    arabic: 'العربية', english: 'English',
    wideMode: 'iPad / Wide Screen Mode',
    adminTools: 'Admin Tools', account: 'Account',
    backup: '💾 Backup & Restore Data', signOut: 'Sign Out',
    inviteCodesLogo: '⚙️ Invite Codes & Logo',
    manageHomepage: '🌐 Manage Homepage', managePriceLists: '🏷️ Manage Price Lists',
    viewUserInventories: '👑 View User Inventories',
    // Orders
    newOrders: 'new', pending: 'Pending', confirmed: 'Confirmed',
    delivered: 'Delivered', cancelled: 'Cancelled', totalOrders: 'Total Orders',
    // Common
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    loading: 'Loading...', noData: 'No data yet',
    search: 'Search...', back: '←',
  },
  ar: {
    // Nav
    home: 'الرئيسية', customers: 'العملاء', map: 'الخريطة',
    products: 'المنتجات', orders: 'الطلبات',
    // Dashboard
    today: 'اليوم', thisWeek: 'هذا الأسبوع', visits: 'الزيارات',
    added: 'مضاف', revenue: 'الإيرادات', profit: 'الربح',
    revenueToday: 'إيرادات اليوم', profitToday: 'ربح اليوم',
    analytics: 'التحليلات', quickActions: 'إجراءات سريعة',
    addCustomer: 'إضافة عميل', recordPurchase: 'تسجيل شراء',
    viewOrders: 'عرض الطلبات', openMap: 'فتح الخريطة',
    overdueVisit: 'زيارة متأخرة', overdueVisits: 'زيارات متأخرة',
    dueToday: 'زيارة مستحقة اليوم', dueTodayPlural: 'زيارات مستحقة اليوم',
    recentActivity: 'النشاط الأخير', customers_label: 'العملاء',
    active: 'نشط', dueToday2: 'مستحق اليوم', overdue: 'متأخر',
    reschedule: 'إعادة جدولة',
    // Customers
    searchCustomers: 'ابحث عن عملاء...', all: 'الكل',
    priority: 'أولوية', followUp: 'متابعة', avoid: '⛔ تجنب',
    doNotVisit: 'لا تزور',
    addNewCustomer: '+ إضافة عميل',
    // Products
    addProduct: '+ إضافة', view: '👁️ عرض', share: '🔗 مشاركة',
    lists: '📋 قوائم', catalog: '📦 كتالوج', featured: '🏠 مميز',
    shared: '👑 مشترك', archive: '📦 أرشيف', archived: 'مؤرشف',
    restore: '↩ استعادة', costValue: 'قيمة التكلفة', sellValue: 'قيمة البيع',
    potentialProfit: 'الربح المحتمل', margin: 'الهامش',
    inStock: 'متوفر', lowStock: 'مخزون منخفض', outOfStock: 'نفد المخزون',
    // Settings
    settings: 'الإعدادات', darkMode: 'الوضع الداكن', language: 'اللغة',
    arabic: 'العربية', english: 'English',
    wideMode: 'وضع الشاشة العريضة (iPad)',
    adminTools: 'أدوات المشرف', account: 'الحساب',
    backup: '💾 نسخ احتياطي واستعادة', signOut: 'تسجيل الخروج',
    inviteCodesLogo: '⚙️ رموز الدعوة والشعار',
    manageHomepage: '🌐 إدارة الصفحة الرئيسية', managePriceLists: '🏷️ إدارة قوائم الأسعار',
    viewUserInventories: '👑 عرض مخزونات المستخدمين',
    // Orders
    newOrders: 'جديد', pending: 'قيد الانتظار', confirmed: 'مؤكد',
    delivered: 'تم التوصيل', cancelled: 'ملغى', totalOrders: 'إجمالي الطلبات',
    // Common
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل',
    loading: 'جاري التحميل...', noData: 'لا توجد بيانات',
    search: 'بحث...', back: '→',
  }
}

export const useT = (lang) => (key) => t[lang]?.[key] ?? t.en[key] ?? key
