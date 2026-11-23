import React from "react";

/**
 * Partner checkout must always open as our own full page, never inside
 * another site's frame. The Lovable editor preview is exempt.
 */
const isEditorPreview = () => {
  const h = window.location.hostname;
  return h.endsWith("lovable.app") && h.includes("preview") || h.endsWith("lovableproject.com") || h === "localhost";
};

const isFramed = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const NoFrameGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const framed = typeof window !== "undefined" && isFramed() && !isEditorPreview();

  React.useEffect(() => {
    if (!framed) return;
    try {
      window.top!.location.href = window.location.href;
    } catch {
      /* blocked by the outer site; the button below lets the customer continue */
    }
  }, [framed]);

  if (!framed) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Continue on Panda Protect</h1>
        <p className="text-sm text-muted-foreground">
          For your security, checkout opens on our own website.
        </p>
        <a
          href={window.location.href}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Open secure checkout
        </a>
      </div>
    </div>
  );
};

export default NoFrameGuard;
