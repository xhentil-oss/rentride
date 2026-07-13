import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  items: FAQItem[];
  title?: string;
}

export default function FAQAccordion({
  items,
  title = "Pyetje të shpeshta",
}: FAQAccordionProps) {
  return (
    <section className="py-16 px-6 bg-white" aria-labelledby="faq-heading">
      <div className="max-w-3xl mx-auto">
        <h2
          id="faq-heading"
          className="text-3xl font-medium text-neutral-900 mb-8 text-center"
        >
          {title}
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-border rounded-lg px-6 bg-white"
            >
              <AccordionTrigger className="text-left text-base font-medium text-neutral-800 py-4 hover:no-underline hover:text-primary transition-colors duration-200">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-neutral-600 pb-4 leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
