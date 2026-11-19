
    const elements = {
      form: document.getElementById("create-form"),
      url: document.getElementById("url-input"),
      alias: document.getElementById("alias-input"),
      message: document.getElementById("form-message"),
      submit: document.getElementById("submit-button"),
      search: document.getElementById("search-input"),
      table: document.getElementById("table-container"),
      toast: document.getElementById("toast")
    };
    let links = [];
    let toastTimer;

    document.getElementById("today-label").textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long", month: "long", day: "numeric"
    }).format(new Date());

    function showToast(message) {
      elements.toast.textContent = message;
      elements.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
    }

    async function request(path, options) {
      const response = await fetch(path, options);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      return body;
    }

    function makeIcon(name) {
      const icons = {
        link: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 13.5a4.5 4.5 0 0 0 6.36 0l3-3A4.5 4.5 0 0 0 13 4.14l-1.72 1.72M14 10.5a4.5 4.5 0 0 0-6.36 0l-3 3A4.5 4.5 0 0 0 11 19.86l1.72-1.72" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
        copy: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" stroke="currentColor" stroke-width="1.6"/></svg>',
        trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7h15M10 11v6m4-6v6M6.5 7l.8 12h9.4l.8-12M9 7V4.5h6V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      };
      return icons[name];
    }

    function renderTable() {
      const query = elements.search.value.trim().toLowerCase();
      const visibleLinks = links.filter((link) => `${link.url} ${link.slug}`.toLowerCase().includes(query));
      document.getElementById("link-count").textContent = links.length;
      if (!visibleLinks.length) {
        const title = query ? "No links found" : "Your next great link starts here";
        const copy = query ? "Try a different search term." : "Paste a destination URL above to create your first short link.";
        elements.table.replaceChildren();
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.innerHTML = `<span class="empty-icon">${makeIcon("link")}</span><div class="empty-title">${title}</div><div class="empty-copy">${copy}</div>`;
        elements.table.append(empty);
        return;
      }

      const table = document.createElement("table");
      table.innerHTML = "<thead><tr><th>Destination</th><th>Short link</th><th>Clicks</th><th>Created</th><th aria-label='Actions'></th></tr></thead>";
      const body = document.createElement("tbody");
      for (const link of visibleLinks) {
        const row = document.createElement("tr");
        const destination = new URL(link.url);
        const cells = Array.from({ length: 5 }, () => document.createElement("td"));
        const destinationWrap = document.createElement("div");
        destinationWrap.className = "destination";
        const destinationIcon = document.createElement("span");
        destinationIcon.className = "destination-icon";
        destinationIcon.innerHTML = makeIcon("link");
        const destinationCopy = document.createElement("span");
        destinationCopy.className = "destination-copy";
        const host = document.createElement("span");
        host.className = "destination-host";
        host.textContent = destination.hostname;
        const path = document.createElement("span");
        path.className = "destination-path";
        path.textContent = `${destination.pathname}${destination.search}`;
        destinationCopy.append(host, path);
        destinationWrap.append(destinationIcon, destinationCopy);
        cells[0].append(destinationWrap);

        const shortLink = document.createElement("a");
        shortLink.className = "short-link";
        shortLink.href = `/${encodeURIComponent(link.slug)}`;
        shortLink.textContent = link.shortUrl.replace(/^https?:\/\//, "");
        cells[1].append(shortLink);

        const clickCount = document.createElement("span");
        clickCount.className = "click-count";
        clickCount.textContent = Number(link.clicks).toLocaleString();
        cells[2].append(clickCount);

        const created = document.createElement("span");
        created.className = "date-cell";
        created.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(link.createdAt));
        cells[3].append(created);

        const actions = document.createElement("div");
        actions.className = "row-actions";
        const copyButton = document.createElement("button");
        copyButton.className = "icon-button";
        copyButton.type = "button";
        copyButton.dataset.action = "copy";
        copyButton.dataset.url = link.shortUrl;
        copyButton.setAttribute("aria-label", `Copy ${link.slug}`);
        copyButton.title = "Copy short link";
        copyButton.innerHTML = makeIcon("copy");
        const deleteButton = document.createElement("button");
        deleteButton.className = "icon-button delete";
        deleteButton.type = "button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.slug = link.slug;
        deleteButton.setAttribute("aria-label", `Delete ${link.slug}`);
        deleteButton.title = "Delete link";
        deleteButton.innerHTML = makeIcon("trash");
        actions.append(copyButton, deleteButton);
        cells[4].append(actions);
        row.append(...cells);
        body.append(row);
      }
      table.append(body);
      elements.table.replaceChildren(table);
    }

    function renderAnalytics() {
      const container = document.getElementById("top-links");
      const popular = [...links].sort((a, b) => b.clicks - a.clicks).slice(0, 4);
      container.replaceChildren();
      if (!popular.length) {
        const empty = document.createElement("div");
        empty.className = "analytics-empty";
        empty.textContent = "Your most-clicked links will show up here.";
        container.append(empty);
        return;
      }
      const maxClicks = Math.max(1, ...popular.map((link) => link.clicks));
      for (const link of popular) {
        const row = document.createElement("div");
        row.className = "top-link-row";
        const label = document.createElement("span");
        label.className = "top-link-name";
        label.textContent = link.shortUrl.replace(/^https?:\/\//, "");
        const track = document.createElement("span");
        track.className = "bar-track";
        const fill = document.createElement("span");
        fill.className = "bar-fill";
        fill.style.width = `${link.clicks ? Math.max(5, link.clicks / maxClicks * 100) : 0}%`;
        track.append(fill);
        const value = document.createElement("span");
        value.className = "bar-value";
        value.textContent = Number(link.clicks).toLocaleString();
        row.append(label, track, value);
        container.append(row);
      }
    }

    function renderStats() {
      const clicks = links.reduce((total, link) => total + Number(link.clicks), 0);
      document.getElementById("total-links").textContent = links.length.toLocaleString();
      document.getElementById("total-clicks").textContent = clicks.toLocaleString();
      document.getElementById("clicked-links").textContent = links.filter((link) => link.clicks > 0).length.toLocaleString();
      document.getElementById("plan-count").textContent = links.length;
      document.getElementById("plan-progress").style.width = `${Math.min(100, links.length)}%`;
    }

    async function refreshLinks() {
      const result = await request("/api/links");
      links = result.links;
      renderStats();
      renderTable();
      renderAnalytics();
    }

    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      elements.message.textContent = "";
      elements.submit.disabled = true;
      try {
        const result = await request("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: elements.url.value.trim(), alias: elements.alias.value.trim() })
        });
        elements.form.reset();
        await refreshLinks();
        showToast(`Your link ${result.shortUrl.replace(/^https?:\/\//, "")} is ready.`);
      } catch (error) {
        elements.message.textContent = error.message;
      } finally {
        elements.submit.disabled = false;
      }
    });

    elements.search.addEventListener("input", renderTable);

    elements.table.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      if (button.dataset.action === "copy") {
        try {
          await navigator.clipboard.writeText(button.dataset.url);
          showToast("Short link copied to clipboard.");
        } catch {
          showToast("Could not access your clipboard. Copy the link directly instead.");
        }
      } else if (button.dataset.action === "delete" && window.confirm(`Delete the short link "${button.dataset.slug}"?`)) {
        button.disabled = true;
        try {
          await request(`/api/links/${encodeURIComponent(button.dataset.slug)}`, { method: "DELETE" });
          await refreshLinks();
          showToast("Link deleted.");
        } catch (error) {
          button.disabled = false;
          showToast(error.message);
        }
      }
    });

    refreshLinks().catch((error) => {
      elements.message.textContent = `Unable to load your links: ${error.message}`;
      const empty = document.createElement("div");
      empty.className = "empty-state";
      const title = document.createElement("div");
      title.className = "empty-title";
      title.textContent = "Could not connect to your workspace";
      const copy = document.createElement("div");
      copy.className = "empty-copy";
      copy.textContent = "Check that the server is running, then refresh this page.";
      empty.append(title, copy);
      elements.table.replaceChildren(empty);
    });