(function () {
  "use strict";

  var config = window.STILLYOURS_CONFIG || {};
  var appStoreUrl = String(config.APP_STORE_URL || "").trim();
  var playStoreUrl = String(config.GOOGLE_PLAY_URL || "").trim();
  var measurementId = String(config.GA4_MEASUREMENT_ID || "").trim();
  var lastClick = { key: "", at: 0 };

  function isUsableHttpUrl(value) {
    if (!value) {
      return false;
    }
    try {
      var url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (err) {
      return false;
    }
  }

  function isValidMeasurementId(id) {
    if (!id) {
      return false;
    }
    if (/^G-X+$/i.test(id)) {
      return false;
    }
    return /^G-[A-Z0-9]{8,}$/i.test(id);
  }

  function detectPlatform() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return "ios";
    }
    if (/Android/i.test(ua)) {
      return "android";
    }
    return "other";
  }

  function isDesktop() {
    return window.matchMedia("(min-width: 1024px)").matches;
  }

  function readLandingUtms() {
    var params = new URLSearchParams(window.location.search);
    var utm = {};
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (key) {
      var raw = params.get(key);
      if (raw) {
        utm[key] = String(raw).slice(0, 100);
      }
    });
    return utm;
  }

  function shouldDebounce(key) {
    var now = Date.now();
    if (lastClick.key === key && now - lastClick.at < 400) {
      return true;
    }
    lastClick = { key: key, at: now };
    return false;
  }

  function loadGa4(id) {
    if (!isValidMeasurementId(id)) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "denied",
      personalization_storage: "denied",
      security_storage: "granted"
    });

    var debugMode = new URLSearchParams(window.location.search).has("ga_debug");
    var gaConfig = {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: "auto",
      cookie_flags: "Secure;SameSite=Lax",
      send_page_view: true
    };
    if (debugMode) {
      gaConfig.debug_mode = true;
    }

    gtag("js", new Date());
    gtag("config", id, gaConfig);

    var script = document.createElement("script");
    script.async = true;
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(script);
  }

  function trackStoreClick(eventName, destinationStore, linkUrl) {
    if (typeof window.gtag !== "function") {
      return;
    }
    var utm = readLandingUtms();
    var payload = {
      landing_path: window.location.pathname || "/",
      destination_store: destinationStore,
      link_url: linkUrl || ""
    };
    if (utm.utm_source) {
      payload.landing_utm_source = utm.utm_source;
    }
    if (utm.utm_medium) {
      payload.landing_utm_medium = utm.utm_medium;
    }
    if (utm.utm_campaign) {
      payload.landing_utm_campaign = utm.utm_campaign;
    }
    window.gtag("event", eventName, payload);
  }

  function openStore(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function preferredStore() {
    var platform = detectPlatform();
    if (platform === "ios" && isUsableHttpUrl(appStoreUrl)) {
      return {
        url: appStoreUrl,
        eventName: "app_store_click",
        destinationStore: "app_store"
      };
    }
    if (platform === "android" && isUsableHttpUrl(playStoreUrl)) {
      return {
        url: playStoreUrl,
        eventName: "play_store_click",
        destinationStore: "google_play"
      };
    }
    return null;
  }

  function bindStoreLink(el, url, eventName, destinationStore) {
    if (!el) {
      return;
    }

    var usable = isUsableHttpUrl(url);
    if (usable) {
      el.setAttribute("href", url);
      el.setAttribute("rel", "noopener noreferrer");
      el.setAttribute("target", "_blank");
      el.removeAttribute("aria-disabled");
    } else {
      el.setAttribute("href", fallbackCtaHref());
      el.setAttribute("aria-disabled", "true");
      el.removeAttribute("target");
      el.removeAttribute("rel");
    }

    el.addEventListener("click", function (event) {
      var key = eventName + ":" + (el.id || destinationStore);
      if (shouldDebounce(key)) {
        event.preventDefault();
        return;
      }
      if (!usable) {
        event.preventDefault();
        return;
      }
      trackStoreClick(eventName, destinationStore, url);
    });
  }

  function fallbackCtaHref() {
    return document.getElementById("final-cta") ? "#final-cta" : "./#final-cta";
  }

  function bindGetApp(el, options) {
    if (!el) {
      return;
    }
    options = options || {};
    el.setAttribute("href", fallbackCtaHref());

    el.addEventListener("click", function (event) {
      if (options.desktopScrolls && isDesktop()) {
        return;
      }
      var dest = preferredStore();
      if (!dest) {
        return;
      }
      if (shouldDebounce("get-app:" + (el.id || "primary"))) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      trackStoreClick(dest.eventName, dest.destinationStore, dest.url);
      openStore(dest.url);
    });
  }

  document.documentElement.setAttribute("data-platform", detectPlatform());

  function syncScrolled() {
    document.documentElement.classList.toggle(
      "is-scrolled",
      window.scrollY > 8
    );
  }
  window.addEventListener("scroll", syncScrolled, { passive: true });
  syncScrolled();

  loadGa4(measurementId);

  document.querySelectorAll('[data-store="app"]').forEach(function (el) {
    bindStoreLink(el, appStoreUrl, "app_store_click", "app_store");
  });
  document.querySelectorAll('[data-store="play"]').forEach(function (el) {
    bindStoreLink(el, playStoreUrl, "play_store_click", "google_play");
  });

  bindGetApp(document.getElementById("cta-get-app-header"), {
    desktopScrolls: true
  });
  bindGetApp(document.getElementById("cta-get-app"), {
    desktopScrolls: false
  });
  bindGetApp(document.getElementById("cta-get-app-final"), {
    desktopScrolls: false
  });
})();
