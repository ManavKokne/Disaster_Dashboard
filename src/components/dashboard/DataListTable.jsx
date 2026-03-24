"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
} from "lucide-react";

export default function DataListTable({ tweets, locations, requestTypes }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "#",
        size: 60,
        cell: ({ row }) => (
          <span className="text-slate-400 text-xs">{row.original.id}</span>
        ),
      },
      {
        accessorKey: "tweet",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 cursor-pointer hover:text-slate-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Tweet <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 350,
        cell: ({ row }) => (
          <span className="text-sm text-slate-700 line-clamp-2" title={row.original.tweet}>
            {row.original.tweet.length > 80
              ? row.original.tweet.substring(0, 80) + "..."
              : row.original.tweet}
          </span>
        ),
      },
      {
        accessorKey: "location",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 cursor-pointer hover:text-slate-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Location <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 140,
      },
      {
        accessorKey: "request_type",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 cursor-pointer hover:text-slate-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Category <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 140,
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.request_type}</Badge>
        ),
      },
      {
        accessorKey: "urgency",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 cursor-pointer hover:text-slate-900"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Urgency <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 120,
        cell: ({ row }) => {
          const urgency = (row.original.urgency || "").toLowerCase();
          const isResolved = Boolean(row.original.is_resolved);
          return (
            <Badge
              variant={
                isResolved
                  ? "success"
                  : urgency === "urgent"
                  ? "destructive"
                  : "outline"
              }
            >
              {isResolved ? "resolved" : row.original.urgency}
            </Badge>
          );
        },
      },
      {
        accessorKey: "is_acknowledged",
        header: "Acknowledged",
        size: 110,
        cell: ({ row }) => {
          const isAcknowledged = Boolean(row.original.is_acknowledged);
          return (
            <Badge
              variant={isAcknowledged ? "success" : "outline"}
            >
              {isAcknowledged ? "Yes" : "No"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  // Apply column filters
  const filteredData = useMemo(() => {
    return tweets.filter((t) => {
      if (locationFilter && t.location.toLowerCase() !== locationFilter.toLowerCase()) return false;
      if (categoryFilter && t.request_type !== categoryFilter) return false;
      if (urgencyFilter) {
        if (urgencyFilter.toLowerCase() === "resolved") {
          if (!t.is_resolved) return false;
        } else if ((t.urgency || "").toLowerCase() !== urgencyFilter.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [tweets, locationFilter, categoryFilter, urgencyFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filters Bar - Responsive */}
      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 p-2 sm:p-3 border-b border-slate-200 bg-white">
        <div className="relative flex-1 min-w-full sm:min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tweets..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-8 text-xs sm:text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="flex-1 sm:flex-none sm:w-[140px] h-8 text-xs"
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex-1 sm:flex-none sm:w-[140px] h-8 text-xs"
          >
            <option value="">All Categories</option>
            {requestTypes.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </Select>
          <Select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="flex-1 sm:flex-none sm:w-[130px] h-8 text-xs"
          >
            <option value="">All Urgency</option>
            <option value="Urgent">Urgent</option>
            <option value="Non-Urgent">Non-Up</option>
            <option value="Resolved">Resolved</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }} className="text-xs sm:text-sm">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs sm:text-sm py-1 sm:py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-6 sm:py-8 text-slate-400 text-xs sm:text-sm">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 sm:px-3 py-2 border-t border-slate-200 bg-white gap-2 sm:gap-0">
        <p className="text-xs text-slate-500">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7"
          >
            <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <span className="text-xs text-slate-600 px-2 whitespace-nowrap">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
