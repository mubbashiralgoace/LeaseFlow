"use client";

import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Route {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  departure_time: string;
  active_days: string[];
  seats_available: number;
  is_active: boolean;
}

interface RouteRequest {
  route_id: string;
  requested_seats: number;
  status: string;
}

interface ScheduleItem {
  day: string;
  route: Route;
  occupiedSeats: number;
}

export function Schedule() {
  const [loading, setLoading] = useState(true);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { toast } = useToast();

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          variant: "destructive",
          description: "Please sign in to view schedule",
        });
        setLoading(false);
        return;
      }

      // Fetch user's active routes
      const { data: routes, error: routesError } = await supabase
        .from('car_owner_routes')
        .select(`
          id,
          pickup_address,
          dropoff_address,
          departure_time,
          active_days,
          seats_available,
          is_active
        `)
        .eq('car_owner_id', user.id)
        .eq('is_active', true);

      if (routesError) {
        console.error("Error fetching routes:", routesError);
        toast({
          variant: "destructive",
          description: "Failed to load schedule",
        });
        setLoading(false);
        return;
      }

      if (!routes || routes.length === 0) {
        setScheduleItems([]);
        setLoading(false);
        return;
      }

      // Get all route IDs
      const routeIds = routes.map(r => r.id);

      // Fetch accepted requests for these routes
      const { data: acceptedRequests } = await supabase
        .from('route_requests')
        .select('route_id, requested_seats, status')
        .in('route_id', routeIds)
        .eq('status', 'accepted');

      // Calculate occupied seats per route
      const occupiedSeatsMap = new Map<string, number>();
      (acceptedRequests || []).forEach((request: RouteRequest) => {
        const current = occupiedSeatsMap.get(request.route_id) || 0;
        occupiedSeatsMap.set(request.route_id, current + request.requested_seats);
      });

      // Create schedule items grouped by day
      const scheduleMap = new Map<string, ScheduleItem[]>();
      const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

      routes.forEach((route: Route) => {
        route.active_days.forEach((day: string) => {
          if (!scheduleMap.has(day)) {
            scheduleMap.set(day, []);
          }
          scheduleMap.get(day)!.push({
            day,
            route,
            occupiedSeats: occupiedSeatsMap.get(route.id) || 0,
          });
        });
      });

      // Convert map to array and sort by day order
      const sortedSchedule: ScheduleItem[] = [];
      daysOfWeek.forEach(day => {
        const items = scheduleMap.get(day);
        if (items) {
          sortedSchedule.push(...items);
        }
      });

      setScheduleItems(sortedSchedule);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        variant: "destructive",
        description: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDay = (day: string) => {
    const dayMap: { [key: string]: string } = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thu",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };
    return dayMap[day] || day;
  };

  // Group schedule items by day
  const scheduleByDay = new Map<string, ScheduleItem[]>();
  scheduleItems.forEach(item => {
    if (!scheduleByDay.has(item.day)) {
      scheduleByDay.set(item.day, []);
    }
    scheduleByDay.get(item.day)!.push(item);
  });

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your carpool schedule
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Loading schedule...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Schedule</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your carpool schedule
        </p>
      </div>

      {scheduleItems.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No scheduled trips</p>
              <p className="text-sm mt-2">
                Create a route to start scheduling your carpool trips
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {daysOfWeek.map((day) => {
            const dayItems = scheduleByDay.get(day);
            if (!dayItems || dayItems.length === 0) return null;

            return (
              <Card key={day}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day}
                  </CardTitle>
                  <CardDescription>
                    {dayItems.length} trip{dayItems.length > 1 ? 's' : ''} scheduled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dayItems.map((item, index) => (
                      <div
                        key={`${item.route.id}-${index}`}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[80px]">
                            <p className="text-sm font-medium">{formatDay(item.day)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(item.route.departure_time)}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">
                              {item.route.pickup_address} → {item.route.dropoff_address}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {item.occupiedSeats}/{item.route.seats_available} seats
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {item.route.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={item.route.is_active ? "default" : "secondary"}>
                          {item.route.is_active ? "Scheduled" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

