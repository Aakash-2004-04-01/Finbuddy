import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate, calculateEMI } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, Edit, CreditCard, Calculator } from 'lucide-react';

interface Loan {
  id: string;
  name: string;
  lender: string | null;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number | null;
  start_date: string;
  status: string;
  total_paid: number;
}

const loanSchema = z.object({
  name: z.string().min(1, 'Loan name is required'),
  lender: z.string().optional(),
  principal_amount: z.string().min(1, 'Principal amount is required'),
  interest_rate: z.string().min(1, 'Interest rate is required'),
  tenure_months: z.string().min(1, 'Tenure is required'),
  start_date: z.string().min(1, 'Start date is required'),
});

type LoanFormData = z.infer<typeof loanSchema>;

export default function Loans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [calculatedEMI, setCalculatedEMI] = useState<number | null>(null);

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      name: '',
      lender: '',
      principal_amount: '',
      interest_rate: '',
      tenure_months: '',
      start_date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedPrincipal = form.watch('principal_amount');
  const watchedRate = form.watch('interest_rate');
  const watchedTenure = form.watch('tenure_months');

  useEffect(() => {
    if (watchedPrincipal && watchedRate && watchedTenure) {
      const emi = calculateEMI(
        parseFloat(watchedPrincipal),
        parseFloat(watchedRate),
        parseInt(watchedTenure)
      );
      setCalculatedEMI(emi);
    } else {
      setCalculatedEMI(null);
    }
  }, [watchedPrincipal, watchedRate, watchedTenure]);

  useEffect(() => {
    if (user) {
      fetchLoans();
    }
  }, [user]);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: LoanFormData) => {
    if (!user) {
  toast({ title: "User not logged in", variant: "destructive" });
  return;
}
    try {
      const principal = parseFloat(data.principal_amount);
      const rate = parseFloat(data.interest_rate);
      const tenure = parseInt(data.tenure_months);
      const emi = calculateEMI(principal, rate, tenure);

      const loanData = {
        user_id: user?.id,
        name: data.name,
        lender: data.lender || null,
        principal_amount: principal,
        interest_rate: rate,
        tenure_months: tenure,
        emi_amount: emi,
        start_date: data.start_date,
      };

      if (editingLoan) {
        const { error } = await supabase
          .from('loans')
          .update(loanData)
          .eq('id', editingLoan.id);

        if (error) throw error;
        toast({ title: 'Loan updated successfully' });
      } else {
        const { error } = await supabase
          .from('loans')
          .insert([loanData]);

        if (error) throw error;
        toast({ title: 'Loan added successfully' });
      }

      setDialogOpen(false);
      setEditingLoan(null);
      form.reset();
      setCalculatedEMI(null);
      fetchLoans();
    } catch (error) {
      console.error('Error saving loan:', error);
      toast({
        title: 'Error saving loan',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    form.reset({
      name: loan.name,
      lender: loan.lender || '',
      principal_amount: loan.principal_amount.toString(),
      interest_rate: loan.interest_rate.toString(),
      tenure_months: loan.tenure_months.toString(),
      start_date: loan.start_date,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;

    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Loan deleted' });
      fetchLoans();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast({
        title: 'Error deleting loan',
        variant: 'destructive',
      });
    }
  };

  const totalLoanAmount = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);
  const totalEMI = loans.reduce((sum, l) => sum + Number(l.emi_amount || 0), 0);
  const activeLoans = loans.filter((l) => l.status === 'active').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Loan Management</h1>
            <p className="text-muted-foreground">Track and manage your loans and EMIs</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingLoan(null);
              form.reset();
              setCalculatedEMI(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                Add Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingLoan ? 'Edit Loan' : 'Add New Loan'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Home Loan, Car Loan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lender (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SBI, HDFC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="principal_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Principal (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="interest_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Interest Rate (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tenure_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenure (Months)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {calculatedEMI !== null && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Calculated EMI</span>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(calculatedEMI)}</p>
                        <p className="text-sm text-muted-foreground">per month</p>
                      </CardContent>
                    </Card>
                  )}

                  <Button type="submit" className="w-full gradient-primary">
                    {editingLoan ? 'Update Loan' : 'Add Loan'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-expense/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-expense" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Loan Amount</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalLoanAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly EMI</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalEMI)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Active Loans</p>
              <p className="text-xl font-bold text-foreground">{activeLoans}</p>
            </CardContent>
          </Card>
        </div>

        {/* Loans List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {loading ? (
            <p className="col-span-2 text-center py-8 text-muted-foreground">Loading...</p>
          ) : loans.length > 0 ? (
            loans.map((loan) => {
              const totalAmount = Number(loan.principal_amount) * (1 + (Number(loan.interest_rate) / 100) * (loan.tenure_months / 12));
              const progress = (Number(loan.total_paid) / totalAmount) * 100;
              
              return (
                <Card key={loan.id} className="stat-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{loan.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(loan)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(loan.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {loan.lender && <p className="text-sm text-muted-foreground">{loan.lender}</p>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Principal</p>
                        <p className="font-semibold">{formatCurrency(loan.principal_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Interest Rate</p>
                        <p className="font-semibold">{loan.interest_rate}% p.a.</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Monthly EMI</p>
                        <p className="font-semibold text-warning">{formatCurrency(loan.emi_amount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tenure</p>
                        <p className="font-semibold">{loan.tenure_months} months</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Started: {formatDate(loan.start_date)}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="col-span-2 stat-card">
              <CardContent className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No loans added yet</p>
                <Button variant="link" onClick={() => setDialogOpen(true)}>
                  Add your first loan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
