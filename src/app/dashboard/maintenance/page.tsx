"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Image as ImageIcon, Eye } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  request_date: string;
  completed_date: string | null;
  cost: number | null;
  photos: string[] | null;
  agreement: {
    agreement_number: string;
    property_address: string;
  } | null;
}

export default function MaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRequests = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(`
          id,
          title,
          description,
          priority,
          status,
          request_date,
          completed_date,
          cost,
          photos,
          rent_agreements:agreement_id (
            agreement_number,
            property_address
          )
        `)
        .order("request_date", { ascending: false });

      if (error) throw error;

      interface MaintenanceRequestData {
        id: string;
        title: string;
        description: string;
        priority: string;
        status: string;
        request_date: string;
        completed_date: string | null;
        cost: number | null;
        photos: string[] | null;
        rent_agreements?: {
          agreement_number: string;
          property_address: string;
        }[] | null;
      }

      const formattedRequests = data?.map((req: MaintenanceRequestData) => ({
        id: req.id,
        title: req.title,
        description: req.description,
        priority: req.priority,
        status: req.status,
        request_date: req.request_date,
        completed_date: req.completed_date,
        cost: req.cost,
        photos: req.photos || [],
        agreement: req.rent_agreements?.[0] || null,
      })) || [];

      setRequests(formattedRequests);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      toast({
        title: "Error",
        description: "Failed to load maintenance requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "outline",
      medium: "secondary",
      high: "default",
      urgent: "destructive",
    };

    return (
      <Badge variant={variants[priority] || "outline"}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      in_progress: "secondary",
      completed: "default",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ").split(" ").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage maintenance requests
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/maintenance/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {requests.length} request{requests.length !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No maintenance requests yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first maintenance request to get started
              </p>
              <Button asChild>
                <Link href="/dashboard/maintenance/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>
                      {request.agreement?.property_address || "N/A"}
                    </TableCell>
                    <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                    <TableCell>{getStatusBadge(request.status)}</TableCell>
                    <TableCell>
                      {format(new Date(request.request_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {request.cost ? `₹${request.cost.toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      {request.photos && request.photos.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{request.photos.length}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/maintenance/${request.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
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
