"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UtilityBill {
  id: string;
  bill_type: string;
  bill_date: string;
  total_amount: number;
  tenant_share: number | null;
  landlord_share: number | null;
  split_percentage: number;
  bill_number: string | null;
  agreement: {
    agreement_number: string;
    property_address: string;
  } | null;
}

export default function UtilitiesPage() {
  const [bills, setBills] = useState<UtilityBill[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBills = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("utility_bills")
        .select(`
          id,
          bill_type,
          bill_date,
          total_amount,
          tenant_share,
          landlord_share,
          split_percentage,
          bill_number,
          rent_agreements:agreement_id (
            agreement_number,
            property_address
          )
        `)
        .order("bill_date", { ascending: false });

      if (error) throw error;

      interface UtilityBillData {
        id: string;
        bill_type: string;
        bill_date: string;
        total_amount: number;
        tenant_share: number | null;
        landlord_share: number | null;
        split_percentage: number;
        bill_number: string | null;
        rent_agreements?: {
          agreement_number: string;
          property_address: string;
        }[] | null;
      }

      const formattedBills = data?.map((bill: UtilityBillData) => ({
        id: bill.id,
        bill_type: bill.bill_type,
        bill_date: bill.bill_date,
        total_amount: bill.total_amount,
        tenant_share: bill.tenant_share,
        landlord_share: bill.landlord_share,
        split_percentage: bill.split_percentage,
        bill_number: bill.bill_number,
        agreement: bill.rent_agreements?.[0] || null,
      })) || [];

      setBills(formattedBills);
    } catch (error) {
      console.error("Error fetching utility bills:", error);
      toast({
        title: "Error",
        description: "Failed to load utility bills",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getBillTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      electricity: "bg-yellow-100 text-yellow-800",
      water: "bg-blue-100 text-blue-800",
      gas: "bg-orange-100 text-orange-800",
      internet: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={colors[type] || colors.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Utility Bills</h1>
          <p className="text-muted-foreground mt-2">
            Track and split utility bills between tenant and landlord
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/utilities/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Utility Bills</CardTitle>
          <CardDescription>
            {bills.length} bill{bills.length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading bills...
            </div>
          ) : bills.length === 0 ? (
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No utility bills yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first utility bill to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/utilities/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bill
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Type</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Bill Number</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Tenant Share</TableHead>
                  <TableHead className="text-right">Landlord Share</TableHead>
                  <TableHead>Split %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{getBillTypeBadge(bill.bill_type)}</TableCell>
                    <TableCell>
                      {bill.agreement?.property_address || "N/A"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(bill.bill_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {bill.bill_number || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{bill.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.tenant_share ? `₹${bill.tenant_share.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {bill.landlord_share ? `₹${bill.landlord_share.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      {bill.split_percentage}% / {100 - bill.split_percentage}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
