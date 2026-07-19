import { PublicCard } from "@/components/public/public-card";

type MagazineIssueDescriptionProps = {
  description: string | null;
};

function getDescriptionParagraphs(description: string | null) {
  const normalizedDescription = description
    ?.replace(/\r\n?/g, "\n")
    .trim();

  if (!normalizedDescription) {
    return [];
  }

  return normalizedDescription
    .split(/\n[\t ]*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export function MagazineIssueDescription({
  description,
}: MagazineIssueDescriptionProps) {
  const paragraphs = getDescriptionParagraphs(description);

  if (paragraphs.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="magazine-description-title"
      className="mt-7 sm:mt-8"
    >
      <PublicCard className="p-5 sm:p-6">
        <h2
          id="magazine-description-title"
          className="font-editorial text-xl font-bold text-public-text sm:text-2xl"
        >
          About this issue
        </h2>
        <span
          aria-hidden="true"
          className="mt-3 block h-0.5 w-9 bg-public-primary"
        />
        <div className="mt-4 max-w-3xl space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="whitespace-pre-line break-words text-base leading-7 text-public-text [overflow-wrap:anywhere]"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </PublicCard>
    </section>
  );
}
