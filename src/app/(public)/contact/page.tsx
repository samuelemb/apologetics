import type { Metadata } from "next";

import { ContactForm } from "@/components/public/contact/contact-form";
import { PublicCard } from "@/components/public/public-card";
import { PublicContainer } from "@/components/public/public-container";

export const metadata: Metadata = {
  title: "Contact Us | APOLOGETICS መጽሔት",
  description:
    "Contact APOLOGETICS መጽሔት with questions, feedback, suggestions, or inquiries.",
};

export default function ContactPage() {
  return (
    <main className="min-w-0 flex-1 bg-public-background">
      <PublicContainer className="py-10 sm:py-14 lg:py-16 xl:py-20">
        <div className="mx-auto grid min-w-0 max-w-[1120px] gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-10 xl:gap-14">
          <header className="min-w-0 lg:pt-3">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-public-primary">
              <span>Get in touch</span>
              <span aria-hidden="true" className="h-px w-8 bg-public-primary" />
            </div>
            <h1 className="mt-3 break-words font-editorial text-4xl font-bold leading-tight text-public-text sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-5 max-w-xl break-words text-base leading-7 text-public-muted-text sm:text-lg sm:leading-8">
              Send us your questions, feedback, suggestions, or inquiries using
              the form below.
            </p>

            <div className="mt-7 border-l-2 border-public-primary bg-public-primary-soft/45 px-5 py-4 sm:mt-9">
              <p className="break-words font-editorial text-lg leading-7 text-public-text sm:text-xl sm:leading-8">
                We welcome thoughtful questions, feedback, suggestions, and
                inquiries.
              </p>
            </div>
          </header>

          <section aria-labelledby="contact-form-heading" className="min-w-0">
            <PublicCard className="p-5 sm:p-7 lg:p-8">
              <div className="mb-6 border-b border-public-border pb-5">
                <h2
                  id="contact-form-heading"
                  className="break-words font-editorial text-2xl font-bold leading-tight text-public-primary sm:text-3xl"
                >
                  Send us a message
                </h2>
                <p className="mt-2 break-words text-sm leading-6 text-public-muted-text">
                  Complete the fields below. Required fields are clearly marked.
                </p>
              </div>
              <ContactForm />
            </PublicCard>
          </section>
        </div>
      </PublicContainer>
    </main>
  );
}
