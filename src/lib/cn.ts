type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassValue[]
  | { [className: string]: unknown };

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = [];
  const append = (value: ClassValue): void => {
    if (!value) return;
    if (typeof value === "string" || typeof value === "number") {
      classes.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(append);
    } else {
      for (const [className, enabled] of Object.entries(value)) {
        if (enabled) classes.push(className);
      }
    }
  };
  inputs.forEach(append);
  return classes.join(" ");
}
