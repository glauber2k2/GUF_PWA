"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapse, Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { PLAN_FAQ } from "@/features/plans/constants/plan-faq";

const NONE_OPEN = -1;

/** "Dúvidas comuns": uma resposta aberta por vez (a primeira começa aberta). */
export function PlanFaq() {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      {PLAN_FAQ.map((item, index) => {
        const isOpen = openIndex === index;
        const answerId = `plan-faq-${index}`;
        return (
          <div key={item.question} className="border-b border-border last:border-b-0">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={answerId}
              onClick={() => setOpenIndex(isOpen ? NONE_OPEN : index)}
              className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 bg-transparent px-4 py-3 text-left text-fg transition-colors duration-150 ease-standard hover:bg-surface-3"
            >
              <strong className="flex-1 text-sm leading-5 font-semibold">{item.question}</strong>
              <Icon
                icon={ChevronDown}
                size={18}
                className={cn("flex-none text-fg-muted transition-transform duration-200 ease-standard motion-reduce:transition-none", isOpen && "rotate-180")}
              />
            </button>
            <Collapse open={isOpen}>
              <p id={answerId} className="m-0 px-4 pb-3.5 text-[13px] leading-[19px] text-pretty text-fg-secondary">
                {item.answer}
              </p>
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}
