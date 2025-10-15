import { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import dayjs from "dayjs";
import { Plus, Mail, Phone, Filter, Clock, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

type Employee = {
    empId: string;
    firstName: string;
    lastName: string;
    emailId: string;
    phoneNumber?: string;
    role: string;
    status?: string;
    shiftTiming?: { start?: string; end?: string };
};

type TaskCreate = {
    organizationId: string;
    taskTitle: string;
    description: string;
    priority: string;
    shift: string;
    assignedToEmpId: string;
    dueDate: string;
};

function formatTime(time?: string) {
    return time || "";
}

export default function EmployeeSetDuty() {
    const { toast } = useToast();

    // --- FIX: Always get orgId and BLOCK rendering until present ---
    const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "" : "";

    // BLOCK RENDERING unless orgId is present
    if (!orgId) {
        return (
            <div className="p-6 text-center text-muted-foreground">
                Loading organization context…
            </div>
        );
    }

    const [search, setSearch] = useState("");

    const { data: employeesRaw = [], isLoading } = useQuery({
        queryKey: ["employees", orgId],
        queryFn: async () => {
            if (!orgId) return [];
            const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/employees`);
            // Support both array or { content: [...] }
            if (Array.isArray(res.data)) return res.data;
            if (Array.isArray(res.data.content)) return res.data.content;
            return [];
        },
        enabled: !!orgId,
    });

    const employees =
        Array.isArray(employeesRaw)
            ? employeesRaw.filter((e: any) => (e.status ?? "").toLowerCase() === "active")
            : [];


    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter((e: Employee) => {
            const fullName = `${e.firstName} ${e.lastName}`.trim();
            const composite = [
                fullName,
                e.empId,
                e.role,
                e.emailId,
                e.phoneNumber,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return composite.includes(q);
        });
    }, [employees, search]);

    const [assignOpen, setAssignOpen] = useState(false);
    const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
    const [assignForm, setAssignForm] = useState<TaskCreate>({
        organizationId: orgId,
        taskTitle: "",
        description: "",
        priority: "medium",
        shift: "",
        assignedToEmpId: "",
        dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    });
    const [submitting, setSubmitting] = useState(false);

    function openAssignDialog(emp: Employee) {
        setCurrentEmp(emp);
        setAssignForm(form => ({
            ...form,
            organizationId: orgId,
            assignedToEmpId: emp.empId,
            taskTitle: "",
            description: "",
            priority: "medium",
            shift: "",
            dueDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
        }));
        setAssignOpen(true);
    }

    async function assignDuty(e: React.FormEvent) {
        e.preventDefault();
        if (!assignForm.taskTitle || !assignForm.assignedToEmpId || !assignForm.priority) {
            toast({
                title: "Validation",
                description: "Title, priority, and assignee required.",
                variant: "destructive"
            });
            return;
        }
        try {
            setSubmitting(true);
            await axios.post(
                `${API_BASE}/api/organizations/${orgId}/tasks`,
                assignForm
            );
            toast({ title: "Duty assigned", description: assignForm.taskTitle });
            setAssignOpen(false);
        } catch (err: any) {
            toast({
                title: "Assign failed",
                description:
                    err?.response?.data?.message || "Could not assign duty.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    }

    const getUserInitials = (name: string) =>
        name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Set Employee Duty</h1>
                    <p className="text-muted-foreground">
                        Assign specific tasks to any team member easily
                    </p>
                </div>
            </div>
            <Card className="card-gradient">
                <CardContent className="p-6">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search employees..."
                                    className="pl-10"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Card className="card-gradient">
                <CardHeader>
                    <CardTitle>Active Employees</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading && (
                        <div className="text-muted-foreground">Loading employees…</div>
                    )}
                    {!isLoading && (
                        <div className="space-y-4">
                            {filtered.map((emp: Employee) => {
                                const fullName = `${emp.firstName} ${emp.lastName}`;
                                const start = formatTime(emp.shiftTiming?.start);
                                const end = formatTime(emp.shiftTiming?.end);
                                return (
                                    <div
                                        key={emp.empId}
                                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12">
                                                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                                                    {getUserInitials(fullName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-foreground">{fullName}</h3>
                                                    <Badge>{emp.role}</Badge>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {emp.emailId}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {emp.phoneNumber || "—"}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        Shift:{" "}
                                                        {start && end ? `${start} — ${end}` : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="default" onClick={() => openAssignDialog(emp)}>
                                            <Plus className="mr-1 h-4 w-4" /> Assign Duty
                                        </Button>
                                    </div>
                                );
                            })}
                            {filtered.length === 0 && (
                                <div className="text-sm text-muted-foreground">
                                    No employees match the current filter.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
            {/* Assign Duty Dialog */}
            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogOverlay />
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Assign Duty for {currentEmp?.firstName} {currentEmp?.lastName}
                        </DialogTitle>
                    </DialogHeader>
                    <form className="space-y-4" onSubmit={assignDuty}>
                        <div>
                            <Label>Task Title</Label>
                            <Input
                                required
                                value={assignForm.taskTitle}
                                onChange={(e) =>
                                    setAssignForm((f) => ({ ...f, taskTitle: e.target.value }))
                                }
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                value={assignForm.description}
                                onChange={(e) =>
                                    setAssignForm((f) => ({
                                        ...f,
                                        description: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Priority</Label>
                                <select
                                    className="w-full rounded-md border p-2"
                                    value={assignForm.priority}
                                    onChange={(e) =>
                                        setAssignForm((f) => ({
                                            ...f,
                                            priority: e.target.value
                                        }))
                                    }
                                >
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                </select>
                            </div>
                            <div>
                                <Label>Shift</Label>
                                <Input
                                    value={assignForm.shift}
                                    placeholder="e.g. Morning"
                                    onChange={(e) =>
                                        setAssignForm((f) => ({
                                            ...f,
                                            shift: e.target.value
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                required
                                value={assignForm.dueDate}
                                onChange={(e) =>
                                    setAssignForm((f) => ({
                                        ...f,
                                        dueDate: e.target.value
                                    }))
                                }
                            />
                        </div>
                        <DialogFooter className="flex gap-3 justify-end">
                            <Button
                                type="button"
                                onClick={() => setAssignOpen(false)}
                                variant="outline"
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Assigning..." : "Assign"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
