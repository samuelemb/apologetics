import type { PublicNewsDetailArticle } from "@/services/public-news-detail.service";

type NewsArticleBodyProps = {
  content: PublicNewsDetailArticle["content"];
  tags: PublicNewsDetailArticle["tags"];
};

function getParagraphs(content: string) {
  return content
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .filter((paragraph) => paragraph.trim().length > 0);
}

export function NewsArticleBody({ content, tags }: NewsArticleBodyProps) {
  const paragraphs = getParagraphs(content);

  return (
    <div className="mt-8 max-w-3xl">
      {paragraphs.length > 0 ? (
        <div className="space-y-5 text-base leading-7 text-public-text sm:text-[1.0625rem] sm:leading-8">
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="break-words whitespace-pre-line [overflow-wrap:anywhere]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-[var(--public-radius)] border border-public-border bg-public-primary-soft px-4 py-3 text-sm leading-6 text-public-muted-text">
          Article content is currently unavailable.
        </p>
      )}

      {tags.length > 0 ? (
        <section aria-labelledby="article-tags-title" className="mt-10 border-t border-public-border pt-6">
          <h2
            id="article-tags-title"
            className="text-sm font-bold text-public-text"
          >
            Tags
          </h2>
          <ul className="mt-3 flex min-w-0 flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag.slug}
                className="max-w-full rounded-[var(--public-radius)] bg-public-primary-soft px-3 py-1.5 text-xs font-medium text-public-muted-text"
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
