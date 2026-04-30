import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface BulkUpload {
  id: string;
  filename: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: any;
  status: string;
  created_at: string;
}

export default function DealerAdminBulkPricing() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorDialog, setErrorDialog] = useState<BulkUpload | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dealer_admin_bulk_pricing_uploads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setUploads((data ?? []) as BulkUpload[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h] = values[i] ?? ""));
      return row;
    });
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("CSV is empty or malformed");
        return;
      }

      const errors: string[] = [];
      let success = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row["name"] || row["Name"] || row["plan_name"];
        if (!name) {
          errors.push(`Row ${i + 2}: Missing name`);
          continue;
        }

        const monthly = parseFloat(row["monthly_price"] || row["Monthly"] || "0") || 0;
        const yearly = parseFloat(row["yearly_price"] || row["12 Month"] || "0") || 0;
        const threeYear =
          parseFloat(row["three_yearly_price"] || row["36 Month"] || "0") || 0;
        const planType = row["plan_type"] || "standard";
        const vehicleType = row["vehicle_type"] || null;

        // Upsert by name + plan_type
        const { data: existing } = await supabase
          .from("dealer_admin_plans")
          .select("id")
          .eq("name", name)
          .eq("plan_type", planType)
          .maybeSingle();

        const payload = {
          name,
          plan_type: planType,
          vehicle_type: vehicleType,
          monthly_price: monthly,
          yearly_price: yearly,
          three_yearly_price: threeYear,
          is_active: true,
        };

        const { error } = existing
          ? await supabase
              .from("dealer_admin_plans")
              .update(payload)
              .eq("id", existing.id)
          : await supabase.from("dealer_admin_plans").insert(payload);

        if (error) errors.push(`Row ${i + 2} (${name}): ${error.message}`);
        else success++;
      }

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("dealer_admin_bulk_pricing_uploads").insert({
        filename: file.name,
        total_rows: rows.length,
        success_count: success,
        error_count: errors.length,
        errors: errors,
        status: errors.length === 0 ? "complete" : "partial",
        uploaded_by: user?.id,
      });

      toast.success(`Processed ${success} of ${rows.length} rows`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv =
      "name,plan_type,vehicle_type,monthly_price,yearly_price,three_yearly_price\n" +
      "Basic,standard,,29.99,299,799\n" +
      "Gold,standard,,39.99,399,999\n" +
      "Platinum,standard,,49.99,499,1199\n" +
      "EV Plan,special,ev,34.99,349,899\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dealer-pricing-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-8 w-8" /> Bulk Pricing
        </h1>
        <p className="text-muted-foreground">
          Upload CSV files to update dealer plan pricing in bulk
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Pricing CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              Download Template
            </Button>
            <label>
              <Input
                type="file"
                accept=".csv"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
                className="hidden"
                id="bulk-upload"
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="bulk-upload" className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading…" : "Upload CSV"}
                </label>
              </Button>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            CSV columns: <code>name, plan_type, vehicle_type, monthly_price, yearly_price, three_yearly_price</code>.
            Existing plans (matched by name + plan_type) will be updated; new ones inserted.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No uploads yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((u) => (
                  <TableRow
                    key={u.id}
                    className={u.error_count > 0 ? "cursor-pointer" : ""}
                    onClick={() => u.error_count > 0 && setErrorDialog(u)}
                  >
                    <TableCell className="font-medium">{u.filename}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{u.total_rows}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {u.success_count}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {u.error_count}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.status === "complete" ? "default" : "secondary"}
                      >
                        {u.status === "complete" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {u.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Errors — {errorDialog?.filename}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-1 text-sm">
            {(errorDialog?.errors as string[] ?? []).map((err, i) => (
              <div key={i} className="p-2 bg-destructive/10 rounded">
                {err}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
