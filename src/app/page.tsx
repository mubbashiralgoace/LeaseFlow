import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Car, Users, DollarSign, MapPin, Clock, Shield, Route } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-x-20 top-[-10rem] -z-10 transform-gpu blur-3xl">
          <div className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-sky-500/40 to-indigo-500/30 opacity-50" />
        </div>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-8 flex items-center justify-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm text-sky-300">
            <Car className="h-4 w-4" />
            <span>Smart Carpooling Platform</span>
          </div>
          <h1 className="mt-4 text-5xl font-bold leading-tight text-white sm:text-6xl md:text-7xl">
            Share Rides,
            <br />
            <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              Save Money
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl">
            Connect with colleagues traveling the same route. Split costs, reduce traffic, and make your daily commute affordable and eco-friendly.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-600 text-white">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className=" border-white/20 text-sky-500 hover:bg-white/10">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative -mt-20 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/20">
                <Route className="h-6 w-6 text-sky-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Smart Route Matching</h3>
              <p className="text-slate-400">
                Automatically find colleagues on your route with intelligent matching algorithm
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-500/20">
                <DollarSign className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Cost Calculator</h3>
              <p className="text-slate-400">
                Transparent cost splitting with automatic calculations and savings comparison
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Verified Users</h3>
              <p className="text-slate-400">
                Company email verification ensures safe and trusted carpooling experience
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Flexible Scheduling</h3>
              <p className="text-slate-400">
                Set your preferred timings and manage your weekly carpool schedule easily
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20">
                <MapPin className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Easy Address Selection</h3>
              <p className="text-slate-400">
                Pick your home and office addresses using interactive maps
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20">
                <Shield className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">Safe & Secure</h3>
              <p className="text-slate-400">
                Secure authentication and profile management for peace of mind
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-white/10 bg-white/5 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Start Saving?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Join thousands of commuters saving money and reducing their carbon footprint
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-600 text-white">
              <Link href="/auth/signup">Create Free Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
