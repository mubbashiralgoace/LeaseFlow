"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Route, MapPin, Clock, DollarSign, Send, Users } from "lucide-react";
import { AddressPicker } from "@/components/maps/AddressPicker";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CarOwnerRoute {
  id: string;
  car_owner_id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  departure_time: string;
  return_time?: string;
  price_per_ride: number;
  price_per_month?: number;
  seats_available: number;
  active_days: string[];
  description?: string;
  profiles?: {
    name: string;
    phone?: string;
    vehicle_type?: string;
  };
}

export function FindRoutes() {
  const [loading, setLoading] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [matchingRoutes, setMatchingRoutes] = useState<CarOwnerRoute[]>([]);
  // Removed unused userProfile state
  const [selectedRoute, setSelectedRoute] = useState<CarOwnerRoute | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [sendingRequest, setSendingRequest] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();

  // Removed unused profile loading

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleFindRoutes = async () => {
    if (!pickupAddress || !dropoffAddress || !pickupCoords || !dropoffCoords) {
      toast({
        variant: "destructive",
        description: "Please select both pickup and dropoff locations on the map",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          description: "Please sign in to find routes",
        });
        setLoading(false);
        return;
      }

      // Fetch all active car owner routes
      const { data: allRoutes, error: fetchError } = await supabase
        .from('car_owner_routes')
        .select(`
          id,
          car_owner_id,
          pickup_address,
          dropoff_address,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          departure_time,
          return_time,
          price_per_ride,
          price_per_month,
          seats_available,
          active_days,
          description,
          is_active
        `)
        .eq('is_active', true)
        .neq('car_owner_id', user.id); // Exclude own routes

      if (fetchError) {
        console.error("Error fetching routes:", fetchError);
          toast({
            variant: "destructive",
            description: fetchError.message || "Failed to fetch routes. Please try again.",
          });
        setLoading(false);
        return;
      }

      // Get unique car owner IDs
      const ownerIds = [...new Set((allRoutes || []).map(route => route.car_owner_id))];
      
      // Fetch profiles for all car owners
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, phone, vehicle_type')
        .in('id', ownerIds);

      // Create a map of owner_id to profile
      const profilesMap = new Map();
      (profilesData || []).forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Filter routes within 3km of pickup and dropoff and attach profiles
      const MAX_DEVIATION_KM = 3;
      const matches = (allRoutes || []).filter((route) => {
        const pickupDistance = calculateDistance(
          pickupCoords.lat,
          pickupCoords.lng,
          route.pickup_lat,
          route.pickup_lng
        );
        const dropoffDistance = calculateDistance(
          dropoffCoords.lat,
          dropoffCoords.lng,
          route.dropoff_lat,
          route.dropoff_lng
        );
        return pickupDistance <= MAX_DEVIATION_KM && dropoffDistance <= MAX_DEVIATION_KM;
      }).map((route) => ({
        ...route,
        profiles: profilesMap.get(route.car_owner_id) || undefined
      }));

      setMatchingRoutes(matches as CarOwnerRoute[]);

      if (matches.length === 0) {
        toast({
          description: "No matching routes found. Try adjusting your locations.",
        });
      } else {
        toast({
          description: `Found ${matches.length} matching route${matches.length > 1 ? 's' : ''}!`,
        });
      }
    } catch (error) {
      console.error("Error finding routes:", error);
      toast({
        variant: "destructive",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedRoute) return;

    if (requestedSeats > selectedRoute.seats_available) {
      toast({
        variant: "destructive",
        description: `Only ${selectedRoute.seats_available} seat(s) available`,
      });
      return;
    }

    setSendingRequest(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          description: "Please sign in to send requests",
        });
        setSendingRequest(false);
        return;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('route_requests')
        .select('id')
        .eq('requester_id', user.id)
        .eq('route_id', selectedRoute.id)
        .single();

      if (existingRequest) {
        toast({
          variant: "destructive",
          description: "You have already sent a request for this route",
        });
        setSendingRequest(false);
        return;
      }

      // Create request
      const { error: insertError } = await supabase
        .from('route_requests')
        .insert({
          requester_id: user.id,
          route_id: selectedRoute.id,
          status: 'pending',
          message: requestMessage || null,
          requested_seats: requestedSeats,
        });

      if (insertError) {
        console.error("Error sending request:", insertError);
        toast({
          variant: "destructive",
          description: insertError.message || "Failed to send request. Please try again.",
        });
        setSendingRequest(false);
        return;
      }

      toast({
        title: "Request Sent!",
        description: "Your request has been sent to the car owner. They will review it soon.",
      });

      setRequestDialogOpen(false);
      setRequestMessage("");
      setRequestedSeats(1);
      setSelectedRoute(null);
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        description: errorMessage,
      });
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Find Routes</h1>
        <p className="text-muted-foreground mt-2">
          Discover colleagues traveling on the same route
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search for Routes
          </CardTitle>
          <CardDescription>
            Find car owners offering rides on your route
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AddressPicker
              label="Pickup Location"
              value={pickupAddress}
              onChange={(address, coords) => {
                setPickupAddress(address);
                if (coords) setPickupCoords(coords);
              }}
              placeholder="Enter pickup location"
              onSelectOnMap={true}
            />
            <AddressPicker
              label="Dropoff Location"
              value={dropoffAddress}
              onChange={(address, coords) => {
                setDropoffAddress(address);
                if (coords) setDropoffCoords(coords);
              }}
              placeholder="Enter dropoff location"
              onSelectOnMap={true}
            />
          </div>
          <Button 
            className="w-full" 
            disabled={loading || !pickupAddress || !dropoffAddress}
            onClick={handleFindRoutes}
          >
            <Route className="mr-2 h-4 w-4" />
            {loading ? "Searching..." : "Find Routes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Routes</CardTitle>
          <CardDescription>
            Routes matching your criteria (within 3 km deviation)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {matchingRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No routes found yet. Start searching to find available rides!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matchingRoutes.map((route) => (
                <Card key={route.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">
                            {route.profiles?.name || "Car Owner"}
                          </h4>
                          {route.profiles?.vehicle_type && (
                            <p className="text-sm text-muted-foreground capitalize">
                              {route.profiles.vehicle_type} Owner
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600">
                            PKR {route.price_per_ride}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">Pickup:</p>
                            <p className="text-muted-foreground break-words">{route.pickup_address}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">Dropoff:</p>
                            <p className="text-muted-foreground break-words">{route.dropoff_address}</p>
                          </div>
                        </div>
                          <div className="flex items-start gap-2 text-sm">
                            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div>
                            <p className="font-medium">Departure Time:</p>
                            <p className="text-muted-foreground">{route.departure_time}</p>
                          </div>
                            </div>
                        <div className="flex items-start gap-2 text-sm">
                          <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Seats Available:</p>
                            <p className="text-muted-foreground">{route.seats_available}</p>
                          </div>
                        </div>
                        {route.description && (
                          <p className="text-sm text-muted-foreground mt-2">{route.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedRoute(route);
                            setRequestDialogOpen(true);
                          }}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Ride Request</DialogTitle>
            <DialogDescription>
              Send a request to {selectedRoute?.profiles?.name || "the car owner"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="seats">Number of Seats</Label>
              <Input
                id="seats"
                type="number"
                min="1"
                max={selectedRoute?.seats_available || 1}
                value={requestedSeats}
                onChange={(e) => setRequestedSeats(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum {selectedRoute?.seats_available || 1} seat(s) available
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a message for the car owner..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <p className="text-sm font-medium">Route Details</p>
              <div className="space-y-1">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pickup Address:</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {selectedRoute?.pickup_address}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Dropoff Address:</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {selectedRoute?.dropoff_address}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Price: PKR {selectedRoute?.price_per_ride} per ride
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={sendingRequest}>
              {sendingRequest ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

