'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface ClientResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  clientRef: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

interface ClientSearchBoxProps {
  defaultValue?: string;
}

export function ClientSearchBox({ defaultValue = '' }: ClientSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState(defaultValue);
  const [results, setResults] = React.useState<ClientResult[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [highlightIdx, setHighlightIdx] = React.useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 200);

  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    fetch(`/api/clients/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setResults(json.data?.items ?? []);
          setShowDropdown(true);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && results[highlightIdx]) {
        selectClient(results[highlightIdx]);
      } else if (results.length === 1) {
        selectClient(results[0]);
      } else {
        // Fall back to server-side search
        router.push(`/clients?search=${encodeURIComponent(query)}`);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }

  function selectClient(client: ClientResult) {
    router.push(`/clients/${client.id}`);
    setShowDropdown(false);
    setQuery(`${client.firstName} ${client.lastName}`);
  }

  function handleBlur() {
    // Delay to allow click on dropdown item to register
    setTimeout(() => setShowDropdown(false), 150);
  }

  return (
    <div className="relative w-full sm:w-96">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlightIdx(-1);
          }}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Поиск клиентов: имя, email, телефон..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-onyx border border-border-luxury text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-champagne/30 focus:border-champagne/40 transition-all"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border border-champagne/40 border-t-champagne rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-obsidian border border-border-luxury rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto"
        >
          {results.map((client, idx) => (
            <button
              key={client.id}
              type="button"
              onMouseDown={() => selectClient(client)}
              className={`w-full text-left px-4 py-3 transition-colors border-b border-border-luxury/50 last:border-b-0 ${
                idx === highlightIdx ? 'bg-charcoal' : 'hover:bg-charcoal/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{client.email}</p>
                  {client.phone && (
                    <p className="text-xs text-text-tertiary">{client.phone}</p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-text-tertiary shrink-0 mt-0.5 bg-charcoal px-1.5 py-0.5 rounded">
                  {client.clientRef}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.trim() && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-obsidian border border-border-luxury rounded-xl shadow-2xl z-50 px-4 py-3">
          <p className="text-sm text-text-tertiary">Клиентов не найдено по запросу «{query}»</p>
        </div>
      )}
    </div>
  );
}
