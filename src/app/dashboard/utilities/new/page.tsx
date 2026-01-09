"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { ArrowLeft, Calculator } from "lucide-react";
import Link from "next/link";

const utilityBillSchema = z.object({
  agreement_id: z.string().min(1, "Agreement is required"),
  bill_type: z.enum(["electricity", "water", "gas", "internet", "other"]),
  bill_date: z.string().min(1, "Bill date is required"),
  total_amount: z.number().min(0.01, "Amount must be greater than 0"),
  split_percentage: z.number().min(0).max(100).default(50),
  bill_number: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewUtilityBillPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agreements, setAgreements] = useState<Array<{ id: string; agreement_number: string; property_address: string }>>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(utilityBillSchema),
    defaultValues: {
      bill_type: "electricity",
      bill_date: new Date().toISOString().split("T")[0],
      split_percentage: 50,
      total_amount: 0,
    },
  });

  const watchedTotalAmount = watch("total_amount");
  const watchedSplitPercentage = watch("split_percentage");

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("id, agreement_number, property_address")
        .eq("status", "active")
        .order("agreement_number");

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error("Error fetching agreements:", error);
    }
  };

  const calculateSplit = () => {
    const total = watchedTotalAmount || 0;
    const tenantPercent = watchedSplitPercentage || 50;
    const landlordPercent = 100 - tenantPercent;

    const tenantShare = (total * tenantPercent) / 100;
    const landlordShare = (total * landlordPercent) / 100;

    return {
      tenantShare: Math.round(tenantShare * 100) / 100,
      landlordShare: Math.round(landlordShare * 100) / 100,
      tenantPercent,
      landlordPercent,
    };
  };

  const split = calculateSplit();

  const onSubmit = async (data: z.infer<typeof utilityBillSchema>) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const { tenantShare, landlordShare } = calculateSplit();

      const { error } = await supabase.from("utility_bills").insert({
        user_id: user.id,
        agreement_id: data.agreement_id,
        bill_type: data.bill_type,
        bill_date: data.bill_date,
        total_amount: data.total_amount,
        tenant_share: tenantShare,
        landlord_share: landlordShare,
        split_percentage: data.split_percentage,
        bill_number: data.bill_number || null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Utility bill added successfully",
      });

      router.push("/dashboard/utilities");
    } catch (error) {
      console.error("Error adding utility bill:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add utility bill",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/utilities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add Utility Bill</h1>
          <p className="text-muted-foreground mt-2">
            Add and split utility bills between tenant and landlord
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Bill Information</CardTitle>
              <CardDescription>Enter utility bill details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="agreement_id">
                    Agreement <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("agreement_id", value)}
                    value={watch("agreement_id")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agreement" />
                    </SelectTrigger>
                    <SelectContent>
                      {agreements.map((agreement) => (
                        <SelectItem key={agreement.id} value={agreement.id}>
                          {agreement.agreement_number} - {agreement.property_address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.agreement_id && (
                    <p className="text-sm text-destructive">
                      {errors.agreement_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bill_type">
                    Bill Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    defaultValue="electricity"
                    onValueChange={(value) => setValue("bill_type", value as "electricity" | "water" | "gas" | "internet" | "other")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="water">Water</SelectItem>
                      <SelectItem value="gas">Gas</SelectItem>
                      <SelectItem value="internet">Internet</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bill_date">
                    Bill Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bill_date"
                    type="date"
                    {...register("bill_date")}
                  />
                  {errors.bill_date && (
                    <p className="text-sm text-destructive">
                      {errors.bill_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bill_number">Bill Number</Label>
                  <Input
                    id="bill_number"
                    {...register("bill_number")}
                    placeholder="Bill/Invoice number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_amount">
                    Total Amount (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("total_amount", { valueAsNumber: true })}
                    placeholder="0"
                  />
                  {errors.total_amount && (
                    <p className="text-sm text-destructive">
                      {errors.total_amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="split_percentage">
                    Tenant Share (%) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="split_percentage"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    {...register("split_percentage", { valueAsNumber: true })}
                    placeholder="50"
                  />
                  {errors.split_percentage && (
                    <p className="text-sm text-destructive">
                      {errors.split_percentage.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Landlord will pay {100 - (watchedSplitPercentage || 50)}%
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Additional notes about the bill..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Split Calculation
              </CardTitle>
              <CardDescription>Automatic calculation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Total Amount:</span>
                  <span className="text-sm font-bold">₹{watchedTotalAmount.toLocaleString() || "0"}</span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Tenant Share ({split.tenantPercent}%):</span>
                    <span className="text-sm font-medium text-blue-600">
                      ₹{split.tenantShare.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Landlord Share ({split.landlordPercent}%):</span>
                    <span className="text-sm font-medium text-green-600">
                      ₹{split.landlordShare.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-sm font-bold">
                      ₹{split.tenantShare + split.landlordShare}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Bill"}
          </Button>
        </div>
      </form>
    </div>
  );
}
