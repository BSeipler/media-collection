"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Wrong password");
        return;
      }
      router.replace(params.get("from") || "/");
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function enterAsGuest() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest: true }),
      });
      if (!res.ok) {
        setError("Could not start guest mode");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not start guest mode");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-24 flex w-full max-w-sm flex-col gap-3 px-4"
    >
      <h1 className="text-center text-xl font-semibold text-zinc-50">
        Yard Sale Stack
      </h1>
      <p className="text-center text-sm text-zinc-500">Enter the shared password</p>
      <input
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500"
        placeholder="Password"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-amber-500 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
      >
        Unlock
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void enterAsGuest()}
        className="rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-200 disabled:opacity-50"
      >
        Guest
      </button>
      <p className="text-center text-xs text-zinc-600">
        Guests can browse the collection. Editing stays locked.
      </p>
      {error ? (
        <p className="text-center text-sm text-red-400">{error}</p>
      ) : null}
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
