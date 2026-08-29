import { createContext, useContext } from "react";

export interface CardGroupContextValue {
  maximizedId: string | null;
  toggle: (id: string) => void;
  /**
   * When true (default), cards flex to fill the group's height and scroll
   * internally (fixed-viewport dashboard). When false, cards take their
   * natural height and stack — the page scrolls instead. A maximized card
   * fills the viewport in either mode.
   */
  fill: boolean;
}

export const CardGroupContext = createContext<CardGroupContextValue | null>(null);

export function useCardGroup(): CardGroupContextValue | null {
  return useContext(CardGroupContext);
}
