(function () {
  "use strict";

  var config = window.STILLYOURS_CONFIG || {};
  var appStoreUrl = String(config.APP_STORE_URL || "").trim();
  var playStoreUrl = String(config.GOOGLE_PLAY_URL || "").trim();
  var measurementId = String(config.GA4_MEASUREMENT_ID || "").trim();
  var lastClick = { key: "", at: 0 };
  var reduceMotion = false;

  try {
    reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  } catch (err) {
    reduceMotion = false;
  }

  function isUsableHttpUrl(value) {
    if (!value) {
      return false;
    }
    try {
      var url = new URL(value, window.location.href);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch (error) {
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
    return window.matchMedia("(min-width: 768px)").matches;
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

  function fallbackCtaHref() {
    if (document.getElementById("download")) {
      return "#download";
    }
    if (document.getElementById("final-cta")) {
      return "#final-cta";
    }
    return "./#download";
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
      el.removeAttribute("hidden");
      el.removeAttribute("aria-disabled");
      el.removeAttribute("target");
    } else {
      el.setAttribute("hidden", "");
      el.setAttribute("aria-disabled", "true");
      el.removeAttribute("href");
    }

    el.addEventListener("click", function (event) {
      var key = eventName + ":" + (el.id || el.getAttribute("data-cta-id") || destinationStore);
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

  function syncComingSoon() {
    var hasAppStore = isUsableHttpUrl(appStoreUrl);
    document.documentElement.classList.toggle("has-app-store", hasAppStore);
    document.querySelectorAll("[data-store-soon]").forEach(function (el) {
      if (hasAppStore) {
        el.setAttribute("hidden", "");
      } else {
        el.removeAttribute("hidden");
      }
    });
  }

  function bindGetApp(el) {
    if (!el) {
      return;
    }
    el.setAttribute("href", fallbackCtaHref());

    el.addEventListener("click", function (event) {
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
      window.location.href = dest.url;
    });
  }

  function syncScrolled() {
    document.documentElement.classList.toggle(
      "is-scrolled",
      window.scrollY > 8
    );
  }

  function setupSticky() {
    var bar = document.getElementById("sticky-cta");
    if (!bar || isDesktop()) {
      return;
    }

    var hero = document.getElementById("download");
    var mid = document.getElementById("mid-cta");
    var closer = document.getElementById("final-cta");
    if (!hero) {
      return;
    }

    var vis = { hero: true, mid: false, closer: false };

    function render() {
      var show = !vis.hero && !vis.mid && !vis.closer;
      if (show) {
        bar.removeAttribute("hidden");
      } else {
        bar.setAttribute("hidden", "");
      }
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.target.id === "download") {
            vis.hero = entry.isIntersecting;
          } else if (entry.target.id === "mid-cta") {
            vis.mid = entry.isIntersecting;
          } else if (entry.target.id === "final-cta") {
            vis.closer = entry.isIntersecting;
          }
        });
        render();
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
    );

    io.observe(hero);
    if (mid) {
      io.observe(mid);
    }
    if (closer) {
      io.observe(closer);
    }
    render();
  }

  function pauseMarqueeOnTouch() {
    var band = document.querySelector(".notes-atmosphere");
    var track = document.querySelector(".notes-track");
    if (!band || !track || reduceMotion) {
      return;
    }
    band.addEventListener("pointerdown", function () {
      track.style.animationPlayState = "paused";
    });
  }

  function stampYear() {
    var el = document.querySelector(".footer-copy");
    if (!el) {
      return;
    }
    el.textContent = "© " + new Date().getFullYear() + " StillYours";
  }

  if (!isUsableHttpUrl(playStoreUrl)) {
    document.querySelectorAll('[data-store="play"]').forEach(function (el) {
      var existing = el.getAttribute("href") || "";
      if (isUsableHttpUrl(existing)) {
        playStoreUrl = existing;
      }
    });
  }

  document.documentElement.setAttribute("data-platform", detectPlatform());

  window.addEventListener("scroll", syncScrolled, { passive: true });
  syncScrolled();

  loadGa4(measurementId);
  syncComingSoon();
  stampYear();

  document.querySelectorAll('[data-store="app"]').forEach(function (el) {
    bindStoreLink(el, appStoreUrl, "app_store_click", "app_store");
  });
  document.querySelectorAll('[data-store="play"]').forEach(function (el) {
    bindStoreLink(el, playStoreUrl, "play_store_click", "google_play");
  });

  bindGetApp(document.getElementById("cta-get-app-header"));
  setupSticky();
  pauseMarqueeOnTouch();
})();
