export type Notification = {
  id: string;
  title: string;
  description: string;
  date: string;
  /** Seed/default; local overrides may change this at runtime. */
  read?: boolean;
};
