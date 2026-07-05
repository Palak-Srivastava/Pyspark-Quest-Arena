export const dynamic = 'force-dynamic';

import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ZoneQuestionBrowser } from "@/components/zone-question-browser";
import { getAllCompanies, getQuestionsByZone, getSolvedProgressByZone } from "@/lib/db";
import { ACCESS_COOKIE } from "@/lib/session";
import { arenaZones, totalQuestionCount } from "@/data/mock";

type Props = {
  params: Promise<{ zoneId: string }>;
};

function getCurrentUserIdFromAccessToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8")) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export default async function ArenaZonePage({ params }: Props) {
  const { zoneId } = await params;
  const zone = arenaZones.find((item) => item.id === zoneId);

  if (!zone) {
    notFound();
  }

  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const currentUserId = getCurrentUserIdFromAccessToken(token);

  const questions: Awaited<ReturnType<typeof getQuestionsByZone>> = await getQuestionsByZone(
    zone.id,
    1,
    20,
    {
      sort: "recommended",
      difficulty: "All",
      company: "All",
      search: "",
      savedOnly: false,
    },
    currentUserId ?? undefined,
  );
  const companies = getAllCompanies();
  const progressByZone = currentUserId ? await getSolvedProgressByZone(currentUserId) : [];
  const zoneProgress = progressByZone.find((item) => item.zoneId === zone.id)?.percent ?? 0;

  return (
    <section className="space-y-4">
      <Link href="/arena" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
        <ChevronLeft className="size-4" /> Back to Arena Lobby
      </Link>

      <header className={`zone-card ${zone.bgClass} relative overflow-hidden rounded-2xl border border-white/20 p-5`}>
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/65" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="sci-title text-xs">Zone Briefing</p>
            <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">{zone.name}</h1>
            <p className="mt-1 text-sm text-slate-200">{zone.description}</p>
          </div>
          <div className="text-right text-sm text-slate-200">
            <p>{zone.questionCount} Missions</p>
            <p>{totalQuestionCount}+ Global Question Bank</p>
          </div>
        </div>
      </header>

      <ZoneQuestionBrowser zoneId={zone.id} initialData={questions} companies={companies} initialProgressPercent={zoneProgress} />
    </section>
  );
}
