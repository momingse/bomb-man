// src/components/auth/RequireAuth.tsx
import { usePlayersStore } from "@/state/player";
import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router";

export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ok" | "not-auth">(
    "loading",
  );
  const { setPlayer } = usePlayersStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include", // send session cookie
    })
      .then((res) => {
        if (res.ok) {
          return res.json().then(({ user }) => {
            setPlayer(user);
            setStatus("ok");
          });
        }
        // If response is not OK
        setStatus("not-auth");
        throw new Error("Not authenticated");
      })
      .catch((error) => {
        console.error("Auth check failed:", error);
        setStatus("not-auth");
      });
  }, []);

  if (status === "loading") {
    return <div>Checking authentication…</div>;
  }

  if (status === "not-auth") {
    // Redirect user back to login page
    navigate("/");
    return null;
  }

  // status === 'ok'
  return <>{children}</>;
}
