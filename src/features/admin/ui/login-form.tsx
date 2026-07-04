import { Button } from "@sovia/shared/ui/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@sovia/shared/ui/shadcn/card";
import { Input } from "@sovia/shared/ui/shadcn/input";
import { Label } from "@sovia/shared/ui/shadcn/label";
import Link from "next/link";
import { loginAdmin } from "../actions";
import type { AdminAuthMode } from "../data/auth";

export function AdminLogin({
  mode,
}: {
  mode: Exclude<AdminAuthMode, "disabled">;
}) {
  return (
    <section className="flex min-h-[calc(100vh-7rem)] items-center lg:min-h-[calc(100vh-2.5rem)]">
      <Card className="w-full border-zinc-800 bg-zinc-900 text-zinc-100 shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl text-zinc-100">Admin</CardTitle>
          <CardDescription className="text-zinc-400">
            Restricted content console
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "password" ? (
            <form action={loginAdmin} className="grid gap-5">
              <div className="grid gap-2">
                <Label
                  className="text-xs font-medium normal-case tracking-normal text-zinc-300"
                  htmlFor="admin-password"
                >
                  Password
                </Label>
                <Input
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 shadow-none focus-visible:ring-zinc-500"
                  id="admin-password"
                  name="password"
                  type="password"
                  required
                />
              </div>

              <Button
                className="border-zinc-600 bg-zinc-100 text-zinc-950 shadow-none hover:bg-white"
                type="submit"
              >
                Enter
              </Button>
            </form>
          ) : (
            <Button
              asChild
              className="w-full border-zinc-600 bg-zinc-100 text-zinc-950 shadow-none hover:bg-white"
            >
              <Link href="/admin/login/google">Continue with Google</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
