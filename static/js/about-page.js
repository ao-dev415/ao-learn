async function loadAbout() {
  try {
    const res = await fetch("data/about.json");
    const data = await res.json();

    const nameEl = document.getElementById("name");
    if (nameEl) nameEl.textContent = data.name;

    const locEl = document.getElementById("location");
    if (locEl) locEl.textContent = data.location;

    const imgEl = document.getElementById("profile-img");
    if (imgEl) {
      imgEl.src = data.imageSrc;
      imgEl.alt = data.name;
    }

    const socialNamesEl = document.getElementById("social-names");
    const socialLinksEl = document.getElementById("social-links");
    const ctaBtn = document.getElementById("cta-btn");
    if (socialNamesEl) {
      socialNamesEl.textContent = (data.socials || [])
        .map(s => s.text)
        .join(" • ");
    }
    if (socialLinksEl && ctaBtn) {
      // Insert social links before CTA button
      for (const { text, url } of data.socials || []) {
        const a = document.createElement("a");
        a.className = "btn";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = text;
        socialLinksEl.insertBefore(a, ctaBtn);
        }
      ctaBtn.textContent = data.cta?.text || "";
      ctaBtn.href = data.cta?.url || "#";
    }

    const officeLocEl = document.getElementById("office-location");
    if (officeLocEl) officeLocEl.textContent = data.office?.location || "";

    const mapEl = document.getElementById("map-iframe");
    if (mapEl) {
      mapEl.src = data.office?.mapUrl || "";
      if (data.office?.location) {
        mapEl.title = `${data.office.location} map`;
      }
    }

    const bioEl = document.getElementById("bio");
    if (bioEl) bioEl.textContent = data.bio || "";
  } catch (err) {
    console.error("Failed to load about.json", err);
  }
}

loadAbout();
