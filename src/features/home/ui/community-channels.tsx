"use client";

import { Routes } from "@sovia/shared";
import type { SiteLocale } from "@sovia/shared/i18n/site-locale";
import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import type { HomeCopy } from "../i18n/copy";

type CopyText = HomeCopy["community"];
type Channel = {
  title: string;
  description: string;
  href?: string;
  number?: string;
};

function ChannelCard({
  channel,
  copy,
  locale,
}: {
  channel: Channel;
  copy: CopyText;
  locale: SiteLocale;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const banned = !channel.href;
  const url = channel.number
    ? `https://sovia.work/${locale}/community#qq-${channel.number}`
    : channel.href;
  const invitation = [
    banned
      ? copy.bannedDescription
      : copy.invitation.replace("{name}", channel.title),
    channel.description,
    channel.number ? `${copy.groupNumber}: ${channel.number}` : "",
    url,
  ]
    .filter(Boolean)
    .join("\n");

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitation);
      setCopied(true);
      setError(false);
    } catch {
      setError(true);
    }
  }

  async function share() {
    if (!navigator.share) return copyInvitation();
    try {
      await navigator.share({ title: channel.title, text: invitation });
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(true);
    }
  }

  return (
    <article
      className="card flex min-w-0 flex-col gap-5"
      id={channel.number ? `qq-${channel.number}` : undefined}
    >
      <div className="meta">{banned ? copy.banned : copy.eyebrow}</div>
      <h2 className="break-words text-3xl">{channel.title}</h2>
      <p>{channel.description}</p>
      {channel.number && (
        <p className="font-bold">
          {copy.groupNumber}: {channel.number}
        </p>
      )}
      {channel.number && !banned && <p className="text-sm">{copy.qqHelp}</p>}
      <div className="mt-auto flex flex-wrap gap-3">
        {channel.href && (
          <a
            className="btn-primary"
            href={channel.href}
            target={channel.number ? undefined : "_blank"}
            rel={channel.number ? undefined : "noopener noreferrer"}
          >
            {channel.number ? copy.joinQq : copy.open}
          </a>
        )}
        <button
          className="btn-outline inline-flex items-center gap-2"
          type="button"
          onClick={share}
        >
          <Share2 size={16} />
          {copy.share}
        </button>
        <button
          className="btn-outline inline-flex items-center gap-2"
          type="button"
          onClick={copyInvitation}
        >
          <Copy size={16} />
          {copy.copyInvitation}
        </button>
      </div>
      <p aria-live="polite" className="text-sm">
        {error ? copy.shareError : copied ? copy.copied : ""}
      </p>
      {error && (
        <textarea
          className="w-full border p-3 text-sm"
          aria-label={copy.copyInvitation}
          readOnly
          value={invitation}
          rows={6}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}
    </article>
  );
}

export function CommunityChannels({
  copy,
  locale,
}: {
  copy: CopyText;
  locale: SiteLocale;
}) {
  const channels: Channel[] = [
    {
      title: "Reddit",
      description: copy.redditDescription,
      href: Routes.Reddit.href,
    },
    { title: "VK", description: copy.vkDescription, href: Routes.VK.href },
    {
      title: "Discord",
      description: copy.discordDescription,
      href: Routes.Discord.href,
    },
    {
      title: copy.qqTitle,
      description: copy.qqDescription,
      number: "165715829",
      href: "mqqapi://card/show_pslcard?src_type=internal&version=1&uin=165715829&card_type=group&source=qrcode",
    },
    {
      title: copy.oldQqTitle,
      description: copy.bannedDescription,
      number: "1055983594",
    },
  ];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {channels.map((channel) => (
        <ChannelCard
          key={channel.number ?? channel.title}
          channel={channel}
          copy={copy}
          locale={locale}
        />
      ))}
    </div>
  );
}
