export function getFriendlyDatabaseError(error: unknown) {
  const urlError = getDatabaseUrlError();

  if (urlError) {
    return urlError;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("invalid") ||
      message.includes("url") ||
      message.includes("connection string")
    ) {
      return "DATABASE_URL looks invalid. Check the PostgreSQL connection string format.";
    }

    if (
      message.includes("authentication") ||
      message.includes("password") ||
      message.includes("permission denied")
    ) {
      return "PostgreSQL rejected the credentials. Check the user name, password, and database permissions.";
    }

    if (
      message.includes("connect") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("timeout")
    ) {
      return "Could not connect to PostgreSQL. Check the host, port, network access, and whether the database is running.";
    }

    if (message.includes("recovery mode")) {
      return "PostgreSQL is in recovery mode. Wait for recovery to finish, then try again.";
    }

    if (message.includes("does not exist") || message.includes("relation")) {
      return "The PostgreSQL connection works, but the Prisma table is missing. Run pnpm db:push.";
    }
  }

  return "The database connection is not available. Check DATABASE_URL and PostgreSQL, then try again.";
}

export function getDatabaseUrlError() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return "DATABASE_URL is not configured. Set a PostgreSQL connection string in env before saving database overrides.";
  }

  try {
    const url = new URL(databaseUrl);

    if (!["postgresql:", "postgres:"].includes(url.protocol)) {
      return "DATABASE_URL must use a PostgreSQL URL, for example postgresql://user:password@host:5432/database.";
    }

    if (!url.hostname || !url.pathname || url.pathname === "/") {
      return "DATABASE_URL looks incomplete. Include the PostgreSQL host and database name.";
    }
  } catch {
    return "DATABASE_URL looks invalid. Check the PostgreSQL connection string format.";
  }

  return null;
}
