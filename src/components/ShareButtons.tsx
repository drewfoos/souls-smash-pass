"use client";

import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

interface ShareButtonsProps {
  smashed: number;
  passed: number;
  total: number;
  smashPercent: number;
  /** Public profile URL — if provided, included in the share text. */
  profileUrl?: string | null;
  className?: string;
}

function buildShareText(props: ShareButtonsProps): string {
  const { smashed, total, smashPercent, profileUrl } = props;
  const lines = [
    `I smashed ${smashed} out of ${total} Elden Ring characters (${smashPercent}% smash rate).`,
    "",
    "Think you can beat that?",
    profileUrl ?? "https://eldensmash.com",
  ];
  return lines.join("\n");
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

export function ShareButtons(props: ShareButtonsProps) {
  const { className = "" } = props;
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(props);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleTwitter = () => {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  const handleReddit = () => {
    const title = `I smashed ${props.smashed} out of ${props.total} Elden Ring characters (${props.smashPercent}% smash rate)`;
    const link = props.profileUrl ?? "https://eldensmash.com";
    const url = `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(link)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const handleNativeShare = () => {
    navigator.share({
      title: "Elden Smash",
      text: shareText,
      url: props.profileUrl ?? "https://eldensmash.com",
    }).catch(() => { /* user cancelled */ });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleTwitter}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
          bg-dark-700/50 text-priscilla/60 border border-dark-600/30
          hover:text-priscilla/90 hover:border-dark-600/60 active:scale-95 transition-all"
        aria-label="Share on X"
      >
        <XIcon size={14} />
        <span className="hidden sm:inline">Post</span>
      </button>

      <button
        onClick={handleReddit}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
          bg-dark-700/50 text-priscilla/60 border border-dark-600/30
          hover:text-[#FF4500] hover:border-[#FF4500]/30 active:scale-95 transition-all"
        aria-label="Share on Reddit"
      >
        <RedditIcon size={14} />
        <span className="hidden sm:inline">Reddit</span>
      </button>

      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
          bg-dark-700/50 text-priscilla/60 border border-dark-600/30
          hover:text-priscilla/90 hover:border-dark-600/60 active:scale-95 transition-all"
        aria-label="Copy to clipboard"
      >
        {copied ? <Check size={14} className="text-smash" /> : <Copy size={14} />}
        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
      </button>

      {canNativeShare && (
        <button
          onClick={handleNativeShare}
          className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
            bg-dark-700/50 text-priscilla/60 border border-dark-600/30
            hover:text-priscilla/90 hover:border-dark-600/60 active:scale-95 transition-all"
          aria-label="Share"
        >
          <Share2 size={14} />
        </button>
      )}
    </div>
  );
}
