/* ============================================================
   HEADER LIQUID GLASS — capa duplicada + filter
   backdrop-filter con url(#svg-filter) no es confiable en Chromium;
   filter (aplicado directo a un clon del contenido) sí lo es. Este
   script clona <main>, lo pega detrás del header con blur+distorsión,
   y lo sincroniza con el scroll real para que coincida pixel a pixel
   con lo que hay detrás.
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const mainContent = document.querySelector(".site-main");
  const glassClone = document.querySelector(".header-glass-clone");
  if (!header || !mainContent || !glassClone) return;

  const clone = mainContent.cloneNode(true);

  // Sin ids duplicados ni foco por teclado en contenido decorativo.
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.querySelectorAll("a, button, input, textarea, select").forEach((el) => {
    el.setAttribute("tabindex", "-1");
  });
  clone.setAttribute("aria-hidden", "true");
  if ("inert" in clone) clone.inert = true;

  // El clon es solo el fondo del "vidrio": se muestra en su estado
  // final, sin depender de que las animaciones de scroll-reveal hayan
  // disparado (evita reflejar texto invisible/a medio animar).
  clone.querySelectorAll(".reveal").forEach((el) => el.classList.remove("reveal"));

  glassClone.appendChild(clone);

  let ticking = false;
  const syncClonePosition = () => {
    clone.style.transform = `translateY(${-window.scrollY}px)`;
    ticking = false;
  };
  const requestSync = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(syncClonePosition);
    }
  };

  const setGlassHeight = () => {
    glassClone.style.height = `${header.offsetHeight}px`;
  };

  let isActive = false;
  const setActive = (active) => {
    if (active === isActive) return;
    isActive = active;
    glassClone.classList.toggle("is-active", active);

    if (active) {
      setGlassHeight();
      requestSync();
      window.addEventListener("scroll", requestSync, { passive: true });
    } else {
      window.removeEventListener("scroll", requestSync);
    }
  };

  // El efecto solo hace falta cuando el header ya tiene fondo (scrolleado):
  // arriba del todo no hay nada que "distorsionar" detrás. Se arranca/pausa
  // la sincronización según ese estado en vez de correrla siempre.
  setActive(header.classList.contains("is-scrolled"));

  const headerStateObserver = new MutationObserver(() => {
    setActive(header.classList.contains("is-scrolled"));
  });
  headerStateObserver.observe(header, { attributes: true, attributeFilter: ["class"] });

  window.addEventListener("resize", () => {
    if (isActive) setGlassHeight();
  });
});
