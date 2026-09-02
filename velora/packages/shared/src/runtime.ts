/**
 * Calisma anindaki ortam yapilandirmasini okur.
 *
 * Vite, VITE_* degiskenlerini derleme sirasinda JS paketine GOMER. Bu da
 * staging ile prod'un farkli artefaktlar olmasi demektir: "dev'de test ettigini
 * prod'a promote et" prensibi coker, cunku promote edilecek tek bir imaj yoktur.
 *
 * Cozum, adresleri paketten cikarip container acilisina tasimak. index.html,
 * paketten ONCE /config.js dosyasini yukler; o dosya window.__VELORA_CONFIG__
 * nesnesini yer tutucularla doldurur ve nginx acilirken envsubst ile gercek
 * degerleri yazar. Boylece ayni imaj her ortamda calisir.
 *
 * `pnpm dev` sirasinda envsubst hic calismaz; yer tutucular oldugu gibi kalir
 * ve asagidaki kontrol onlari yok sayarak import.meta.env'e duser.
 */

declare global {
  interface Window {
    __VELORA_CONFIG__?: Record<string, string>;
  }
}

/** Yer tutucular "__ADI__" bicimindedir; degistirilmemis olan deger sayilmaz. */
const isPlaceholder = (value: string) => value.startsWith('__') && value.endsWith('__');

export function runtimeValue(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const value = window.__VELORA_CONFIG__?.[key];
  if (!value || isPlaceholder(value)) return undefined;

  return value;
}
