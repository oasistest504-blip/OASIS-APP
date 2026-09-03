import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [eventoPrompt, setEventoPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [estaInstalada, setEstaInstalada] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [esAndroid, setEsAndroid] = useState(false);
  const [esMovil, setEsMovil] = useState(false);

  useEffect(() => {
    // 1. Detectar si la app ya está ejecutándose como PWA instalada
    const enStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://'));
    setEstaInstalada(enStandalone);

    // 2. Detectar dispositivos móviles (Android / iOS)
    if (typeof window !== 'undefined') {
      const agente = window.navigator.userAgent.toLowerCase();
      const esApple = /iphone|ipad|ipod/.test(agente);
      const esAndr = /android/.test(agente);
      const esDispositivoMovil = esApple || esAndr || /mobile|tablet/.test(agente);

      setEsIOS(esApple);
      setEsAndroid(esAndr);
      setEsMovil(esDispositivoMovil);
    }

    // 3. Escuchar el evento oficial del navegador para instalar
    const alCapturarPrompt = (e: Event) => {
      e.preventDefault();
      setEventoPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Escuchar cuando la app termine de instalarse
    const alInstalar = () => {
      setEstaInstalada(true);
      setEventoPrompt(null);
      try {
        localStorage.setItem('oasis_app_instalada', 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', alCapturarPrompt);
    window.addEventListener('appinstalled', alInstalar);

    return () => {
      window.removeEventListener('beforeinstallprompt', alCapturarPrompt);
      window.removeEventListener('appinstalled', alInstalar);
    };
  }, []);

  async function instalar(): Promise<boolean> {
    if (!eventoPrompt) return false;
    try {
      await eventoPrompt.prompt();
      const eleccion = await eventoPrompt.userChoice;
      if (eleccion.outcome === 'accepted') {
        setEstaInstalada(true);
        setEventoPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Error durante el proceso de instalación:', err);
    }
    return false;
  }

  return {
    puedeInstalar: !!eventoPrompt,
    estaInstalada,
    esIOS,
    esAndroid,
    esMovil,
    instalar,
  };
}
