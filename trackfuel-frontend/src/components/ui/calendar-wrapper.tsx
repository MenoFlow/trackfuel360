// components/ui/calendar-wrapper.tsx
import * as React from "react";
import { Calendar } from "./calendar";

type CalendarWrapperProps = {
  mode?: "single";
  selected?: Date | null;
  onSelect?: (date: Date | null) => void;
  initialFocus?: boolean;
  className?: string;
  placeholderText?: string;
};

export function CalendarWrapper({
  selected,
  onSelect,
  initialFocus,
  className,
  placeholderText,
  ...props
}: CalendarWrapperProps) {
  return (
    <Calendar
      selected={selected ?? null}
      onChange={onSelect ?? (() => {})}
      className={className}
      placeholderText={placeholderText}
      {...props}
    />
  );
}

CalendarWrapper.displayName = "CalendarWrapper";