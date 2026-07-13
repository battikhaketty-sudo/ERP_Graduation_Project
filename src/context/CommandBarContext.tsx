import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CommandAction = {
  id: string;
  label: string;
  keywords?: string[];
  group: "navigation" | "actions";
  onSelect: () => void;
};

type CommandBarContextValue = {
  registerActions: (actions: CommandAction[]) => () => void;
  pageActions: CommandAction[];
  open: () => void;
  close: () => void;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
};

const CommandBarContext = createContext<CommandBarContextValue | null>(null);

export function CommandBarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [pageActions, setPageActions] = useState<CommandAction[]>([]);

  const registerActions = useCallback((actions: CommandAction[]) => {
    setPageActions(actions);
    return () => setPageActions([]);
  }, []);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({
      registerActions,
      pageActions,
      open,
      close,
      isOpen,
      setOpen,
    }),
    [close, isOpen, open, pageActions, registerActions],
  );

  return (
    <CommandBarContext.Provider value={value}>{children}</CommandBarContext.Provider>
  );
}

export function useCommandBar() {
  const context = useContext(CommandBarContext);
  if (!context) {
    throw new Error("useCommandBar must be used within CommandBarProvider");
  }
  return context;
}

export function useRegisterCommandActions(actions: CommandAction[]) {
  const { registerActions } = useCommandBar();

  useEffect(() => registerActions(actions), [actions, registerActions]);
}
