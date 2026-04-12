"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { ENSAvatar } from "@/components/ui/ENSAvatar";
import { useENSName } from "@/hooks/useENS";
import { formatRelativeTime, formatDisplayName, cn } from "@/lib/utils";
import { uploadJSONToPinata, fetchFromIPFSWithFallback } from "@/lib/ipfs";
import type { Comment } from "@/types";

interface CommentsSheetProps {
  open: boolean;
  onClose: () => void;
  videoCid: string;
  commentCount: number;
}

// Comments are stored as an IPFS-linked thread.
// Each comment JSON: { videoCid, author, content, timestamp, parentCid? }
// A simple off-chain index (or TheGraph) tracks the latest thread CID per video.
// For v1, we use a lightweight API route to store/retrieve comment thread CIDs.

export function CommentsSheet({
  open,
  onClose,
  videoCid,
  commentCount,
}: CommentsSheetProps) {
  const { address } = useAccount();
  const { name: ensName, avatar } = useENSName(address);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load comments from API (backed by IPFS CID index)
  useEffect(() => {
    if (!open || !videoCid) return;
    setLoading(true);

    fetch(`/api/comments?videoCid=${encodeURIComponent(videoCid)}`)
      .then((r) => r.json())
      .then((data: Comment[]) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [open, videoCid]);

  const handlePost = useCallback(async () => {
    if (!text.trim() || !address || posting) return;
    setPosting(true);

    const comment: Comment = {
      id: Date.now().toString(),
      author: address,
      authorEns: ensName || undefined,
      authorAvatar: avatar || undefined,
      content: text.trim(),
      timestamp: Math.floor(Date.now() / 1000),
    };

    try {
      // Pin comment to IPFS
      const cid = await uploadJSONToPinata(
        { videoCid, ...comment },
        `comment-${Date.now()}.json`
      );

      // Register with our API (stores CID → videoCid mapping)
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoCid, commentCid: cid, comment }),
      });

      setComments((prev) => [{ ...comment, txHash: cid }, ...prev]);
      setText("");
    } catch (err) {
      console.error("Comment post error:", err);
    } finally {
      setPosting(false);
    }
  }, [text, address, posting, videoCid, ensName, avatar]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-x-4 bottom-4 top-auto z-50 w-auto max-w-lg mx-auto bg-eth-card border border-eth-border rounded-3xl flex flex-col"
            style={{ maxHeight: "75dvh", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 540 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-eth-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-eth-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-neon-cyan" />
                <span className="text-white font-bold text-sm">
                  {commentCount} Comments
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-eth-surface flex items-center justify-center text-muted-foreground"
              >
                <X size={14} />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="text-neon-cyan animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">
                    No comments yet. Be the first!
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <CommentRow key={c.id} comment={c} />
                ))
              )}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-eth-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <ENSAvatar
                  address={address}
                  ensName={ensName || undefined}
                  avatarUrl={avatar || undefined}
                  size="sm"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={address ? "Add a comment..." : "Connect wallet to comment"}
                  disabled={!address}
                  maxLength={280}
                  className="flex-1 h-10 bg-eth-surface border border-eth-border rounded-xl px-3 text-white text-sm placeholder:text-muted-foreground/60 outline-none focus:border-neon-cyan/50 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handlePost}
                  disabled={!text.trim() || !address || posting}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                    text.trim() && address && !posting
                      ? "text-eth-dark"
                      : "bg-eth-surface border border-eth-border text-muted-foreground"
                  )}
                  style={
                    text.trim() && address && !posting
                      ? { background: "linear-gradient(135deg, #00f5ff, #bf5af2)" }
                      : {}
                  }
                >
                  {posting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
              <p className="text-muted-foreground text-[10px] text-center mt-2">
                Comments are pinned permanently to IPFS
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const { name: ensName, avatar } = useENSName(comment.author);

  return (
    <div className="flex gap-2.5">
      <ENSAvatar
        address={comment.author}
        ensName={comment.authorEns || ensName || undefined}
        avatarUrl={comment.authorAvatar || avatar || undefined}
        size="sm"
        className="flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-white font-semibold text-xs">
            @{formatDisplayName(comment.author, comment.authorEns || ensName || undefined)}
          </span>
          <span className="text-muted-foreground text-[10px]">
            {formatRelativeTime(comment.timestamp)}
          </span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed break-words">
          {comment.content}
        </p>
        {comment.txHash && (
          <a
            href={`https://ipfs.io/ipfs/${comment.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 text-[9px] font-mono hover:text-neon-cyan/60 transition-colors"
          >
            ipfs://{comment.txHash.slice(0, 12)}...
          </a>
        )}
      </div>
    </div>
  );
}
