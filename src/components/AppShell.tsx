import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  /** Optional group key — a separator is rendered between adjacent items with different groups. */
  group?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

interface HeaderProps {
  logoSrc?: string;
  title: string;
  titleHref?: string | null;
  navItems?: NavItem[];
  actions?: React.ReactNode;
  className?: string;
}

interface FooterProps {
  children?: React.ReactNode;
  className?: string;
}

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

function HeaderImpl({
  logoSrc,
  title,
  titleHref = null,
  navItems,
  actions,
  className,
}: HeaderProps) {
  const brand = logoSrc ? (
    <img src={logoSrc} alt={title} className="cs-component-app-shell-7 " />
  ) : (
    <span className="cs-component-app-shell-8 ">{title}</span>
  );

  return (
    <header
      data-component="Header"
      className={cn("cs-component-app-shell-3 ", className)}
    >
      <div className="cs-component-app-shell-4 ">
        {titleHref === null ? (
          <span className="cs-component-app-shell-6 ">{brand}</span>
        ) : (
          <a href={titleHref} className="cs-component-app-shell-6 ">
            {brand}
          </a>
        )}
        <nav role="navigation" aria-label="Main navigation">
          <div className="cs-component-app-shell-11 ">
            {navItems?.map((item, i) => {
              const prevGroup = i > 0 ? navItems[i - 1].group : undefined;
              const showSeparator = item.group && prevGroup && item.group !== prevGroup;
              return (
                <span key={item.href} className="cs-component-app-shell-12 ">
                  {showSeparator && (
                    <span
                      className="cs-component-app-shell-13 "
                      aria-hidden="true"
                    />
                  )}
                  <a
                    data-header-nav-link={item.href}
                    href={item.href}
                    aria-current={item.active ? "page" : undefined}
                    className={cn(
                      "cs-component-app-shell-16 ",
                      item.active
                        ? "cs-component-app-shell-17 "
                        : "cs-component-app-shell-18 "
                    )}
                    onClick={
                      item.onClick
                        ? (e) => {
                            e.preventDefault();
                            item.onClick?.(e);
                          }
                        : undefined
                    }
                  >
                    {item.label}
                  </a>
                </span>
              );
            })}
            {actions}
          </div>
        </nav>
      </div>
    </header>
  );
}

function FooterImpl({ children, className }: FooterProps) {
  return (
    <footer
      data-component="Footer"
      className={cn("cs-component-app-shell-20 ", className)}
    >
      {children}
    </footer>
  );
}

function AppShellImpl({ children, className }: AppShellProps) {
  return (
    <div
      data-component="AppShell"
      className={cn("cs-component-app-shell-24 ", className)}
    >
      {children}
    </div>
  );
}

export const Header = forwardRefToRoot<HTMLElement, HeaderProps>(HeaderImpl);
export const Footer = forwardRefToRoot<HTMLElement, FooterProps>(FooterImpl);
export const AppShell = forwardRefToRoot<HTMLDivElement, AppShellProps>(AppShellImpl);
