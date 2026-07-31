import { listEnabledAdminPromptsForTask } from "@sovia/admin/data/admin-prompts";
import { requireAdminSession } from "@sovia/admin/data/auth";
import { listAdminMusicWorkOptions } from "@sovia/admin/data/music-admin";
import { listEnabledAdminYoutubeLocales } from "@sovia/admin/data/youtube-locales";
import { NextResponse } from "next/server";

type ActionOption = { isDefault?: boolean; label: string; value: string };

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "content") {
      const options = (await listAdminMusicWorkOptions())
        .map((work) => ({
          label: `${work.contentId} - ${work.title || work.path}`,
          value: work.contentId,
        }))
        .sort((first, second) => first.label.localeCompare(second.label));
      return NextResponse.json({ options } satisfies {
        options: ActionOption[];
      });
    }

    if (type === "prompt") {
      const task = searchParams.get("task");
      if (!task) throw new Error("Prompt task is required.");
      const options = (await listEnabledAdminPromptsForTask(task)).map(
        (prompt) => ({
          isDefault: prompt.isDefault,
          label: `${prompt.isDefault ? "[default] " : ""}${prompt.title} (${prompt.variant})`,
          value: prompt.key,
        }),
      );
      return NextResponse.json({ options } satisfies {
        options: ActionOption[];
      });
    }

    if (type === "youtubeLocale") {
      const options = (await listEnabledAdminYoutubeLocales()).map(
        (locale) => ({
          label: `${locale.label} (${locale.locale})`,
          value: locale.locale,
        }),
      );
      return NextResponse.json({ options } satisfies {
        options: ActionOption[];
      });
    }

    throw new Error("Unsupported action option type.");
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Action options could not be loaded.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
