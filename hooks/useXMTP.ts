"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWalletClient } from "wagmi";

// XMTP browser SDK — dynamically imported to avoid SSR issues
type XMTPClient = import("@xmtp/browser-sdk").Client;
type Conversation = import("@xmtp/browser-sdk").Conversation;
type DecodedMessage = import("@xmtp/browser-sdk").DecodedMessage;

export interface XMTPMessage {
  id: string;
  senderAddress: string;
  content: string;
  sentAt: Date;
}

export interface XMTPConversation {
  id: string;
  peerAddress: string;
  messages: XMTPMessage[];
}

type XMTPStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "error";

export function useXMTP() {
  const { data: walletClient } = useWalletClient();
  const clientRef = useRef<XMTPClient | null>(null);
  const [status, setStatus] = useState<XMTPStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<XMTPConversation[]>([]);

  const initialize = useCallback(async () => {
    if (!walletClient || clientRef.current) return;
    setStatus("initializing");
    setError(null);

    try {
      const { Client } = await import("@xmtp/browser-sdk");

      const signer = {
        getAddress: async () => walletClient.account.address,
        signMessage: async (message: string) => {
          const sig = await walletClient.signMessage({ message });
          return sig;
        },
      };

      // Derive a deterministic 32-byte encryption key from the wallet.
      // This avoids "Malformed 32 byte encryption key" errors caused by
      // a missing or corrupted key stored in IndexedDB.
      const keySignature = await walletClient.signMessage({
        message: "ethvideos.eth XMTP encryption key v1",
      });
      // keccak256 of the hex signature → 32 bytes
      const { keccak256, toBytes } = await import("viem");
      const encryptionKey = toBytes(keccak256(keySignature as `0x${string}`));

      const client = await Client.create(signer, encryptionKey, {
        env: "production",
      });

      clientRef.current = client;
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "XMTP init failed";
      setError(msg);
      setStatus("error");
    }
  }, [walletClient]);

  const loadConversations = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    try {
      await client.conversations.sync();
      const convos = await client.conversations.list();
      const enriched = await Promise.all(
        convos.slice(0, 20).map(async (convo) => {
          const messages = await convo.messages({ limit: 50 });
          return {
            id: convo.id,
            peerAddress: convo.peerAddress,
            messages: messages.map((m) => ({
              id: m.id,
              senderAddress: m.senderAddress,
              content: typeof m.content === "string" ? m.content : "",
              sentAt: m.sentAt ?? new Date(),
            })),
          };
        })
      );
      setConversations(enriched);
    } catch (err) {
      console.error("Load conversations error:", err);
    }
  }, []);

  const sendMessage = useCallback(
    async (peerAddress: string, content: string): Promise<boolean> => {
      const client = clientRef.current;
      if (!client || !content.trim()) return false;

      try {
        const canMessage = await Client.canMessage([peerAddress], {
          env: "production",
        });

        if (!canMessage[peerAddress]) {
          setError(`${peerAddress} hasn't enabled XMTP yet`);
          return false;
        }

        const conversation = await client.conversations.newConversation(
          peerAddress
        );
        await conversation.send(content);

        // Update local state optimistically
        setConversations((prev) => {
          const existing = prev.find((c) => c.peerAddress === peerAddress);
          const newMsg: XMTPMessage = {
            id: Date.now().toString(),
            senderAddress: client.address,
            content,
            sentAt: new Date(),
          };

          if (existing) {
            return prev.map((c) =>
              c.peerAddress === peerAddress
                ? { ...c, messages: [...c.messages, newMsg] }
                : c
            );
          } else {
            return [
              ...prev,
              {
                id: conversation.id,
                peerAddress,
                messages: [newMsg],
              },
            ];
          }
        });

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Send failed";
        setError(msg);
        return false;
      }
    },
    []
  );

  const checkCanMessage = useCallback(async (address: string): Promise<boolean> => {
    try {
      const { Client } = await import("@xmtp/browser-sdk");
      const result = await Client.canMessage([address], { env: "production" });
      return result[address] ?? false;
    } catch {
      return false;
    }
  }, []);

  const streamMessages = useCallback(
    async (
      peerAddress: string,
      onMessage: (msg: XMTPMessage) => void
    ): Promise<() => void> => {
      const client = clientRef.current;
      if (!client) return () => {};

      const conversation = await client.conversations.newConversation(peerAddress);
      const stream = await conversation.streamMessages();

      (async () => {
        for await (const message of stream) {
          onMessage({
            id: message.id,
            senderAddress: message.senderAddress,
            content: typeof message.content === "string" ? message.content : "",
            sentAt: message.sentAt ?? new Date(),
          });
        }
      })();

      return () => stream.return?.(undefined);
    },
    []
  );

  return {
    initialize,
    loadConversations,
    sendMessage,
    checkCanMessage,
    streamMessages,
    status,
    error,
    conversations,
    isReady: status === "ready",
    address: clientRef.current?.address,
  };
}
