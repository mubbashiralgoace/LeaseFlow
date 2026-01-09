"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const maintenanceSchema = z.object({
  agreement_id: z.string().min(1, "Agreement is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  cost: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export default function NewMaintenancePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [agreements, setAgreements] = useState<Array<{ id: string; agreement_number: string; property_address: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      priority: "medium",
      cost: 0,
    },
  });

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("rent_agreements")
        .select("id, agreement_number, property_address")
        .eq("status", "active")
        .order("agreement_number");

      if (error) throw error;
      setAgreements(data || []);
    } catch (error) {
      console.error("Error fetching agreements:", error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // filePath reserved for future Supabase Storage integration
        // const filePath = `maintenance/${fileName}`;

        // Convert file to base64 for storage (in production, use Supabase Storage)
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          
          // For now, we'll store the base64 string in the database
          // In production, upload to Supabase Storage and store the URL
          uploadedUrls.push(base64String);
          
          if (uploadedUrls.length === files.length) {
            setPhotos([...photos, ...uploadedUrls]);
            setUploading(false);
            toast({
              title: "Success",
              description: "Photos uploaded successfully",
            });
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: z.infer<typeof maintenanceSchema>) => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("maintenance_requests").insert({
        user_id: user.id,
        agreement_id: data.agreement_id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: "pending",
        request_date: new Date().toISOString().split("T")[0],
        cost: data.cost || null,
        photos: photos.length > 0 ? photos : null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Maintenance request created successfully",
      });

      router.push("/dashboard/maintenance");
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create maintenance request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/maintenance">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Maintenance Request</h1>
          <p className="text-muted-foreground mt-2">
            Create a new maintenance request with photos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
          <CardDescription>Enter maintenance request details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agreement_id">
                  Agreement <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue("agreement_id", value)}
                  value={watch("agreement_id")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agreement" />
                  </SelectTrigger>
                  <SelectContent>
                    {agreements.map((agreement) => (
                      <SelectItem key={agreement.id} value={agreement.id}>
                        {agreement.agreement_number} - {agreement.property_address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.agreement_id && (
                  <p className="text-sm text-destructive">
                    {errors.agreement_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  defaultValue="medium"
                  onValueChange={(value) => setValue("priority", value as "low" | "medium" | "high" | "urgent")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g., Leaking pipe in kitchen"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Describe the maintenance issue in detail..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("cost", { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="photos">Upload Photos</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <input
                    type="file"
                    id="photos"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="photos"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Click to upload photos"}
                    </span>
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          width={96}
                          height={96}
                          className="w-full h-24 object-cover rounded border"
                          unoptimized
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Any additional information..."
                  rows={3}
                />
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
              <Button type="submit" disabled={loading || uploading}>
                {loading ? "Creating..." : "Create Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
