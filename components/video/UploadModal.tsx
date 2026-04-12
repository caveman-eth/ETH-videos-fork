"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Upload,
  Video,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  ImagePlus,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useWriteContract } from "wagmi";
import {
  validateVideoFile,
  getVideoDuration,
  validateVideoDuration,
  generateThumbnail,
  extractHashtags,
  cn,
} from "@/lib/utils";
import { uploadToLivepeer } from "@/lib/livepeer";
import {
  uploadFileToPinata,
  uploadJSONToPinata,
  buildVideoMetadata,
} from "@/lib/ipfs";
import { CONTRACTS, VIDEO_POST_ABI } from "@/lib/contracts";
import { useENSName } from "@/hooks/useENS";
import type { UploadProgress, VideoMetadata } from "@/types";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (video: VideoMetadata) => void;
}

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const { address } = useAccount();
  const { name: ensName } = useENSName(address);
  const { writeContractAsync } = useWriteContract();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [progress, setProgress] = useState<UploadProgress>({
    stage: "idle",
    percent: 0,
    message: "",
  });

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    // Type + size check
    const validation = validateVideoFile(f);
    if (!validation.valid) {
      setProgress({ stage: "error", percent: 0, message: validation.error! });
      return;
    }

    // Duration check (15–60s)
    try {
      const duration = await getVideoDuration(f);
      const durationCheck = validateVideoDuration(duration);
      if (!durationCheck.valid) {
        setProgress({ stage: "error", percent: 0, message: durationCheck.error! });
        return;
      }
    } catch {
      // If we can't read duration, allow it and let Livepeer handle it
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setProgress({ stage: "idle", percent: 0, message: "" });
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".webm", ".mov"] },
    maxFiles: 1,
    maxSize: 500 * 1024 * 1024,
    noClick: true,
  });

  const handlePost = useCallback(async () => {
    if (!file || !address) return;

    try {
      // 1. Upload video to Livepeer
      setProgress({
        stage: "uploading",
        percent: 0,
        message: "Uploading to Livepeer...",
      });

      const { playbackId, assetId } = await uploadToLivepeer(
        file,
        caption || file.name,
        (pct) =>
          setProgress({
            stage: "uploading",
            percent: pct,
            message: `Uploading: ${pct}%`,
          })
      );

      // 2. Pin thumbnail (custom or auto-generated)
      setProgress({
        stage: "transcoding",
        percent: 30,
        message: thumbnailFile ? "Pinning cover image..." : "Transcoding video...",
      });

      let thumbnailCid = "";
      const thumbSource = thumbnailFile ?? await generateThumbnail(file, 2);

      if (thumbSource) {
        setProgress({
          stage: "pinning",
          percent: 50,
          message: "Pinning thumbnail to IPFS...",
        });
        thumbnailCid = await uploadFileToPinata(
          thumbSource,
          thumbnailFile ? `cover-${Date.now()}.${thumbnailFile.name.split(".").pop()}` : `thumb-${Date.now()}.jpg`
        );
      }

      // 3. Pin video file to IPFS
      setProgress({
        stage: "pinning",
        percent: 60,
        message: "Pinning video to IPFS permanently...",
      });

      const videoCid = await uploadFileToPinata(
        file,
        file.name,
        (pct) =>
          setProgress({
            stage: "pinning",
            percent: 60 + pct * 0.2,
            message: `Pinning: ${pct}%`,
          })
      );

      // 4. Build & pin metadata
      setProgress({
        stage: "pinning",
        percent: 82,
        message: "Creating video metadata...",
      });

      const hashtags = extractHashtags(caption);
      const metadata = await buildVideoMetadata({
        videoCid,
        thumbnailCid,
        playbackId,
        caption,
        hashtags,
        duration: 0, // would get from video file
        poster: address,
        posterEns: ensName || undefined,
      });

      const metadataCid = await uploadJSONToPinata(
        metadata,
        `video-${Date.now()}.json`
      );

      // 5. Post on-chain
      setProgress({
        stage: "posting",
        percent: 90,
        message: "Recording on Ethereum...",
      });

      const txHash = await writeContractAsync({
        address: CONTRACTS.mainnet.videoPost,
        abi: VIDEO_POST_ABI,
        functionName: "postVideo",
        args: [metadataCid, playbackId, caption],
      });

      setProgress({
        stage: "done",
        percent: 100,
        message: "Posted successfully!",
        playbackId,
        cid: metadataCid,
        txHash,
      });

      onSuccess?.({
        cid: metadataCid,
        playbackId,
        caption,
        hashtags: extractHashtags(caption),
        duration: 0,
        poster: address!,
        posterEns: ensName || undefined,
        timestamp: Date.now(),
        likes: 0,
        comments: 0,
        tips: "0",
        views: 0,
        txHash: typeof txHash === "string" ? txHash : undefined,
      });
    } catch (err) {
      setProgress({
        stage: "error",
        percent: 0,
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }, [file, address, caption, ensName, writeContractAsync, onSuccess]);

  const reset = useCallback(() => {
    setFile(null);
    setPreview("");
    setCaption("");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setProgress({ stage: "idle", percent: 0, message: "" });
  }, []);

  const handleClose = () => {
    if (progress.stage === "uploading" || progress.stage === "pinning") return;
    reset();
    onClose();
  };

  const isUploading = [
    "uploading",
    "transcoding",
    "pinning",
    "posting",
  ].includes(progress.stage);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-eth-card rounded-3xl w-full overflow-hidden border border-eth-border"
              style={{ maxWidth: file ? 800 : 560, maxHeight: "90dvh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-eth-border">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #00f5ff, #bf5af2)" }}
                  >
                    <Upload size={12} style={{ color: "#0a0a0f" }} />
                  </div>
                  <h2 className="text-base font-black text-white">Upload Video</h2>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-eth-surface flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(90dvh - 65px)" }}>
              <div className={cn("p-5", file && !isUploading && progress.stage !== "done" ? "grid grid-cols-[auto_1fr] gap-5" : "")}>
                {/* Done state */}
                {progress.stage === "done" ? (
                  <div className="py-12 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                    >
                      <CheckCircle2
                        size={56}
                        className="text-neon-green mx-auto mb-4 drop-shadow-[0_0_20px_rgba(48,209,88,0.8)]"
                      />
                    </motion.div>
                    <h3 className="text-xl font-black text-white mb-2">
                      Video posted!
                    </h3>
                    <p className="text-muted-foreground text-sm mb-6">
                      Your video is live on ethvideos.eth
                    </p>
                    {progress.txHash && (
                      <a
                        href={`https://etherscan.io/tx/${progress.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-neon-cyan text-xs mb-6 hover:underline"
                      >
                        View on Etherscan <ExternalLink size={10} />
                      </a>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={reset}
                        className="flex-1 h-12 rounded-xl bg-eth-surface border border-eth-border text-white text-sm font-semibold"
                      >
                        Post another
                      </button>
                      <button
                        onClick={handleClose}
                        className="flex-1 h-12 rounded-xl text-eth-dark text-sm font-semibold"
                        style={{
                          background: "linear-gradient(135deg, #00f5ff, #bf5af2)",
                        }}
                      >
                        Go to feed
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Drop zone — shown when no file */}
                    {!file ? (
                      <div
                        {...getRootProps()}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200",
                          isDragActive
                            ? "border-neon-cyan bg-neon-cyan/5"
                            : "border-eth-border hover:border-neon-cyan/50 hover:bg-eth-surface/50"
                        )}
                      >
                        <input {...getInputProps()} />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onDrop([f]);
                            e.target.value = "";
                          }}
                        />
                        <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}>
                          <Video
                            size={44}
                            className={cn(
                              "mx-auto mb-4",
                              isDragActive ? "text-neon-cyan" : "text-muted-foreground"
                            )}
                          />
                        </motion.div>
                        <p className="text-white font-bold text-base mb-1">
                          {isDragActive ? "Drop it here!" : "Drag & drop your video"}
                        </p>
                        <p className="text-muted-foreground text-sm mb-5">
                          MP4, WebM, or MOV · Up to 3 min · Max 500MB
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-7 py-2.5 rounded-xl bg-eth-surface border border-eth-border text-white text-sm font-semibold hover:border-neon-cyan/50 transition-colors"
                        >
                          Browse files
                        </button>
                      </div>
                    ) : (
                      /* Left column: video preview (9:16, fixed width) */
                      <div
                        className="relative bg-black rounded-2xl overflow-hidden flex-shrink-0"
                        style={{ width: 180, aspectRatio: "9/16" }}
                      >
                        <video
                          src={preview}
                          className="w-full h-full object-cover"
                          controls
                          muted
                        />
                        <button
                          onClick={() => { setFile(null); setPreview(""); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                        >
                          <X size={12} />
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-2 py-0.5">
                          <span className="text-white text-[10px] font-medium">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Right column: form content */}
                    <div className="flex flex-col gap-4 min-w-0">
                    {/* Error */}
                    {progress.stage === "error" && (
                      <div className="flex items-center gap-2 bg-neon-pink/10 border border-neon-pink/30 rounded-xl px-4 py-3">
                        <AlertCircle size={14} className="text-neon-pink flex-shrink-0" />
                        <span className="text-neon-pink text-xs">
                          {progress.message}
                        </span>
                      </div>
                    )}

                    {/* Caption */}
                    <div>
                      <textarea
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption... #ethereum #web3"
                        maxLength={300}
                        rows={file ? 5 : 3}
                        className="w-full bg-eth-surface border border-eth-border rounded-xl px-4 py-3 text-white text-sm placeholder:text-muted-foreground/60 resize-none outline-none focus:border-neon-cyan/50 transition-colors"
                      />
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {extractHashtags(caption).map((tag) => (
                            <span key={tag} className="text-neon-cyan text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {caption.length}/300
                        </span>
                      </div>
                    </div>

                    {/* Custom thumbnail */}
                    {file && !isUploading && progress.stage !== "done" && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Cover Image <span className="normal-case font-normal">(optional)</span>
                        </p>
                        {thumbnailPreview ? (
                          <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={thumbnailPreview}
                              alt="Cover preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => { setThumbnailFile(null); setThumbnailPreview(""); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black/90 transition-colors"
                            >
                              <X size={12} />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-2 py-0.5">
                              <span className="text-white text-[10px] font-medium">Custom cover</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-eth-border hover:border-neon-cyan/40 hover:bg-eth-surface/50 py-3 text-muted-foreground hover:text-white text-sm transition-colors"
                          >
                            <ImagePlus size={14} />
                            Upload cover image
                          </button>
                        )}
                        <input
                          ref={thumbnailInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setThumbnailFile(f);
                              setThumbnailPreview(URL.createObjectURL(f));
                            }
                            e.target.value = "";
                          }}
                        />
                      </div>
                    )}

                    {/* Progress bar */}
                    {isUploading && (
                      <div className="bg-eth-surface border border-eth-border rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Loader2 size={14} className="text-neon-cyan animate-spin" />
                          <span className="text-white text-sm font-medium">
                            {progress.message}
                          </span>
                        </div>
                        <div className="h-2 bg-eth-border rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background: "linear-gradient(90deg, #00f5ff, #bf5af2)",
                              width: `${progress.percent}%`,
                            }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground text-xs">
                            {getStageLabel(progress.stage)}
                          </span>
                          <span className="text-neon-cyan text-xs font-mono">
                            {Math.round(progress.percent)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Info chips */}
                    {!isUploading && file && (
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "IPFS permanent storage" },
                          { label: "Livepeer transcoding" },
                          { label: "On-chain post" },
                        ].map(({ label }) => (
                          <span
                            key={label}
                            className="text-xs text-muted-foreground bg-eth-surface border border-eth-border rounded-full px-2.5 py-1"
                          >
                            ✓ {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Post button */}
                    <button
                      onClick={handlePost}
                      disabled={!file || !address || isUploading}
                      className={cn(
                        "w-full h-14 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2",
                        !file || !address || isUploading
                          ? "bg-eth-surface border border-eth-border text-muted-foreground"
                          : "text-eth-dark"
                      )}
                      style={
                        file && address && !isUploading
                          ? {
                              background:
                                "linear-gradient(135deg, #00f5ff, #bf5af2)",
                            }
                          : {}
                      }
                    >
                      {isUploading ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <>
                          <Upload size={18} />
                          Post to ethvideos.eth
                        </>
                      )}
                    </button>

                    {!address && (
                      <p className="text-muted-foreground text-xs text-center">
                        Connect your wallet to post
                      </p>
                    )}
                    </div> {/* right column */}
                  </>
                )}
              </div>
              </div> {/* scrollable body */}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    uploading: "Uploading video...",
    transcoding: "Transcoding to HLS...",
    pinning: "Pinning to IPFS...",
    posting: "Broadcasting to Ethereum...",
  };
  return labels[stage] || "";
}
