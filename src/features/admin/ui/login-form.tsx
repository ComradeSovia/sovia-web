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
import { loginAdmin } from "../actions";

export function AdminLogin() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-mono text-2xl">admin.shell</CardTitle>
          <CardDescription>Restricted content console</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={loginAdmin} className="grid gap-5">
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
        </CardContent>
      </Card>
    </section>
  );
}
