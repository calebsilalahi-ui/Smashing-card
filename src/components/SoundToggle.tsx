"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { sfx } from "@/lib/sound-fx";

export function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(sfx.isMuted());
    return sfx.subscribe(() => setMuted(sfx.isMuted()));
  }, []);

  return (
    <button
      type="button"
      aria-pressed={muted}
      aria-label={muted ? "Unmute sound effects" : "Mute sound effects"}
      title={muted ? "Sound off" : "Sound on"}
      onClick={() => {
        const next = !muted;
        sfx.setMuted(next);
        setMuted(next);
        if (!next) {
          sfx.unlock();
          sfx.click();
        }
      }}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-fg-2 transition-transform duration-150 ease-out active:scale-95 hover:text-fg ${className}`}
    >
      {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
    </button>
  );
}
