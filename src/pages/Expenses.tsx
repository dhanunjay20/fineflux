import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card, CardHeader, CardTitle, CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, Plus, TrendingDown, Clock, CheckCircle, XCircle, Calendar, Receipt, Filter, Edit, Trash2, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

const getLocal = (k: string) => {
  const v = localStorage.getItem(k);
  return v ?? "";
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  categoryName: string;
  expenseDate: string;
  organizationId: string;
  empId?: string;
  status?: string;
  requestedBy?: string;
  approvedBy?: string | null;
  receipt?: boolean;
};

type ExpenseCategory = {
  id: string;
  categoryName: string;
  organizationId: string;
};

export default function Expenses() {
  const { toast } = useToast();

  const orgId = getLocal("organizationId") || getLocal("orgId") || "FOS-8127";
  const empId = getLocal("empId") || "EMP001";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCat, setExpenseCat] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [deleteExpenseConfirmId, setDeleteExpenseConfirmId] = useState<string | null>(null);
  const [deleteExpenseLoading, setDeleteExpenseLoading] = useState(false);

  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    axios.get(`${API_BASE}/api/organizations/${orgId}/expenses`)
      .then(res => setExpenses(res.data))
      .catch(() => setExpenses([]));

    axios.get(`${API_BASE}/api/organizations/${orgId}/expense-categories`)
      .then(res => {
        setCategories(res.data);
        if (res.data.length && !expenseCat) setExpenseCat(res.data[0].categoryName);
      })
      .catch(() => setCategories([]));
  }, [orgId, refreshToken]);

  const categoryStats = categories.map(cat => {
    const catExpenses = expenses.filter(exp => exp.categoryName === cat.categoryName);
    return {
      ...cat,
      total: catExpenses.reduce((sum, e) => sum + e.amount, 0),
      count: catExpenses.length
    };
  });

  const stats = [
    {
      title: 'Total Expenses',
      value: `₹${expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`,
      change: 'This month',
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive-soft',
    },
    {
      title: 'Categories',
      value: categories.length.toString(),
      change: 'Expense categories',
      icon: Filter,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    },
    {
      title: 'Average Expense',
      value: expenses.length ? `₹${Math.round(expenses.reduce((s, e) => s + e.amount, 0) / expenses.length).toLocaleString()}` : '₹0',
      change: 'Per expense',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent-soft',
    }
  ];

  const openCreateCategoryModal = () => {
    setEditingCategory(null); setNewCategoryName(''); setCategoryError(''); setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: ExpenseCategory) => {
    setEditingCategory(cat); setNewCategoryName(cat.categoryName); setCategoryError(''); setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setEditingCategory(null); setShowCategoryModal(false); setCategoryLoading(false);
    setCategoryError(''); setNewCategoryName('');
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError('');
    if (!newCategoryName.trim()) { setCategoryError("Category name required."); return; }
    setCategoryLoading(true);
    try {
      let message = '';
      if (editingCategory) {
        const res = await axios.put(
          `${API_BASE}/api/organizations/${orgId}/expense-categories/${editingCategory.id}`,
          { categoryName: newCategoryName.trim(), organizationId: orgId }
        );
        message = `Category "${res.data.categoryName}" updated.`;
      } else {
        const res = await axios.post(
          `${API_BASE}/api/organizations/${orgId}/expense-categories`,
          { categoryName: newCategoryName.trim(), organizationId: orgId }
        );
        message = `Category "${res.data.categoryName}" created.`;
      }
      closeCategoryModal();
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: message, variant: "default" });
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || (editingCategory ? "Failed to update category." : "Failed to create category."));
      toast({ title: "Error", description: (editingCategory ? "Failed to update category." : "Failed to create category."), variant: "destructive" });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setCategoryLoading(true); setCategoryError('');
    try {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/expense-categories/${id}`);
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: "Category deleted.", variant: "default" });
      setDeleteCategoryConfirmId(null);
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || "Delete failed.");
      toast({ title: "Error", description: "Delete failed.", variant: "destructive" });
    } finally {
      setCategoryLoading(false);
    }
  };

  const openCreateExpenseModal = () => {
    setShowExpenseModal(true);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCat(categories[0]?.categoryName || '');
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseError('');
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setExpenseLoading(false);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCat(categories[0]?.categoryName || '');
    setExpenseError('');
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');
    if (!expenseDesc.trim() || !expenseAmount || !expenseCat) {
      setExpenseError('All fields required.');
      toast({ title: "Error", description: "All fields required.", variant: "destructive" });
      return;
    }
    setExpenseLoading(true);
    try {
      await axios.post(`${API_BASE}/api/organizations/${orgId}/expenses`, {
        description: expenseDesc,
        amount: parseFloat(expenseAmount),
        categoryName: expenseCat,
        expenseDate: expenseDate,
        organizationId: orgId,
        empId: empId
      });
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: "Expense created.", variant: "default" });
      closeExpenseModal();
    } catch (err: any) {
      setExpenseError(err?.response?.data?.message || "Failed to add expense.");
      toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    setDeleteExpenseLoading(true);
    try {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/expenses/${id}`);
      setRefreshToken(v => v + 1);
      toast({ title: "Success", description: "Expense deleted.", variant: "default" });
      setDeleteExpenseConfirmId(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete expense.",
        variant: "destructive"
      });
    } finally {
      setDeleteExpenseLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-IN");

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const colors = { pending: "bg-warning-soft text-warning", approved: "bg-success-soft text-success", rejected: "bg-destructive-soft text-destructive" };
    const icons = { pending: Clock, approved: CheckCircle, rejected: XCircle };
    const Icon = icons[status as keyof typeof icons];
    return (
      <Badge className={colors[status as keyof typeof colors] || "bg-muted text-muted-foreground"}>
        <Icon className="mr-1 h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  function closeModal(event: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Expense Management</h1>
          <p className="text-muted-foreground">Track and approve business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button className="btn-gradient-primary" onClick={openCreateExpenseModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button variant="outline" onClick={openCreateCategoryModal}>
            <Plus className="mr-1 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Expense Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map(category => (
              <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary-soft text-primary">{category.categoryName}</Badge>
                  <span className="text-sm">{category.count} expenses</span>
                  <span className="text-sm font-semibold text-foreground">₹{category.total.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditCategoryModal(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteCategoryConfirmId(category.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!categories.length && <p className="text-muted-foreground">No categories found.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-destructive-soft p-3 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{expense.description}</h3>
                      <Badge>{expense.categoryName}</Badge>
                      {getStatusBadge(expense.status)}
                      {expense.receipt && (
                        <Badge className="bg-accent-soft text-accent">
                          <Receipt className="mr-1 h-3 w-3" />
                          Receipt
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Requested by {expense.requestedBy || expense.empId} • {formatDate(expense.expenseDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-destructive">-₹{expense.amount.toLocaleString()}</p>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteExpenseConfirmId(expense.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {!expenses.length && <p className="text-muted-foreground">No expenses found.</p>}
          </div>
        </CardContent>
      </Card>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (showCategoryModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div className="bg-background rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={closeCategoryModal}
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-2xl font-bold mb-6">{editingCategory ? "Edit" : "New"} Expense Category</h3>
            <form className="space-y-4" onSubmit={handleCategorySubmit}>
              <div className="space-y-2">
                <Label htmlFor="expense-cat-name">Category Name</Label>
                <Input
                  id="expense-cat-name"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {categoryError && <div className="text-sm text-red-600">{categoryError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeCategoryModal}>Cancel</Button>
                <Button type="submit" disabled={categoryLoading} className="btn-gradient-primary">
                  {categoryLoading ? "Saving..." : editingCategory ? "Save" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (showExpenseModal ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div className="bg-background rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-lg relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={closeExpenseModal}
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-2xl font-bold mb-6">Add Expense</h3>
            <form className="space-y-4" onSubmit={handleCreateExpense}>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc" value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  required autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount" type="number" min={1} step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Category</Label>
                <Select value={expenseCat} onValueChange={(value) => setExpenseCat(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.categoryName}>
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Expense Date</Label>
                <Input
                  id="date" type="date"
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  required
                />
              </div>
              {expenseError && <div className="text-sm text-red-600">{expenseError}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={closeExpenseModal}>Cancel</Button>
                <Button type="submit" disabled={expenseLoading} className="btn-gradient-primary">
                  {expenseLoading ? "Saving..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CATEGORY CONFIRMATION */}
      {deleteCategoryConfirmId && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteCategoryConfirmId ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div className="bg-background rounded-xl p-6 min-w-[320px] max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-3">Confirm Delete</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this category? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteCategoryConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteCategory(deleteCategoryConfirmId!)}
                disabled={categoryLoading}
              >
                {categoryLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE EXPENSE CONFIRMATION */}
      {deleteExpenseConfirmId && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteExpenseConfirmId ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={closeModal}
        >
          <div className="bg-background rounded-xl p-6 min-w-[320px] max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-3">Confirm Delete</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteExpenseConfirmId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteExpense(deleteExpenseConfirmId!)}
                disabled={deleteExpenseLoading}
              >
                {deleteExpenseLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

