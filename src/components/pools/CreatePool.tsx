"use client";

import { AddressPicker } from "@/components/maps/AddressPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  Sparkles,
  Users
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export function CreatePool() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropOffAddress, setDropOffAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [dropOffCoords, setDropOffCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [departureTime, setDepartureTime] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("");
  const [monthlyCost, setMonthlyCost] = useState("");
  const [activeDays, setActiveDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const handleDayToggle = (day: string) => {
    setActiveDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!pickupAddress || !dropOffAddress || !departureTime || !seatsAvailable || !monthlyCost) {
      toast({
        variant: "destructive",
        description: "Please fill in all required fields",
      });
      return;
    }

    if (!pickupCoords || !dropOffCoords) {
      toast({
        variant: "destructive",
        description: "Please select locations on the map to get coordinates",
      });
      return;
    }

    if (activeDays.length === 0) {
      toast({
        variant: "destructive",
        description: "Please select at least one active day",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        toast({
          variant: "destructive",
          description: "Please sign in to create a route",
        });
        setLoading(false);
        return;
      }

      // Check if user has active subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (subError || !subscription || new Date(subscription.end_date) <= new Date()) {
        toast({
          variant: "destructive",
          title: "Subscription Required",
          description: "You need an active subscription to register routes. Please subscribe first.",
        });
        setLoading(false);
        setTimeout(() => {
          router.push("/dashboard/subscription");
        }, 2000);
        return;
      }

      // Prepare route data for car_owner_routes table
      const routeData = {
        car_owner_id: user.id,
        pickup_address: pickupAddress,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_address: dropOffAddress,
        dropoff_lat: dropOffCoords.lat,
        dropoff_lng: dropOffCoords.lng,
        departure_time: departureTime,
        return_time: null, // Can be added later
        price_per_ride: parseFloat(monthlyCost), // Using monthly cost as price per ride for now
        price_per_month: parseFloat(monthlyCost),
        seats_available: parseInt(seatsAvailable),
        active_days: activeDays,
        is_active: true,
        description: null,
      };

      // Insert into car_owner_routes table
      const { error: insertError } = await supabase
        .from('car_owner_routes')
        .insert(routeData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating route:", insertError);
        toast({
          variant: "destructive",
          title: "Failed to create route",
          description: insertError.message || "Please try again",
        });
        setLoading(false);
        return;
      }

      // Success
      toast({
        title: "Route registered successfully!",
        description: "Your route is now active and visible to users",
      });

      // Reset form
      setPickupAddress("");
      setDropOffAddress("");
      setPickupCoords(undefined);
      setDropOffCoords(undefined);
      setDepartureTime("");
      setSeatsAvailable("");
      setMonthlyCost("");
      setActiveDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);

      // Redirect to My Pools page after a short delay
      setTimeout(() => {
        router.push("/dashboard/my-pools");
      }, 1500);

    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}

        {/* Main Form Card */}
        <Card className="border-0 shadow-2xl shadow-slate-200/50 bg-white/80 backdrop-blur-sm">

          <CardContent className="p-8 space-y-8">
            {/* Route Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-blue-100">
                  <MapPin className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Route Information</h3>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="pickup" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    Pickup Location
                  </Label>
                  <div className="relative">
                    <AddressPicker
                      label=""
                      value={pickupAddress}
                      onChange={(address, coords) => {
                        setPickupAddress(address);
                        if (coords) setPickupCoords(coords);
                      }}
                      placeholder="Enter pickup location"
                      onSelectOnMap={true}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="dropoff" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    Drop Off Location
                  </Label>
                  <div className="relative">
                    <AddressPicker
                      label=""
                      value={dropOffAddress}
                      onChange={(address, coords) => {
                        setDropOffAddress(address);
                        if (coords) setDropOffCoords(coords);
                      }}
                      placeholder="Enter drop off location"
                      onSelectOnMap={true}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            {/* Schedule Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-purple-100">
                  <Clock className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Schedule & Timing</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="departureTime" className="text-sm font-medium text-slate-700">
                    Departure Time
                  </Label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <Input
                      id="departureTime"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="pl-12 h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="Select departure time"
                    />
                  </div>
                  <p className="text-xs text-slate-500">When will you start your journey?</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Active Days
                  </Label>
                  <div className="flex flex-wrap gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                    {days.map((day, index) => (
                      <div key={day} className="flex items-center">
                        <Checkbox
                          id={day}
                          checked={activeDays.includes(day)}
                          onCheckedChange={() => handleDayToggle(day)}
                          className="mr-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label
                          htmlFor={day}
                          className={`text-sm font-medium cursor-pointer transition-colors ${
                            activeDays.includes(day)
                              ? "text-blue-700"
                              : "text-slate-600"
                          }`}
                        >
                          {dayLabels[index]}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Select days when carpool will be active</p>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-200" />

            {/* Capacity & Pricing Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-emerald-100">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Capacity & Pricing</h3>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="seatsAvailable" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Seats Available
                  </Label>
                  <Select value={seatsAvailable} onValueChange={setSeatsAvailable}>
                    <SelectTrigger className="h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500/20">
                      <SelectValue placeholder="Select number of seats" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Seat Available</SelectItem>
                      <SelectItem value="2">2 Seats Available</SelectItem>
                      <SelectItem value="3">3 Seats Available</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">How many passengers can you accommodate?</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="monthlyCost" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    Price per Ride (PKR)
                  </Label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                      PKR
                    </span>
                    <Input
                      id="monthlyCost"
                      type="number"
                      value={monthlyCost}
                      onChange={(e) => setMonthlyCost(e.target.value)}
                      placeholder="300"
                      className="pl-16 h-12 text-base border-slate-300 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                  <p className="text-xs text-slate-500">Set your own price per ride. You can also set monthly pricing later.</p>
                </div>
              </div>
            </div>
          </CardContent>

          {/* Footer with Submit Button */}
          <div className="px-8 pb-8 pt-6 border-t bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-b-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>All information will be verified before publishing</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={loading || !pickupAddress || !dropOffAddress || !departureTime || !seatsAvailable || !monthlyCost}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-semibold text-base"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating Pool...
                  </>
                ) : (
                  <>
                    Create Pool
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-100 mt-1">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-slate-900">Tips for a successful carpool</h4>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>Be punctual and communicate any schedule changes</li>
                  <li>Set clear expectations about pickup and drop-off points</li>
                  <li>Keep your vehicle clean and well-maintained</li>
                  <li>Respect your co-passengers&apos; preferences and comfort</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
