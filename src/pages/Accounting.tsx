import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  categories?: { name: string } | null;
}

interface LedgerEntry {
  account: string;
  debit: number;
  credit: number;
}

interface BalanceSheetItem {
  name: string;
  value: number;
}

export default function Accounting() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ totalDebit: number; totalCredit: number }>({ totalDebit: 0, totalCredit: 0 });
  const [assets, setAssets] = useState<BalanceSheetItem[]>([]);
  const [liabilities, setLiabilities] = useState<BalanceSheetItem[]>([]);

  useEffect(() => {
    if (user) {
      fetchAccountingData();
    }
  }, [user]);

  const fetchAccountingData = async () => {
    setLoading(true);
    try {
      const [transactionsRes, loansRes, investmentsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, categories (name)')
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

      setTransactions(transactions);

      // Calculate ledger data
      const ledgerMap = new Map<string, { debit: number; credit: number }>();
      
      transactions.forEach((t) => {
        const account = t.categories?.name || 'Other';
        const current = ledgerMap.get(account) || { debit: 0, credit: 0 };
        if (t.type === 'expense') {
          current.debit += Number(t.amount);
        } else {
          current.credit += Number(t.amount);
        }
        ledgerMap.set(account, current);
      });

      const ledger: LedgerEntry[] = [];
      ledgerMap.forEach((value, account) => {
        ledger.push({ account, ...value });
      });
      setLedgerData(ledger);

      // Calculate trial balance
      const totalDebit = ledger.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = ledger.reduce((sum, l) => sum + l.credit, 0);
      setTrialBalance({ totalDebit, totalCredit });

      // Calculate balance sheet
      const totalInvestments = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
      const totalSavings = totalCredit - totalDebit;
      const totalLoanPrincipal = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);

      setAssets([
        { name: 'Investments', value: totalInvestments },
        { name: 'Net Savings', value: Math.max(0, totalSavings) },
      ]);

      setLiabilities([
        { name: 'Loans & Debts', value: totalLoanPrincipal },
      ]);

    } catch (error) {
      console.error('Error fetching accounting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Accounting Module</h1>
          <p className="text-muted-foreground">Journal, Ledger, Trial Balance & Balance Sheet</p>
        </div>

        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="journal" className="gap-2">
              <BookOpen className="w-4 h-4 hidden sm:inline" />
              Journal
            </TabsTrigger>
            <TabsTrigger value="ledger">Ledger</TabsTrigger>
            <TabsTrigger value="trial">Trial Balance</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          </TabsList>

          {/* Journal */}
          <TabsContent value="journal">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Journal Entries
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      A journal is the first place transactions are recorded in accounting. 
                      Each entry shows the date, accounts affected, and amounts debited or credited.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Debit (₹)</TableHead>
                        <TableHead className="text-right">Credit (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.slice(0, 20).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{formatDate(t.transaction_date)}</TableCell>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>{t.categories?.name || 'Other'}</TableCell>
                          <TableCell className="text-right text-expense">
                            {t.type === 'expense' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right text-income">
                            {t.type === 'income' ? formatCurrency(t.amount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No journal entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ledger */}
          <TabsContent value="ledger">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  General Ledger
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      A ledger organizes all journal entries by account. 
                      It shows the total debits and credits for each category.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : ledgerData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Total Debit (₹)</TableHead>
                        <TableHead className="text-right">Total Credit (₹)</TableHead>
                        <TableHead className="text-right">Balance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{entry.account}</TableCell>
                          <TableCell className="text-right text-expense">
                            {formatCurrency(entry.debit)}
                          </TableCell>
                          <TableCell className="text-right text-income">
                            {formatCurrency(entry.credit)}
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${entry.credit - entry.debit >= 0 ? 'text-income' : 'text-expense'}`}>
                            {formatCurrency(Math.abs(entry.credit - entry.debit))}
                            {entry.credit - entry.debit >= 0 ? ' Cr' : ' Dr'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No ledger entries yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Balance */}
          <TabsContent value="trial">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Trial Balance
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      A trial balance is a summary of all ledger accounts. 
                      Total debits should equal total credits if your books are balanced.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className="text-right">Debit (₹)</TableHead>
                      <TableHead className="text-right">Credit (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>{entry.account}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit > entry.credit ? formatCurrency(entry.debit - entry.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit > entry.debit ? formatCurrency(entry.credit - entry.debit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-expense">{formatCurrency(trialBalance.totalDebit)}</TableCell>
                      <TableCell className="text-right text-income">{formatCurrency(trialBalance.totalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="mt-4 p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    {trialBalance.totalDebit === trialBalance.totalCredit ? (
                      <span className="text-income">✓ Your books are balanced!</span>
                    ) : (
                      <span className="text-warning">⚠ There's a difference of {formatCurrency(Math.abs(trialBalance.totalDebit - trialBalance.totalCredit))}</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance">
            <Card className="stat-card">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Balance Sheet
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      A balance sheet shows your financial position at a point in time: 
                      Assets (what you own), Liabilities (what you owe), and Net Worth (the difference).
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-income">Assets</h3>
                    <div className="space-y-3">
                      {assets.map((asset, index) => (
                        <div key={index} className="flex justify-between p-3 rounded-lg bg-income/5">
                          <span>{asset.name}</span>
                          <span className="font-semibold">{formatCurrency(asset.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between p-3 rounded-lg bg-income/10 font-bold">
                        <span>Total Assets</span>
                        <span>{formatCurrency(totalAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 text-expense">Liabilities</h3>
                    <div className="space-y-3">
                      {liabilities.map((liability, index) => (
                        <div key={index} className="flex justify-between p-3 rounded-lg bg-expense/5">
                          <span>{liability.name}</span>
                          <span className="font-semibold">{formatCurrency(liability.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between p-3 rounded-lg bg-expense/10 font-bold">
                        <span>Total Liabilities</span>
                        <span>{formatCurrency(totalLiabilities)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Worth */}
                <div className="mt-6 p-6 rounded-xl gradient-primary text-center">
                  <p className="text-primary-foreground/80 mb-1">Your Net Worth</p>
                  <p className="text-4xl font-bold text-primary-foreground">{formatCurrency(netWorth)}</p>
                  <p className="text-primary-foreground/60 text-sm mt-2">
                    Total Assets - Total Liabilities
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
