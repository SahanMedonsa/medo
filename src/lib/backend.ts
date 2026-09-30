import { firebaseRequest } from "./firebase-rest";
import { cookies } from "next/headers";

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function demoEnabled() {
  return process.env.NODE_ENV === "development" && process.env.LOCAL_DEMO === "true";
}

export function configured() {
  return !demoEnabled();
}

export async function backend(path: string, token?: string, init: RequestInit = {}) {
  try { return await firebaseRequest(path, token, init); }
  catch { throw new ApiError("Firebase could not be reached. Please try again.", 503); }
}

export async function verifyAdmin(token: string) {
  const userResponse = await backend("/auth/user", token);
  if (!userResponse.ok) throw new ApiError("Please sign in again.", 401);
  const user = await userResponse.json();
  const adminResponse = await backend(`/data/admins?user_id=eq.${encodeURIComponent(user.id)}&select=user_id`, token);
  if (adminResponse.status === 403) throw new ApiError("This account does not have administrator access.", 403);
  if (!adminResponse.ok) throw new ApiError("Unable to verify administrator access. Check the database setup.", 503);
  const admins = await adminResponse.json();
  if (!admins.length) throw new ApiError("This account does not have administrator access.", 403);
  return user;
}

export async function requireAdmin() {
  const token = (await cookies()).get("admin_session")?.value;
  if (!token) throw new ApiError("Please sign in.", 401);
  const user = await verifyAdmin(token);
  return { token, user };
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new ApiError("Request origin is not allowed.", 403);
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(error: unknown) {
  return json({ error: error instanceof ApiError ? error.message : "Something went wrong. Please try again." }, error instanceof ApiError ? error.status : 500);
}
