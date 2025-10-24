import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Eye, Download, Pencil, Trash2, UploadCloud,
  Calendar, User, Building2, Clock, FileCheck, X, Loader2,
  Search, AlertCircle, File
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";

function safeArray(v: any) {
  return Array.isArray(v) ? v : Array.isArray(v?.content) ? v.content : [];
}

export default function Documents() {
  const orgId = typeof window !== "undefined" ? localStorage.getItem("organizationId") || "" : "";
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    documentType: "",
    issuingAuthority: "",
    issuedDate: "",
    expiryDate: "",
    renewalPeriodDays: "",
    responsibleParty: "",
    notes: "",
    file: null as File | null,
    fileUrl: ""
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (open || deleteDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, deleteDialogOpen]);

  const stats = useMemo(() => {
    const total = documents.length;
    const now = new Date();
    const expiringSoon = documents.filter((doc: any) => {
      if (!doc.expiryDate) return false;
      const expiry = new Date(doc.expiryDate);
      const diff = expiry.getTime() - now.getTime();
      const daysUntilExpiry = diff / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    const expired = documents.filter((doc: any) => {
      if (!doc.expiryDate) return false;
      return new Date(doc.expiryDate) < now;
    }).length;
    return [
      { title: "Total Documents", value: total, change: "All documents", icon: FileText, bg: "bg-primary-soft", color: "text-primary" },
      { title: "Expiring Soon", value: expiringSoon, change: "Within 30 days", icon: Clock, bg: "bg-warning-soft", color: "text-warning" },
      { title: "Expired", value: expired, change: "Need renewal", icon: AlertCircle, bg: "bg-destructive/10", color: "text-destructive" },
      { title: "Valid", value: total - expired, change: "Currently active", icon: FileCheck, bg: "bg-success-soft", color: "text-success" },
    ];
  }, [documents]);

  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((doc: any) =>
      doc.documentType?.toLowerCase().includes(q) ||
      doc.issuingAuthority?.toLowerCase().includes(q) ||
      doc.responsibleParty?.toLowerCase().includes(q)
    );
  }, [documents, searchQuery]);

  const fetchDocs = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE}/api/organizations/${orgId}/documents?page=0&size=50`);
      setDocuments(safeArray(res.data));
    } catch (err: any) {
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchDocs(); }, [orgId]);

  const calculatedRenewalDays = useMemo(() => {
    if (!form.issuedDate || !form.expiryDate) return "";
    const d1 = new Date(form.issuedDate); const d2 = new Date(form.expiryDate);
    const diff = d2.getTime() - d1.getTime();
    const days = Math.max(Math.round(diff / (1000 * 60 * 60 * 24)), 0);
    return isNaN(days) ? "" : days.toString();
  }, [form.issuedDate, form.expiryDate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await axios.post(
        `${API_BASE}/api/organizations/${orgId}/documents/upload`,
        data,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setForm(f => ({ ...f, file, fileUrl: res.data }));
      toast({ title: "Success", description: "File uploaded successfully!" });
    } catch {
      toast({ title: "Upload Error", description: "Failed to upload file", variant: "destructive" });
      setForm(f => ({ ...f, file: null, fileUrl: "" }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date();
    const issued = form.issuedDate ? new Date(form.issuedDate) : null;
    const expired = form.expiryDate ? new Date(form.expiryDate) : null;
    if (issued && issued > today) {
      toast({ title: "Validation", description: "Issued date cannot be in the future.", variant: "destructive" });
      return;
    }
    if (issued && expired && expired < issued) {
      toast({ title: "Validation", description: "Expiry date cannot be before issued date.", variant: "destructive" });
      return;
    }
    if (!form.fileUrl) {
      toast({ title: "Validation", description: "Please upload the file first.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        documentType: form.documentType,
        organizationId: orgId,
        issuingAuthority: form.issuingAuthority,
        issuedDate: form.issuedDate,
        expiryDate: form.expiryDate,
        renewalPeriodDays: Number(calculatedRenewalDays),
        responsibleParty: form.responsibleParty,
        fileUrl: form.fileUrl,
        notes: form.notes,
      };
      if (editId) {
        await axios.put(`${API_BASE}/api/organizations/${orgId}/documents/${editId}`, payload);
        toast({ title: "Success", description: "Document updated successfully!" });
      } else {
        await axios.post(`${API_BASE}/api/organizations/${orgId}/documents`, payload);
        toast({ title: "Success", description: "Document added successfully!" });
      }
      setOpen(false);
      setEditId(null);
      setForm({
        documentType: "", issuingAuthority: "", issuedDate: "", expiryDate: "",
        renewalPeriodDays: "", responsibleParty: "", notes: "",
        file: null, fileUrl: ""
      });
      fetchDocs();
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to save document", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (doc: any) => {
    setEditId(doc.id);
    setForm({
      documentType: doc.documentType || "",
      issuingAuthority: doc.issuingAuthority || "",
      issuedDate: doc.issuedDate || "",
      expiryDate: doc.expiryDate || "",
      renewalPeriodDays: doc.renewalPeriodDays?.toString() || "",
      responsibleParty: doc.responsibleParty || "",
      notes: doc.notes || "",
      file: null,
      fileUrl: doc.fileUrl || ""
    });
    setOpen(true);
  };

  const confirmDelete = (doc: any) => { setDeleteTarget(doc); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/documents/${deleteTarget.id}`);
      fetchDocs();
      toast({ title: "Success", description: "Document deleted successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false); setDeleteTarget(null);
    }
  };

  const handleDownload = async (fileUrl: string, documentType: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentType.replace(/\s+/g, '_')}_${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Document downloaded successfully!" });
    } catch {
      toast({ title: "Error", description: "Failed to download document", variant: "destructive" });
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: "No Expiry", color: "bg-muted text-muted-foreground" };
    const expiry = new Date(expiryDate), now = new Date();
    const diff = expiry.getTime() - now.getTime(), days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
    if (days <= 7) return { label: `${days} days left`, color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `${days} days left`, color: "bg-warning/10 text-warning" };
    return { label: "Valid", color: "bg-success/10 text-success" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header, Stats, Search, Document Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Document Management</h1>
          <p className="text-muted-foreground">Manage organization documents and compliance</p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => { setOpen(true); setEditId(null); }}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="stat-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                  <div className={`${stat.bg} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents by type, authority, or responsible party..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 text-destructive">
          <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
          <p>{error}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          {searchQuery ? (
            <>
              <Search className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Try adjusting your search</p>
            </>
          ) : (
            <>
              <FileText className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No documents yet</p>
              <p className="text-sm">Upload your first document to get started</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc: any) => {
            const expiryStatus = getExpiryStatus(doc.expiryDate);
            return (
              <Card key={doc.id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 shrink-0">
                        <File className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-lg truncate">{doc.documentType}</h3>
                        <Badge className={`${expiryStatus.color} text-xs mt-1`}>
                          {expiryStatus.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.issuingAuthority}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="truncate">{doc.responsibleParty}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs">Issued</p>
                          <p className="font-medium text-foreground truncate">
                            {doc.issuedDate
                              ? new Date(doc.issuedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : "--"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs">Expires</p>
                          <p className="font-medium text-foreground truncate">
                            {doc.expiryDate
                              ? new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : "--"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
                      onClick={() => window.open(doc.fileUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-600"
                      onClick={() => handleDownload(doc.fileUrl, doc.documentType)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-orange-50 hover:text-orange-600"
                      onClick={() => handleEdit(doc)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                      onClick={() => confirmDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {open && (
        <div
          className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300"
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-background shadow-2xl rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold">{editId ? "Edit Document" : "Add New Document"}</h2>
                <p className="text-sm text-muted-foreground">Fill in the document details</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-2 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/*Add Edit  Modal content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="document-form" onSubmit={handleSubmit}>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Document Type *</Label>
                      <Input value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Issuing Authority *</Label>
                      <Input value={form.issuingAuthority} onChange={e => setForm(f => ({ ...f, issuingAuthority: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Issued Date *</Label>
                      <Input
                        type="date"
                        value={form.issuedDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => setForm(f => ({
                          ...f,
                          issuedDate: e.target.value,
                          expiryDate: f.expiryDate && f.expiryDate < e.target.value ? "" : f.expiryDate
                        }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Expiry Date *</Label>
                      <Input
                        type="date"
                        value={form.expiryDate}
                        min={form.issuedDate || ""}
                        onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Renewal Period (Days)</Label>
                      <Input
                        value={calculatedRenewalDays}
                        readOnly
                        className="bg-yellow-50 border border-yellow-300 text-yellow-800 font-bold"
                        tabIndex={-1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase text-muted-foreground">Responsible Party *</Label>
                      <Input value={form.responsibleParty} onChange={e => setForm(f => ({ ...f, responsibleParty: e.target.value }))} required />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase text-muted-foreground">Upload File (PDF/Image/Any) *</Label>
                      <Input type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" onChange={handleFileChange} required={!editId} />
                      {form.fileUrl && (
                        <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Preview uploaded file
                        </a>
                      )}
                      {uploading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase text-muted-foreground">Notes</Label>
                      <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes (optional)" />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Stretched Footer (sticky, full width, no margin) */}
            <div className="sticky bottom-0 left-0 w-full px-6 py-4 border-t border-border bg-background flex justify-end gap-4 rounded-b-2xl">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                form="document-form"
                type="submit"
                className="btn-gradient-primary"
                disabled={submitting || uploading}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editId ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editId ? "Save Changes" : "Add Document"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div
          className={
            "fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300 " +
            (deleteDialogOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')
          }
          style={{ margin: 0, padding: '1rem', minHeight: '100vh', minWidth: '100vw' }}
          onClick={() => setDeleteDialogOpen(false)}
        >
          <div className="bg-background p-8 rounded-2xl shadow-2xl relative w-full max-w-md">
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="absolute top-4 right-4 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground p-1 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold">Delete Document</h3>
            </div>
            <p className="mb-6 text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.documentType}</span>?
              <br />
              <span className="text-sm">This action cannot be undone.</span>
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete Document
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
