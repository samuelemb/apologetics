type PageTitleProps = {
  title: string;
};

export function PageTitle({ title }: PageTitleProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
    </main>
  );
}
