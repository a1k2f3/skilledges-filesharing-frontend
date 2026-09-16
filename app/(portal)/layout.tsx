import { PortalProvider } from "@/components/portal-context";
import { PortalShell } from "@/components/portal-shell";

export default function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PortalProvider><PortalShell>{children}</PortalShell></PortalProvider>;
}