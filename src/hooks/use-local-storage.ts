import { useState, useEffect } from 'react';
// utils
import { localStorageAvailable } from 'src/utils/storage-available';

// ----------------------------------------------------------------------

export function useLocalStorage<ValueType>(key: string, defaultValue: ValueType) {
  const storageAvailable = localStorageAvailable();

  const [value, setValue] = useState(() => {
    let storedValue = storageAvailable ? localStorage.getItem(key) : null;

    if (storedValue) {
      try {
        if (storedValue === 'undefined' || !storedValue.trim()) return defaultValue;
        return JSON.parse(storedValue);
      } catch (error) {
        console.error('Error parsing localStorage key:', key, error);
        return defaultValue;
      }
    }

    return defaultValue;
  });

  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.storageArea === localStorage && e.key === key) {
        try {
          setValue(e.newValue ? JSON.parse(e.newValue) : e.newValue);
        } catch (error) {
          setValue(defaultValue);
        }
      }
    };
    window.addEventListener('storage', listener);

    return () => {
      window.removeEventListener('storage', listener);
    };
  }, [key, defaultValue]);

  const setValueInLocalStorage = (newValue: ValueType) => {
    setValue((currentValue: ValueType) => {
      const result = typeof newValue === 'function' ? newValue(currentValue) : newValue;

      if (storageAvailable) {
        localStorage.setItem(key, JSON.stringify(result));
      }

      return result;
    });
  };

  return [value, setValueInLocalStorage];
}
