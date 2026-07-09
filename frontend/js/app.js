/**
 * Broschüren-Mediathek – Kiosk Frontend
 */
(function () {
  'use strict';

  /** Öffentliche Projekt-Version (Fußzeile, Releases) */
  const RELEASE_VERSION = '1.3.9';
  /** Cache-Busting für statische Assets */
  const APP_VERSION = '34';
  const CSS_VERSION = '41';
  const PDF_JS_BASE = '/js/vendor/';
  const ALL_LANGS = ['de', 'en', 'nl', 'fr', 'it', 'pl', 'hu', 'ro', 'dk', 'no', 'se', 'tr'];
  const EU_LANGUAGE_URLS = {
    de: 'https://www.amada.eu/de-de/produkte/broschueren-mediathek/',
    en: 'https://www.amada.eu/de-en/products/amada-brochures-library/',
    nl: 'https://www.amada.eu/nl-nl/producten/brochure-bibliotheek/',
    fr: 'https://www.amada.eu/fr-fr/produits/bibliotheque-de-brochures/',
    it: 'https://www.amada.eu/it-it/prodotti/archivio-brochure/',
    pl: 'https://www.amada.eu/pl-pl/produkty/biblioteka-broszur/',
    hu: 'https://www.amada.eu/hu-hu/termekek/kiadvany-koenyvtar/',
    ro: 'https://www.amada.eu/ro-ro/produse/biblioteca-de-brosuri/',
    dk: 'https://www.amada.eu/dk-dk/produkter/brochurebibliotek/',
    no: 'https://www.amada.eu/no-no/produkter/brosjyrebibliotek/',
    se: 'https://www.amada.eu/se-se/produkter/broschyr-mediabibliotek/',
    tr: 'https://www.amada.eu/tr-tr/ueruenler/brosuer-kuetuephanesi/',
  };
  /** Link-Tabelle: Original-PDFs auf der Zielwebsite (DE primär, EN/NL optional) */
  const TABLE_LINK_LANGS = ['de', 'en', 'nl'];
  const VIEW_MODE_KEY = 'mediathek_view_mode';
  const ENABLED_LANGS_KEY = 'mediathek_enabled_langs';
  const DEFAULT_ENABLED_LANGS = ['de', 'en', 'nl'];
  const LANG_FLAGS = {
    de: '🇩🇪', en: '🇬🇧', nl: '🇳🇱', fr: '🇫🇷', it: '🇮🇹', pl: '🇵🇱', hu: '🇭🇺',
    dk: '🇩🇰', no: '🇳🇴',
    ro: '🇷🇴', se: '🇸🇪', tr: '🇹🇷',
  };

  const I18N = {
    de: {
      loading: 'Broschüren werden geladen …',
      title: 'Broschüren-Mediathek',
      subtitle: 'Berühren zum Auswählen',
      search: 'Broschüre suchen …',
      all_categories: 'Alle',
      tab_viewer: 'Ansehen',
      tab_qr: 'QR-Code',
      download: 'PDF herunterladen',
      qr_hint: 'Scannen Sie den Code, um die Broschüre auf der Website des Anbieters zu öffnen.',
      qr_unavailable: 'Original-Link nicht verfügbar – bitte nach dem nächsten Sync erneut versuchen.',
      empty: 'Keine Broschüren verfügbar. Sync läuft …',
      no_results: 'Keine Treffer',
      sync_label: 'Aktualisiert',
      lang_unavailable: 'In dieser Sprache nicht verfügbar',
      pdf_loading: 'PDF wird geladen …',
      pdf_error: 'PDF konnte nicht geladen werden',
      screensaver_hint: 'Berühren zum Fortfahren',
      copy_link: 'Original-Link kopieren',
      copy_ok: 'Link kopiert',
      copy_fail: 'Kopieren fehlgeschlagen',
      copy_unavailable: 'Kein Original-Link verfügbar',
      scroll_hint: 'Nach unten wischen für weitere Broschüren',
      scroll_up: 'Nach oben scrollen',
      scroll_down: 'Nach unten scrollen',
      view_grid: 'Kacheln',
      view_table: 'Link-Tabelle',
      col_product: 'Produkt',
      col_technology: 'Technologie',
      col_link_de: 'Link DE',
      col_link_en: 'Link EN',
      col_link_nl: 'Link NL',
      copy_short: 'Link kopieren',
      link_missing: '—',
      table_empty: 'Keine Original-Links für die Auswahl.',
      lang_config_btn: 'Sprachen',
      lang_config_title: 'Sprachen verwalten',
      lang_config_note: 'Sprache aktivieren/deaktivieren. Quelle je Sprache ist fest auf AMADA EU hinterlegt.',
      lang_config_save: 'Speichern',
      lang_switcher_label: 'Sprache wählen',
    },
    en: {
      loading: 'Loading brochures …',
      title: 'Brochures Library',
      subtitle: 'Touch to select',
      search: 'Search brochure …',
      all_categories: 'All',
      tab_viewer: 'View',
      tab_qr: 'QR Code',
      download: 'Download PDF',
      qr_hint: 'Scan the code to open the brochure on the publisher website.',
      qr_unavailable: 'Original link unavailable – please try again after the next sync.',
      empty: 'No brochures available. Sync in progress …',
      no_results: 'No results',
      sync_label: 'Updated',
      lang_unavailable: 'Not available in this language',
      pdf_loading: 'Loading PDF …',
      pdf_error: 'Could not load PDF',
      screensaver_hint: 'Touch to continue',
      copy_link: 'Copy original link',
      copy_ok: 'Link copied',
      copy_fail: 'Copy failed',
      copy_unavailable: 'No original link available',
      scroll_hint: 'Swipe down for more brochures',
      scroll_up: 'Scroll up',
      scroll_down: 'Scroll down',
      view_grid: 'Tiles',
      view_table: 'Link table',
      col_product: 'Product',
      col_technology: 'Technology',
      col_link_de: 'Link DE',
      col_link_en: 'Link EN',
      col_link_nl: 'Link NL',
      copy_short: 'Copy link',
      link_missing: '—',
      table_empty: 'No original links for this filter.',
      lang_config_btn: 'Languages',
      lang_config_title: 'Manage languages',
      lang_config_note: 'Enable/disable languages. Each language source is fixed to AMADA EU.',
      lang_config_save: 'Save',
      lang_switcher_label: 'Choose language',
    },
    nl: {
      loading: 'Brochures laden …',
      title: 'Brochurebibliotheek',
      subtitle: 'Tik om te selecteren',
      search: 'Brochure zoeken …',
      all_categories: 'Alle',
      tab_viewer: 'Bekijken',
      tab_qr: 'QR-code',
      download: 'PDF downloaden',
      qr_hint: 'Scan de code om de brochure op de website van de aanbieder te openen.',
      qr_unavailable: 'Originele link niet beschikbaar – probeer het na de volgende sync opnieuw.',
      empty: 'Geen brochures beschikbaar. Synchronisatie bezig …',
      no_results: 'Geen resultaten',
      sync_label: 'Bijgewerkt',
      lang_unavailable: 'Niet beschikbaar in deze taal',
      screensaver_hint: 'Tik om verder te gaan',
      copy_link: 'Originele link kopiëren',
      copy_ok: 'Link gekopieerd',
      copy_fail: 'Kopiëren mislukt',
      copy_unavailable: 'Geen originele link beschikbaar',
      scroll_hint: 'Veeg omlaag voor meer brochures',
      scroll_up: 'Omhoog',
      scroll_down: 'Omlaag',
      lang_config_btn: 'Talen',
      lang_config_title: 'Talen beheren',
      lang_config_note: 'Taal in-/uitschakelen. Elke taalbron is vast ingesteld op AMADA EU.',
      lang_config_save: 'Opslaan',
      lang_switcher_label: 'Taal kiezen',
    },
    fr: {
      loading: 'Chargement des brochures …',
      title: 'Bibliothèque de brochures',
      subtitle: 'Toucher pour sélectionner',
      search: 'Rechercher une brochure …',
      all_categories: 'Toutes',
      tab_viewer: 'Voir',
      tab_qr: 'Code QR',
      download: 'Télécharger le PDF',
      qr_hint: 'Scannez le code pour ouvrir la brochure sur le site de l\'éditeur.',
      qr_unavailable: 'Lien original indisponible – réessayez après la prochaine synchronisation.',
      empty: 'Aucune brochure disponible. Synchronisation en cours …',
      no_results: 'Aucun résultat',
      sync_label: 'Mis à jour',
      lang_unavailable: 'Non disponible dans cette langue',
      screensaver_hint: 'Toucher pour continuer',
      copy_link: 'Copier le lien original',
      copy_ok: 'Lien copié',
      copy_fail: 'Échec de la copie',
      copy_unavailable: 'Aucun lien original disponible',
      scroll_hint: 'Faites défiler vers le bas pour plus de brochures',
      scroll_up: 'Défiler vers le haut',
      scroll_down: 'Défiler vers le bas',
      lang_config_btn: 'Langues',
      lang_config_title: 'Gérer les langues',
      lang_config_note: 'Activer/désactiver les langues. Chaque source est fixée sur AMADA EU.',
      lang_config_save: 'Enregistrer',
      lang_switcher_label: 'Choisir la langue',
    },
    it: {
      loading: 'Caricamento brochure …',
      title: 'Archivio brochure',
      subtitle: 'Tocca per selezionare',
      search: 'Cerca brochure …',
      all_categories: 'Tutte',
      tab_viewer: 'Visualizza',
      tab_qr: 'Codice QR',
      download: 'Scarica PDF',
      qr_hint: 'Scansiona il codice per aprire la brochure sul sito dell\'editore.',
      qr_unavailable: 'Link originale non disponibile – riprovare dopo la prossima sincronizzazione.',
      empty: 'Nessuna brochure disponibile. Sincronizzazione in corso …',
      no_results: 'Nessun risultato',
      sync_label: 'Aggiornato',
      lang_unavailable: 'Non disponibile in questa lingua',
      screensaver_hint: 'Tocca per continuare',
      copy_link: 'Copia link originale',
      copy_ok: 'Link copiato',
      copy_fail: 'Copia non riuscita',
      copy_unavailable: 'Nessun link originale disponibile',
      scroll_hint: 'Scorri verso il basso per altre brochure',
      scroll_up: 'Scorri in alto',
      scroll_down: 'Scorri in basso',
      lang_config_btn: 'Lingue',
      lang_config_title: 'Gestisci lingue',
      lang_config_note: 'Attiva/disattiva le lingue. Ogni sorgente è fissata su AMADA EU.',
      lang_config_save: 'Salva',
      lang_switcher_label: 'Scegli la lingua',
    },
    pl: {
      loading: 'Ładowanie broszur …',
      title: 'Biblioteka broszur',
      subtitle: 'Dotknij, aby wybrać',
      search: 'Szukaj broszury …',
      all_categories: 'Wszystkie',
      tab_viewer: 'Podgląd',
      tab_qr: 'Kod QR',
      download: 'Pobierz PDF',
      qr_hint: 'Zeskanuj kod, aby otworzyć broszurę na stronie wydawcy.',
      qr_unavailable: 'Link oryginalny niedostępny – spróbuj ponownie po następnej synchronizacji.',
      empty: 'Brak broszur. Trwa synchronizacja …',
      no_results: 'Brak wyników',
      sync_label: 'Zaktualizowano',
      lang_unavailable: 'Niedostępne w tym języku',
      screensaver_hint: 'Dotknij, aby kontynuować',
      copy_link: 'Kopiuj link oryginalny',
      copy_ok: 'Link skopiowany',
      copy_fail: 'Kopiowanie nie powiodło się',
      copy_unavailable: 'Brak linku oryginalnego',
      scroll_hint: 'Przesuń w dół, aby zobaczyć więcej broszur',
      scroll_up: 'Przewiń w górę',
      scroll_down: 'Przewiń w dół',
      lang_config_btn: 'Języki',
      lang_config_title: 'Zarządzaj językami',
      lang_config_note: 'Włącz/wyłącz języki. Każde źródło jest ustawione na AMADA EU.',
      lang_config_save: 'Zapisz',
      lang_switcher_label: 'Wybierz język',
    },
    hu: {
      loading: 'Brochúrák betöltése …',
      title: 'Kiadvány könyvtár',
      subtitle: 'Érintse meg a kiválasztáshoz',
      search: 'Brochúra keresése …',
      all_categories: 'Összes',
      tab_viewer: 'Megtekintés',
      tab_qr: 'QR-kód',
      download: 'PDF letöltése',
      qr_hint: 'Olvassa be a kódot a brosúra megnyitásához a kiadó weboldalán.',
      qr_unavailable: 'Az eredeti link nem elérhető – próbálja újra a következő szinkronizálás után.',
      empty: 'Nincs elérhető brosúra. Szinkronizálás …',
      no_results: 'Nincs találat',
      sync_label: 'Frissítve',
      lang_unavailable: 'Ezen a nyelven nem elérhető',
      screensaver_hint: 'Érintse meg a folytatáshoz',
      copy_link: 'Eredeti link másolása',
      copy_ok: 'Link másolva',
      copy_fail: 'Másolás sikertelen',
      copy_unavailable: 'Nincs eredeti link',
      scroll_hint: 'Görgessen lefelé további brosúrákhoz',
      scroll_up: 'Görgetés fel',
      scroll_down: 'Görgetés le',
      lang_config_btn: 'Nyelvek',
      lang_config_title: 'Nyelvek kezelése',
      lang_config_note: 'Nyelvek engedélyezése/letiltása. Minden forrás az AMADA EU-hoz van kötve.',
      lang_config_save: 'Mentés',
      lang_switcher_label: 'Nyelv kiválasztása',
    },
    ro: {
      loading: 'Broșurile se încarcă …',
      title: 'Biblioteca de broșuri',
      subtitle: 'Atingeți pentru a selecta',
      search: 'Căutați broșura …',
      all_categories: 'Toate',
      tab_viewer: 'Vizualizare',
      tab_qr: 'Cod QR',
      download: 'Descărcați PDF',
      qr_hint: 'Scanați codul pentru a deschide broșura pe site-ul furnizorului.',
      qr_unavailable: 'Link original indisponibil – încercați din nou după următoarea sincronizare.',
      empty: 'Nicio broșură disponibilă. Sincronizare în curs …',
      no_results: 'Niciun rezultat',
      sync_label: 'Actualizat',
      lang_unavailable: 'Indisponibil în această limbă',
      pdf_loading: 'PDF se încarcă …',
      pdf_error: 'PDF-ul nu a putut fi încărcat',
      screensaver_hint: 'Atingeți pentru a continua',
      copy_link: 'Copiază linkul original',
      copy_ok: 'Link copiat',
      copy_fail: 'Copiere eșuată',
      copy_unavailable: 'Niciun link original disponibil',
      scroll_hint: 'Glisați în jos pentru mai multe broșuri',
      scroll_up: 'Derulați în sus',
      scroll_down: 'Derulați în jos',
      lang_config_btn: 'Limbi',
      lang_config_title: 'Gestionare limbi',
      lang_config_note: 'Activați/dezactivați limbile. Fiecare sursă este fixată pe AMADA EU.',
      lang_config_save: 'Salvare',
      lang_switcher_label: 'Alege limba',
    },
    dk: {
      loading: 'Brochurer indlæses …',
      title: 'Brochurebibliotek',
      subtitle: 'Tryk for at vælge',
      search: 'Søg brochure …',
      all_categories: 'Alle',
      tab_viewer: 'Vis',
      tab_qr: 'QR-kode',
      download: 'Download PDF',
      qr_hint: 'Scan koden for at åbne brochuren på udgiverens website.',
      qr_unavailable: 'Originalt link er ikke tilgængeligt – prøv igen efter næste synkronisering.',
      empty: 'Ingen brochurer tilgængelige. Synkronisering kører …',
      no_results: 'Ingen resultater',
      sync_label: 'Opdateret',
      lang_unavailable: 'Ikke tilgængelig på dette sprog',
      pdf_loading: 'PDF indlæses …',
      pdf_error: 'PDF kunne ikke indlæses',
      screensaver_hint: 'Tryk for at fortsætte',
      copy_link: 'Kopiér originalt link',
      copy_ok: 'Link kopieret',
      copy_fail: 'Kopiering mislykkedes',
      copy_unavailable: 'Intet originalt link tilgængeligt',
      scroll_hint: 'Swipe ned for flere brochurer',
      scroll_up: 'Rul op',
      scroll_down: 'Rul ned',
      lang_config_btn: 'Sprog',
      lang_config_title: 'Administrer sprog',
      lang_config_note: 'Aktiver/deaktiver sprog. Hver kilde er sat til AMADA EU.',
      lang_config_save: 'Gem',
      lang_switcher_label: 'Vælg sprog',
    },
    no: {
      loading: 'Laster brosjyrer …',
      title: 'Brosjyrebibliotek',
      subtitle: 'Trykk for å velge',
      search: 'Søk brosjyre …',
      all_categories: 'Alle',
      tab_viewer: 'Vis',
      tab_qr: 'QR-kode',
      download: 'Last ned PDF',
      qr_hint: 'Skann koden for å åpne brosjyren på utgiverens nettsted.',
      qr_unavailable: 'Original lenke er ikke tilgjengelig – prøv igjen etter neste synkronisering.',
      empty: 'Ingen brosjyrer tilgjengelig. Synkronisering pågår …',
      no_results: 'Ingen treff',
      sync_label: 'Oppdatert',
      lang_unavailable: 'Ikke tilgjengelig på dette språket',
      pdf_loading: 'Laster PDF …',
      pdf_error: 'PDF kunne ikke lastes',
      screensaver_hint: 'Trykk for å fortsette',
      copy_link: 'Kopier original lenke',
      copy_ok: 'Lenke kopiert',
      copy_fail: 'Kopiering feilet',
      copy_unavailable: 'Ingen original lenke tilgjengelig',
      scroll_hint: 'Sveip ned for flere brosjyrer',
      scroll_up: 'Rull opp',
      scroll_down: 'Rull ned',
      lang_config_btn: 'Språk',
      lang_config_title: 'Administrer språk',
      lang_config_note: 'Aktiver/deaktiver språk. Hver kilde er satt til AMADA EU.',
      lang_config_save: 'Lagre',
      lang_switcher_label: 'Velg språk',
    },
    se: {
      loading: 'Laddar broschyrer …',
      title: 'Broschyr mediabibliotek',
      subtitle: 'Tryck för att välja',
      search: 'Sök broschyr …',
      all_categories: 'Alla',
      tab_viewer: 'Visa',
      tab_qr: 'QR-kod',
      download: 'Ladda ned PDF',
      qr_hint: 'Skanna koden för att öppna broschyren på utgivarens webbplats.',
      qr_unavailable: 'Original-länk ej tillgänglig – försök igen efter nästa synk.',
      empty: 'Inga broschyrer tillgängliga. Synkronisering pågår …',
      no_results: 'Inga träffar',
      sync_label: 'Uppdaterad',
      lang_unavailable: 'Ej tillgänglig på detta språk',
      pdf_loading: 'Laddar PDF …',
      pdf_error: 'PDF kunde inte laddas',
      screensaver_hint: 'Tryck för att fortsätta',
      copy_link: 'Kopiera originallänk',
      copy_ok: 'Länk kopierad',
      copy_fail: 'Kopiering misslyckades',
      copy_unavailable: 'Ingen originallänk tillgänglig',
      scroll_hint: 'Svep nedåt för fler broschyrer',
      scroll_up: 'Scrolla upp',
      scroll_down: 'Scrolla ner',
      lang_config_btn: 'Språk',
      lang_config_title: 'Hantera språk',
      lang_config_note: 'Aktivera/inaktivera språk. Varje källa är inställd på AMADA EU.',
      lang_config_save: 'Spara',
      lang_switcher_label: 'Välj språk',
    },
    tr: {
      loading: 'Broşürler yükleniyor …',
      title: 'Broşür kütüphanesi',
      subtitle: 'Seçmek için dokunun',
      search: 'Broşür ara …',
      all_categories: 'Tümü',
      tab_viewer: 'Görüntüle',
      tab_qr: 'QR Kod',
      download: 'PDF indir',
      qr_hint: 'Broşürü yayıncının web sitesinde açmak için kodu tarayın.',
      qr_unavailable: 'Orijinal bağlantı kullanılamıyor – bir sonraki senkronizasyondan sonra tekrar deneyin.',
      empty: 'Broşür yok. Senkronizasyon devam ediyor …',
      no_results: 'Sonuç yok',
      sync_label: 'Güncellendi',
      lang_unavailable: 'Bu dilde mevcut değil',
      pdf_loading: 'PDF yükleniyor …',
      pdf_error: 'PDF yüklenemedi',
      screensaver_hint: 'Devam etmek için dokunun',
      copy_link: 'Orijinal bağlantıyı kopyala',
      copy_ok: 'Bağlantı kopyalandı',
      copy_fail: 'Kopyalama başarısız',
      copy_unavailable: 'Orijinal bağlantı yok',
      scroll_hint: 'Daha fazla broşür için aşağı kaydırın',
      scroll_up: 'Yukarı kaydır',
      scroll_down: 'Aşağı kaydır',
      lang_config_btn: 'Diller',
      lang_config_title: 'Dilleri yönet',
      lang_config_note: 'Dilleri etkinleştir/devre dışı bırak. Her kaynak AMADA EU olarak ayarlanmıştır.',
      lang_config_save: 'Kaydet',
      lang_switcher_label: 'Dil seçin',
    },
  };

  const LOCALE_MAP = {
    de: 'de-DE', en: 'en-GB', nl: 'nl-NL', fr: 'fr-FR', it: 'it-IT', pl: 'pl-PL', hu: 'hu-HU',
    dk: 'da-DK', no: 'nb-NO',
    ro: 'ro-RO', se: 'sv-SE', tr: 'tr-TR',
  };

  function detectInitialLang() {
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang) return urlLang.toLowerCase().slice(0, 2);
    const browserLang = (navigator.language || 'en').toLowerCase().slice(0, 2);
    if (browserLang === 'sv') return 'se';
    if (ALL_LANGS.includes(browserLang)) return browserLang;
    return 'en';
  }

  const state = {
    uiLang: detectInitialLang(),
    category: 'all',
    search: '',
    manifest: null,
    selectedBrochure: null,
    selectedPdfLang: null,
    qrInstance: null,
    pdfObjectUrl: null,
    branding: {
      companyName: '',
      logoUrl: '/assets/AMADA_80th_logo_White.svg',
    },
    viewMode: 'grid',
    screensaver: {
      enabled: false,
      timeoutMs: 5 * 60 * 1000,
      videoUrl: '',
      timer: null,
      active: false,
    },
    pdfView: {
      pageMode: 'single',
    },
    pdfRenderToken: 0,
    availableLangs: [],
    enabledLangs: [],
    touchLayout: false,
  };

  function getActiveLangs() {
    const available = state.availableLangs.length ? state.availableLangs : ALL_LANGS;
    if (!state.enabledLangs.length) return available;
    const enabled = available.filter((lang) => state.enabledLangs.includes(lang));
    return enabled.length ? enabled : [available[0]];
  }

  function applyActiveLangs(langs) {
    if (Array.isArray(langs) && langs.length) {
      state.availableLangs = langs.filter((l) => ALL_LANGS.includes(l));
    } else {
      state.availableLangs = [...ALL_LANGS];
    }
    if (!state.enabledLangs.length) {
      const defaults = DEFAULT_ENABLED_LANGS.filter((lang) => state.availableLangs.includes(lang));
      state.enabledLangs = defaults.length ? defaults : [state.availableLangs[0]];
    } else {
      state.enabledLangs = state.enabledLangs.filter((lang) => state.availableLangs.includes(lang));
      if (!state.enabledLangs.length && state.availableLangs.length) {
        const defaults = DEFAULT_ENABLED_LANGS.filter((lang) => state.availableLangs.includes(lang));
        state.enabledLangs = defaults.length ? defaults : [state.availableLangs[0]];
      }
    }
    if (!getActiveLangs().includes(state.uiLang)) {
      state.uiLang = getActiveLangs()[0] || 'en';
    }
  }

  function loadEnabledLangPreferences() {
    try {
      const raw = localStorage.getItem(ENABLED_LANGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.enabledLangs = parsed.filter((lang) => ALL_LANGS.includes(lang));
      }
    } catch (_) { /* ignore */ }
  }

  function saveEnabledLangPreferences() {
    try {
      localStorage.setItem(ENABLED_LANGS_KEY, JSON.stringify(state.enabledLangs));
    } catch (_) { /* ignore */ }
  }

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let toastTimer = null;

  function t(key) {
    return (I18N[state.uiLang] || I18N.en)[key] || key;
  }

  function applyI18n() {
    $$('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (key) el.textContent = t(key);
    });
    $$('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    $$('[data-i18n-aria]').forEach((el) => {
      const key = el.dataset.i18nAria;
      if (key) el.setAttribute('aria-label', t(key));
    });
    const copyBtn = $('#modal-copy-link');
    if (copyBtn) {
      copyBtn.setAttribute('aria-label', t('copy_link'));
      copyBtn.title = t('copy_link');
      const label = copyBtn.querySelector('[data-i18n="copy_link"]');
      if (label) label.textContent = t('copy_link');
    }
    const lcOpen = $('#lang-config-open');
    if (lcOpen) lcOpen.textContent = t('lang_config_btn');
    const lcTitle = $('#lang-config-title');
    if (lcTitle) lcTitle.textContent = t('lang_config_title');
    const lcNote = $('.lang-config-note');
    if (lcNote) lcNote.textContent = t('lang_config_note');
    const lcSave = $('#lang-config-save');
    if (lcSave) lcSave.textContent = t('lang_config_save');
    const langSwitcher = $('#lang-switcher');
    if (langSwitcher) langSwitcher.setAttribute('aria-label', t('lang_switcher_label'));
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('copy failed');
  }

  function resolveModalSourceUrl(brochure, lang) {
    return resolveSourceUrl(brochure, { strict: true, lang })
      || resolveSourceUrl(brochure, { lang });
  }

  function updateModalEuLink(brochure, lang) {
    const urlEl = $('#qr-url');
    const copyBtn = $('#modal-copy-link');
    const rawUrl = resolveModalSourceUrl(brochure, lang);
    const qrUrl = rawUrl && isSafeHttpUrl(rawUrl) ? rawUrl : null;

    if (qrUrl) {
      urlEl.textContent = qrUrl;
      urlEl.classList.remove('is-empty');
      if (copyBtn) copyBtn.disabled = false;
      renderQr(qrUrl);
    } else {
      urlEl.textContent = t('qr_unavailable');
      urlEl.classList.add('is-empty');
      if (copyBtn) copyBtn.disabled = true;
      $('#qrcode').innerHTML = '';
      state.qrInstance = null;
    }
  }

  async function copyModalSourceUrl() {
    const brochure = state.selectedBrochure;
    const lang = state.selectedPdfLang || state.uiLang;
    const btn = $('#modal-copy-link');
    const url = brochure ? resolveModalSourceUrl(brochure, lang) : null;
    if (!url) {
      showToast(t('copy_unavailable'));
      return;
    }
    try {
      await copyTextToClipboard(url);
      if (btn) {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      }
      showToast(t('copy_ok'));
    } catch (_) {
      showToast(t('copy_fail'));
    }
  }

  function isTouchLayoutActive() {
    if (state.touchLayout) return true;
    return window.matchMedia('(orientation: portrait)').matches
      || window.matchMedia('(max-aspect-ratio: 1/1)').matches
      || window.innerHeight > window.innerWidth * 1.02;
  }

  function getKioskMain() {
    return document.querySelector('.kiosk-main');
  }

  function setScrollRailVisible(rail, touch) {
    if (!rail) return;
    rail.classList.toggle('hidden', !touch);
    rail.setAttribute('aria-hidden', touch ? 'false' : 'true');
  }

  function updatePortraitLayout() {
    document.body.classList.toggle('layout-touch', state.touchLayout);
    const touch = isTouchLayoutActive();
    setScrollRailVisible($('#kiosk-scroll-rail'), touch);
    setScrollRailVisible($('#pdf-scroll-rail'), touch);
    updateScrollHint();
    updateScrollButtons();
    updatePdfScrollButtons();
  }

  function updateScrollHint() {
    const hint = $('#scroll-hint');
    const main = getKioskMain();
    if (!hint || !main) return;
    const touch = isTouchLayoutActive();
    if (!touch) {
      hint.classList.add('hidden');
      hint.setAttribute('aria-hidden', 'true');
      return;
    }
    /* Pfeil-Leiste ersetzt den Hinweistext im Touch-Modus */
    hint.classList.add('hidden');
    hint.setAttribute('aria-hidden', 'true');
  }

  function updateScrollButtons() {
    const main = getKioskMain();
    const up = $('#kiosk-scroll-up');
    const down = $('#kiosk-scroll-down');
    if (!main || !up || !down) return;
    const canScroll = main.scrollHeight > main.clientHeight + 8;
    const atTop = main.scrollTop <= 8;
    const atBottom = main.scrollTop + main.clientHeight >= main.scrollHeight - 8;
    up.disabled = !canScroll || atTop;
    down.disabled = !canScroll || atBottom;
  }

  function scrollKioskMain(direction) {
    const main = getKioskMain();
    if (!main) return;
    const step = Math.max(280, Math.round(main.clientHeight * 0.82));
    main.scrollBy({ top: direction * step, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 400);
  }

  function getPdfScroll() {
    return $('#pdf-scroll');
  }

  function updatePdfScrollButtons() {
    const scroll = getPdfScroll();
    const up = $('#pdf-scroll-up');
    const down = $('#pdf-scroll-down');
    if (!scroll || !up || !down) return;
    const touch = isTouchLayoutActive();
    if (!touch) {
      up.disabled = true;
      down.disabled = true;
      return;
    }
    const canScroll = scroll.scrollHeight > scroll.clientHeight + 8;
    const atTop = scroll.scrollTop <= 8;
    const atBottom = scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 8;
    up.disabled = !canScroll || atTop;
    down.disabled = !canScroll || atBottom;
  }

  function scrollPdfView(direction) {
    const scroll = getPdfScroll();
    if (!scroll) return;
    const step = Math.max(280, Math.round(scroll.clientHeight * 0.82));
    scroll.scrollBy({ top: direction * step, behavior: 'smooth' });
    setTimeout(updatePdfScrollButtons, 400);
  }

  async function fetchJson(url, timeoutMs = 20000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + 't=' + Date.now(), { signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function loadConfig() {
    try {
      const cfg = await fetchJson('/data/config.json');
      const ss = cfg.screensaver || {};
      state.screensaver.videoUrl = (ss.video_url || '').trim();
      if (state.screensaver.videoUrl && !isSafeLocalPath(state.screensaver.videoUrl)) {
        state.screensaver.videoUrl = '';
      }
      state.screensaver.enabled = !!(ss.enabled && state.screensaver.videoUrl);
      const minutes = parseInt(ss.timeout_minutes, 10);
      state.screensaver.timeoutMs = (Number.isFinite(minutes) && minutes > 0 ? minutes : 5) * 60 * 1000;
      const pv = cfg.pdf_view || {};
      state.pdfView.pageMode = pv.page_mode === 'double' ? 'double' : 'single';
      if (cfg.supported_languages?.length) {
        applyActiveLangs(cfg.supported_languages);
      }
      state.touchLayout = !!cfg.touch_layout;
      const brand = cfg.branding || {};
      state.branding.companyName = (brand.company_name || '').trim();
      state.branding.logoUrl = (brand.logo_url || '').trim();
    } catch (_) { /* optional */ }
  }

  function applyBranding() {
    const logo = $('#company-logo');
    const name = state.branding.companyName;
    const url = state.branding.logoUrl;
    if (logo && url && isSafeAssetUrl(url)) {
      logo.src = url + (url.includes('?') ? '&' : '?') + 'v=' + APP_VERSION;
      logo.alt = name || '';
      logo.classList.remove('hidden');
      logo.onerror = () => logo.classList.add('hidden');
    } else if (logo) {
      logo.classList.add('hidden');
    }
    document.title = name ? `${name} – Broschüren-Mediathek` : 'Broschüren-Mediathek';
  }

  function hideScreensaver() {
    if (!state.screensaver.active) return;
    state.screensaver.active = false;
    const el = $('#screensaver');
    const video = $('#screensaver-video');
    video.pause();
    video.removeAttribute('src');
    video.load();
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  }

  function showScreensaver() {
    if (!state.screensaver.enabled || state.screensaver.active) return;
    closeModal();
    state.screensaver.active = true;
    const el = $('#screensaver');
    const video = $('#screensaver-video');
    video.src = state.screensaver.videoUrl;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    video.play().catch(() => {});
  }

  function resetIdleTimer() {
    if (!state.screensaver.enabled) return;
    hideScreensaver();
    clearTimeout(state.screensaver.timer);
    state.screensaver.timer = setTimeout(showScreensaver, state.screensaver.timeoutMs);
  }

  function initScreensaver() {
    if (!state.screensaver.enabled) return;
    const ss = $('#screensaver');
    const events = ['touchstart', 'touchend', 'mousedown', 'keydown', 'scroll', 'click'];
    events.forEach((ev) => {
      document.addEventListener(ev, resetIdleTimer, { passive: true });
    });
    ss.addEventListener('click', () => resetIdleTimer());
    ss.addEventListener('touchstart', () => resetIdleTimer(), { passive: true });
    resetIdleTimer();
  }

  function brochureCount(manifest) {
    const list = manifest?.brochures;
    return Array.isArray(list) ? list.length : 0;
  }

  async function loadManifest() {
    state.manifest = await fetchJson('/data/manifest.json');
    if (!Array.isArray(state.manifest.brochures)) {
      console.error('[mediathek] manifest.brochures ist kein Array:', state.manifest.brochures);
      state.manifest.brochures = [];
    }
    if (state.manifest.supported_languages?.length) {
      applyActiveLangs(state.manifest.supported_languages);
    } else if (!state.availableLangs.length) {
      applyActiveLangs(ALL_LANGS);
    }
  }

  function showAppShell() {
    const app = $('#app');
    if (!app) return;
    app.classList.remove('hidden');
    app.classList.add('is-visible');
  }

  function getCategoryLabel(cat) {
    return (cat.labels && cat.labels[state.uiLang]) || cat.labels?.en || cat.id;
  }

  function getBrochureTitle(brochure, lang = state.uiLang) {
    if (brochure.titles && brochure.titles[lang]) {
      return brochure.titles[lang];
    }
    return brochure.title;
  }

  function getBrochureById(id) {
    return (state.manifest?.brochures || []).find((b) => b.id === id) || null;
  }

  function resolvePdfPath(brochure, { strict = false, lang = state.uiLang } = {}) {
    const files = brochure.files || {};
    if (files[lang]) return files[lang];
    if (strict) return null;
    const fallback = getActiveLangs().find((l) => files[l]);
    return fallback ? files[fallback] : null;
  }

  function resolveSourceUrl(brochure, { strict = false, lang = state.uiLang } = {}) {
    const urls = brochure.source_urls || {};
    if (urls[lang]) return urls[lang];
    if (strict) return null;
    const fallback = getActiveLangs().find((l) => urls[l]);
    return fallback ? urls[fallback] : null;
  }

  let pdfJsLoadPromise = null;
  const pdfThumbQueue = [];
  let pdfThumbRunning = false;

  function resolveThumbnailPath(brochure, lang = state.uiLang) {
    const thumbs = brochure.thumbnails;
    if (thumbs && typeof thumbs === 'object') {
      if (thumbs[lang]) return thumbs[lang];
      const fallback = getActiveLangs().find((l) => thumbs[l]);
      if (fallback) return thumbs[fallback];
    }
    if (brochure.thumbnail && brochure.thumbnail.startsWith('/pdfs/thumbs/')) {
      return brochure.thumbnail;
    }
    return null;
  }

  function usesSyncedThumbnail(brochure, lang = state.uiLang) {
    return !!resolveThumbnailPath(brochure, lang);
  }

  function needsPdfThumbnailFallback(brochure, lang = state.uiLang) {
    return !usesSyncedThumbnail(brochure, lang) && !!resolvePdfPath(brochure, { lang });
  }

  function queuePdfThumbnail(brochure, canvas) {
    pdfThumbQueue.push({ brochure, canvas });
    if (!pdfThumbRunning) {
      requestAnimationFrame(() => drainPdfThumbQueue());
    }
  }

  async function drainPdfThumbQueue() {
    if (pdfThumbRunning || !pdfThumbQueue.length) return;
    pdfThumbRunning = true;
    try {
      await loadPdfJsLib();
      while (pdfThumbQueue.length) {
        const job = pdfThumbQueue.shift();
        if (job && job.canvas.isConnected) {
          await renderPdfThumbnail(job.brochure, job.canvas);
        }
      }
    } catch (err) {
      console.warn('[mediathek] PDF-Thumbnails:', err);
    } finally {
      pdfThumbRunning = false;
      if (pdfThumbQueue.length) {
        requestAnimationFrame(() => drainPdfThumbQueue());
      }
    }
  }

  async function renderPdfThumbnail(brochure, canvas) {
    const pdfPath = resolvePdfPath(brochure);
    if (!pdfPath) return;

    const container = canvas.parentElement;
    if (!container) return;

    let cssW = container.clientWidth;
    let cssH = container.clientHeight;
    if (cssW < 10 || cssH < 10) {
      await waitForLayout();
      cssW = container.clientWidth || 200;
      cssH = container.clientHeight || 150;
    }

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument(pdfPath + '?v=' + APP_VERSION).promise;
      const page = await pdf.getPage(1);
      const pad = 8;
      const dpr = window.devicePixelRatio || 1;
      const base = page.getViewport({ scale: 1 });
      const cssScale = Math.min(
        (cssW - pad * 2) / base.width,
        (cssH - pad * 2) / base.height
      );
      const viewport = page.getViewport({ scale: cssScale * dpr });

      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#2A2A2A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.clip();
      ctx.translate(
        (canvas.width - viewport.width) / 2,
        (canvas.height - viewport.height) / 2
      );
      await page.render({ canvasContext: ctx, viewport }).promise;
      ctx.restore();
    } catch (err) {
      console.warn('[mediathek] Thumbnail für', brochure.id, err);
    } finally {
      if (pdf) pdf.destroy();
    }
  }

  function initPdfJs() {
    if (typeof pdfjsLib === 'undefined') return;
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_BASE + 'pdf.worker.min.js';
  }

  function loadPdfJsLib() {
    if (typeof pdfjsLib !== 'undefined') {
      initPdfJs();
      return Promise.resolve();
    }
    if (pdfJsLoadPromise) return pdfJsLoadPromise;
    pdfJsLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDF_JS_BASE + 'pdf.min.js?v=' + APP_VERSION;
      script.onload = () => {
        initPdfJs();
        resolve();
      };
      script.onerror = () => reject(new Error('pdf.js nicht ladbar'));
      document.head.appendChild(script);
    });
    return pdfJsLoadPromise;
  }

  function waitForLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function getPdfSpreads(numPages) {
    if (state.pdfView.pageMode !== 'double') {
      return Array.from({ length: numPages }, (_, i) => [i + 1]);
    }
    const spreads = [[1]];
    for (let i = 2; i <= numPages; i += 2) {
      spreads.push(i + 1 <= numPages ? [i, i + 1] : [i]);
    }
    return spreads;
  }

  function getPdfViewportSize(scrollEl, pagesInSpread) {
    const pad = 6;
    const gap = pagesInSpread > 1 ? 8 * (pagesInSpread - 1) : 0;
    return {
      width: Math.max((scrollEl.clientWidth - pad * 2 - gap) / pagesInSpread, 80),
      height: Math.max(scrollEl.clientHeight - pad * 2, 80),
    };
  }

  async function renderPageCanvas(page, scrollEl, pagesInSpread) {
    const { width: availableWidth, height: availableHeight } = getPdfViewportSize(
      scrollEl,
      pagesInSpread
    );
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(availableHeight / base.height, availableWidth / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page-canvas';
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({
      canvasContext: canvas.getContext('2d'),
      viewport,
    }).promise;
    return canvas;
  }

  async function renderPdfDocument(pdf, container, token) {
    const isDouble = state.pdfView.pageMode === 'double';
    container.innerHTML = '';
    container.classList.toggle('pdf-scroll--double', isDouble);
    const spreads = getPdfSpreads(pdf.numPages);

    for (const spread of spreads) {
      if (token !== state.pdfRenderToken) return;
      const row = document.createElement('div');
      row.className = 'pdf-spread';
      for (const pageNum of spread) {
        const page = await pdf.getPage(pageNum);
        if (token !== state.pdfRenderToken) return;
        const canvas = await renderPageCanvas(page, container, spread.length);
        canvas.dataset.pageNumber = String(pageNum);
        const slot = document.createElement('div');
        slot.className = 'pdf-page-slot';
        slot.appendChild(canvas);
        row.appendChild(slot);
      }
      container.appendChild(row);
    }
    container.scrollTop = 0;
    requestAnimationFrame(updatePdfScrollButtons);
  }

  function clearPdfViewer() {
    state.pdfRenderToken += 1;
    const scroll = $('#pdf-scroll');
    const loading = $('#pdf-loading');
    if (scroll) scroll.innerHTML = '';
    if (loading) loading.classList.add('hidden');
  }

  async function loadPdfInViewer(pdfPath, lang) {
    const scroll = $('#pdf-scroll');
    const loading = $('#pdf-loading');
    state.pdfRenderToken += 1;
    const token = state.pdfRenderToken;

    scroll.innerHTML = '';
    loading.textContent = t('pdf_loading');
    loading.classList.remove('hidden');

    const url = pdfPath + '?v=' + APP_VERSION + '&lang=' + encodeURIComponent(lang) + '&t=' + Date.now();

    try {
      await loadPdfJsLib();
      if (token !== state.pdfRenderToken) return;
      await waitForLayout();
      if (token !== state.pdfRenderToken) return;
      const pdf = await pdfjsLib.getDocument(url).promise;
      if (token !== state.pdfRenderToken) return;
      await renderPdfDocument(pdf, scroll, token);
    } catch (err) {
      console.error(err);
      if (token === state.pdfRenderToken) {
        scroll.innerHTML = '<p class="pdf-error">' + escapeHtml(t('pdf_error')) + '</p>';
      }
    } finally {
      if (token === state.pdfRenderToken) {
        loading.classList.add('hidden');
        updatePdfScrollButtons();
      }
    }
  }

  function renderModalLangSwitcher(brochure, activeLang) {
    const container = $('#modal-lang-switcher');
    if (!container) return;
    container.innerHTML = '';
    getActiveLangs().forEach((l) => {
      const avail = !!(brochure.files && brochure.files[l]);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-btn modal-lang-btn' + (activeLang === l ? ' active' : '');
      btn.textContent = l.toUpperCase();
      btn.disabled = !avail;
      btn.setAttribute('aria-pressed', activeLang === l);
      if (avail) {
        btn.addEventListener('click', () => openModal(brochure, { pdfLang: l }));
      }
      container.appendChild(btn);
    });
  }

  function brochureMatchesSearch(brochure, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const title = getBrochureTitle(brochure).toLowerCase();
    if (title.includes(q)) return true;
    const cat = (state.manifest?.categories || []).find((c) => c.id === brochure.category);
    if (cat && getCategoryLabel(cat).toLowerCase().includes(q)) return true;
    return false;
  }

  function filteredBrochures() {
    if (!state.manifest) return [];
    return state.manifest.brochures.filter((b) => {
      if (state.category !== 'all' && b.category !== state.category) return false;
      if (!brochureMatchesSearch(b, state.search)) return false;
      return resolvePdfPath(b) !== null;
    });
  }

  // Categories that are superseded when a more specific category exists for the same PDF.
  // Key = dominant category → value = categories it replaces.
  const CATEGORY_SUPERSEDES = {
    'stanz-laser-kombination': ['stanzen', 'faserlaser-schneiden'],
  };
  const FALLBACK_CATS = new Set(['unternehmen', 'sonstiges']);

  function filteredBrochuresForTable() {
    if (!state.manifest) return [];
    const items = state.manifest.brochures.filter((b) => {
      if (state.category !== 'all' && b.category !== state.category) return false;
      if (!brochureMatchesSearch(b, state.search)) return false;
      const urls = b.source_urls || {};
      return TABLE_LINK_LANGS.some((lang) => urls[lang]);
    });

    const urlKey = (b) => {
      const urls = b.source_urls || {};
      return TABLE_LINK_LANGS.map((l) => urls[l] || '').join('|');
    };

    // Build set of url-keys that appear in a dominant category.
    const dominatedKeys = new Map(); // urlKey → Set of dominated cats to suppress
    for (const [dominant, dominated] of Object.entries(CATEGORY_SUPERSEDES)) {
      const dominantItems = items.filter((b) => b.category === dominant);
      for (const b of dominantItems) {
        const k = urlKey(b);
        if (!dominatedKeys.has(k)) dominatedKeys.set(k, new Set());
        for (const d of dominated) dominatedKeys.get(k).add(d);
      }
    }

    // Build set of url-keys that appear in a specific (non-fallback) category.
    const specificKeys = new Set(
      items.filter((b) => !FALLBACK_CATS.has(b.category)).map(urlKey)
    );

    const deduped = items.filter((b) => {
      const k = urlKey(b);
      // Suppress fallback if a specific category exists for same PDF
      if (FALLBACK_CATS.has(b.category) && specificKeys.has(k)) return false;
      // Suppress dominated category if dominant exists for same PDF
      const dominated = dominatedKeys.get(k);
      if (dominated && dominated.has(b.category)) return false;
      return true;
    });

    return deduped.sort((a, b) => getBrochureTitle(a).localeCompare(getBrochureTitle(b), state.uiLang));
  }

  function createTableCopyButton(url) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'table-copy-btn';
    btn.title = t('copy_short');
    btn.setAttribute('aria-label', t('copy_short'));
    btn.innerHTML = `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
    </svg>`;
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await copyTextToClipboard(url);
        btn.classList.add('copied');
        showToast(t('copy_ok'));
        setTimeout(() => btn.classList.remove('copied'), 1500);
      } catch (_) {
        showToast(t('copy_fail'));
      }
    });
    return btn;
  }

  function renderLinkTableCell(url) {
    const td = document.createElement('td');
    td.className = 'brochure-table__link-cell';
    if (!url) {
      td.innerHTML = `<span class="brochure-table__empty">${escapeHtml(t('link_missing'))}</span>`;
      return td;
    }
    if (!isSafeHttpUrl(url)) {
      td.textContent = t('link_missing');
      return td;
    }
    const wrap = document.createElement('div');
    wrap.className = 'link-cell-inner';
    const link = document.createElement('a');
    link.className = 'brochure-table__url';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = url;
    wrap.appendChild(link);
    wrap.appendChild(createTableCopyButton(url));
    td.appendChild(wrap);
    return td;
  }

  function renderLinkTable() {
    const tbody = $('#brochure-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const items = filteredBrochuresForTable();

    if (items.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.className = 'grid-empty-msg';
      td.textContent = t('table_empty');
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    items.forEach((brochure) => {
      const tr = document.createElement('tr');
      const cat = (state.manifest.categories || []).find((c) => c.id === brochure.category);
      const urls = brochure.source_urls || {};

      const tdName = document.createElement('td');
      tdName.className = 'brochure-table__product';
      tdName.textContent = getBrochureTitle(brochure);
      tr.appendChild(tdName);

      const tdTech = document.createElement('td');
      tdTech.className = 'brochure-table__tech';
      tdTech.textContent = cat ? getCategoryLabel(cat) : brochure.category;
      tr.appendChild(tdTech);

      TABLE_LINK_LANGS.forEach((lang) => {
        tr.appendChild(renderLinkTableCell(urls[lang] || null));
      });

      tbody.appendChild(tr);
    });
  }

  function renderViewModeSwitcher() {
    $$('.view-mode-btn').forEach((btn) => {
      const active = btn.dataset.view === state.viewMode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setViewMode(mode) {
    if (mode !== 'grid' && mode !== 'table') return;
    state.viewMode = mode;
    try {
      sessionStorage.setItem(VIEW_MODE_KEY, mode);
    } catch (_) { /* ignore */ }
    renderViewModeSwitcher();
    renderMainContent();
    updatePortraitLayout();
  }

  function renderMainContent() {
    const grid = $('#brochure-grid');
    const tableWrap = $('#brochure-table-wrap');
    if (!grid || !tableWrap) return;

    if (state.viewMode === 'table') {
      grid.classList.add('hidden');
      grid.hidden = true;
      tableWrap.classList.remove('hidden');
      tableWrap.hidden = false;
      renderLinkTable();
    } else {
      tableWrap.classList.add('hidden');
      tableWrap.hidden = true;
      grid.classList.remove('hidden');
      grid.hidden = false;
      renderBrochures();
    }
  }

  function renderLangSwitcher() {
    const container = $('#lang-switcher');
    container.innerHTML = '';
    getActiveLangs().forEach((lang) => {
      const btn = document.createElement('button');
      btn.className = 'lang-btn' + (state.uiLang === lang ? ' active' : '');
      btn.dataset.lang = lang;
      btn.setAttribute('aria-pressed', state.uiLang === lang);
      btn.textContent = lang.toUpperCase();
      btn.title = LANG_FLAGS[lang];
      btn.addEventListener('click', () => {
        state.uiLang = lang;
        render();
        if (state.selectedBrochure) {
          openModal(state.selectedBrochure, { pdfLang: lang });
        }
      });
      container.appendChild(btn);
    });
  }

  function openLangConfig() {
    renderLangConfigList();
    $('#lang-config-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLangConfig() {
    $('#lang-config-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderLangConfigList() {
    const list = $('#lang-config-list');
    if (!list) return;
    const activeSet = new Set(getActiveLangs());
    list.innerHTML = '';
    ALL_LANGS.forEach((lang) => {
      const row = document.createElement('label');
      row.className = 'lang-config-item' + (activeSet.has(lang) ? '' : ' is-disabled');
      row.dataset.lang = lang;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = activeSet.has(lang);
      checkbox.addEventListener('change', () => {
        row.classList.toggle('is-disabled', !checkbox.checked);
      });

      const code = document.createElement('span');
      code.className = 'lang-config-code';
      code.textContent = lang.toUpperCase();

      const link = document.createElement('a');
      const source = EU_LANGUAGE_URLS[lang];
      link.href = source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = source;

      row.appendChild(checkbox);
      row.appendChild(code);
      row.appendChild(link);
      list.appendChild(row);
    });
  }

  function saveLangConfigFromUi() {
    const selected = Array.from($$('#lang-config-list .lang-config-item'))
      .filter((row) => row.querySelector('input[type="checkbox"]')?.checked)
      .map((row) => row.dataset.lang)
      .filter(Boolean);

    state.enabledLangs = selected.filter((lang) => ALL_LANGS.includes(lang));
    if (!state.enabledLangs.length) {
      state.enabledLangs = [ALL_LANGS[0]];
    }
    if (!state.enabledLangs.includes(state.uiLang)) {
      state.uiLang = state.enabledLangs[0];
    }
    saveEnabledLangPreferences();
    closeLangConfig();
    render();
  }

  function renderCategories() {
    const container = $('#category-chips');
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = 'category-chip' + (state.category === 'all' ? ' active' : '');
    allBtn.textContent = t('all_categories');
    allBtn.dataset.category = 'all';
    allBtn.addEventListener('click', () => {
      state.category = 'all';
      renderMainContent();
      renderCategories();
    });
    container.appendChild(allBtn);

    (state.manifest?.categories || []).forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'category-chip' + (state.category === cat.id ? ' active' : '');
      btn.textContent = getCategoryLabel(cat);
      btn.dataset.category = cat.id;
      btn.addEventListener('click', () => {
        state.category = cat.id;
        renderMainContent();
        renderCategories();
      });
      container.appendChild(btn);
    });
  }

  function mountBrochureThumbnail(brochure, thumbWrap) {
    const thumbPath = resolveThumbnailPath(brochure);
    if (thumbPath) {
      const img = document.createElement('img');
      img.src = thumbPath + '?v=' + APP_VERSION;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => {
        img.remove();
        if (needsPdfThumbnailFallback(brochure)) {
          const canvas = document.createElement('canvas');
          canvas.className = 'brochure-thumb-canvas';
          canvas.setAttribute('aria-hidden', 'true');
          thumbWrap.appendChild(canvas);
          queuePdfThumbnail(brochure, canvas);
        } else {
          thumbWrap.innerHTML = `<div class="brochure-thumb-placeholder">
               <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                   d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
               </svg>
             </div>`;
        }
      }, { once: true });
      thumbWrap.appendChild(img);
      return;
    }

    if (needsPdfThumbnailFallback(brochure)) {
      const canvas = document.createElement('canvas');
      canvas.className = 'brochure-thumb-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      thumbWrap.appendChild(canvas);
      queuePdfThumbnail(brochure, canvas);
      return;
    }

    thumbWrap.innerHTML = `<div class="brochure-thumb-placeholder">
         <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
             d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
         </svg>
       </div>`;
  }

  function renderBrochureCard(brochure) {
    const card = document.createElement('article');
    card.className = 'brochure-card';
    card.role = 'listitem';
    card.dataset.id = brochure.id;

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'brochure-thumb';
    mountBrochureThumbnail(brochure, thumbWrap);

    const langBadges = document.createElement('div');
    langBadges.className = 'brochure-langs';
    getActiveLangs().forEach((l) => {
      const avail = !!(brochure.files && brochure.files[l]);
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'lang-badge' + (avail ? ' available' : '');
      badge.textContent = l;
      badge.disabled = !avail;
      badge.title = avail ? l.toUpperCase() : t('lang_unavailable');
      if (avail) {
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          openModal(brochure, { pdfLang: l });
        });
      }
      langBadges.appendChild(badge);
    });

    const info = document.createElement('div');
    info.className = 'brochure-info';
    info.innerHTML = `<h3 class="brochure-title">${escapeHtml(getBrochureTitle(brochure))}</h3>`;
    info.appendChild(langBadges);

    card.appendChild(thumbWrap);
    card.appendChild(info);

    card.addEventListener('click', () => openModal(brochure));
    return card;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function isSafeHttpUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  function isSafeLocalPath(path) {
    return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && !path.includes('..');
  }

  function isSafeAssetUrl(url) {
    if (!url) return false;
    return isSafeLocalPath(url) || isSafeHttpUrl(url);
  }

  function renderBrochures() {
    const grid = $('#brochure-grid');
    grid.innerHTML = '';
    const total = brochureCount(state.manifest);
    const items = filteredBrochures();

    if (items.length === 0) {
      const hint = total > 0
        ? `${total} Broschüren im Manifest, aber keine passende PDF-Sprache – config.json prüfen.`
        : t('no_results');
      grid.innerHTML = `<p class="grid-empty-msg">${escapeHtml(hint)}</p>`;
      return;
    }

    items.forEach((b) => grid.appendChild(renderBrochureCard(b)));
    requestAnimationFrame(() => {
      updateScrollHint();
      updateScrollButtons();
    });
  }

  function renderSyncInfo() {
    const el = $('#sync-info');
    if (!state.manifest?.last_sync) {
      el.textContent = '';
      return;
    }
    const date = new Date(state.manifest.last_sync);
    const company = state.branding.companyName;
    const suffix = company ? ` · © ${company}` : '';
    el.textContent = `${t('sync_label')}: ${date.toLocaleString(LOCALE_MAP[state.uiLang] || 'en-GB')} · Release ${RELEASE_VERSION}${suffix}`;
  }

  function render() {
    applyBranding();
    applyI18n();
    renderLangSwitcher();
    renderCategories();
    renderViewModeSwitcher();
    renderMainContent();
    renderSyncInfo();
    updatePortraitLayout();
  }

  function openModal(brochure, { pdfLang = null } = {}) {
    const fresh = getBrochureById(brochure.id) || brochure;
    const viewLang = pdfLang || state.uiLang;
    state.selectedBrochure = fresh;
    state.selectedPdfLang = viewLang;

    let pdfPath = resolvePdfPath(fresh, { strict: true, lang: viewLang });
    if (!pdfPath) {
      pdfPath = resolvePdfPath(fresh, { lang: viewLang });
    }
    if (!pdfPath) {
      alert(t('lang_unavailable'));
      return;
    }

    const cat = (state.manifest.categories || []).find((c) => c.id === fresh.category);
    $('#modal-category').textContent = cat ? getCategoryLabel(cat) : fresh.category;
    $('#modal-title').textContent = getBrochureTitle(fresh, viewLang);
    renderModalLangSwitcher(fresh, viewLang);

    const dl = $('#download-link');
    dl.href = pdfPath + '?lang=' + viewLang;
    dl.download = pdfPath.split('/').pop().replace('.pdf', '') + '_' + viewLang + '.pdf';

    updateModalEuLink(fresh, viewLang);

    switchTab('viewer');
    $('#modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    void loadPdfInViewer(pdfPath, viewLang);
    resetIdleTimer();
  }

  function closeModal() {
    $('#modal').classList.add('hidden');
    clearPdfViewer();
    document.body.style.overflow = '';
    state.selectedBrochure = null;
    state.selectedPdfLang = null;
    if (state.qrInstance) {
      $('#qrcode').innerHTML = '';
      state.qrInstance = null;
    }
  }

  function loadQrLib() {
    if (typeof QRCode !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/js/vendor/qrcode.min.js?v=' + APP_VERSION;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('QRCode lib'));
      document.head.appendChild(script);
    });
  }

  async function renderQr(url) {
    const container = $('#qrcode');
    container.innerHTML = '';
    try {
      await loadQrLib();
    } catch (_) {
      container.innerHTML = `<p class="qr-error-text">${escapeHtml(t('qr_unavailable'))}</p>`;
      return;
    }
    state.qrInstance = new QRCode(container, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#1A1A1A',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  }

  function switchTab(tab) {
    $$('.modal-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    $('#tab-viewer').classList.toggle('hidden', tab !== 'viewer');
    $('#tab-qr').classList.toggle('hidden', tab !== 'qr');
    if (tab === 'viewer') {
      requestAnimationFrame(updatePdfScrollButtons);
    }
  }

  function bindEvents() {
    window.addEventListener('resize', updatePortraitLayout);
    window.addEventListener('orientationchange', () => {
      setTimeout(updatePortraitLayout, 150);
    });

    const main = getKioskMain();
    if (main) {
      main.addEventListener('scroll', () => {
        updateScrollButtons();
      }, { passive: true });
    }

    $('#kiosk-scroll-up')?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollKioskMain(-1);
    });
    $('#kiosk-scroll-down')?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollKioskMain(1);
    });

    const pdfScroll = getPdfScroll();
    if (pdfScroll) {
      pdfScroll.addEventListener('scroll', () => {
        updatePdfScrollButtons();
      }, { passive: true });
    }
    $('#pdf-scroll-up')?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollPdfView(-1);
    });
    $('#pdf-scroll-down')?.addEventListener('click', (e) => {
      e.preventDefault();
      scrollPdfView(1);
    });

    $('#search-input').addEventListener('input', (e) => {
      state.search = e.target.value.trim();
      renderMainContent();
    });

    $$('.view-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => setViewMode(btn.dataset.view));
    });

    $$('.modal-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    $('#modal-copy-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      copyModalSourceUrl();
    });

    $('#lang-config-open')?.addEventListener('click', openLangConfig);
    $('#lang-config-save')?.addEventListener('click', saveLangConfigFromUi);
    $$('[data-action="close-lang-config"]').forEach((el) => {
      el.addEventListener('click', closeLangConfig);
    });

    $$('[data-action="close"]').forEach((el) => {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#lang-config-modal')?.classList.contains('hidden')) {
          closeLangConfig();
          return;
        }
        closeModal();
      }
    });

    setInterval(async () => {
      try {
        await loadManifest();
        render();
      } catch (_) { /* ignore */ }
    }, 30 * 60 * 1000);
  }

  let emptyRetryTimer = null;

  function setEmptyDetail(message) {
    const el = $('#empty-state-detail');
    if (el) el.textContent = message || '';
  }

  function scheduleEmptyRetry() {
    if (emptyRetryTimer) return;
    emptyRetryTimer = setTimeout(async () => {
      emptyRetryTimer = null;
      try {
        await loadManifest();
        const count = brochureCount(state.manifest);
        if (count > 0) {
          setEmptyDetail('');
          $('#empty-state').classList.add('hidden');
          try {
            render();
          } catch (renderErr) {
            console.error(renderErr);
            setEmptyDetail(`Anzeigefehler: ${renderErr.message || renderErr}`);
            $('#empty-state').classList.remove('hidden');
            return;
          }
          showAppShell();
          return;
        }
        setEmptyDetail(`Manifest geladen: ${count} Broschüren – warte auf Sync …`);
      } catch (err) {
        setEmptyDetail(`Manifest nicht erreichbar: ${err.message || err}. Seite neu laden (F5).`);
      }
      scheduleEmptyRetry();
    }, 5000);
  }

  function loadViewModePreference() {
    try {
      const saved = sessionStorage.getItem(VIEW_MODE_KEY);
      if (saved === 'grid' || saved === 'table') state.viewMode = saved;
    } catch (_) { /* ignore */ }
  }

  async function init() {
    try {
      loadViewModePreference();
      loadEnabledLangPreferences();
      await loadConfig();
      bindEvents();
      initScreensaver();
      await loadManifest();
      const count = brochureCount(state.manifest);
      if (count === 0) {
        $('#empty-state').classList.remove('hidden');
        setEmptyDetail('Manifest enthält noch keine Broschüren – wird alle 5 s erneut geprüft.');
        scheduleEmptyRetry();
        return;
      }
      $('#empty-state').classList.add('hidden');
      try {
        render();
      } catch (renderErr) {
        console.error(renderErr);
        $('#empty-state').classList.remove('hidden');
        setEmptyDetail(`Anzeigefehler: ${renderErr.message || renderErr}`);
        scheduleEmptyRetry();
        return;
      }
      showAppShell();
    } catch (err) {
      console.error(err);
      $('#empty-state').classList.remove('hidden');
      setEmptyDetail(`Fehler beim Laden: ${err.message || err}. Hart neu laden (Strg+F5).`);
      scheduleEmptyRetry();
    } finally {
      const loader = $('#loader');
      if (loader) loader.classList.add('hidden');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
