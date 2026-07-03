import * as React from "react";
import DatePicker from "react-datepicker";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholderText?: string;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
};

function Calendar({
  selected,
  onChange,
  className,
  placeholderText = "Select date",
  dateFormat = "yyyy-MM-dd",
  minDate,
  maxDate,
  locale = "en"
}: CalendarProps) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      className={cn("border rounded-md px-3 py-2 text-sm", className)}
      placeholderText={placeholderText}
      dateFormat={dateFormat}
      minDate={minDate}
      maxDate={maxDate}
      locale={locale}
      showPopperArrow={false}
      calendarClassName="p-2"
      popperPlacement="bottom"
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
