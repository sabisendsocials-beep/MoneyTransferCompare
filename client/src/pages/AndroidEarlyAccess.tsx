import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiGoogleplay } from "react-icons/si";
import { CheckCircle2, Smartphone, Bell, Zap, Shield } from "lucide-react";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function AndroidEarlyAccess() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      apiRequest("POST", "/api/early-access/android", data),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => {
      const msg = err?.message || "Something went wrong. Please try again.";
      if (msg.toLowerCase().includes("already")) {
        form.setError("email", { message: "You're already on the list!" });
      } else {
        form.setError("email", { message: msg });
      }
    },
  });

  const onSubmit = (data: FormValues) => mutation.mutate(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 mb-4">
            <SiGoogleplay className="h-6 w-6 text-green-400 mr-2" />
            <span className="text-white font-bold text-lg">SabiSend for Android</span>
          </div>
          <div className="inline-block bg-green-500/20 text-green-300 text-xs font-semibold px-3 py-1 rounded-full border border-green-500/30">
            Early Access
          </div>
        </div>

        {submitted ? (
          /* Success state */
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 text-center border border-white/10">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're on the list!</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              We'll email you as soon as the SabiSend Android app is ready to download. You'll be among the very first to get it.
            </p>
            <p className="text-gray-400 text-xs mt-4">
              In the meantime, use SabiSend on your browser to compare live exchange rates from all providers.
            </p>
            <a
              href="/"
              className="inline-block mt-6 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-colors"
            >
              Back to SabiSend
            </a>
          </div>
        ) : (
          /* Sign-up form */
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10">
            <h1 className="text-2xl font-bold text-white mb-2 text-center">
              Be first to get the app
            </h1>
            <p className="text-gray-300 text-sm text-center mb-8 leading-relaxed">
              The SabiSend Android app is on its way. Join the early access list and we'll send you a direct download link the moment it's live.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 rounded-xl h-12 focus:border-green-400 focus:ring-green-400/20"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-300 text-xs" />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full h-12 bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl text-base transition-colors"
                >
                  {mutation.isPending ? "Joining…" : "Join Early Access"}
                </Button>
              </form>
            </Form>

            <p className="text-gray-500 text-xs text-center mt-4">
              No spam. One email when the app is ready — that's it.
            </p>
          </div>
        )}

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {[
            { icon: Zap, label: "Live rates", sub: "Updated every hour" },
            { icon: Bell, label: "Rate alerts", sub: "Get notified instantly" },
            { icon: Smartphone, label: "Native app", sub: "Fast & lightweight" },
            { icon: Shield, label: "No fees hidden", sub: "Full transparency" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <Icon className="h-5 w-5 text-green-400 mb-2" />
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-gray-400 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
