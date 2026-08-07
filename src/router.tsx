import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

type RouterValue = { path: string; navigate: (path: string, replace?: boolean) => void };
const RouterContext = createContext<RouterValue>({ path: location.pathname, navigate: () => undefined });

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const changed = () => setPath(location.pathname);
    addEventListener('popstate', changed);
    addEventListener('skc:navigate', changed);
    return () => { removeEventListener('popstate', changed); removeEventListener('skc:navigate', changed); };
  }, []);
  const navigate = (next: string, replace = false) => {
    if (replace) history.replaceState({}, '', next); else history.pushState({}, '', next);
    dispatchEvent(new Event('skc:navigate'));
  };
  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function usePath() { return useContext(RouterContext).path; }
export function useNavigate() { return useContext(RouterContext).navigate; }
export function useSlug() {
  const parts = usePath().split('/').filter(Boolean);
  return parts[0] === 'f' ? parts[1] || '' : parts[0] === 'forms' ? parts[1] || '' : '';
}

export function Link({ to, children, onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }) {
  const navigate = useNavigate();
  return <a href={to} {...props} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || props.target === '_blank' || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(to);
  }}>{children}</a>;
}
