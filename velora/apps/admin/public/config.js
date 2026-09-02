// Container acilisinda doldurulur (docker-entrypoint.d/10-velora-config.sh).
// Yer tutucular oldugu gibi kalirsa uygulama derleme anindaki
// varsayilanlara duser, bu yuzden `pnpm dev` de sorunsuz calisir.
window.__VELORA_CONFIG__ = {
  apiUrl: "__API_URL__",
  mediaOrigin: "__MEDIA_ORIGIN__",
  storefrontUrl: "__STOREFRONT_URL__"
};
