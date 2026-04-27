import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { userPreferences } from "@/lib/db/schema";
import { createRequestId, logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [userData] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  // Split name into first/last for the UI
  const parts = (userData.name ?? "").trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");

  return NextResponse.json({
    profile: {
      id: userData.id,
      firstName,
      lastName,
      email: userData.email,
      image: userData.image,
      emailNotifications: prefs?.emailNotifications ?? true,
      githubAuthorized: prefs?.githubAuthorized ?? false,
      githubUsername: prefs?.githubUsername ?? null,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { firstName, lastName, emailNotifications } = body as {
    firstName?: string;
    lastName?: string;
    emailNotifications?: boolean;
  };

  // Validate name fields if provided
  if (firstName !== undefined) {
    if (typeof firstName !== "string" || firstName.trim().length === 0) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }
  }

  // Update user name if name fields provided
  if (firstName !== undefined || lastName !== undefined) {
    // Get current name to merge partial updates
    const [current] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const currentParts = (current?.name ?? "").trim().split(/\s+/);
    const currentFirst = currentParts[0] ?? "";
    const currentLast = currentParts.slice(1).join(" ");

    const newFirst = firstName !== undefined ? firstName.trim() : currentFirst;
    const newLast = lastName !== undefined ? lastName.trim() : currentLast;
    const fullName = [newFirst, newLast].filter(Boolean).join(" ");

    await db
      .update(user)
      .set({ name: fullName, updatedAt: new Date() })
      .where(eq(user.id, session.user.id));
  }

  // Update preferences if provided
  if (emailNotifications !== undefined) {
    if (typeof emailNotifications !== "boolean") {
      return NextResponse.json(
        { error: "emailNotifications must be a boolean" },
        { status: 400 },
      );
    }

    // Upsert preferences
    const [existing] = await db
      .select({ id: userPreferences.id })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(userPreferences)
        .set({ emailNotifications, updatedAt: new Date() })
        .where(eq(userPreferences.userId, session.user.id));
    } else {
      await db.insert(userPreferences).values({
        userId: session.user.id,
        emailNotifications,
      });
    }
  }

  // Re-fetch and return updated profile
  const [userData] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  const parts = (userData?.name ?? "").trim().split(/\s+/);

  return NextResponse.json({
    profile: {
      id: userData?.id,
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email: userData?.email,
      image: userData?.image,
      emailNotifications: prefs?.emailNotifications ?? true,
      githubAuthorized: prefs?.githubAuthorized ?? false,
      githubUsername: prefs?.githubUsername ?? null,
    },
  });
}

/**
 * DELETE /api/users/profile
 *
 * Permanently deletes the authenticated user's account and all associated data.
 */
export async function DELETE() {
  const requestId = createRequestId();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    logger.warn("user_delete_unauthorized", { requestId });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Delete the user record from the 'user' table (Better Auth)
    // Cascading deletes in the schema handle memberships, prefs, sessions, accounts.
    await db.delete(user).where(eq(user.id, userId));

    logger.info("user_delete_completed", {
      requestId,
      userId,
      email: session.user.email,
    });

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    logger.error("user_delete_failed", {
      requestId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }
}
