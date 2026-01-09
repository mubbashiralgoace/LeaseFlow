"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Eye, Edit, Trash2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface RentAgreement {
  id: string;
  agreement_number: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  tenant: {
    name: string;
    email: string;
  } | null;
  landlord: {
    name: string;
    email: string;
  } | null;
}

export default function AgreementsPage() {
  const [agreements, setAgreements] = useState<RentAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgreements = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_agreements")
        .select(`
          id,
          agreement_number,
          status,
          start_date,
          end_date,
          monthly_rent,
          deposit_amount,
          tenants:tenant_id (
            name,
            email
          ),
          landlords:landlord_id (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      interface AgreementWithRelations {
        id: string;
        agreement_number: string;
        status: string;
        start_date: string;
        end_date: string;
        monthly_rent: number;
        deposit_amount: number;
        tenants?: { name: string; email: string }[] | { name: string; email: string } | null;
        landlords?: { name: string; email: string }[] | { name: string; email: string } | null;
      }

      const formattedAgreements = data?.map((agr: AgreementWithRelations) => {
        const tenantData = Array.isArray(agr.tenants) ? agr.tenants[0] : agr.tenants;
        const landlordData = Array.isArray(agr.landlords) ? agr.landlords[0] : agr.landlords;
        return {
          id: agr.id,
          agreement_number: agr.agreement_number,
          status: agr.status,
          start_date: agr.start_date,
          end_date: agr.end_date,
          monthly_rent: agr.monthly_rent,
          deposit_amount: agr.deposit_amount,
          tenant: tenantData || null,
          landlord: landlordData || null,
        };
      }) || [];

      setAgreements(formattedAgreements);
    } catch (error) {
      console.error("Error fetching agreements:", error);
      toast({
        title: "Error",
        description: "Failed to load agreements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agreement?")) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("rent_agreements").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Agreement deleted successfully",
      });

      fetchAgreements();
    } catch (error) {
      console.error("Error deleting agreement:", error);
      toast({
        title: "Error",
        description: "Failed to delete agreement",
        variant: "destructive",
      });
    }
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rent Agreements</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track all your rent agreements
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agreements/new">
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Agreements</CardTitle>
          <CardDescription>
            {agreements.length} agreement{agreements.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading agreements...
            </div>
          ) : agreements.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No agreements yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first rent agreement to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/agreements/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Agreement
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agreement #</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Landlord</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((agreement) => (
                  <TableRow key={agreement.id}>
                    <TableCell className="font-medium">
                      {agreement.agreement_number}
                    </TableCell>
                    <TableCell>
                      {agreement.tenant?.name || "No tenant"}
                    </TableCell>
                    <TableCell>
                      {agreement.landlord?.name || "No landlord"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(agreement.start_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(agreement.end_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      ₹{agreement.monthly_rent.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(agreement.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/dashboard/agreements/${agreement.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/dashboard/agreements/${agreement.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(agreement.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
