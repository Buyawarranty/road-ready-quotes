import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

interface DealerAdminPlan {
  id: string;
  name: string;
  plan_type: string;
  vehicle_type: string | null;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  three_yearly_price: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  plan_type: "standard",
  vehicle_type: "",
  description: "",
  monthly_price: 0,
  yearly_price: 0,
  three_yearly_price: 0,
  is_active: true,
  display_order: 0,
};

export default function DealerAdminPlans() {
  const [plans, setPlans] = useState<DealerAdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState("standard");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dealer_admin_plans")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPlans((data ?? []) as DealerAdminPlan[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, plan_type: tab });
    setDialogOpen(true);
  };

  const openEdit = (plan: DealerAdminPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      plan_type: plan.plan_type,
      vehicle_type: plan.vehicle_type ?? "",
      description: plan.description ?? "",
      monthly_price: Number(plan.monthly_price ?? 0),
      yearly_price: Number(plan.yearly_price ?? 0),
      three_yearly_price: Number(plan.three_yearly_price ?? 0),
      is_active: plan.is_active,
      display_order: plan.display_order ?? 0,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      ...form,
      vehicle_type: form.vehicle_type || null,
      description: form.description || null,
    };
    const { error } = editingId
      ? await supabase.from("dealer_admin_plans").update(payload).eq("id", editingId)
      : await supabase.from("dealer_admin_plans").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editingId ? "Plan updated" : "Plan created");
    setDialogOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("dealer_admin_plans").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Plan deleted");
      load();
    }
  };

  const toggleActive = async (plan: DealerAdminPlan) => {
    const { error } = await supabase
      .from("dealer_admin_plans")
      .update({ is_active: !plan.is_active })
      .eq("id", plan.id);
    if (error) toast.error(error.message);
    else load();
  };

  const filtered = plans.filter((p) => p.plan_type === tab);
  const standardCount = plans.filter((p) => p.plan_type === "standard").length;
  const specialCount = plans.filter((p) => p.plan_type === "special").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8" /> Plans & Bulk Pricing
          </h1>
          <p className="text-muted-foreground">
            Manage standard and special vehicle plans for dealers
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Plan
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="standard">Standard ({standardCount})</TabsTrigger>
          <TabsTrigger value="special">Special Vehicle ({specialCount})</TabsTrigger>
        </TabsList>

        {["standard", "special"].map((t) => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {t === "standard" ? "Standard Plans" : "Special Vehicle Plans"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No plans yet. Click "New Plan" to add one.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead className="text-right">Monthly</TableHead>
                        <TableHead className="text-right">12mo</TableHead>
                        <TableHead className="text-right">36mo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.vehicle_type ?? "—"}</TableCell>
                          <TableCell className="text-right">£{Number(p.monthly_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">£{Number(p.yearly_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">£{Number(p.three_yearly_price).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={p.is_active ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => toggleActive(p)}
                            >
                              {p.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Basic, Gold, Platinum"
              />
            </div>
            <div>
              <Label>Plan Type</Label>
              <Select
                value={form.plan_type}
                onValueChange={(v) => setForm({ ...form, plan_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="special">Special Vehicle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle Type (optional)</Label>
              <Select
                value={form.vehicle_type || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, vehicle_type: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="ev">EV</SelectItem>
                  <SelectItem value="phev">PHEV</SelectItem>
                  <SelectItem value="motorbike">Motorbike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Monthly Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.monthly_price}
                onChange={(e) =>
                  setForm({ ...form, monthly_price: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>12 Month Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.yearly_price}
                onChange={(e) =>
                  setForm({ ...form, yearly_price: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>36 Month Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.three_yearly_price}
                onChange={(e) =>
                  setForm({ ...form, three_yearly_price: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm({ ...form, display_order: Number(e.target.value) })
                }
              />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editingId ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
