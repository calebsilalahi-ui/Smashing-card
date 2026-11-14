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
      className={`grid h-10 w-10 place-items-center rounded-full border border-cream/20 bg-espresso-soft/70 text-cream transition active:scale-95 hover:border-gold/60 ${className}`}
    >
      {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
    </button>
  );
}
