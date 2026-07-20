import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdmin } from "../actions";
import type { AdminAuthMode } from "../data/auth";

export function AdminLogin({
  mode,
  returnTo,
}: {
  mode: Exclude<AdminAuthMode, "disabled">;
  returnTo?: string;
}) {
  return (
    <section className="flex min-h-[calc(100vh-7rem)] items-center lg:min-h-[calc(100vh-2.5rem)]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Admin</CardTitle>
          <CardDescription>Restricted content console</CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "password" ? (
            <form action={loginAdmin} className="grid gap-5">
              {returnTo ? (
                <input name="returnTo" type="hidden" value={returnTo} />
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  required
                />
              </div>

              <Button type="submit">Enter</Button>
            </form>
          ) : (
            <Button asChild className="w-full">
              <Link
                href={
                  returnTo
                    ? `/admin/login/google?next=${encodeURIComponent(returnTo)}`
                    : "/admin/login/google"
                }
              >
                Continue with Google
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
