import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  Shield,
  PieChart,
  FileText,
  CreditCard,
  Wallet,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Smart Dashboard',
    description: 'Get a complete view of your finances with interactive charts and real-time insights.',
  },
  {
    icon: Wallet,
    title: 'Expense Tracking',
    description: 'Track every rupee with categorized expenses and smart spending analysis.',
  },
  {
    icon: CreditCard,
    title: 'Loan Management',
    description: 'Calculate EMIs, track payments, and manage multiple loans effortlessly.',
  },
  {
    icon: TrendingUp,
    title: 'Investment Portfolio',
    description: 'Monitor FDs, Mutual Funds, Stocks, PPF and more in one place.',
  },
  {
    icon: Shield,
    title: 'AI Risk Analysis',
    description: 'Get personalized alerts for insurance gaps and financial risks.',
  },
  {
    icon: FileText,
    title: 'Paperless Reports',
    description: 'Generate and share professional PDF reports with family or advisors.',
  },
];

const benefits = [
  '100% Free to use',
  'No credit card required',
  'Bank-grade security',
  'Designed for Indian users',
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-effect border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">FinanceAI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="gradient-primary">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered Financial Insights</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Master Your Money with
            <br />
            <span className="text-primary">Smart Finance Management</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Track expenses, manage loans, analyze investments, and get AI-powered insights — 
            all designed specifically for Indian users with ₹ INR support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-primary text-lg px-8 gap-2">
                Start Free Today
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-12 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/50 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-expense" />
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div className="w-3 h-3 rounded-full bg-income" />
            </div>
            <div className="p-8 bg-gradient-to-br from-muted/20 to-muted/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Income</p>
                    <p className="text-2xl font-bold text-income">₹1,25,000</p>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold text-expense">₹78,500</p>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Net Savings</p>
                    <p className="text-2xl font-bold text-primary">₹46,500</p>
                  </CardContent>
                </Card>
              </div>
              <div className="h-48 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 flex items-center justify-center">
                <PieChart className="w-16 h-16 text-primary/30" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Your Finances
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From expense tracking to investment analysis, get all the tools you need in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="stat-card hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 gradient-hero">
        <div className="container mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Join thousands of users who are already managing their money smarter with FinanceAI.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" variant="secondary" className="text-lg px-8 gap-2">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">FinanceAI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 FinanceAI. Built for Indian users. All amounts in INR (₹).
          </p>
        </div>
      </footer>
    </div>
  );
}
