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
import type { AdminCopy } from "../i18n/copy";

export function AdminLogin({ copy }: { copy: AdminCopy }) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-mono text-2xl">
            {copy.login.title}
          </CardTitle>
          <CardDescription>{copy.login.description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={loginAdmin} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="admin-password">{copy.login.password}</Label>
              <Input
                id="admin-password"
                name="password"
                type="password"
                required
              />
            </div>

            <Button type="submit">{copy.login.submit}</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
