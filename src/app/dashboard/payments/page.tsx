"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Download } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface RentPayment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  receipt_number: string | null;
  agreement: {
    agreement_number: string;
    tenant: { name: string } | null;
    landlord: { name: string } | null;
  } | null;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPayments = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_payments")
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          payment_reference,
          receipt_number,
          rent_agreements:agreement_id (
            agreement_number,
            tenants:tenant_id (name),
            landlords:landlord_id (name)
          )
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      interface PaymentData {
        id: string;
        payment_date: string;
        amount: number;
        payment_method: string | null;
        payment_reference: string | null;
        receipt_number: string | null;
        rent_agreements?: {
          agreement_number: string;
          tenants?: { name: string }[] | { name: string } | null;
          landlords?: { name: string }[] | { name: string } | null;
        }[] | null;
      }

      const formattedPayments = data?.map((payment: PaymentData) => {
        const agreementData = payment.rent_agreements?.[0];
        const tenantData = agreementData?.tenants 
          ? (Array.isArray(agreementData.tenants) ? agreementData.tenants[0] : agreementData.tenants)
          : null;
        const landlordData = agreementData?.landlords
          ? (Array.isArray(agreementData.landlords) ? agreementData.landlords[0] : agreementData.landlords)
          : null;

        return {
          id: payment.id,
          payment_date: payment.payment_date,
          amount: payment.amount,
          payment_method: payment.payment_method,
          payment_reference: payment.payment_reference,
          receipt_number: payment.receipt_number,
          agreement: agreementData ? {
            agreement_number: agreementData.agreement_number,
            tenant: tenantData,
            landlord: landlordData,
          } : null,
        };
      }) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to load payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (payment: RentPayment) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RENT PAYMENT RECEIPT", margin, yPos);
      yPos += 15;

      // Receipt details
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Receipt #: ${payment.receipt_number || `PAY-${payment.id.slice(0, 8)}`}`, margin, yPos);
      yPos += 6;
      doc.text(`Payment Date: ${format(new Date(payment.payment_date), "MMM dd, yyyy")}`, margin, yPos);
      yPos += 6;
      if (payment.agreement) {
        doc.text(`Agreement #: ${payment.agreement.agreement_number}`, margin, yPos);
        yPos += 6;
        if (payment.agreement.tenant) {
          doc.text(`Tenant: ${payment.agreement.tenant.name}`, margin, yPos);
          yPos += 6;
        }
        if (payment.agreement.landlord) {
          doc.text(`Landlord: ${payment.agreement.landlord.name}`, margin, yPos);
          yPos += 6;
        }
      }
      yPos += 5;

      // Payment details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("PAYMENT DETAILS", margin, yPos);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos + 2, margin + 60, yPos + 2);
      yPos += 10;

      const formatCurrency = (amount: number): string => {
        return `₹ ${Math.round(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      };

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Amount Paid:`, margin, yPos);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(payment.amount), pageWidth - margin - 5, yPos, { align: "right" });
      yPos += 7;

      if (payment.payment_method) {
        doc.setFont("helvetica", "normal");
        doc.text(`Payment Method: ${payment.payment_method}`, margin, yPos);
        yPos += 6;
      }

      if (payment.payment_reference) {
        doc.text(`Reference: ${payment.payment_reference}`, margin, yPos);
        yPos += 6;
      }

      // Footer
      const pageHeight = doc.internal.pageSize.getHeight();
      yPos = pageHeight - 30;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("This is an official receipt for rent payment.", margin, yPos);
      doc.text(`Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}`, pageWidth - margin - 5, yPos, { align: "right" });

      doc.save(`receipt-${payment.receipt_number || payment.id.slice(0, 8)}.pdf`);
      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error) {
      console.error("Error generating receipt:", error);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rent Payments</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage all rent payments
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/payments/new">
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No payments recorded yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Record your first rent payment to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/payments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Agreement</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.receipt_number || `PAY-${payment.id.slice(0, 8)}`}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {payment.agreement?.agreement_number || "N/A"}
                    </TableCell>
                    <TableCell>
                      {payment.agreement?.tenant?.name || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{payment.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {payment.payment_method || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadReceipt(payment)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
