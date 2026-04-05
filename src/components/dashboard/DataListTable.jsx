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
import { getUrgencyMeta } from "@/lib/urgency";

export default function DataListTable({ tweets, locations, requestTypes }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
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
        accessorKey: "urgency_label",
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
          const urgencyMeta = getUrgencyMeta(row.original);
          const urgencyLabel = urgencyMeta.label;
          const isClosed = Boolean(row.original.is_closed);
          const isResolved = Boolean(row.original.is_resolved);

          let className = "";
          if (urgencyLabel === "urgent") {
            className = "bg-red-100 text-red-700";
          } else if (urgencyLabel === "likely urgent") {
            className = "bg-orange-100 text-orange-700";
          } else if (urgencyLabel === "potentially urgent") {
            className = "bg-yellow-100 text-yellow-700";
          } else {
            className = "bg-blue-100 text-blue-700";
          }

          if (isClosed) {
            className = "bg-slate-100 text-slate-700";
          }

          if (isResolved && !isClosed) {
            className = "bg-green-100 text-green-700";
          }

          return (
            <Badge
              className={className}
            >
              {urgencyLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: "urgency_score",
        header: "Score",
        size: 90,
        cell: ({ row }) => {
          const urgencyMeta = getUrgencyMeta(row.original);
          return <span className="text-xs text-slate-600">{urgencyMeta.score.toFixed(2)}</span>;
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
      if (
        locationFilter &&
        (t.location || "").toLowerCase() !== locationFilter.toLowerCase()
      ) {
        return false;
      }
      if (categoryFilter && t.request_type !== categoryFilter) return false;
      if (urgencyFilter) {
        const urgencyLabel = getUrgencyMeta(t).label;
        if (urgencyLabel !== urgencyFilter.toLowerCase()) {
          return false;
        }
      }

      if (statusFilter) {
        const isClosed = Boolean(t.is_closed);
        const isResolved = Boolean(t.is_resolved) && !isClosed;
        const isAcknowledged =
          Boolean(t.is_acknowledged) && !isClosed && !Boolean(t.is_resolved);
        const isActive = !isClosed && !Boolean(t.is_resolved) && !Boolean(t.is_acknowledged);

        if (statusFilter === "closed" && !isClosed) return false;
        if (statusFilter === "resolved" && !isResolved) return false;
        if (statusFilter === "acknowledged" && !isAcknowledged) return false;
        if (statusFilter === "active" && !isActive) return false;
      }

      return true;
    });
  }, [tweets, locationFilter, categoryFilter, urgencyFilter, statusFilter]);

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
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 border-b border-slate-200 bg-white">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tweets..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="w-40 h-8 text-sm"
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
          className="w-40 h-8 text-sm"
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
          className="w-35 h-8 text-sm"
        >
          <option value="">All Urgency</option>
          <option value="non-urgent">non-urgent</option>
          <option value="potentially urgent">potentially urgent</option>
          <option value="likely urgent">likely urgent</option>
          <option value="urgent">urgent</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-35 h-8 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-slate-50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() }}>
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
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-slate-400">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 bg-white">
        <p className="text-xs text-slate-500">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} results
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-600 px-2">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
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
