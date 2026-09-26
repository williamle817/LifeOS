"use client";

import { useEffect } from "react";
import { watchReturn } from "@/lib/refresh";

export function StayFresh() {
  useEffect(() => watchReturn(), []);
  return null;
}
