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
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const paymentSchema = z.object({
  agreement_id: z.string().min(1, "Agreement is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.number().min(1, "Amount is required"),
  payment_method: z.string().optional(),
  payment_reference: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agreements, setAgreements] = useState<Array<{ id: string; agreement_number: string; monthly_rent: number }>>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: new Date().toISOString().split("T")[0],
      amount: 0,
    },
  });

  const watchedAgreementId = watch("agreement_id");

  useEffect(() => {
    fetchAgreements();
  }, []);

  useEffect(() => {
    if (watchedAgreementId) {
      const selectedAgreement = agreements.find(a => a.id === watchedAgreementId);
      if (selectedAgreement) {
        setValue("amount", selectedAgreement.monthly_rent);
      }
    }
  }, [watchedAgreementId, agreements, setValue]);

  const fetchAgreements = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("id, agreement_number, monthly_rent")
        .eq("status", "active")
        .order("agreement_number");

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error("Error fetching agreements:", error);
    }
  };

  const generateReceiptNumber = () => {
    return `RCP-${Date.now()}`;
  };

  const onSubmit = async (data: z.infer<typeof paymentSchema>) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const receiptNumber = generateReceiptNumber();

      const { error } = await supabase.from("rent_payments").insert({
        user_id: user.id,
        agreement_id: data.agreement_id,
        payment_date: data.payment_date,
        amount: data.amount,
        payment_method: data.payment_method || null,
        payment_reference: data.payment_reference || null,
        receipt_number: receiptNumber,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });

      router.push("/dashboard/payments");
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record payment",
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
          <Link href="/dashboard/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground mt-2">
            Record a new rent payment
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>Enter payment details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                        {agreement.agreement_number} (₹{agreement.monthly_rent.toLocaleString()}/month)
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
                <Label htmlFor="payment_date">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment_date"
                  type="date"
                  {...register("payment_date")}
                />
                {errors.payment_date && (
                  <p className="text-sm text-destructive">
                    {errors.payment_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  onValueChange={(value) => setValue("payment_method", value)}
                  value={watch("payment_method")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_reference">Payment Reference</Label>
                <Input
                  id="payment_reference"
                  {...register("payment_reference")}
                  placeholder="Transaction ID, Cheque Number, etc."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional notes about the payment..."
                  rows={3}
                />
              </div>
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
                {loading ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
