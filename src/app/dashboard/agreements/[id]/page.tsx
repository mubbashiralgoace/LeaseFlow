"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Edit, Download } from "lucide-react";
import jsPDF from "jspdf";

interface RentAgreement {
  id: string;
  agreement_number: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  notice_period_days: number;
  property_address: string;
  property_city: string;
  property_state: string;
  property_pincode: string;
  terms: string | null;
  notes: string | null;
  tenant: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    aadhar_number: string | null;
    pan_number: string | null;
  } | null;
  landlord: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    aadhar_number: string | null;
    pan_number: string | null;
  } | null;
}

export default function AgreementViewPage() {
  const params = useParams();
  const { toast } = useToast();
  const [agreement, setAgreement] = useState<RentAgreement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchAgreement();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchAgreement = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: agreementData, error: agreementError } = await supabase
        .from("rent_agreements")
        .select(`
          *,
          tenants:tenant_id (
            name,
            email,
            phone,
            address,
            city,
            state,
            aadhar_number,
            pan_number
          ),
          landlords:landlord_id (
            name,
            email,
            phone,
            address,
            city,
            state,
            aadhar_number,
            pan_number
          )
        `)
        .eq("id", params.id)
        .single();

      if (agreementError) throw agreementError;

      interface AgreementDataWithRelations {
        tenants?: {
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          aadhar_number: string | null;
          pan_number: string | null;
        } | null;
        landlords?: {
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          aadhar_number: string | null;
          pan_number: string | null;
        } | null;
      }

      setAgreement({
        ...agreementData,
        tenant: (agreementData as AgreementDataWithRelations).tenants || null,
        landlord: (agreementData as AgreementDataWithRelations).landlords || null,
      });
    } catch (error) {
      console.error("Error fetching agreement:", error);
      toast({
        title: "Error",
        description: "Failed to load agreement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!agreement) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Professional Header with border
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 25);
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("RENT AGREEMENT", margin + 5, yPos + 8);
    
    // Agreement details on the right
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const rightMargin = pageWidth - margin - 5;
    doc.text(`Agreement #: ${agreement.agreement_number}`, rightMargin, yPos + 3, { align: "right" });
    doc.text(`Start Date: ${format(new Date(agreement.start_date), "MMM dd, yyyy")}`, rightMargin, yPos + 8, { align: "right" });
    doc.text(`End Date: ${format(new Date(agreement.end_date), "MMM dd, yyyy")}`, rightMargin, yPos + 13, { align: "right" });
    doc.text(`Status: ${agreement.status.toUpperCase()}`, rightMargin, yPos + 18, { align: "right" });
    
    yPos += 30;

    // Property Details with underline
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PROPERTY DETAILS", margin, yPos);
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPos + 2, margin + 50, yPos + 2);
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(agreement.property_address, margin, yPos);
    yPos += 6;
    doc.text(`${agreement.property_city}, ${agreement.property_state} - ${agreement.property_pincode}`, margin, yPos);
    yPos += 15;

    // Landlord info with underline
    if (agreement.landlord) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("LANDLORD", margin, yPos);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos + 2, margin + 40, yPos + 2);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${agreement.landlord.name}`, margin, yPos);
      yPos += 5;
      if (agreement.landlord.email) {
        doc.text(`Email: ${agreement.landlord.email}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.landlord.phone) {
        doc.text(`Phone: ${agreement.landlord.phone}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.landlord.address) {
        doc.text(`Address: ${agreement.landlord.address}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.landlord.aadhar_number) {
        doc.text(`Aadhar: ${agreement.landlord.aadhar_number.slice(0, 4)}****${agreement.landlord.aadhar_number.slice(-4)}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.landlord.pan_number) {
        doc.text(`PAN: ${agreement.landlord.pan_number}`, margin, yPos);
        yPos += 5;
      }
    }
    yPos += 10;

    // Tenant info with underline
    if (agreement.tenant) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TENANT", margin, yPos);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos + 2, margin + 30, yPos + 2);
      yPos += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${agreement.tenant.name}`, margin, yPos);
      yPos += 5;
      if (agreement.tenant.email) {
        doc.text(`Email: ${agreement.tenant.email}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.tenant.phone) {
        doc.text(`Phone: ${agreement.tenant.phone}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.tenant.address) {
        doc.text(`Address: ${agreement.tenant.address}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.tenant.aadhar_number) {
        doc.text(`Aadhar: ${agreement.tenant.aadhar_number.slice(0, 4)}****${agreement.tenant.aadhar_number.slice(-4)}`, margin, yPos);
        yPos += 5;
      }
      if (agreement.tenant.pan_number) {
        doc.text(`PAN: ${agreement.tenant.pan_number}`, margin, yPos);
        yPos += 5;
      }
    }
    yPos += 10;

    // Financial Details - Professional Format with underline
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL DETAILS", margin, yPos);
    doc.setDrawColor(100, 100, 100);
    doc.line(margin, yPos + 2, margin + 60, yPos + 2);
    yPos += 10;
    
    // Helper function to format currency with proper Indian number format
    const formatCurrency = (amount: number): string => {
      // Ensure proper formatting with Indian numbering system
      const formatted = Math.round(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      return `₹ ${formatted}`;
    };

    // Create a table-like structure for financial details with right alignment
    const financialData = [
      { label: "Monthly Rent", value: formatCurrency(agreement.monthly_rent), isCurrency: true },
      { label: "Security Deposit", value: formatCurrency(agreement.deposit_amount), isCurrency: true },
      { label: "Notice Period", value: `${agreement.notice_period_days} days`, isCurrency: false },
    ];

    const labelWidth = 90;
    const valueStartX = pageWidth - margin - 60; // Right-aligned values
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    financialData.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${item.label}:`, margin, yPos);
      doc.setFont("helvetica", "bold");
      if (item.isCurrency) {
        // Right-align currency values
        doc.text(item.value, valueStartX, yPos, { align: "right" });
      } else {
        doc.text(item.value, margin + labelWidth, yPos);
      }
      yPos += 7;
    });

    // Separator line
    yPos += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Next Year Rent - Highlighted with proper calculation
    const nextYearRent = Math.round(agreement.monthly_rent * 1.1);
    const incrementAmount = nextYearRent - agreement.monthly_rent;
    
    // Box for next year rent calculation
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    const boxY = yPos - 2;
    doc.rect(margin, boxY, pageWidth - 2 * margin, 25);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Next Year Rent Calculation (10% Increment):", margin + 3, yPos + 4);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Current Monthly Rent:`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(agreement.monthly_rent), valueStartX, yPos, { align: "right" });
    yPos += 5;
    doc.text(`Increment Amount (10%):`, margin + 5, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(formatCurrency(incrementAmount), valueStartX, yPos, { align: "right" });
    yPos += 5;
    doc.setDrawColor(0, 128, 0);
    doc.line(margin + 5, yPos - 1, valueStartX - 5, yPos - 1);
    yPos += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`New Monthly Rent:`, margin + 5, yPos);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 128, 0); // Green color
    doc.text(formatCurrency(nextYearRent), valueStartX, yPos, { align: "right" });
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.setDrawColor(200, 200, 200); // Reset draw color
    yPos += 12;

    // Terms with underline
    if (agreement.terms) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TERMS & CONDITIONS", margin, yPos);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos + 2, margin + 70, yPos + 2);
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const splitTerms = doc.splitTextToSize(agreement.terms, pageWidth - 2 * margin);
      doc.text(splitTerms, margin, yPos);
      yPos += splitTerms.length * 5;
    }

    // Notes with underline
    if (agreement.notes) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("ADDITIONAL NOTES", margin, yPos);
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, yPos + 2, margin + 65, yPos + 2);
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const splitNotes = doc.splitTextToSize(agreement.notes, pageWidth - 2 * margin);
      doc.text(splitNotes, margin, yPos);
    }

    // Professional Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    yPos = pageHeight - 30;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("This is a legally binding rent agreement document.", margin, yPos);
    doc.text(`Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}`, pageWidth - margin - 5, yPos, { align: "right" });
    doc.setTextColor(0, 0, 0); // Reset color

    doc.save(`rent-agreement-${agreement.agreement_number}.pdf`);
    toast({
      title: "Success",
      description: "PDF downloaded successfully",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      expired: "secondary",
      terminated: "destructive",
      draft: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const calculateNextYearRent = () => {
    if (!agreement) return 0;
    return Math.round(agreement.monthly_rent * 1.1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading agreement...</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Agreement not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/agreements">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agreement {agreement.agreement_number}</h1>
            <div className="text-muted-foreground mt-2">
              {getStatusBadge(agreement.status)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/agreements/${agreement.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agreement Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Property Address:</h3>
              <p className="text-sm">{agreement.property_address}</p>
              <p className="text-sm text-muted-foreground">
                {agreement.property_city}, {agreement.property_state} - {agreement.property_pincode}
              </p>
            </div>

            {agreement.landlord && (
              <div>
                <h3 className="font-semibold mb-2">Landlord:</h3>
                <p className="text-sm">{agreement.landlord.name}</p>
                {agreement.landlord.email && (
                  <p className="text-sm text-muted-foreground">{agreement.landlord.email}</p>
                )}
                {agreement.landlord.phone && (
                  <p className="text-sm text-muted-foreground">{agreement.landlord.phone}</p>
                )}
              </div>
            )}

            {agreement.tenant && (
              <div>
                <h3 className="font-semibold mb-2">Tenant:</h3>
                <p className="text-sm">{agreement.tenant.name}</p>
                {agreement.tenant.email && (
                  <p className="text-sm text-muted-foreground">{agreement.tenant.email}</p>
                )}
                {agreement.tenant.phone && (
                  <p className="text-sm text-muted-foreground">{agreement.tenant.phone}</p>
                )}
              </div>
            )}

            {agreement.terms && (
              <div>
                <h3 className="font-semibold mb-2">Terms & Conditions:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agreement.terms}</p>
              </div>
            )}

            {agreement.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agreement.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                <span className="text-sm font-medium">₹{agreement.monthly_rent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit:</span>
                <span className="text-sm font-medium">₹{agreement.deposit_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Notice Period:</span>
                <span className="text-sm font-medium">{agreement.notice_period_days} days</span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Agreement Period:</span>
              </div>
              <div className="text-sm">
                <p>{format(new Date(agreement.start_date), "MMM dd, yyyy")}</p>
                <p className="text-muted-foreground">to</p>
                <p>{format(new Date(agreement.end_date), "MMM dd, yyyy")}</p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Next Year Rent:</span>
                <span className="text-sm font-medium text-green-600">₹{calculateNextYearRent().toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">(10% increment)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
