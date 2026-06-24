-- Expenses tracker (gas, supplies, repairs, anything else)
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'gas',  -- 'gas', 'maintenance', 'supplies', 'meals', 'other'
  amount numeric(10, 2) NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own expenses" ON expenses;
CREATE POLICY "users see own expenses" ON expenses
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users insert own expenses" ON expenses;
CREATE POLICY "users insert own expenses" ON expenses
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users update own expenses" ON expenses;
CREATE POLICY "users update own expenses" ON expenses
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users delete own expenses" ON expenses;
CREATE POLICY "users delete own expenses" ON expenses
  FOR DELETE USING (user_id = auth.uid());
