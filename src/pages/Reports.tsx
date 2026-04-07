import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate, getCurrentFinancialYear } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Download,
  Share2,
  Calendar,
  PieChart,
  CreditCard,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const reportTypes: ReportType[] = [
  {
    id: 'monthly_summary',
    title: 'Monthly Financial Summary',
    description: 'Overview of income, expenses, and savings for the current month',
    icon: Calendar,
    color: 'primary',
  },
  {
    id: 'expense_breakdown',
    title: 'Expense Category Breakdown',
    description: 'Detailed breakdown of expenses by category with percentages',
    icon: PieChart,
    color: 'expense',
  },
  {
    id: 'investment_portfolio',
    title: 'Investment Portfolio Report',
    description: 'Summary of all investments with returns and allocation',
    icon: TrendingUp,
    color: 'income',
  },
  {
    id: 'loan_status',
    title: 'Loan Status Report',
    description: 'Current status of all loans with EMI schedules',
    icon: CreditCard,
    color: 'warning',
  },
  {
    id: 'balance_sheet',
    title: 'Balance Sheet',
    description: 'Complete financial statement with assets, liabilities, and net worth',
    icon: BarChart3,
    color: 'info',
  },
];

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generating, setGenerating] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);

  const generateReport = async (reportType: string) => {
    setGenerating(reportType);
    try {
      // Fetch data based on report type
      const [transactionsRes, loansRes, investmentsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, categories (name, icon, color)')
          .eq('user_id', user?.id)
          .order('transaction_date', { ascending: false }),
        supabase
          .from('loans')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('investments')
          .select('*')
          .eq('user_id', user?.id),
      ]);

      const transactions = transactionsRes.data || [];
      const loans = loansRes.data || [];
      const investments = investmentsRes.data || [];

      // Generate report content based on type
      let reportContent = '';
      const financialYear = getCurrentFinancialYear();
      
      switch (reportType) {
        case 'monthly_summary': {
          const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
          const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
          reportContent = `
MONTHLY FINANCIAL SUMMARY
${financialYear}
Generated: ${formatDate(new Date())}
================================

INCOME SUMMARY
Total Income: ${formatCurrency(income)}

EXPENSE SUMMARY
Total Expenses: ${formatCurrency(expense)}

NET SAVINGS
${formatCurrency(income - expense)}

Savings Rate: ${income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0}%
          `;
          break;
        }
        case 'expense_breakdown': {
          const categoryTotals = new Map<string, number>();
          transactions.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.categories?.name || 'Other';
            categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + Number(t.amount));
          });
          const totalExpense = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);
          
          reportContent = `
EXPENSE CATEGORY BREAKDOWN
${financialYear}
Generated: ${formatDate(new Date())}
================================

CATEGORY WISE EXPENSES
${Array.from(categoryTotals.entries()).map(([cat, amount]) => 
  `${cat}: ${formatCurrency(amount)} (${(amount / totalExpense * 100).toFixed(1)}%)`
).join('\n')}

TOTAL EXPENSES: ${formatCurrency(totalExpense)}
          `;
          break;
        }
        case 'investment_portfolio': {
          const totalInvested = investments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
          const totalCurrent = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
          
          reportContent = `
INVESTMENT PORTFOLIO REPORT
${financialYear}
Generated: ${formatDate(new Date())}
================================

INVESTMENTS
${investments.map(i => 
  `${i.name} (${i.type.toUpperCase()})
   Invested: ${formatCurrency(i.invested_amount)}
   Current Value: ${formatCurrency(i.current_value)}
   Returns: ${formatCurrency(Number(i.current_value) - Number(i.invested_amount))} (${(((Number(i.current_value) - Number(i.invested_amount)) / Number(i.invested_amount)) * 100).toFixed(1)}%)`
).join('\n\n')}

SUMMARY
Total Invested: ${formatCurrency(totalInvested)}
Current Value: ${formatCurrency(totalCurrent)}
Total Returns: ${formatCurrency(totalCurrent - totalInvested)}
          `;
          break;
        }
        case 'loan_status': {
          const totalPrincipal = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
          const totalEMI = loans.reduce((sum, l) => sum + Number(l.emi_amount || 0), 0);
          
          reportContent = `
LOAN STATUS REPORT
${financialYear}
Generated: ${formatDate(new Date())}
================================

ACTIVE LOANS
${loans.map(l => 
  `${l.name} ${l.lender ? `(${l.lender})` : ''}
   Principal: ${formatCurrency(l.principal_amount)}
   Interest Rate: ${l.interest_rate}% p.a.
   Monthly EMI: ${formatCurrency(l.emi_amount || 0)}
   Tenure: ${l.tenure_months} months
   Status: ${l.status.toUpperCase()}`
).join('\n\n')}

SUMMARY
Total Loan Amount: ${formatCurrency(totalPrincipal)}
Monthly EMI Total: ${formatCurrency(totalEMI)}
          `;
          break;
        }
        case 'balance_sheet': {
          const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
          const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
          const totalInvestments = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
          const totalLoans = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
          const netSavings = Math.max(0, income - expense);
          const totalAssets = totalInvestments + netSavings;
          const netWorth = totalAssets - totalLoans;
          
          reportContent = `
BALANCE SHEET
${financialYear}
Generated: ${formatDate(new Date())}
================================

ASSETS
Investments: ${formatCurrency(totalInvestments)}
Net Savings: ${formatCurrency(netSavings)}
----------------------------------------
TOTAL ASSETS: ${formatCurrency(totalAssets)}

LIABILITIES
Loans & Debts: ${formatCurrency(totalLoans)}
----------------------------------------
TOTAL LIABILITIES: ${formatCurrency(totalLoans)}

========================================
NET WORTH: ${formatCurrency(netWorth)}
========================================
          `;
          break;
        }
      }

      // Create a downloadable file
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Report Generated',
        description: 'Your report has been downloaded successfully.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error generating report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10 text-primary';
      case 'income': return 'bg-income/10 text-income';
      case 'expense': return 'bg-expense/10 text-expense';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'info': return 'bg-info/10 text-info';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and download paperless financial reports</p>
        </div>

        {/* Eco-friendly message */}
        <Card className="stat-card bg-income/5 border-income/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-income/20 flex items-center justify-center">
              🌿
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Eco-Friendly Paperless Reports</h3>
              <p className="text-sm text-muted-foreground">
                Download digital reports and help save the environment. Share with family or advisors via secure links.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportTypes.map((report) => (
            <Card key={report.id} className="stat-card hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getColorClass(report.color)}`}>
                    <report.icon className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-lg mt-4">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => generateReport(report.id)}
                    disabled={generating === report.id}
                  >
                    <Download className="w-4 h-4" />
                    {generating === report.id ? 'Generating...' : 'Download'}
                  </Button>
                  <Button variant="outline" size="icon" disabled>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Reports */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Your generated reports will appear here</p>
              <p className="text-sm mt-2">Reports are stored locally for privacy</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
