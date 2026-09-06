import { ImageResponse } from "next/og";
import { getBayanBySlug, getAllBayanSlugs } from "@/lib/data/service";
import { formatDurationLabel } from "@/lib/utils";
import { siteConfig } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Bayan on HuDa Web Quran";

export async function generateStaticParams() {
  const slugs = await getAllBayanSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function OgImage({
  params,
}: {
  params: { slug: string };
}) {
  const bayan = await getBayanBySlug(params.slug);
  const title = bayan?.title ?? "Bayan";
  const speaker = bayan?.speaker.name ?? "";
  const category = bayan?.category.name ?? "";
  const duration = bayan ? formatDurationLabel(bayan.durationSeconds) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #1a5140 0%, #0f2e25 100%)",
          color: "#fbf9f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#e8d19a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
            }}
          >
            ☾
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>
            <span>{siteConfig.name}</span>
            <span style={{ color: "#aed7c1", fontWeight: 400 }}>
              {" "}
              · Bayan
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {category ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 24,
                color: "#0f2e25",
                background: "#e8d19a",
                padding: "8px 20px",
                borderRadius: 999,
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1000 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 30, color: "#d6ebe0" }}>
          <span>{speaker}</span>
          {duration ? <span>· {duration}</span> : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
