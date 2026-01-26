import { useState, useEffect } from 'react';

export function useSearchAndFilter<T>(
  items: T[],
  searchFields: (keyof T)[],
  initialSearchTerm = '',
  debounceDelay = 300
) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceDelay]);

  // Filter items based on search term
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const filtered = items.filter(item => {
      return searchFields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(debouncedSearchTerm);
        }
        return false;
      });
    });

    setFilteredItems(filtered);
  }, [items, debouncedSearchTerm, searchFields]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    filteredItems,
  };
}

