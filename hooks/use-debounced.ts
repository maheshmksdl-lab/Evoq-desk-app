"use client";

import { useEffect, useState } from "react";

/** `value` once it has stopped changing for `ms`. Compared by JSON, so a fresh but equal object doesn't restart the timer. */
export function useDebounced<T>(value: T, ms = 250): T {
  const json = JSON.stringify(value);
  const [settled, setSettled] = useState(json);
  useEffect(() => {
    const id = setTimeout(() => setSettled(json), ms);
    return () => clearTimeout(id);
  }, [json, ms]);
  return JSON.parse(settled) as T;
}
