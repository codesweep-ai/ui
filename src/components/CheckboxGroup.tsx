"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useState, useMemo } from "react";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { FormGroup } from "./FormGroup";

export interface CheckboxOption {
  /** Unique value identifier */
  value: string;
  /** Display label */
  label: string;
  /** Optional color dot rendered beside the label */
  color?: string;
  /** Optional group name — when set on any option, sections are rendered */
  group?: string;
  /** Disable this individual option */
  disabled?: boolean;
}

interface CheckboxGroupProps {
  /** Available options */
  options: CheckboxOption[];
  /** Currently selected values */
  selected: Set<string>;
  /** Called when selection changes */
  onChange: (selected: Set<string>) => void;
  /** Group label displayed above the checkboxes */
  label?: string;
  /** Optional grey helper text below the group. Added v1.3.0. */
  helper?: string;
  /** Optional red error message below the group (replaces helper). Added v1.3.0. */
  error?: string;
  /** Show a filter input to narrow visible options. Default: false */
  filterable?: boolean;
  /** Placeholder for the filter input */
  filterPlaceholder?: string;
  /** Disable the entire group */
  disabled?: boolean;
  /** Additional className on the root container */
  className?: string;
}

// ── Shared sub-components ─────────────────────────────────

function CheckboxItem({
  opt,
  checked,
  disabled,
  onToggle,
}: {
  opt: CheckboxOption;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        "cs-component-checkbox-group-5 ",
        "cs-component-checkbox-group-6 ",
        (disabled || opt.disabled) && "cs-component-checkbox-group-7 "
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={disabled || opt.disabled}
        className="cs-component-checkbox-group-9 "
      />
      {opt.color && (
        <span
          className="cs-component-checkbox-group-10 "
          style={{ backgroundColor: opt.color }}
        />
      )}
      <span className="cs-component-checkbox-group-11">{opt.label}</span>
    </label>
  );
}

function AllNoneButtons({
  allDisabled,
  noneDisabled,
  groupDisabled,
  onAll,
  onNone,
}: {
  allDisabled: boolean;
  noneDisabled: boolean;
  groupDisabled: boolean;
  onAll: () => void;
  onNone: () => void;
}) {
  const btnClass = cn(
    "cs-component-checkbox-group-12 ",
    "cs-component-checkbox-group-13 ",
    "cs-component-checkbox-group-14 ",
    "cs-component-checkbox-group-15 "
  );
  return (
    <div className="cs-component-checkbox-group-16 ">
      <button type="button" onClick={onAll} disabled={groupDisabled || allDisabled} className={btnClass}>
        All
      </button>
      <span className="cs-component-checkbox-group-18">|</span>
      <button type="button" onClick={onNone} disabled={groupDisabled || noneDisabled} className={btnClass}>
        None
      </button>
    </div>
  );
}

// ── Grouped layout ────────────────────────────────────────

interface GroupedSection {
  name: string;
  options: CheckboxOption[];
}

