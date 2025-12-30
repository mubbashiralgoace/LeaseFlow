"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, MapPin, Clock, Users, Edit, Trash2, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

type Pool = {
  id: string;
  car_owner_id: string;
  pickup_address: string;
  dropoff_address: string;
  departure_time: string;
  active_days: string[];
  seats_available: number;
  price_per_ride: number;
  price_per_month: number;
  is_active: boolean;
  created_at: string;
};

export function MyPools() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchPools();
    
    // Refresh pools when page becomes visible (user navigates back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchPools();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPools = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          variant: "destructive",
          description: "Please sign in to view your pools",
        });
        setLoading(false);
        return;
      }

      // Fetch pools (routes) owned by the user
      const { data, error } = await supabase
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
          is_active,
          description,
          created_at
        `)
        .eq('car_owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching pools:", error);
        toast({
          variant: "destructive",
          description: "Failed to load pools. Please try again.",
        });
        setLoading(false);
        return;
      }

      setPools(data || []);
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (poolId: string) => {
    if (!confirm("Are you sure you want to delete this pool? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(poolId);
      
      const { error } = await supabase
        .from('car_owner_routes')
        .delete()
        .eq('id', poolId);

      if (error) {
        console.error("Error deleting pool:", error);
        toast({
          variant: "destructive",
          description: "Failed to delete pool. Please try again.",
        });
        setDeletingId(null);
        return;
      }

      toast({
        description: "Pool deleted successfully",
      });

      // Refresh pools list
      fetchPools();
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        variant: "destructive",
        description: errorMessage,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "N/A";
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return "N/A";
    
    const dayMap: { [key: string]: string } = {
      Monday: "Mon",
      Tuesday: "Tue",
      Wednesday: "Wed",
      Thursday: "Thu",
      Friday: "Fri",
      Saturday: "Sat",
      Sunday: "Sun",
    };

    const formattedDays = days.map(day => dayMap[day] || day);
    
    if (formattedDays.length === 5 && 
        formattedDays.includes("Mon") && 
        formattedDays.includes("Tue") && 
        formattedDays.includes("Wed") && 
        formattedDays.includes("Thu") && 
        formattedDays.includes("Fri")) {
      return "Mon-Fri";
    }
    
    return formattedDays.join(", ");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Pools</h1>
          <p className="text-muted-foreground mt-2">
            Manage your active carpool pools
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Loading your pools...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Pools</h1>
        <p className="text-muted-foreground mt-2">
          Manage your active carpool pools
        </p>
      </div>

      {pools.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pools created yet. Create your first pool to get started!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Pool #{pool.id.slice(0, 8)}
                  </CardTitle>
                  <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                    {pool.is_active ? 'active' : 'inactive'}
                  </Badge>
                </div>
                <CardDescription>
                  {pool.pickup_address} → {pool.dropoff_address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatTime(pool.departure_time)} Departure</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{pool.seats_available} Seats Available</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDays(pool.active_days)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>PKR {pool.price_per_ride?.toLocaleString() || pool.price_per_month?.toLocaleString() || '0'} per ride</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/create-pool?edit=${pool.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDelete(pool.id)}
                    disabled={deletingId === pool.id}
                  >
                    {deletingId === pool.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

