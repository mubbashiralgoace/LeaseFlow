"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AddressPicker } from "@/components/maps/AddressPicker";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  companyEmail: z.string().email("Invalid company email"),
  homeAddress: z.string().min(5, "Please enter your home address"),
  officeAddress: z.string().min(5, "Please enter your office address"),
  vehicleType: z.enum(["car", "bike", "none"]).refine((val) => val !== undefined, {
    message: "Please select vehicle type",
  }),
  officeInTime: z.string().min(1, "Please select office in time"),
  officeOutTime: z.string().min(1, "Please select office out time"),
  gender: z.enum(["male", "female", "other"]).refine((val) => val !== undefined, {
    message: "Please select gender",
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const vehicleType = watch("vehicleType");
  const gender = watch("gender");

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Load from profiles table instead of user_metadata
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error("Error loading profile:", error);
          }

          if (profile) {
            if (profile.name) setValue("name", profile.name);
            if (profile.email || user.email) setValue("email", profile.email || user.email || "");
            if (profile.phone) setValue("phone", profile.phone);
            if (profile.company_email) setValue("companyEmail", profile.company_email);
            if (profile.home_address) setValue("homeAddress", profile.home_address);
            if (profile.office_address) setValue("officeAddress", profile.office_address);
            if (profile.vehicle_type) setValue("vehicleType", profile.vehicle_type);
            if (profile.office_in_time) setValue("officeInTime", profile.office_in_time);
            if (profile.office_out_time) setValue("officeOutTime", profile.office_out_time);
            if (profile.gender) setValue("gender", profile.gender);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [supabase, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        console.error("Get user error:", getUserError);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: getUserError.message || "User not authenticated",
        });
        setLoading(false);
        return;
      }

      if (!user) {
        toast({
          variant: "destructive",
          description: "User not authenticated",
        });
        setLoading(false);
        return;
      }

      console.log("Saving profile to database:", {
        id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company_email: data.companyEmail,
        home_address: data.homeAddress,
        office_address: data.officeAddress,
        vehicle_type: data.vehicleType,
        office_in_time: data.officeInTime,
        office_out_time: data.officeOutTime,
        gender: data.gender,
        profile_completed: true,
      });

      // Save to profiles table instead of user_metadata
      const { data: profileData, error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company_email: data.companyEmail,
          home_address: data.homeAddress,
          office_address: data.officeAddress,
          vehicle_type: data.vehicleType,
          office_in_time: data.officeInTime,
          office_out_time: data.officeOutTime,
          gender: data.gender,
          profile_completed: true,
        })
        .select()
        .single();

      if (updateError) {
        console.error("Update profile error:", updateError);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: updateError.message || "Failed to update profile",
        });
        setLoading(false);
        return;
      }

      console.log("Profile saved successfully:", profileData);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });

      // Wait a bit then refresh to show updated data
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error("Unexpected error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardContent className="py-8">
          <div className="text-center">Loading profile...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>
          Update your profile information below. All fields can be edited at any time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  placeholder="+1234567890"
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(value) => setValue("gender", value as "male" | "female" | "other")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other">Other</Label>
                  </div>
                </RadioGroup>
                {errors.gender && (
                  <p className="text-sm text-destructive">{errors.gender.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Information</h3>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email *</Label>
              <Input
                id="companyEmail"
                type="email"
                {...register("companyEmail")}
                placeholder="john@company.com"
              />
              {errors.companyEmail && (
                <p className="text-sm text-destructive">{errors.companyEmail.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                We&apos;ll send a verification email to this address
              </p>
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Address Information</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <AddressPicker
                  label="Home Address *"
                  value={watch("homeAddress")}
                  onChange={(address) => setValue("homeAddress", address)}
                  placeholder="Enter your home address"
                  onSelectOnMap={true}
                />
                {errors.homeAddress && (
                  <p className="text-sm text-destructive">{errors.homeAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <AddressPicker
                  label="Office Address *"
                  value={watch("officeAddress")}
                  onChange={(address) => setValue("officeAddress", address)}
                  placeholder="Enter your office address"
                  onSelectOnMap={true}
                />
                {errors.officeAddress && (
                  <p className="text-sm text-destructive">{errors.officeAddress.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vehicle Information</h3>
            <div className="space-y-2">
              <Label>Do you own a car or bike? *</Label>
              <RadioGroup
                value={vehicleType}
                onValueChange={(value) => setValue("vehicleType", value as "car" | "bike" | "none")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="car" id="car" />
                  <Label htmlFor="car">Car Owner</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bike" id="bike" />
                  <Label htmlFor="bike">Bike Rider</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none">None</Label>
                </div>
              </RadioGroup>
              {errors.vehicleType && (
                <p className="text-sm text-destructive">{errors.vehicleType.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Office Timings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preferred Office Timings</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="officeInTime">Office In Time *</Label>
                <Select
                  onValueChange={(value) => setValue("officeInTime", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.officeInTime && (
                  <p className="text-sm text-destructive">{errors.officeInTime.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="officeOutTime">Office Out Time *</Label>
                <Select
                  onValueChange={(value) => setValue("officeOutTime", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, "0");
                      return (
                        <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                          {hour}:00
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.officeOutTime && (
                  <p className="text-sm text-destructive">{errors.officeOutTime.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

