import { addMessages, init, getLocaleFromNavigator, locale, waitLocale } from 'svelte-i18n';
import { browser } from '$app/environment';
import en from '../locales/en.json';
import es from '../locales/es.json';

addMessages('es', es);
addMessages('en', en);

export function inicializarI18n() {
  const idiomaGuardado = browser ? localStorage.getItem('idioma') : null;
  const idiomaNavegador = browser ? getLocaleFromNavigator()?.split('-')[0] : null;
  const idiomaInicial =
    idiomaGuardado === 'en' || idiomaGuardado === 'es'
      ? idiomaGuardado
      : idiomaNavegador === 'en'
        ? 'en'
        : 'es';

  return init({
    fallbackLocale: 'es',
    initialLocale: idiomaInicial,
  });
}

// Función para cambiar el idioma y guardarlo
export function cambiarIdioma(nuevoIdioma: 'es' | 'en') {
  locale.set(nuevoIdioma);
  if (browser) {
    localStorage.setItem('idioma', nuevoIdioma);
    document.documentElement.setAttribute('lang', nuevoIdioma);
  }
}

// Esperar a que las traducciones estén listas
export { waitLocale, locale };