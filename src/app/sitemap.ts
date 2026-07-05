import type { MetadataRoute } from "next";

import { arenaZones, challenges } from "@/data/mock";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();

  const staticPages = ["", "/arena", "/leaderboard", "/profile", "/bookmarks", "/open-source", "/login", "/register"].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const zonePages = arenaZones.map((zone) => ({
    url: `${siteUrl}/arena/${zone.id}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  const challengePages = challenges.map((challenge) => ({
    url: `${siteUrl}/challenges/${challenge.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticPages, ...zonePages, ...challengePages];
}
