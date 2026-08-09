"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  const topScrollerRef = React.useRef<HTMLDivElement>(null);
  const tableScrollerRef = React.useRef<HTMLDivElement>(null);
  const [scrollWidth, setScrollWidth] = React.useState(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] =
    React.useState(false);

  React.useEffect(() => {
    const scroller = tableScrollerRef.current;
    if (!scroller) return;

    const updateOverflow = () => {
      setScrollWidth(scroller.scrollWidth);
      setHasHorizontalOverflow(scroller.scrollWidth > scroller.clientWidth + 1);
    };
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(scroller);
    const table = scroller.querySelector("table");
    if (table) observer.observe(table);
    updateOverflow();

    return () => observer.disconnect();
  }, []);

  const syncScroll = (
    source: React.RefObject<HTMLDivElement | null>,
    target: React.RefObject<HTMLDivElement | null>,
  ) => {
    if (source.current && target.current) {
      target.current.scrollLeft = source.current.scrollLeft;
    }
  };

  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        data-slot="table-top-scrollbar"
        className={cn(
          "mb-2 h-3 w-full overflow-x-auto overflow-y-hidden",
          !hasHorizontalOverflow && "hidden",
        )}
        onScroll={() => syncScroll(topScrollerRef, tableScrollerRef)}
        ref={topScrollerRef}
      >
        <div className="h-px" style={{ width: scrollWidth }} />
      </div>
      <div
        data-slot="table-container"
        className="relative w-full overflow-x-auto"
        onScroll={() => syncScroll(tableScrollerRef, topScrollerRef)}
        ref={tableScrollerRef}
      >
        <table
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
