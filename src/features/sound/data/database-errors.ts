export function getFriendlyDatabaseError(error: unknown) {
  const urlError = getDatabaseUrlError();

  if (urlError) {
    return urlError;
  }

  if (error instanceof Error) {
    return withDatabaseHint(error.message);
  }

  return "Unknown database error.";
}

function withDatabaseHint(message: string) {
  const hint = getDatabaseErrorHint(message);
  return hint ? `${message}\n\nHint: ${hint}` : message;
}

function getDatabaseErrorHint(message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("url") ||
    lowerMessage.includes("connection string")
  ) {
    return "Check the PostgreSQL connection string format.";
  }

  if (
    lowerMessage.includes("column") ||
    lowerMessage.includes("table") ||
    lowerMessage.includes("relation") ||
    lowerMessage.includes("does not exist")
  ) {
    return "The database schema may be out of date. Run pending Prisma migrations.";
  }

  if (
    lowerMessage.includes("authentication") ||
    lowerMessage.includes("password") ||
    lowerMessage.includes("permission denied")
  ) {
    return "Check the user name, password, and database permissions.";
  }

  if (
    lowerMessage.includes("connect") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("enotfound")
  ) {
    return "Check the host, port, network access, and whether the database is running.";
  }

  if (
    lowerMessage.includes("timed out") ||
    lowerMessage.includes("timeout expired") ||
    lowerMessage.includes("query timeout")
  ) {
    return "The database responded too slowly; check the SSH tunnel, database load, and pending Prisma migrations.";
  }

  if (lowerMessage.includes("recovery mode")) {
    return "PostgreSQL is in recovery mode. Wait for recovery to finish, then try again.";
  }

  if (lowerMessage.includes("invalid")) {
    return "Check the Prisma schema and pending migrations.";
  }

  return null;
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
