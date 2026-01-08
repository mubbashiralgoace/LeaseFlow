"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const invoiceSchema = z.object({
  client_id: z.string().optional(),
  invoice_number: z.string().min(1, "Invoice number is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  currency: z.string().default("USD"),
  tax_rate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  discount_type: z.enum(["amount", "percentage"]).default("amount"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      description: z.string().min(1, "Description is required"),
      quantity: z.number().min(0.01, "Quantity must be greater than 0"),
      unit_price: z.number().min(0, "Unit price must be 0 or greater"),
      tax_rate: z.number().min(0).max(100).default(0),
    })
  ).min(1, "At least one item is required"),
});

type InvoiceFormData = z.input<typeof invoiceSchema>;

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: "",
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "draft",
      currency: "USD",
      tax_rate: 0,
      discount: 0,
      discount_type: "amount",
      items: [
        {
          description: "",
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedTaxRate = watch("tax_rate");
  const watchedDiscount = watch("discount");
  const watchedDiscountType = watch("discount_type");

  useEffect(() => {
    fetchClients();
    if (params.id) {
      fetchInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchClients = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchInvoice = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(`
          *,
          clients:client_id (
            id,
            name
          )
        `)
        .eq("id", params.id)
        .single();

      if (invoiceError) throw invoiceError;

      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", params.id)
        .order("sort_order");

      if (itemsError) throw itemsError;

      // Format dates for input fields
      const issueDate = invoiceData.issue_date
        ? new Date(invoiceData.issue_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const dueDate = invoiceData.due_date
        ? new Date(invoiceData.due_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      // Reset form with fetched data
      reset({
        client_id: invoiceData.client_id || undefined,
        invoice_number: invoiceData.invoice_number || "",
        issue_date: issueDate,
        due_date: dueDate,
        status: invoiceData.status || "draft",
        currency: invoiceData.currency || "USD",
        tax_rate: invoiceData.tax_rate || 0,
        discount: invoiceData.discount || 0,
        discount_type: (invoiceData.discount_type as "amount" | "percentage") || "amount",
        notes: invoiceData.notes || "",
        terms: invoiceData.terms || "",
        items: itemsData && itemsData.length > 0
          ? itemsData.map((item) => ({
              id: item.id,
              description: item.description || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              tax_rate: item.tax_rate || 0,
            }))
          : [
              {
                description: "",
                quantity: 1,
                unit_price: 0,
                tax_rate: 0,
              },
            ],
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        title: "Error",
        description: "Failed to load invoice",
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    watchedItems.forEach((item) => {
      const lineTotal = item.quantity * item.unit_price;
      subtotal += lineTotal;
      totalTax += lineTotal * ((item.tax_rate || 0) / 100);
    });

    // Add global tax
    totalTax += subtotal * ((watchedTaxRate || 0) / 100);

    // Calculate discount
    let discountAmount = 0;
    const discount = watchedDiscount || 0;
    if (watchedDiscountType === "amount") {
      discountAmount = discount;
    } else {
      discountAmount = subtotal * (discount / 100);
    }

    const total = subtotal + totalTax - discountAmount;

    return {
      subtotal: Math.max(0, subtotal),
      tax: Math.max(0, totalTax),
      discount: Math.max(0, discountAmount),
      total: Math.max(0, total),
    };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: z.infer<typeof invoiceSchema>) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      // Calculate totals
      const { subtotal, tax, discount, total } = calculateTotals();

      // Update invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          client_id: data.client_id || null,
          invoice_number: data.invoice_number,
          issue_date: data.issue_date,
          due_date: data.due_date,
          status: data.status,
          currency: data.currency,
          tax_rate: data.tax_rate,
          discount: data.discount,
          discount_type: data.discount_type,
          subtotal,
          tax_amount: tax,
          discount_amount: discount,
          total,
          notes: data.notes || null,
          terms: data.terms || null,
        })
        .eq("id", params.id);

      if (invoiceError) throw invoiceError;

      // Delete existing invoice items
      const { error: deleteError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", params.id);

      if (deleteError) throw deleteError;

      // Create new invoice items
      const items = data.items.map((item, index) => ({
        invoice_id: params.id as string,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        line_total: item.quantity * item.unit_price,
        sort_order: index,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });

      router.push(`/dashboard/invoices/${params.id}`);
    } catch (error) {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/invoices/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Invoice</h1>
          <p className="text-muted-foreground mt-2">
            Update invoice details and items
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Basic information about the invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    onValueChange={(value) => setValue("client_id", value === "none" ? undefined : value)}
                    value={watch("client_id") || "none"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No client</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_number">
                    Invoice Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invoice_number"
                    {...register("invoice_number")}
                    placeholder="INV-001"
                  />
                  {errors.invoice_number && (
                    <p className="text-sm text-destructive">
                      {errors.invoice_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issue_date">
                    Issue Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="issue_date"
                    type="date"
                    {...register("issue_date")}
                  />
                  {errors.issue_date && (
                    <p className="text-sm text-destructive">
                      {errors.issue_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">
                    Due Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    {...register("due_date")}
                  />
                  {errors.due_date && (
                    <p className="text-sm text-destructive">
                      {errors.due_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watch("status")}
                    onValueChange={(value) =>
                      setValue("status", value as InvoiceFormData["status"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={watch("currency")}
                    onValueChange={(value) => setValue("currency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  {...register("terms")}
                  placeholder="Payment terms and conditions..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
              <CardDescription>Pricing and tax information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register("tax_rate", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("discount", { valueAsNumber: true })}
                  />
                  <Select
                    value={watch("discount_type")}
                    onValueChange={(value) =>
                      setValue("discount_type", value as "amount" | "percentage")
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>${totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span>-${totals.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Items</CardTitle>
                <CardDescription>Add items to your invoice</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    description: "",
                    quantity: 1,
                    unit_price: 0,
                    tax_rate: 0,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-4 p-4 border rounded-lg md:grid-cols-12"
                >
                  <div className="md:col-span-5 space-y-2">
                    <Label>Description</Label>
                    <Input
                      {...register(`items.${index}.description`)}
                      placeholder="Item description"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="text-sm text-destructive">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-sm text-destructive">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`items.${index}.unit_price`, {
                        valueAsNumber: true,
                      })}
                    />
                    {errors.items?.[index]?.unit_price && (
                      <p className="text-sm text-destructive">
                        {errors.items[index]?.unit_price?.message}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register(`items.${index}.tax_rate`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="md:col-span-12 text-right text-sm text-muted-foreground">
                    Line Total: $
                    {(
                      (watchedItems[index]?.quantity || 0) *
                      (watchedItems[index]?.unit_price || 0)
                    ).toFixed(2)}
                  </div>
                </div>
              ))}
              {errors.items && typeof errors.items.message === "string" && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}

