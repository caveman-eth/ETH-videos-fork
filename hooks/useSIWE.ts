"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { recoverMessageAddress } from "viem";

const SESSION_KEY = "siwe-session";

type SIWEStatus = "idle" | "signing" | "verifying" | "authenticated" | "error";

interface SIWESession {
  address: string;
  chainId: number;
}

function loadSession(): SIWESession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SIWESession;
  } catch {
    return null;
  }
}

export function useSIWE() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<SIWEStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const session = loadSession();
    if (session && address && session.address.toLowerCase() === address.toLowerCase()) {
      setStatus("authenticated");
    }
  }, [address]);

  const signIn = useCallback(async (): Promise<boolean> => {
    if (!address || !chainId) return false;

    setStatus("signing");
    setError(null);

    try {
      // Generate nonce client-side — no server needed
      const nonce = generateSiweNonce();

      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: "Sign in to ethvideos.eth — the decentralized video platform.",
        uri: window.location.origin,
        version: "1",
        chainId,
        nonce,
        expirationTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const signature = await signMessageAsync({ message });

      setStatus("verifying");

      // Verify signature client-side
      const recovered = await recoverMessageAddress({ message, signature });
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        throw new Error("Signature verification failed");
      }

      // Persist session in localStorage
      const session: SIWESession = { address, chainId };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      setStatus("authenticated");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setError(msg);
      setStatus("error");
      return false;
    }
  }, [address, chainId, signMessageAsync]);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setStatus("idle");
  }, []);

  return {
    signIn,
    signOut,
    status,
    error,
    isAuthenticated: status === "authenticated",
    isSigning: status === "signing" || status === "verifying",
  };
}
