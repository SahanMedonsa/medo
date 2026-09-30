"use client";

import Image from "next/image";
import { useState } from "react";

const variants = ["maxresdefault", "sddefault", "hqdefault"];

function Thumbnail({ videoId, alt }: { videoId: string; alt: string }) {
  const [variant, setVariant] = useState(0);
  const fallback = () => setVariant((current) => Math.min(current + 1, variants.length - 1));

  return <Image
    src={`https://i.ytimg.com/vi/${videoId}/${variants[variant]}.jpg`}
    alt={alt}
    width={1280}
    height={720}
    unoptimized
    onError={fallback}
    onLoad={(event) => {
      // YouTube may return a small placeholder instead of a missing-image error.
      if (event.currentTarget.naturalWidth <= 120) fallback();
    }}
  />;
}

export default function YoutubeThumbnail(props: { videoId: string; alt: string }) {
  return <Thumbnail key={props.videoId} {...props} />;
}
