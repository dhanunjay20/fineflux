import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Eye, Download, Pencil, Trash2, UploadCloud, 
  Calendar, User, Building2, Clock, FileCheck, X, Loader2,
  Search, AlertCircle
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app";
const CLOUDINARY_UPLOAD_URL = import.meta.env.VITE_CLOUDINARY_UPLOAD_URL || "https://api.cloudinary.com/v1_1/dosyyvmtb/auto/upload";
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "FineFlux";

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

  // Lock scroll when modal is open
  useEffect(() => {
    if (open || deleteDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, deleteDialogOpen]);

  // Stats
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
      { 
        title: "Total Documents", 
        value: total, 
        change: "All documents",
        icon: FileText, 
        bg: "bg-primary-soft", 
        color: "text-primary" 
      },
      { 
        title: "Expiring Soon", 
        value: expiringSoon, 
        change: "Within 30 days",
        icon: Clock, 
        bg: "bg-warning-soft", 
        color: "text-warning" 
      },
      { 
        title: "Expired", 
        value: expired, 
        change: "Need renewal",
        icon: AlertCircle, 
        bg: "bg-destructive/10", 
        color: "text-destructive" 
      },
      { 
        title: "Valid", 
        value: total - expired, 
        change: "Currently active",
        icon: FileCheck, 
        bg: "bg-success-soft", 
        color: "text-success" 
      },
    ];
  }, [documents]);

  // Filter documents
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setForm(f => ({ ...f, file, fileUrl: res.data.secure_url }));
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
        renewalPeriodDays: Number(form.renewalPeriodDays),
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

  const confirmDelete = (doc: any) => {
    setDeleteTarget(doc);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/documents/${deleteTarget.id}`);
      fetchDocs();
      toast({ title: "Success", description: "Document deleted successfully!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    if (!expiryDate) return { label: "No Expiry", color: "bg-muted text-muted-foreground" };
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
    if (days <= 7) return { label: `${days} days left`, color: "bg-destructive/10 text-destructive" };
    if (days <= 30) return { label: `${days} days left`, color: "bg-warning/10 text-warning" };
    return { label: "Valid", color: "bg-success/10 text-success" };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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

      {/* Stats Cards - Icons on Right */}
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

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Documents ({filteredDocs.length})
            </CardTitle>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mb-3 opacity-50 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-destructive">
              <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
              <p>{error}</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No documents found</p>
                  <p className="text-sm">Try adjusting your search</p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No documents yet</p>
                  <p className="text-sm">Upload your first document to get started</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Document Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Authority</th>
                    <th className="px-4 py-3 text-left font-semibold">Issued</th>
                    <th className="px-4 py-3 text-left font-semibold">Expiry</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Responsible</th>
                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.map((doc: any, i: number) => {
                    const expiryStatus = getExpiryStatus(doc.expiryDate);
                    return (
                      <tr
                        key={doc.id}
                        className={`border-b border-border transition-colors ${
                          i % 2 === 0 ? "bg-background hover:bg-muted/20" : "bg-muted/20 hover:bg-muted/40"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{doc.documentType}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{doc.issuingAuthority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(doc.issuedDate).toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(doc.expiryDate).toLocaleDateString('en-IN', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${expiryStatus.color} font-medium`}>
                            {expiryStatus.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{doc.responsibleParty}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                              title="View Document"
                            >
                              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                              title="Download"
                            >
                              <a href={doc.fileUrl} download target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(doc)}
                              className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => confirmDelete(doc)}
                              className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal - Full Screen Background */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-background shadow-2xl rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
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
                    <Input type="date" value={form.issuedDate} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Expiry Date *</Label>
                    <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Renewal Period (Days) *</Label>
                    <Input type="number" min="0" value={form.renewalPeriodDays} onChange={e => setForm(f => ({ ...f, renewalPeriodDays: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Responsible Party *</Label>
                    <Input value={form.responsibleParty} onChange={e => setForm(f => ({ ...f, responsibleParty: e.target.value }))} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs uppercase text-muted-foreground">Upload File (PDF/Image) *</Label>
                    <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} required={!editId} />
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

              <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/20 shrink-0">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" className="btn-gradient-primary" disabled={submitting || uploading}>
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
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - Full Screen Background */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
