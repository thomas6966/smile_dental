export const tg = window.Telegram?.WebApp;
export const isTelegram = Boolean(tg?.initData);

const safe = (fn) => {
  try {
    return fn();
  } catch {
    return undefined;
  }
};

const atLeast = (version) => Boolean(tg?.isVersionAtLeast?.(version));

export function initTelegram() {
  if (!tg) return;
  safe(() => tg.ready());
  safe(() => tg.expand());
  if (atLeast('6.1')) {
    safe(() => tg.setHeaderColor('#ffffff'));
    safe(() => tg.setBackgroundColor('#ffffff'));
  }
  if (atLeast('7.10')) safe(() => tg.setBottomBarColor('#ffffff'));
  if (atLeast('7.7')) safe(() => tg.disableVerticalSwipes());
}

export const haptic = {
  light: () => atLeast('6.1') && safe(() => tg.HapticFeedback.impactOccurred('light')),
  select: () => atLeast('6.1') && safe(() => tg.HapticFeedback.selectionChanged()),
  success: () => atLeast('6.1') && safe(() => tg.HapticFeedback.notificationOccurred('success')),
  error: () => atLeast('6.1') && safe(() => tg.HapticFeedback.notificationOccurred('error')),
};

export function setBackButton(visible, handler) {
  if (!tg || !atLeast('6.1')) return () => {};
  if (!visible) {
    safe(() => tg.BackButton.hide());
    return () => {};
  }
  safe(() => tg.BackButton.show());
  safe(() => tg.BackButton.onClick(handler));
  return () => safe(() => tg.BackButton.offClick(handler));
}

export function openLink(url) {
  if (isTelegram && atLeast('6.1')) {
    safe(() => tg.openLink(url));
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export function openTelegramLink(url) {
  if (isTelegram && atLeast('6.1')) {
    safe(() => tg.openTelegramLink(url));
    return;
  }
  window.open(url, '_blank', 'noopener');
}

export function closeApp() {
  if (isTelegram) safe(() => tg.close());
}

export function canRequestContact() {
  return isTelegram && atLeast('6.9');
}

export function requestContact() {
  return new Promise((resolve) => {
    if (!canRequestContact()) {
      resolve(false);
      return;
    }
    safe(() => tg.requestContact((shared) => resolve(Boolean(shared))));
  });
}

export function startPage() {
  const params = new URLSearchParams(window.location.search);
  return params.get('page') || tg?.initDataUnsafe?.start_param || '';
}

export function initData() {
  return tg?.initData || '';
}

export function telegramLanguage() {
  return tg?.initDataUnsafe?.user?.language_code || navigator.language || '';
}
