import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

const DISMISS_KEY = "sn_install_dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    let t;
    if (isIOS()) {
      t = setTimeout(() => setShow(true), 2500);
      setIosHint(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      data-testid="install-prompt"
      className="fixed z-[60] left-3 right-3 bottom-20 md:bottom-6 md:left-auto md:right-6 md:max-w-sm bg-white rounded-2xl border border-brand-line shadow-2xl p-4 fade-up"
    >
      <button onClick={dismiss} data-testid="install-dismiss" className="absolute top-2.5 right-2.5 p-1 text-brand-muted hover:text-brand-ink">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-4">
        <img src="/icons/icon-192.png" alt="Salud Nutrition" className="w-11 h-11 rounded-xl shrink-0" />
        <div className="min-w-0">
          <p className="font-serif font-bold text-brand-ink leading-tight">Instala Salud Nutrition</p>
          {iosHint && !deferred ? (
            <p className="text-xs text-brand-muted mt-1 leading-relaxed">
              Toca <Share className="w-3.5 h-3.5 inline -mt-0.5" /> <strong>Compartir</strong> y luego{" "}
              <strong>"Añadir a pantalla de inicio"</strong>.
            </p>
          ) : (
            <p className="text-xs text-brand-muted mt-1 leading-relaxed">Tenla en tu celular como una app y recibe recordatorios.</p>
          )}
        </div>
      </div>
      {deferred && (
        <button
          onClick={install}
          data-testid="install-accept"
          className="w-full mt-3 py-2.5 rounded-full bg-brand-green text-white font-semibold text-sm hover:bg-brand-greenHover transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Instalar app
        </button>
      )}
    </div>
  );
}
