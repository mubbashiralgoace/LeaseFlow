"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

const agreementSchema = z.object({
  tenant_id: z.string().min(1, "Tenant is required"),
  landlord_id: z.string().min(1, "Landlord is required"),
  agreement_number: z.string().min(1, "Agreement number is required"),
  property_address: z.string().min(1, "Property address is required"),
  property_city: z.string().min(1, "City is required"),
  property_state: z.string().min(1, "State is required"),
  property_pincode: z.string().min(1, "Pincode is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  monthly_rent: z.number().min(1, "Monthly rent is required"),
  deposit_amount: z.number().min(0, "Deposit amount must be 0 or greater"),
  notice_period_days: z.number().min(0).optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

type AgreementFormData = z.infer<typeof agreementSchema>;

export default function NewAgreementPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [landlords, setLandlords] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [previousAgreement, setPreviousAgreement] = useState<{
    id: string;
    monthly_rent: number;
    start_date: string;
    end_date: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AgreementFormData>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      agreement_number: `RENT-${Date.now()}`,
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 11 * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 11 months
      notice_period_days: 30,
      deposit_amount: 0,
      monthly_rent: 0,
    },
  });

  const watchedTenantId = watch("tenant_id");
  const watchedMonthlyRent = watch("monthly_rent");

  useEffect(() => {
    fetchTenants();
    fetchLandlords();
  }, []);

  useEffect(() => {
    if (watchedTenantId) {
      fetchPreviousAgreement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTenantId]);

  const fetchTenants = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error("Error fetching tenants:", error);
    }
  };

  const fetchLandlords = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("landlords")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setLandlords(data || []);
    } catch (error) {
      console.error("Error fetching landlords:", error);
    }
  };

  const fetchPreviousAgreement = async () => {
    if (!watchedTenantId) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("*")
        .eq("tenant_id", watchedTenantId)
        .order("end_date", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows returned

      if (data) {
        setPreviousAgreement(data);
        // Auto-calculate 10% increment
        const newRent = Math.round(data.monthly_rent * 1.1);
        setValue("monthly_rent", newRent);
        toast({
          title: "Previous Agreement Found",
          description: `Previous rent was ₹${data.monthly_rent.toLocaleString()}. New rent set to ₹${newRent.toLocaleString()} (10% increment)`,
        });
      }
    } catch (error) {
      console.error("Error fetching previous agreement:", error);
    }
  };

  const calculateNextYearRent = () => {
    if (!watchedMonthlyRent) return 0;
    return Math.round(watchedMonthlyRent * 1.1);
  };

  const onSubmit = async (data: AgreementFormData) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      // Create rent agreement
      const { data: agreement, error: agreementError } = await supabase
        .from("rent_agreements")
        .insert({
          user_id: user.id,
          tenant_id: data.tenant_id,
          landlord_id: data.landlord_id,
          agreement_number: data.agreement_number,
          property_address: data.property_address,
          property_city: data.property_city,
          property_state: data.property_state,
          property_pincode: data.property_pincode,
          start_date: data.start_date,
          end_date: data.end_date,
          monthly_rent: data.monthly_rent,
          deposit_amount: data.deposit_amount,
          notice_period_days: data.notice_period_days ?? 30,
          status: "active",
          terms: data.terms || null,
          notes: data.notes || null,
        })
        .select()
        .single();

      if (agreementError) throw agreementError;

      toast({
        title: "Success",
        description: "Rent agreement created successfully",
      });

      router.push(`/dashboard/agreements/${agreement.id}`);
    } catch (error) {
      console.error("Error creating agreement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create agreement",
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
          <Link href="/dashboard/agreements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Rent Agreement</h1>
          <p className="text-muted-foreground mt-2">
            Create a new rent agreement between landlord and tenant
          </p>
        </div>
      </div>

      {previousAgreement && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Previous Agreement Found</p>
                <p className="text-sm text-blue-700 mt-1">
                  Previous rent: ₹{previousAgreement.monthly_rent.toLocaleString()} | 
                  Period: {new Date(previousAgreement.start_date).toLocaleDateString()} - {new Date(previousAgreement.end_date).toLocaleDateString()}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  New rent automatically set with 10% increment: ₹{calculateNextYearRent().toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Agreement Details</CardTitle>
              <CardDescription>Basic information about the rent agreement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant_id">
                    Tenant <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("tenant_id", value)}
                    value={watch("tenant_id")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tenant_id && (
                    <p className="text-sm text-destructive">
                      {errors.tenant_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landlord_id">
                    Landlord <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    onValueChange={(value) => setValue("landlord_id", value)}
                    value={watch("landlord_id")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a landlord" />
                    </SelectTrigger>
                    <SelectContent>
                      {landlords.map((landlord) => (
                        <SelectItem key={landlord.id} value={landlord.id}>
                          {landlord.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.landlord_id && (
                    <p className="text-sm text-destructive">
                      {errors.landlord_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agreement_number">
                    Agreement Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="agreement_number"
                    {...register("agreement_number")}
                    placeholder="RENT-001"
                  />
                  {errors.agreement_number && (
                    <p className="text-sm text-destructive">
                      {errors.agreement_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notice_period_days">
                    Notice Period (Days)
                  </Label>
                  <Input
                    id="notice_period_days"
                    type="number"
                    {...register("notice_period_days", { valueAsNumber: true })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_address">
                  Property Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="property_address"
                  {...register("property_address")}
                  placeholder="House/Flat Number, Building Name"
                />
                {errors.property_address && (
                  <p className="text-sm text-destructive">
                    {errors.property_address.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="property_city">
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="property_city"
                    {...register("property_city")}
                    placeholder="City"
                  />
                  {errors.property_city && (
                    <p className="text-sm text-destructive">
                      {errors.property_city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_state">
                    State <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="property_state"
                    {...register("property_state")}
                    placeholder="State"
                  />
                  {errors.property_state && (
                    <p className="text-sm text-destructive">
                      {errors.property_state.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="property_pincode">
                    Pincode <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="property_pincode"
                    {...register("property_pincode")}
                    placeholder="Pincode"
                  />
                  {errors.property_pincode && (
                    <p className="text-sm text-destructive">
                      {errors.property_pincode.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register("start_date")}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-destructive">
                      {errors.start_date.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">
                    End Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...register("end_date")}
                  />
                  {errors.end_date && (
                    <p className="text-sm text-destructive">
                      {errors.end_date.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  {...register("terms")}
                  placeholder="Agreement terms and conditions..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financial Details</CardTitle>
              <CardDescription>Rent and deposit information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_rent">
                  Monthly Rent (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monthly_rent"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("monthly_rent", { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.monthly_rent && (
                  <p className="text-sm text-destructive">
                    {errors.monthly_rent.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit_amount">
                  Security Deposit (₹)
                </Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("deposit_amount", { valueAsNumber: true })}
                  placeholder="0"
                />
                {errors.deposit_amount && (
                  <p className="text-sm text-destructive">
                    {errors.deposit_amount.message}
                  </p>
                )}
              </div>

              {watchedMonthlyRent > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Monthly Rent:</span>
                      <span className="font-medium">₹{watchedMonthlyRent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Year Rent (10% increment):</span>
                      <span className="font-medium text-green-600">₹{calculateNextYearRent().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Annual Rent:</span>
                      <span className="font-medium">₹{(watchedMonthlyRent * 12).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
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
            {loading ? "Creating..." : "Create Agreement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