function GroupedLayout({
  sections,
  selected,
  disabled,
  onToggle,
}: {
  sections: GroupedSection[];
  selected: Set<string>;
  disabled: boolean;
  onToggle: (value: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const allCollapsed = sections.length > 0 && sections.every((s) => collapsed.has(s.name));
  const noneCollapsed = sections.every((s) => !collapsed.has(s.name));

  const toggleSection = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAllSections = () => {
    if (allCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(sections.map((s) => s.name)));
    }
  };

  return (
    <div className="cs-component-checkbox-group-20 ">
      <button
        type="button"
        onClick={toggleAllSections}
        className={cn(
          "cs-component-checkbox-group-12 ",
          "cs-component-checkbox-group-22 ",
          "cs-component-checkbox-group-14 "
        )}
      >
        {allCollapsed ? "Expand all" : noneCollapsed ? "Collapse all" : "Collapse all"}
      </button>
      {sections.map((section) => {
        const isCollapsed = collapsed.has(section.name);
        const sectionSelected = section.options.filter((o) => selected.has(o.value)).length;
        return (
          <div key={section.name} className="cs-component-checkbox-group-26 ">
            <button
              type="button"
              onClick={() => toggleSection(section.name)}
              className={cn(
                "cs-component-checkbox-group-28 ",
                "cs-component-checkbox-group-29 ",
                "text-label-upper",
                "cs-component-checkbox-group-31 ",
                "cs-component-checkbox-group-14 ",
                "cs-component-checkbox-group-32 "
              )}
            >
              {isCollapsed ? <ChevronRight className="cs-component-checkbox-group-33 " /> : <ChevronDown className="cs-component-checkbox-group-33 " />}
              <span className="cs-component-checkbox-group-34">{section.name}</span>
              <span className="cs-component-checkbox-group-35 ">
                {sectionSelected}/{section.options.length}
              </span>
            </button>
            {!isCollapsed && (
              <div className="cs-component-checkbox-group-36 ">
                {section.options.map((opt) => (
                  <CheckboxItem
                    key={opt.value}
                    opt={opt}
                    checked={selected.has(opt.value)}
                    disabled={disabled}
                    onToggle={() => onToggle(opt.value)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

function CheckboxGroupImpl({
  options,
  selected,
  onChange,
  label,
  helper,
  error,
  filterable = false,
  filterPlaceholder = "Filter...",
  disabled = false,
  className,
}: CheckboxGroupProps) {
  const [filter, setFilter] = useState("");

  const hasGroups = options.some((o) => o.group);

  const filteredOptions = useMemo(() => {
    if (!filter) return options;
    const lower = filter.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, filter]);

  const allFilteredSelected = filteredOptions.length > 0 && filteredOptions.every((o) => selected.has(o.value));
  const noneFilteredSelected = filteredOptions.every((o) => !selected.has(o.value));

  const handleSelectAll = () => {
    const next = new Set(selected);
    for (const o of filteredOptions) next.add(o.value);
    onChange(next);
  };

  const handleSelectNone = () => {
    const next = new Set(selected);
    for (const o of filteredOptions) next.delete(o.value);
    onChange(next);
  };

  const handleToggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  // Build grouped sections from filtered options (preserves insertion order)
  const sections = useMemo(() => {
    if (!hasGroups) return [];
    const map = new Map<string, CheckboxOption[]>();
    for (const o of filteredOptions) {
      const group = o.group ?? "Other";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(o);
    }
    return Array.from(map.entries()).map(([name, opts]) => ({ name, options: opts }));
  }, [filteredOptions, hasGroups]);

  return (
    <div
      data-component="CheckboxGroup"
      className={cn(
        "cs-component-checkbox-group-26 ",
        disabled && "cs-component-checkbox-group-41",
        className
      )}
    >
      <FormGroup label={label} helper={helper} error={error}>
        <div className="cs-component-checkbox-group-42 ">

      {filterable && (
        <div className="cs-component-checkbox-group-43">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={filterPlaceholder}
            disabled={disabled}
            className={cn(
              "cs-component-checkbox-group-45 ",
              "cs-component-checkbox-group-46 ",
              "cs-component-checkbox-group-47 ",
              "cs-component-checkbox-group-48",
              "cs-component-checkbox-group-49",
              "cs-component-checkbox-group-50 ",
              "cs-component-checkbox-group-51"
            )}
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter("")}
              className="cs-component-checkbox-group-54 "
              aria-label="Clear filter"
            >
              <X className="cs-component-checkbox-group-33 " />
            </button>
          )}
        </div>
      )}

      <AllNoneButtons
        allDisabled={allFilteredSelected}
        noneDisabled={noneFilteredSelected}
        groupDisabled={disabled}
        onAll={handleSelectAll}
        onNone={handleSelectNone}
      />

      {filteredOptions.length === 0 ? (
        <span className="cs-component-checkbox-group-56 ">
          No matches
        </span>
      ) : hasGroups ? (
        <GroupedLayout
          sections={sections}
          selected={selected}
          disabled={disabled}
          onToggle={handleToggle}
        />
      ) : (
        <div className="cs-component-checkbox-group-57 ">
          {filteredOptions.map((opt) => (
            <CheckboxItem
              key={opt.value}
              opt={opt}
              checked={selected.has(opt.value)}
              disabled={disabled}
              onToggle={() => handleToggle(opt.value)}
            />
          ))}
        </div>
      )}
        </div>
      </FormGroup>
    </div>
  );
}

export const CheckboxGroup = forwardRefToRoot<HTMLDivElement, CheckboxGroupProps>(CheckboxGroupImpl);
