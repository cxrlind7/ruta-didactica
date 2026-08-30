import { ChevronRightIcon } from "./icons";

type FAQItem = { question: string; answer: string };

export default function FAQAccordion({ items }: { items: FAQItem[] }) {
  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-rd-lg border border-slate-200 bg-white">
      {items.map((item) => (
        <details key={item.question} className="group p-5 open:bg-slate-50/70">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-rd-navy [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-rd-violet transition-transform duration-300 group-open:rotate-90" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
