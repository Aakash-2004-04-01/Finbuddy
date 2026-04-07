import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate, getMonthName } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CreditCard,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  categories?: { name: string; color: string; icon?: string } | null;
}

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#22c55e', '#eab308', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#ef4444', '#a855f7'];

export default function Dashboard() {
  const { user } = useAuth();
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
  if (user) {
    fetchDashboardData();
  }
}, [user]);

  const fetchDashboardData = async () => {
  try {
    setLoading(true);

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user?.id)
      .order('transaction_date', { ascending: false });

    if (error) throw error;

    const transactions = data || [];

    console.log("Fetched transactions:", transactions);
    console.log("User ID:", user?.id);

    // ✅ totals
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        income += Number(t.amount);
      } else if (t.type === 'expense') {
        expense += Number(t.amount);
      }
    });

    setTotalIncome(income);
    setTotalExpense(expense);
    setRecentTransactions(transactions.slice(0, 5));

    // ✅ monthly chart
    const monthlyMap: any = {};

    transactions.forEach((t) => {
      const date = new Date(t.transaction_date);
      const month = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyMap[month]) {
        monthlyMap[month] = { income: 0, expense: 0 };
      }

      if (t.type === 'income') {
        monthlyMap[month].income += Number(t.amount);
      } else {
        monthlyMap[month].expense += Number(t.amount);
      }
    });

    const monthly = Object.keys(monthlyMap).map((key) => {
      const [year, month] = key.split('-');
      return {
        month: getMonthName(parseInt(month)),
        income: monthlyMap[key].income,
        expense: monthlyMap[key].expense,
      };
    });

    setMonthlyData(monthly);

    // ✅ category chart (optional simple version)
    const categoryMap: any = {};

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        const name = t.category_id || 'Other';

        if (!categoryMap[name]) {
          categoryMap[name] = 0;
        }

        categoryMap[name] += Number(t.amount);
      }
    });

    const categories = Object.keys(categoryMap).map((key) => ({
      name: key,
      value: categoryMap[key],
      color: '#3b82f6',
    }));

    setCategoryData(categories);

  } catch (err) {
    console.error("Dashboard error:", err);
  } finally {
    setLoading(false);
  }
};

  const savings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;
  
  

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Financial Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your financial overview.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/expenses">
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                Add Transaction
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-income">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-income/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-income" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm text-income">
                <ArrowUpRight className="w-4 h-4" />
                <span>+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                  <p className="text-2xl font-bold text-expense">{formatCurrency(totalExpense)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-expense/10 flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-expense" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm text-expense">
                <ArrowDownRight className="w-4 h-4" />
                <span>-5% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Net Savings</p>
                  <p className={`text-2xl font-bold ${savings >= 0 ? 'text-primary' : 'text-expense'}`}>
                    {formatCurrency(savings)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Savings rate: <span className="font-medium text-foreground">{savingsRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold text-foreground">{recentTransactions.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-info" />
                </div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                This month
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income vs Expense Chart */}
          <Card className="stat-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Income vs Expense Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(value) => `₹${value / 1000}k`} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stackId="1"
                        stroke="hsl(var(--income))"
                        fill="hsl(var(--income) / 0.3)"
                        name="Income"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stackId="2"
                        stroke="hsl(var(--expense))"
                        fill="hsl(var(--expense) / 0.3)"
                        name="Expense"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No transaction data yet</p>
                      <Link to="/dashboard/expenses">
                        <Button variant="link" className="mt-2">Add your first transaction</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Expense by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>No expense data</p>
                  </div>
                )}
              </div>
              {categoryData.length > 0 && (
                <div className="mt-4 space-y-2">
                  {categoryData.slice(0, 4).map((cat, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <Link to="/dashboard/expenses">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                          transaction.type === 'income' ? 'bg-income/10' : 'bg-expense/10'
                        }`}
                      >
                        {transaction.categories?.icon || (transaction.type === 'income' ? '💰' : '💸')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {transaction.categories?.name || 'Uncategorized'} • {formatDate(transaction.transaction_date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-semibold ${
                        transaction.type === 'income' ? 'text-income' : 'text-expense'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(Number(transaction.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <Link to="/dashboard/expenses">
                  <Button variant="link" className="mt-2">Add your first transaction</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
