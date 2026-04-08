import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

interface CalloutFaqProps {
  title?: string;
  items: FaqItem[];
}

export function CalloutFaq({ title, items }: CalloutFaqProps) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        {title && (
          <h2 className="mb-8 text-center text-3xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        <Accordion type="single" collapsible className="w-full">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent>{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
