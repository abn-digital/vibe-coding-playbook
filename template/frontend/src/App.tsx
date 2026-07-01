import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { auth, signInAsGuest, signInWithGoogle } from "@/lib/firebase";

export function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Vibe-Coding POC</h1>
      <p className="text-neutral-600">
        Firebase emulators + React + shadcn/ui. Sign in to test rules.
      </p>
      {user ? (
        <p className="rounded-md border p-4 text-sm">
          Signed in as <strong>{user.uid}</strong>
          {user.email ? ` (${user.email})` : " (anonymous)"}
        </p>
      ) : (
        <div className="flex gap-2">
          <Button onClick={() => signInWithGoogle()}>Google</Button>
          <Button variant="outline" onClick={() => signInAsGuest()}>
            Anonymous
          </Button>
        </div>
      )}
    </main>
  );
}
