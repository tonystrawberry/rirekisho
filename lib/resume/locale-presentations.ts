import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MasterResume } from "@/lib/resume/schema";
import { masterResumeSchema } from "@/lib/resume/schema";
import {
  applySourceDiffToLocale,
  translateMasterResume,
} from "@/lib/ai/translate";
import { RESUME_LOCALES } from "@/lib/resume/locales";

/**
 * Locale presentations are stored separately from the master resume.
 *
 * - MasterResumeProfile.data  → source locale only (usually EN). Never overwritten by translation.
 * - LocalePresentation(locale) → one row per locale (ja, fr, …). Updating JA never touches FR.
 */
export async function getOrCreateLocalePresentation(params: {
  profileId: string;
  sourceLocale: string;
  sourceVersion: number;
  sourceData: MasterResume;
  locale: string;
  force?: boolean;
}): Promise<{
  locale: string;
  sourceVersion: number;
  cached: boolean;
  data: MasterResume;
}> {
  const { profileId, sourceLocale, sourceVersion, sourceData, locale, force } =
    params;

  // Source language always comes from the master profile — never from LocalePresentation.
  if (locale === sourceLocale) {
    return {
      locale,
      sourceVersion,
      cached: true,
      data: sourceData,
    };
  }

  const existing = await prisma.localePresentation.findUnique({
    where: {
      profileId_locale: { profileId, locale },
    },
  });

  if (!force && existing && existing.sourceVersion === sourceVersion) {
    const cached = masterResumeSchema.parse(existing.data);
    // Self-heal: if the master has a summary but this locale lost it (e.g. LLM
    // returned ""), re-translate instead of serving a blank Summary section.
    const sourceHasSummary = Boolean(sourceData.summary?.trim());
    const localeMissingSummary = !cached.summary?.trim();
    if (!(sourceHasSummary && localeMissingSummary)) {
      return {
        locale: existing.locale,
        sourceVersion: existing.sourceVersion,
        cached: true,
        data: cached,
      };
    }
  }

  const translated = await translateMasterResume(sourceData, locale);

  // Upsert ONLY this locale row — sibling locales (e.g. fr vs ja) are untouched.
  const presentation = await prisma.localePresentation.upsert({
    where: {
      profileId_locale: { profileId, locale },
    },
    create: {
      profileId,
      locale,
      data: translated as unknown as Prisma.InputJsonValue,
      sourceVersion,
    },
    update: {
      data: translated as unknown as Prisma.InputJsonValue,
      sourceVersion,
    },
  });

  return {
    locale: presentation.locale,
    sourceVersion: presentation.sourceVersion,
    cached: false,
    data: masterResumeSchema.parse(presentation.data),
  };
}

async function upsertLocalePresentation(params: {
  profileId: string;
  locale: string;
  sourceVersion: number;
  data: MasterResume;
}) {
  const presentation = await prisma.localePresentation.upsert({
    where: {
      profileId_locale: {
        profileId: params.profileId,
        locale: params.locale,
      },
    },
    create: {
      profileId: params.profileId,
      locale: params.locale,
      data: params.data as unknown as Prisma.InputJsonValue,
      sourceVersion: params.sourceVersion,
    },
    update: {
      data: params.data as unknown as Prisma.InputJsonValue,
      sourceVersion: params.sourceVersion,
    },
  });
  return masterResumeSchema.parse(presentation.data);
}

/**
 * Refresh every non-source locale from the latest master resume.
 * When previousData is provided and a locale row already exists, only the
 * changed text is sent to the LLM and merged into that locale copy.
 */
export async function syncAllLocalePresentations(params: {
  profileId: string;
  sourceLocale: string;
  sourceVersion: number;
  sourceData: MasterResume;
  previousData?: MasterResume;
  forceFull?: boolean;
}): Promise<Array<{ locale: string; ok: boolean; error?: string }>> {
  const targets = RESUME_LOCALES.map((l) => l.id).filter(
    (id) => id !== params.sourceLocale,
  );

  return Promise.all(
    targets.map(async (locale) => {
      try {
        const existing = await prisma.localePresentation.findUnique({
          where: {
            profileId_locale: {
              profileId: params.profileId,
              locale,
            },
          },
        });

        const canPatch =
          !params.forceFull &&
          Boolean(params.previousData) &&
          Boolean(existing);

        let data: MasterResume;
        if (canPatch && params.previousData && existing) {
          data = await applySourceDiffToLocale({
            localeData: masterResumeSchema.parse(existing.data),
            previousSource: params.previousData,
            nextSource: params.sourceData,
            locale,
          });
        } else {
          data = await translateMasterResume(params.sourceData, locale);
        }

        await upsertLocalePresentation({
          profileId: params.profileId,
          locale,
          sourceVersion: params.sourceVersion,
          data,
        });
        return { locale, ok: true };
      } catch (e) {
        console.error(`[locale-sync] ${locale} failed`, e);
        return {
          locale,
          ok: false,
          error: e instanceof Error ? e.message : "Translation failed",
        };
      }
    }),
  );
}

type LocaleSyncJob = {
  profileId: string;
  sourceLocale: string;
  sourceVersion: number;
  sourceData: MasterResume;
  previousData?: MasterResume;
  forceFull?: boolean;
};

/** Latest pending job per profile — rapid preview edits coalesce to one sync. */
const pendingLocaleSync = new Map<string, LocaleSyncJob>();
const inflightLocaleSync = new Map<string, Promise<void>>();

/**
 * Queue a locale refresh for a profile.
 * Concurrent calls keep the earliest previousData and the latest sourceData
 * so coalesced edits become a single diff.
 */
export function scheduleLocaleSync(params: LocaleSyncJob): Promise<void> {
  const existing = pendingLocaleSync.get(params.profileId);
  if (existing) {
    pendingLocaleSync.set(params.profileId, {
      ...params,
      previousData: existing.previousData ?? params.previousData,
      forceFull: Boolean(existing.forceFull || params.forceFull),
    });
  } else {
    pendingLocaleSync.set(params.profileId, params);
  }

  const inflight = inflightLocaleSync.get(params.profileId);
  if (inflight) return inflight;

  const run = (async () => {
    try {
      while (pendingLocaleSync.has(params.profileId)) {
        const job = pendingLocaleSync.get(params.profileId)!;
        pendingLocaleSync.delete(params.profileId);
        await syncAllLocalePresentations(job);
      }
    } finally {
      inflightLocaleSync.delete(params.profileId);
    }
  })();

  inflightLocaleSync.set(params.profileId, run);
  return run;
}
