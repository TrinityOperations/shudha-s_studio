"use client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { Ref } from "react";
import { publicEnv } from "@/lib/env.public";

type Props = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  ref?: Ref<TurnstileInstance>;
};

/** Cloudflare Turnstile widget for public forms (PW-38). Pair with verifyTurnstile() on the server. */
export function TurnstileField({ onVerify, onExpire, ref }: Props) {
  return (
    <Turnstile
      ref={ref}
      siteKey={publicEnv.turnstileSiteKey}
      onSuccess={onVerify}
      onExpire={onExpire}
      onError={onExpire}
      options={{ theme: "auto", size: "flexible" }}
    />
  );
}
