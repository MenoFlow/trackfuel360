import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PreviewTableProps {
  type: string;
  items: any[];
  total: number;
}

const ITEMS_PER_PAGE = 2;

export const PreviewTable = ({ type, items, total }: PreviewTableProps) => {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(0);

  const columns = useMemo<ColumnDef<any>[]>(
    () =>
      Object.keys(items[0] || {}).map((key) => ({
        accessorKey: key,
        header: key,
        cell: ({ getValue }) => {
          const stringValue = String(getValue());
          const isTruncated = stringValue.length > 30;

          return isTruncated ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block max-w-[200px] cursor-help">
                  {stringValue}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs break-words">
                <p className="text-xs">{stringValue}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="whitespace-nowrap">{stringValue}</span>
          );
        },
      })),
    [items]
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    
    state: {
      pagination: {
        pageIndex: currentPage,
        pageSize: ITEMS_PER_PAGE,
      },
    },
    
    onPaginationChange: (updater) => {
      const newState = typeof updater === "function" 
        ? updater(table.getState().pagination)
        : updater;
      setCurrentPage(newState.pageIndex);
    },
    
    pageCount: Math.ceil(items.length / ITEMS_PER_PAGE),
  });
  if (!items[0]) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">
          {t(`dataTypes.${type}`)}
        </h4>
        <span className="text-sm text-muted-foreground">
          {total} {t("export.totalRows")}
        </span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-w-full">
          <table className="text-sm border-collapse min-w-full">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-border min-w-[120px]"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <TooltipProvider delayDuration={300}>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-xs text-foreground min-w-[120px]"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </TooltipProvider>
          </table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 py-2 bg-muted/20 rounded-md">
<Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
  <ChevronLeft className="h-4 w-4" />
</Button>

<span>
  {t("export.page")} {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
</span>

<Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
  <ChevronRight className="h-4 w-4" />
</Button>
        </div>
      )}
    </div>
  );
};
