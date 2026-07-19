import type { PublicEventDetail } from "@/services/public-event-detail.service";

type EventDetailBodyProps = {
  content: PublicEventDetail["content"];
  tags: PublicEventDetail["tags"];
};

function getParagraphs(content: string) {
  return content
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0);
}

export function EventDetailBody({ content, tags }: EventDetailBodyProps) {
  const paragraphs = getParagraphs(content);

  if (paragraphs.length === 0 && tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 max-w-3xl">
      {paragraphs.length > 0 ? (
        <section aria-labelledby="event-content-title">
          <h2
            id="event-content-title"
            className="font-editorial text-2xl font-bold text-public-text"
          >
            About this event
          </h2>
          <div className="mt-4 space-y-5 text-base leading-7 text-public-text sm:text-[1.0625rem] sm:leading-8">
            {paragraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 24)}`}
                className="break-words whitespace-pre-line [overflow-wrap:anywhere]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {tags.length > 0 ? (
        <section
          aria-labelledby="event-tags-title"
          className="mt-10 border-t border-public-border pt-6"
        >
          <h2 id="event-tags-title" className="text-sm font-bold text-public-text">
            Tags
          </h2>
          <ul className="mt-3 flex min-w-0 flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.slug}
                className="max-w-full rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft px-3 py-1.5 text-xs font-medium text-public-muted-text"
              >
                <span className="break-words">{tag.name}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
