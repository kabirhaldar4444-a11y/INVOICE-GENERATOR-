import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/**
 * Modern custom dropdown select.
 *
 * Props:
 *  value        – current value (must match one option's value)
 *  onChange     – (value) => void  — called with the raw option value
 *  options      – [{ value, label, meta? }]
 *  placeholder  – string shown when value is empty / not found
 *  required     – bool
 *  disabled     – bool
 *  size         – 'sm' | 'md' (default 'md')
 *  className    – extra classes on the wrapper
 */
const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  required = false,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  /* Close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setFocusedIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* Scroll focused item into view */
  useEffect(() => {
    if (open && listRef.current && focusedIdx >= 0) {
      const el = listRef.current.querySelectorAll('[data-option]')[focusedIdx];
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx, open]);

  const toggle = () => {
    if (disabled) return;
    setOpen((prev) => {
      if (!prev) {
        const idx = options.findIndex((o) => String(o.value) === String(value));
        setFocusedIdx(idx >= 0 ? idx : 0);
      }
      return !prev;
    });
  };

  const select = (optValue) => {
    onChange(optValue);
    setOpen(false);
    setFocusedIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setFocusedIdx(0);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIdx >= 0) select(options[focusedIdx].value);
        break;
      case 'Escape':
        setOpen(false);
        setFocusedIdx(-1);
        break;
      default:
        break;
    }
  };

  const pad = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm';
  const optPad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm';

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={[
          'w-full flex items-center justify-between gap-2 rounded-xl border transition-all duration-200 font-medium',
          pad,
          open
            ? 'border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-slate-800'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600',
          'text-slate-800 dark:text-slate-100',
          'focus:outline-none',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={selected ? '' : 'text-slate-400 dark:text-slate-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-primary-500' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={[
            'absolute z-50 w-full mt-1.5 rounded-xl border border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-850 shadow-xl shadow-slate-900/10 dark:shadow-slate-900/40',
            'backdrop-blur-sm overflow-hidden',
            'animate-dropdown-in',
          ].join(' ')}
          style={{ minWidth: '100%' }}
        >
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-52 overflow-y-auto py-1 custom-scrollbar"
          >
            {options.map((opt, idx) => {
              const isSelected = String(opt.value) === String(value);
              const isFocused = idx === focusedIdx;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  data-option
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onMouseLeave={() => setFocusedIdx(-1)}
                  onClick={() => select(opt.value)}
                  className={[
                    'flex items-center justify-between gap-2 cursor-pointer transition-colors duration-100 select-none',
                    optPad,
                    isFocused
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800',
                    isSelected ? 'font-semibold' : 'font-medium',
                  ].join(' ')}
                >
                  <span className="leading-snug">
                    {opt.label}
                    {opt.meta && (
                      <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                        {opt.meta}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary-500" />
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center">
                No options available
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
