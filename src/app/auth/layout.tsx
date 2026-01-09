import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LeaseFlow",
  description: "Create Professional, Rent Agreements",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-72 w-72 rounded-full bg-green-500/30 blur-[120px]" />
        <div className="absolute right-[-10%] top-[10%] h-80 w-80 rounded-full bg-green-500/25 blur-[120px]" />
        <div className="absolute left-[20%] bottom-[-15%] h-64 w-64 rounded-full bg-green-500/20 blur-[120px]" />
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mt-3 text-3xl font-semibold text-white">
            LeaseFlow
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Sign in, create an account, or recover access.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

