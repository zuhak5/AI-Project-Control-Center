import { getStorageMode, isPersistentStorageConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "AI Project Control Center",
    version: process.env.npm_package_version ?? "1.0.0",
    storageConfigured: isPersistentStorageConfigured(),
    storageMode: getStorageMode(),
    githubOAuthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    timestamp: new Date().toISOString()
  });
}
