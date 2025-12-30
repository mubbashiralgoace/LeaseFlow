"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, User, MapPin, Clock, Users, MessageSquare } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RouteRequest {
  id: string;
  requester_id: string;
  route_id: string;
  status: string;
  message?: string;
  requested_seats: number;
  created_at: string;
  route: {
    id: string;
    pickup_address: string;
    dropoff_address: string;
    departure_time: string;
    price_per_ride: number;
    seats_available: number;
  };
  requester: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export function JoinRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RouteRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all routes owned by this user
      const { data: myRoutes } = await supabase
        .from('car_owner_routes')
        .select('id')
        .eq('car_owner_id', user.id);

      if (!myRoutes || myRoutes.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const routeIds = myRoutes.map(r => r.id);

      // Get all requests for these routes
      const { data: routeRequests, error } = await supabase
        .from('route_requests')
        .select(`
          id,
          requester_id,
          route_id,
          status,
          message,
          requested_seats,
          created_at
        `)
        .in('route_id', routeIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading requests:", error);
        toast({
          variant: "destructive",
          description: "Failed to load requests",
        });
        setLoading(false);
        return;
      }

      if (!routeRequests || routeRequests.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get unique route IDs and requester IDs
      const uniqueRouteIds = [...new Set(routeRequests.map(r => r.route_id))];
      const uniqueRequesterIds = [...new Set(routeRequests.map(r => r.requester_id))];

      // Fetch routes data
      const { data: routesData } = await supabase
        .from('car_owner_routes')
        .select('id, pickup_address, dropoff_address, departure_time, price_per_ride, seats_available')
        .in('id', uniqueRouteIds);

      // Fetch requester profiles
      const { data: requestersData } = await supabase
        .from('profiles')
        .select('id, name, phone, email')
        .in('id', uniqueRequesterIds);

      // Create maps for efficient lookup
      const routesMap = new Map();
      (routesData || []).forEach(route => {
        routesMap.set(route.id, route);
      });

      const requestersMap = new Map();
      (requestersData || []).forEach(requester => {
        requestersMap.set(requester.id, requester);
      });

      // Transform the data to match RouteRequest interface
      const transformedRequests = routeRequests.map((req) => ({
        id: req.id,
        requester_id: req.requester_id,
        route_id: req.route_id,
        status: req.status,
        message: req.message,
        requested_seats: req.requested_seats,
        created_at: req.created_at,
        route: routesMap.get(req.route_id) || {
          id: req.route_id,
          pickup_address: 'Unknown',
          dropoff_address: 'Unknown',
          departure_time: '',
          price_per_ride: 0,
          seats_available: 0,
        },
        requester: requestersMap.get(req.requester_id) || {
          name: 'Unknown',
        },
      })) as RouteRequest[];

      setRequests(transformedRequests);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('route_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) {
        console.error("Error updating request:", error);
        toast({
          variant: "destructive",
          description: error.message || "Failed to update request",
        });
      } else {
        toast({
          title: newStatus === 'accepted' ? "Request Accepted" : "Request Rejected",
          description: `The request has been ${newStatus === 'accepted' ? 'accepted' : 'rejected'}`,
        });
        loadRequests();
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        description: errorMessage,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Route Requests</h1>
          <p className="text-muted-foreground mt-2">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Route Requests</h1>
        <p className="text-muted-foreground mt-2">
          Review and manage requests for your routes
        </p>
      </div>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} waiting for your approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-medium">{request.requester?.name || "User"}</p>
                      {request.requester?.phone && (
                        <p className="text-sm text-muted-foreground">Phone: {request.requester.phone}</p>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Route:</p>
                          <p className="text-muted-foreground">
                            {request.route?.pickup_address} → {request.route?.dropoff_address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{request.route?.departure_time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{request.requested_seats} seat(s)</span>
                        </div>
                        <div className="text-muted-foreground">
                          PKR {request.route?.price_per_ride} per ride
                        </div>
                      </div>
                      {request.message && (
                        <div className="flex items-start gap-2 mt-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground italic">&quot;{request.message}&quot;</p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested on {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleUpdateRequest(request.id, 'accepted')}
                    disabled={processingId === request.id}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleUpdateRequest(request.id, 'rejected')}
                    disabled={processingId === request.id}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {acceptedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accepted Requests</CardTitle>
            <CardDescription>
              {acceptedRequests.length} accepted request{acceptedRequests.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src="" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.requester?.name || "User"}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.route?.pickup_address} → {request.route?.dropoff_address}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Accepted
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {pendingRequests.length === 0 && acceptedRequests.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests at the moment</p>
              <p className="text-sm mt-2">
                Requests from users will appear here when they send requests for your routes
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

