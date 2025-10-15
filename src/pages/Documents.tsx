import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogOverlay } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileImage, Eye, Download as DownloadIcon, Pencil, Trash2, UploadCloud } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://finflux-64307221061.asia-south1.run.app ";
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

  // Delete Confirmation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

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

  // Cloudinary File Upload
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
      toast({ title: "File uploaded", description: "Uploaded to Cloudinary 👍" });
    } catch {
      toast({ title: "Cloudinary Error", description: "Uploading failed", variant: "destructive" });
      setForm(f => ({ ...f, file: null, fileUrl: "" }));
    } finally {
      setUploading(false);
    }
  };

  // CREATE & UPDATE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fileUrl) {
      toast({ title: "Validation", description: "Please upload the file first.", variant: "destructive" });
      return;
    }
    if (!form.documentType || !form.issuingAuthority || !form.issuedDate || !form.expiryDate
      || !form.renewalPeriodDays || !form.responsibleParty || !form.fileUrl) {
      toast({ title: "Validation", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      if (editId) {
        await axios.put(`${API_BASE}/api/organizations/${orgId}/documents/${editId}`, {
          documentType: form.documentType,
          organizationId: orgId,
          issuingAuthority: form.issuingAuthority,
          issuedDate: form.issuedDate,
          expiryDate: form.expiryDate,
          renewalPeriodDays: Number(form.renewalPeriodDays),
          responsibleParty: form.responsibleParty,
          fileUrl: form.fileUrl,
          notes: form.notes,
        });
        toast({ title: "Document Updated" });
      } else {
        await axios.post(`${API_BASE}/api/organizations/${orgId}/documents`, {
          documentType: form.documentType,
          organizationId: orgId,
          issuingAuthority: form.issuingAuthority,
          issuedDate: form.issuedDate,
          expiryDate: form.expiryDate,
          renewalPeriodDays: Number(form.renewalPeriodDays),
          responsibleParty: form.responsibleParty,
          fileUrl: form.fileUrl,
          notes: form.notes,
        });
        toast({ title: "Document Added" });
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
      toast({ title: "Save Error", description: err?.response?.data?.message || "Failed to save document", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit action handler
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

  // Delete action handler: open confirm dialog
  const confirmDelete = (doc: any) => {
    setDeleteTarget(doc);
    setDeleteDialogOpen(true);
  };

  // Delete handler (API call on confirm)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${API_BASE}/api/organizations/${orgId}/documents/${deleteTarget.id}`);
      fetchDocs();
      toast({ title: "Document deleted" });
    } catch (err: any) {
      toast({ title: "Delete Error", description: err?.response?.data?.message || "Failed to delete document", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground">View and manage organization documents</p>
        </div>
        <Button className="btn-gradient-primary" onClick={() => { setOpen(true); setEditId(null); }}>
          <UploadCloud className="mr-2 h-4 w-4" />
          Upload New Document
        </Button>
      </div>

      <Card className="card-gradient">
        <CardHeader>
          <CardTitle>Organization Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {loading
            ? <p>Loading documents…</p>
            : error
              ? <p className="text-destructive">{error}</p>
              : (
                documents.length === 0
                  ? <p>No documents found.</p>
                  : (
                  <div className="overflow-x-auto rounded-lg border border-border shadow">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="px-5 py-3 text-left font-semibold">Type</th>
                          <th className="px-5 py-3 text-left font-semibold">Authority</th>
                          <th className="px-5 py-3 text-left font-semibold">Issued</th>
                          <th className="px-5 py-3 text-left font-semibold">Expiry</th>
                          <th className="px-5 py-3 text-left font-semibold">Responsible</th>
                          <th className="px-5 py-3 text-left font-semibold">Notes</th>
                          <th className="px-5 py-3 text-center font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc: any, i: number) => (
                          <tr
                            key={doc.id}
                            className={i % 2 === 0
                              ? "bg-background hover:bg-muted/20"
                              : "bg-muted/30 hover:bg-muted/40"}
                          >
                            <td className="px-5 py-3 border-b border-border">{doc.documentType}</td>
                            <td className="px-5 py-3 border-b border-border">{doc.issuingAuthority}</td>
                            <td className="px-5 py-3 border-b border-border">{doc.issuedDate}</td>
                            <td className="px-5 py-3 border-b border-border">{doc.expiryDate}</td>
                            <td className="px-5 py-3 border-b border-border">{doc.responsibleParty}</td>
                            <td className="px-5 py-3 border-b border-border">{doc.notes || "—"}</td>
                            <td className="px-5 py-3 border-b border-border text-center">
                              <div className="flex justify-center items-center gap-2">
                                {/* VIEW */}
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-blue-100"
                                  title="View"
                                >
                                  <a
                                    href={doc.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#3887FF" }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                {/* DOWNLOAD */}
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-green-100"
                                  title="Download"
                                >
                                  <a
                                    href={doc.fileUrl}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#12B76A" }}
                                  >
                                    <DownloadIcon className="h-4 w-4" />
                                  </a>
                                </Button>
                                {/* EDIT */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-orange-100"
                                  title="Edit"
                                  onClick={() => handleEdit(doc)}
                                  style={{ color: "#FFA100" }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {/* DELETE */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="hover:bg-red-100"
                                  title="Delete"
                                  onClick={() => confirmDelete(doc)}
                                  style={{ color: "#F04438" }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )
          }
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={isOpen => { setOpen(isOpen); if (!isOpen) setEditId(null); }}>
        <DialogOverlay className="bg-transparent" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Document" : "Add Document"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type*</Label>
                <Input value={form.documentType} onChange={e => setForm(f => ({ ...f, documentType: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Issuing Authority*</Label>
                <Input value={form.issuingAuthority} onChange={e => setForm(f => ({ ...f, issuingAuthority: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Issued Date*</Label>
                <Input type="date" value={form.issuedDate} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date*</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Renewal Period Days*</Label>
                <Input type="number" min="0" value={form.renewalPeriodDays} onChange={e => setForm(f => ({ ...f, renewalPeriodDays: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Responsible Party*</Label>
                <Input value={form.responsibleParty} onChange={e => setForm(f => ({ ...f, responsibleParty: e.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>File (PDF/IMG)*</Label>
                <Input type="file" accept="image/*,.pdf" onChange={handleFileChange} required={!editId} />
                {form.fileUrl && <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">Preview File</a>}
                {uploading && <span className="text-xs">Uploading...</span>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditId(null); }} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" className="btn-gradient-primary" disabled={submitting || uploading}>
                {submitting ? (editId ? "Saving..." : "Adding...") : editId ? "Save Changes" : "Save Document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogOverlay className="bg-transparent" />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Confirmation</DialogTitle>
          </DialogHeader>
          <div>
            Are you sure you want to delete the document{" "}
            <span className="font-bold">{deleteTarget?.documentType}</span>?
            <br />
            This action cannot be undone.
          </div>
          <DialogFooter className="flex gap-2 justify-end pt-4">
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outline">Cancel</Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
