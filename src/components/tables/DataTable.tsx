import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { TableSkeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  hidden?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  searchable?: boolean;
  filterComponent?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  actionsHeader?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder,
  searchable = true,
  filterComponent,
  emptyTitle,
  emptyDescription,
  onRowClick,
  rowsPerPageOptions = [10, 25, 50],
  defaultRowsPerPage = 10,
}: DataTableProps<T>) {
  const { t, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultRowsPerPage);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((col) => {
      map[col.key] = !col.hidden;
    });
    return map;
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();
    return data.filter((item) => {
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, search]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const activeCols = columns.filter((c) => visibleColumns[c.key] !== false);

  const PrevIcon = isRTL ? ChevronRight : ChevronLeft;
  const NextIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="bg-white border border-neutral-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-neutral-200 bg-neutral-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          {searchable && (
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder || t('common.search')}
                className="w-full h-8 ps-8 pe-3 text-xs bg-white border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
            </div>
          )}
          {filterComponent && <div className="flex items-center gap-2">{filterComponent}</div>}
        </div>

        {/* Column Visibility Selector */}
        <div className="relative flex items-center justify-end self-end md:self-auto gap-2">
          <button
            onClick={() => setShowColMenu(!showColMenu)}
            className="h-8 px-2.5 py-1 text-xs border border-neutral-300 rounded-md bg-white hover:bg-neutral-100 text-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Columns"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Columns</span>
          </button>

          {showColMenu && (
            <div className="absolute end-0 top-10 w-48 bg-white border border-neutral-200 rounded-md shadow-lg p-2 z-30 space-y-1 text-xs animate-in fade-in">
              <div className="font-semibold text-neutral-600 px-2 py-1 border-b border-neutral-100 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Toggle Columns
              </div>
              <div className="max-h-52 overflow-y-auto pt-1">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1 hover:bg-neutral-50 rounded cursor-pointer select-none text-neutral-700"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key] !== false}
                      onChange={(e) =>
                        setVisibleColumns((prev) => ({
                          ...prev,
                          [col.key]: e.target.checked,
                        }))
                      }
                      className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                    <span>{col.header}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="relative overflow-x-auto w-full">
        {isLoading ? (
          <TableSkeleton cols={activeCols.length || 5} />
        ) : paginatedData.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-100/75 border-b border-neutral-200 text-neutral-700 select-none">
                {activeCols.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      style={{ width: col.width }}
                      className={`py-2.5 px-3 font-semibold text-neutral-700 tracking-wider uppercase text-[11px] whitespace-nowrap ${
                        col.sortable !== false ? 'cursor-pointer hover:bg-neutral-200/50' : ''
                      } ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : isRTL
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'center' ? 'justify-center' : ''
                        }`}
                      >
                        <span>{col.header}</span>
                        {col.sortable !== false && (
                          <span className="text-neutral-400">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-orange-600" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-orange-600" />
                              )
                            ) : (
                              <ChevronsUpDown className="w-3 h-3 text-neutral-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {paginatedData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors hover:bg-neutral-50/80 ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {activeCols.map((col) => {
                    return (
                      <td
                        key={col.key}
                        className={`py-2.5 px-3 text-neutral-800 ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                            ? 'text-right'
                            : isRTL
                            ? 'text-right'
                            : 'text-left'
                        }`}
                      >
                        {col.render ? col.render(row, rowIdx) : row[col.key] ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!isLoading && sortedData.length > 0 && (
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <span>{t('common.showing')}</span>
            <span className="font-semibold text-neutral-900">
              {Math.min(sortedData.length, (currentPage - 1) * pageSize + 1)}
            </span>
            <span>{t('common.to')}</span>
            <span className="font-semibold text-neutral-900">
              {Math.min(sortedData.length, currentPage * pageSize)}
            </span>
            <span>{t('common.of')}</span>
            <span className="font-semibold text-neutral-900">{sortedData.length}</span>
            <span>{t('common.results')}</span>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="flex items-center gap-1.5">
              <span>{t('common.rowsPerPage')}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-7 px-1.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
              >
                {rowsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 w-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                <PrevIcon className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-neutral-700 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 w-7 rounded border border-neutral-300 bg-white flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                <NextIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
