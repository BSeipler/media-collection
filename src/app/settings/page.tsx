import { Nav } from "@/components/Nav";
import { SettingsForm } from "@/components/SettingsForm";
import { getCollectionStats, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let settings = null;
  let stats = null;
  let error: string | null = null;
  try {
    [settings, stats] = await Promise.all([
      getSettings(),
      getCollectionStats(),
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unavailable";
  }

  return (
    <>
      <Nav active="settings" />
      <main className="flex-1">
        {error || !settings || !stats ? (
          <div className="mx-auto max-w-lg px-3 py-4 text-sm text-amber-200">
            {error ?? "Settings unavailable"}
          </div>
        ) : (
          <SettingsForm settings={settings} stats={stats} />
        )}
      </main>
    </>
  );
}
