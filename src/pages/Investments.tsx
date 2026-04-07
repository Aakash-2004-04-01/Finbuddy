import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatCurrency, formatDate } from '@/lib/formatters';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Plus, Trash2, Edit, PiggyBank, TrendingUp, TrendingDown } from 'lucide-react';

interface Investment {
  id: string;
  name: string;
  type: string;
  invested_amount: number;
  current_value: number;
  interest_rate: number | null;
  start_date: string;
  maturity_date: string | null;
  notes: string | null;
}

const investmentTypes = [
  { value: 'fd', label: 'Fixed Deposit', color: '#22c55e' },
  { value: 'mutual_fund', label: 'Mutual Fund', color: '#3b82f6' },
  { value: 'stocks', label: 'Stocks', color: '#eab308' },
  { value: 'ppf', label: 'PPF', color: '#8b5cf6' },
  { value: 'epf', label: 'EPF', color: '#f97316' },
  { value: 'gold', label: 'Gold', color: '#f59e0b' },
  { value: 'real_estate', label: 'Real Estate', color: '#ec4899' },
  { value: 'other', label: 'Other', color: '#6b7280' },
];

const investmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  invested_amount: z.string().min(1, 'Invested amount is required'),
  current_value: z.string().min(1, 'Current value is required'),
  interest_rate: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  maturity_date: z.string().optional(),
  notes: z.string().optional(),
});

type InvestmentFormData = z.infer<typeof investmentSchema>;

export default function Investments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);

  const form = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: '',
      type: '',
      invested_amount: '',
      current_value: '',
      interest_rate: '',
      start_date: new Date().toISOString().split('T')[0],
      maturity_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: InvestmentFormData) => {
    if (!user) {
  toast({ title: "User not logged in", variant: "destructive" });
  return;
}
    try {
      const investmentData = {
        user_id: user?.id,
        name: data.name,
        type: data.type,
        invested_amount: parseFloat(data.invested_amount),
        current_value: parseFloat(data.current_value),
        interest_rate: data.interest_rate ? parseFloat(data.interest_rate) : null,
        start_date: data.start_date,
        maturity_date: data.maturity_date || null,
        notes: data.notes || null,
      };

      if (editingInvestment) {
        const { error } = await supabase
          .from('investments')
          .update(investmentData)
          .eq('id', editingInvestment.id);

        if (error) throw error;
        toast({ title: 'Investment updated successfully' });
      } else {
        const { error } = await supabase
          .from('investments')
          .insert([investmentData]);

        if (error) throw error;
        toast({ title: 'Investment added successfully' });
      }

      setDialogOpen(false);
      setEditingInvestment(null);
      form.reset();
      fetchInvestments();
    } catch (error) {
      console.error('Error saving investment:', error);
      toast({
        title: 'Error saving investment',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    form.reset({
      name: investment.name,
      type: investment.type,
      invested_amount: investment.invested_amount.toString(),
      current_value: investment.current_value.toString(),
      interest_rate: investment.interest_rate?.toString() || '',
      start_date: investment.start_date,
      maturity_date: investment.maturity_date || '',
      notes: investment.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Investment deleted' });
      fetchInvestments();
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        title: 'Error deleting investment',
        variant: 'destructive',
      });
    }
  };

  const totalInvested = investments.reduce((sum, i) => sum + Number(i.invested_amount), 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + Number(i.current_value), 0);
  const totalReturns = totalCurrentValue - totalInvested;
  const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  const portfolioData = investmentTypes
    .map((type) => {
      const typeInvestments = investments.filter((i) => i.type === type.value);
      const value = typeInvestments.reduce((sum, i) => sum + Number(i.current_value), 0);
      return { name: type.label, value, color: type.color };
    })
    .filter((d) => d.value > 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Investment Portfolio</h1>
            <p className="text-muted-foreground">Track and manage your investments</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingInvestment(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary gap-2">
                <Plus className="w-4 h-4" />
                Add Investment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingInvestment ? 'Edit Investment' : 'Add Investment'}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SBI FD, Axis MF" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {investmentTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="invested_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invested (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="current_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Value (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <FormField
                    control={form.control}
                    name="maturity_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maturity Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full gradient-primary">
                    {editingInvestment ? 'Update Investment' : 'Add Investment'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalCurrentValue)}</p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Returns</p>
              <p className={`text-xl font-bold ${totalReturns >= 0 ? 'text-income' : 'text-expense'}`}>
                {totalReturns >= 0 ? '+' : ''}{formatCurrency(totalReturns)}
              </p>
            </CardContent>
          </Card>
          <Card className="stat-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Returns %</p>
              <div className="flex items-center gap-1">
                {totalReturns >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-income" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-expense" />
                )}
                <p className={`text-xl font-bold ${totalReturns >= 0 ? 'text-income' : 'text-expense'}`}>
                  {returnsPercentage.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Allocation & Investments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <Card className="stat-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Portfolio Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {portfolioData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={portfolioData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {portfolioData.map((entry, index) => (
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
                    <p>No investments yet</p>
                  </div>
                )}
              </div>
              <div className="space-y-2 mt-4">
                {portfolioData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Investments List */}
          <Card className="stat-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">All Investments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : investments.length > 0 ? (
                <div className="space-y-3">
                  {investments.map((investment) => {
                    const returns = Number(investment.current_value) - Number(investment.invested_amount);
                    const returnsPercent = (returns / Number(investment.invested_amount)) * 100;
                    const typeInfo = investmentTypes.find((t) => t.value === investment.type);
                    
                    return (
                      <div
                        key={investment.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${typeInfo?.color}20` }}
                          >
                            <PiggyBank className="w-5 h-5" style={{ color: typeInfo?.color }} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{investment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {typeInfo?.label} • {formatDate(investment.start_date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(investment.current_value)}</p>
                            <p className={`text-sm ${returns >= 0 ? 'text-income' : 'text-expense'}`}>
                              {returns >= 0 ? '+' : ''}{returnsPercent.toFixed(1)}%
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(investment)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(investment.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PiggyBank className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No investments added yet</p>
                  <Button variant="link" onClick={() => setDialogOpen(true)}>
                    Add your first investment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
