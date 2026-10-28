"use client";
import { useSyncExternalStore } from "react";
import { basePath, siteRoot } from "./runtime";

// Values that only exist in the browser cannot be known while the page is being built, so they
// arrive through a store React re-reads after hydration instead of an effect that sets state.
const noSubscribers = () => () => {};
export const useSiteRoot = () => useSyncExternalStore(noSubscribers, siteRoot, () => basePath);
export const useClientValue = <T>(read: () => T, whileServerRendered: T) =>
  useSyncExternalStore(noSubscribers, read, () => whileServerRendered);
