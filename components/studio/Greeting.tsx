"use client";

import { useSyncExternalStore } from "react";
import { useDisplayName } from "@/components/shell/displayName";
import { greetingFor } from "@/lib/studio/home";

const noSubscribe = () => () => {};

/** "Good afternoon, Matthew", from the viewer's own clock and the name they gave (none on the server). */
export function Greeting() {
  const hour = useSyncExternalStore(noSubscribe, () => new Date().getHours(), () => null);
  const name = useDisplayName();
  const hello = hour === null ? "Welcome back" : greetingFor(hour);
  return (
    <h1 className="type-h1">
      {hello}
      {name && `, ${name}`}
    </h1>
  );
}
