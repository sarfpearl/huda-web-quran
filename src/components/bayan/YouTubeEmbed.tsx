"use client";

import { useState } from "react";
import Image from "next/image";
import {
  youtubeEmbedUrl,
  youtubePlaylistEmbedUrl,
  youtubeThumbnail,
} from "@/lib/youtube";
import { PlayIcon } from "@/components/ui/Icon";

/**
 * Click-to-load YouTube / YouTube Playlist embed (facade pattern).
 * Supports both single videoId and full playlistId (auto-play queue).
 */
export function YouTubeEmbed({
  videoId,
  playlistId,
  title,
}: {
  videoId?: string;
  playlistId?: string;
  title: string;
}) {
  const [active, setActive] = useState(false);

  const embedSrc = playlistId
    ? youtubePlaylistEmbedUrl(playlistId, { autoplay: true })
    : videoId
    ? youtubeEmbedUrl(videoId, { autoplay: true })
    : "";

  const thumbUrl = videoId
    ? youtubeThumbnail(videoId)
    : "/assets/images/bayan/quran.jpg";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group absolute inset-0 grid place-items-center"
          aria-label={`Play "${title}" on YouTube`}
        >
          <Image
            src={thumbUrl}
            alt=""
            fill
            className="object-cover opacity-80 transition group-hover:opacity-100"
            sizes="(max-width: 768px) 100vw, 720px"
          />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-red-600 text-3xl text-white shadow-soft-lg transition-transform group-hover:scale-105">
            <PlayIcon />
          </span>
        </button>
      )}
    </div>
  );
}
