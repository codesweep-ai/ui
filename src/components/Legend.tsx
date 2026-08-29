import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

export interface LegendItem {
  id: string;
  label: React.ReactNode;
  /** Design-token custom property, for example `--color-cat-1`. */
  color: `--${string}`;
  /** Swatch shape. Default `"dot"`. Use `"square"` when the legend describes a
   *  chart that paints square marks — a legend whose swatch does not match the
   *  mark it stands for makes the reader map colours by hand. */
  shape?: "dot" | "square";
}

interface LegendProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: LegendItem[];
  /** Active items for the interactive form. Defaults to all items. */
  selected?: Set<string>;
  /** Enables toggle buttons and receives the next active set. */
  onChange?: (selected: Set<string>) => void;
  extras?: React.ReactNode;
}

function Swatch({ id, color, shape = "dot" }: { id: string; color: `--${string}`; shape?: LegendItem["shape"] }) {
  return (
    <span
      data-legend-swatch={id}
      aria-hidden="true"
      className={cn("cs-component-legend-5", shape === "square" && "cs-component-legend-8")}
      style={{ backgroundColor: `var(${color})` }}
    />
  );
}

function LegendImpl({
  items,
  selected,
  onChange,
  extras,
  className,
  ...props
}: LegendProps) {
  const active = selected ?? new Set(items.map((item) => item.id));

  const toggle = (id: string) => {
    if (!onChange) return;
    const next = new Set(active);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  return (
    <div
      role="group"
      {...props}
      data-component="Legend"
      className={cn("cs-component-legend-1", className)}
    >
      <ul className="cs-component-legend-2">
        {items.map((item) => (
          <li key={item.id} className="cs-component-legend-3">
            {onChange ? (
              <button
                type="button"
                aria-pressed={active.has(item.id)}
                onClick={() => toggle(item.id)}
                className="cs-component-legend-4"
              >
                <Swatch id={item.id} color={item.color} shape={item.shape} />
                <span data-legend-label={item.id}>{item.label}</span>
              </button>
            ) : (
              <span className="cs-component-legend-6">
                <Swatch id={item.id} color={item.color} shape={item.shape} />
                <span data-legend-label={item.id}>{item.label}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
      {extras != null && <div className="cs-component-legend-7">{extras}</div>}
    </div>
  );
}

export const Legend = forwardRefToRoot<HTMLDivElement, LegendProps>(LegendImpl);
