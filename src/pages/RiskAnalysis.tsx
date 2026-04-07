import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  HeartPulse,
  Shield,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  icon: React.ElementType;
  action?: string;
}

export default function RiskAnalysis() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [debtRiskLevel, setDebtRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [totalEMI, setTotalEMI] = useState(0);

  useEffect(() => {
    if (user) {
      analyzeRisks();
    }
  }, [user]);

  const analyzeRisks = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [transactionsRes, loansRes, investmentsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('loans')
          .select('*')
          .eq('user_id', user?.id)
          .eq('status', 'active'),
        supabase
          .from('investments')
          .select('*')
          .eq('user_id', user?.id),
      ]);

      const transactions = transactionsRes.data || [];
      const loans = loansRes.data || [];
      const investments = investmentsRes.data || [];

      // Calculate totals
      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const debt = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
      const emi = loans.reduce((sum, l) => sum + Number(l.emi_amount || 0), 0);

      setTotalIncome(income);
      setTotalExpense(expense);
      setTotalDebt(debt);
      setTotalEMI(emi);

      // Analyze risks
      const identifiedRisks: RiskItem[] = [];

      // Check for medical expenses without health insurance
      const medicalExpenses = transactions.filter((t) => 
        t.type === 'expense' && 
        (t.description?.toLowerCase().includes('hospital') || 
         t.description?.toLowerCase().includes('medical') ||
         t.description?.toLowerCase().includes('doctor'))
      );
      
      if (medicalExpenses.length > 0) {
        identifiedRisks.push({
          id: 'health-insurance',
          title: 'Unclaimed Health Insurance',
          description: `You have ${medicalExpenses.length} medical expense(s) totaling ${formatCurrency(medicalExpenses.reduce((sum, t) => sum + Number(t.amount), 0))}. Consider getting health insurance coverage.`,
          severity: 'high',
          icon: HeartPulse,
          action: 'Review your health insurance options',
        });
      }

      // Check for term insurance need based on dependents/income
      if (income > 50000) {
        identifiedRisks.push({
          id: 'term-insurance',
          title: 'Term Insurance Recommended',
          description: 'Based on your income level, term insurance is recommended to protect your family financially.',
          severity: 'medium',
          icon: Shield,
          action: 'Calculate your term insurance needs',
        });
      }

      // Credit-Debit Mismatch
      const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
      if (savingsRate < 10) {
        identifiedRisks.push({
          id: 'savings-low',
          title: 'Low Savings Rate',
          description: `Your savings rate is only ${savingsRate.toFixed(1)}%. Aim for at least 20% of your income.`,
          severity: 'high',
          icon: TrendingDown,
          action: 'Review your budget and cut unnecessary expenses',
        });
      } else if (savingsRate < 20) {
        identifiedRisks.push({
          id: 'savings-moderate',
          title: 'Moderate Savings Rate',
          description: `Your savings rate is ${savingsRate.toFixed(1)}%. Try to increase it to 20% or more.`,
          severity: 'medium',
          icon: AlertTriangle,
          action: 'Look for opportunities to save more',
        });
      }

      // Debt Risk Level
      const debtToIncomeRatio = income > 0 ? (emi / income) * 100 : 0;
      let drl: 'low' | 'medium' | 'high' = 'low';
      
      if (debtToIncomeRatio > 50) {
        drl = 'high';
        identifiedRisks.push({
          id: 'debt-high',
          title: 'High Debt Risk',
          description: `Your EMI-to-income ratio is ${debtToIncomeRatio.toFixed(1)}%. This is dangerously high.`,
          severity: 'high',
          icon: CreditCard,
          action: 'Consider debt consolidation or loan restructuring',
        });
      } else if (debtToIncomeRatio > 30) {
        drl = 'medium';
        identifiedRisks.push({
          id: 'debt-medium',
          title: 'Moderate Debt Level',
          description: `Your EMI-to-income ratio is ${debtToIncomeRatio.toFixed(1)}%. Try to keep it below 30%.`,
          severity: 'medium',
          icon: AlertCircle,
          action: 'Focus on paying off high-interest debts first',
        });
      }
      
      setDebtRiskLevel(drl);

      // Check for emergency fund
      const totalInvestments = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
      const monthlyExpenses = expense;
      const emergencyFundNeeded = monthlyExpenses * 6;
      
      if (totalInvestments < emergencyFundNeeded) {
        identifiedRisks.push({
          id: 'emergency-fund',
          title: 'Insufficient Emergency Fund',
          description: `You need at least ${formatCurrency(emergencyFundNeeded)} (6 months expenses) in emergency funds.`,
          severity: income > 0 ? 'medium' : 'low',
          icon: AlertTriangle,
          action: 'Start building your emergency fund',
        });
      }

      // If no risks found
      if (identifiedRisks.length === 0) {
        identifiedRisks.push({
          id: 'all-good',
          title: 'No Major Risks Detected',
          description: 'Your financial health looks good! Keep up the good work.',
          severity: 'low',
          icon: CheckCircle,
        });
      }

      setRisks(identifiedRisks);
    } catch (error) {
      console.error('Error analyzing risks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-expense text-expense-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-income text-income-foreground';
      default:
        return 'bg-muted';
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-expense/30';
      case 'medium':
        return 'border-warning/30';
      case 'low':
        return 'border-income/30';
      default:
        return 'border-border';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">AI Risk Analysis</h1>
          <p className="text-muted-foreground">Smart insights to protect your financial health</p>
        </div>

        {/* Risk Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(debtRiskLevel)}`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Debt Risk Level</p>
                  <p className="text-xl font-bold capitalize">{debtRiskLevel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Monthly Income</p>
              <p className="text-xl font-bold text-income">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Monthly Expenses</p>
              <p className="text-xl font-bold text-expense">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Debt (EMI)</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(totalEMI)}/mo</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Items */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              Identified Risks & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Analyzing your financial data...</p>
            ) : (
              <div className="space-y-4">
                {risks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-4 rounded-lg border-2 ${getSeverityBorder(risk.severity)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getSeverityColor(risk.severity)}`}>
                        <risk.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{risk.title}</h3>
                          <Badge className={getSeverityColor(risk.severity)}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{risk.description}</p>
                        {risk.action && (
                          <p className="text-sm text-primary font-medium">
                            💡 {risk.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Health Tips */}
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">💡 Financial Health Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-medium text-foreground mb-2">50-30-20 Rule</h4>
                <p className="text-sm text-muted-foreground">
                  Allocate 50% of income to needs, 30% to wants, and 20% to savings & debt repayment.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-income/5 border border-income/20">
                <h4 className="font-medium text-foreground mb-2">Emergency Fund</h4>
                <p className="text-sm text-muted-foreground">
                  Maintain at least 6 months of expenses as an emergency fund in a liquid account.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                <h4 className="font-medium text-foreground mb-2">Debt Management</h4>
                <p className="text-sm text-muted-foreground">
                  Keep your total EMI payments below 30% of your monthly income.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-info/5 border border-info/20">
                <h4 className="font-medium text-foreground mb-2">Insurance Coverage</h4>
                <p className="text-sm text-muted-foreground">
                  Have health insurance for the whole family and term insurance for income earners.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
