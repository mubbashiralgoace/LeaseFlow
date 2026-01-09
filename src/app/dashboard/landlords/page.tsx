"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Home, Edit, Trash2, Mail, Phone } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Landlord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  aadhar_number: string | null;
  pan_number: string | null;
  created_at: string;
}

export default function LandlordsPage() {
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLandlords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLandlords = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("landlords")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLandlords(data || []);
    } catch (error) {
      console.error("Error fetching landlords:", error);
      toast({
        title: "Error",
        description: "Failed to load landlords",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this landlord?")) return;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from("landlords").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Landlord deleted successfully",
      });

      fetchLandlords();
    } catch (error) {
      console.error("Error deleting landlord:", error);
      toast({
        title: "Error",
        description: "Failed to delete landlord",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Landlords</h1>
          <p className="text-muted-foreground mt-2">
            Manage your landlord database
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/landlords/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Landlord
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Landlords</CardTitle>
          <CardDescription>
            {landlords.length} landlord{landlords.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading landlords...
            </div>
          ) : landlords.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No landlords yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first landlord to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/landlords/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Landlord
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>ID Proof</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {landlords.map((landlord) => (
                  <TableRow key={landlord.id}>
                    <TableCell className="font-medium">{landlord.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {landlord.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span>{landlord.email}</span>
                          </div>
                        )}
                        {landlord.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{landlord.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {landlord.city && landlord.state ? (
                        <span className="text-sm text-muted-foreground">
                          {landlord.city}, {landlord.state}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        {landlord.aadhar_number && (
                          <div className="text-muted-foreground">
                            Aadhar: {landlord.aadhar_number.slice(0, 4)}****
                          </div>
                        )}
                        {landlord.pan_number && (
                          <div className="text-muted-foreground">
                            PAN: {landlord.pan_number}
                          </div>
                        )}
                        {!landlord.aadhar_number && !landlord.pan_number && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/landlords/${landlord.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(landlord.id)}
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
