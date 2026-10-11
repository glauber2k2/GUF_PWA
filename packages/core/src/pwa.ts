/**
 * Como instalar o app neste aparelho (puro e testável: recebe o que o navegador informa).
 * - "installed": já aberto pela tela inicial (display-mode standalone / navigator.standalone);
 * - "android-prompt": o navegador ofereceu o convite de instalação (beforeinstallprompt);
 * - "ios-safari": iPhone/iPad no Safari (instala por Compartilhar → Adicionar à Tela de Início);
 * - "ios-other-browser": iPhone/iPad em outro navegador (no iOS só o Safari instala);
 * - "unsupported": sem convite disponível (passo a passo genérico pelo menu do navegador).
 */
export type InstallPlatform = "installed" | "android-prompt" | "ios-safari" | "ios-other-browser" | "unsupported";

export interface InstallEnvironment {
  userAgent: string;
  /** Aberto como app instalado. */
  standalone: boolean;
  /** O navegador já entregou o evento beforeinstallprompt. */
  hasInstallPrompt: boolean;
  /** navigator.maxTouchPoints (iPad no modo "computador" se apresenta como Mac). */
  maxTouchPoints?: number;
}

/** Navegadores e apps que, no iOS, usam o WebKit mas não instalam PWA. */
const IOS_OTHER_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp/i;

export function isIos(userAgent: string, maxTouchPoints = 0): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}

export function installPlatform({ userAgent, standalone, hasInstallPrompt, maxTouchPoints = 0 }: InstallEnvironment): InstallPlatform {
  if (standalone) return "installed";
  if (hasInstallPrompt) return "android-prompt";
  if (isIos(userAgent, maxTouchPoints)) return IOS_OTHER_BROWSERS.test(userAgent) ? "ios-other-browser" : "ios-safari";
  return "unsupported";
}
