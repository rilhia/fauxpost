/**
 * FauxPost Content Script
 * -----------------------
 * This script runs on LinkedIn pages and enables client-side rewriting ("FauxPosts") 
 * of post content for parody, satire, or custom messaging. It injects UI buttons to open a popup 
 * editor that allows users to edit and generate a shareable link to their modified version of the post.
 * 
 * Core features:
 * - Safe Base64 encoding and decoding of messages
 * - Reversible transformation of posts via encoded URLs
 * - Secure URL and HTML sanitization
 * - Drag-and-drop editor popup with real-time preview
 * - Persistent storage of rewritten posts by LinkedIn URN
 */
chrome.storage.local.get("fauxPostEnabled", (data) => {
  if (!data.fauxPostEnabled) return;

  // Encode string as Base64 (UTF-8 safe)
  function encodeUtf8ToBase64(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    const binary = Array.from(utf8Bytes, (byte) =>
      String.fromCharCode(byte)
    ).join("");
    return btoa(binary);
  }

  // Decode Base64 back to UTF-8 string
  function decodeBase64ToUtf8(base64) {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Recursively find data-urn on parent element
  function findUrn(element) {
    let current = element;
    while (current && current !== document.body) {
      if (current.hasAttribute && current.hasAttribute("data-urn")) {
        return current.getAttribute("data-urn");
      }
      current = current.parentElement;
    }
    return null;
  }

  // Extract query string parameter from URL or hash
  function getQueryParam(param, urlString = null) { 
    if(!urlString){
      urlSearch = new URLSearchParams(window.location.search);
    } 
    if (urlSearch.has(param)) return urlSearch.get(param);
    const hash = window.location.hash;
    const hashSearch = new URLSearchParams(hash.split("?")[1]);
    return hashSearch.get(param);
  }

  // Get all FauxPost data or a specific entry by URN
  async function getFauxPostData(urn = null) {
    return new Promise((resolve) => {
      if (urn) {
        chrome.storage.local.get([`fauxPost_${urn}`], (result) => {
          resolve(result[`fauxPost_${urn}`] || {});
        });
      } else {
        chrome.storage.local.get(null, (result) => {
          const allData = {};
          for (const [key, value] of Object.entries(result)) {
            if (key.startsWith("fauxPost_")) {
              const urn = key.replace("fauxPost_", "");
              allData[urn] = value;
            }
          }
          resolve(allData);
        });
      }
    });
  }

  // Save or update decoded message and key for a URN
  async function saveFauxPostData(urn, newData) {
    const keyName = `fauxPost_${urn}`;

    return new Promise((resolve) => {
      chrome.storage.local.get([keyName], (result) => {
        const existing = result[keyName] || {};

        // Preserve original if not already set
        if (!existing.original && newData.original) {
          existing.original = newData.original;
        }

        // Always update decoded
        existing.decoded = newData.decoded;

        // Conditionally update key
        if (newData.key) {
          existing.key = newData.key;
        }

        chrome.storage.local.set({ [keyName]: existing }, resolve);
      });
    });
  }

  // Return SHA-256 hash of given string (used to track changes)
  async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(hashBuffer)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Escapes special HTML characters to prevent XSS or malformed HTML rendering.
  // Converts &, <, >, ", and ' into their corresponding HTML entities.
  function escapeHtml(str) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  }

  // Validates whether a given URL is safe for hyperlinking.
  // Accepts both bare domains and http(s) URLs and ensures the final protocol is HTTPS.
  function isSafeUrl(url) {
    try {
      const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
      return ["https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  // Converts plain text into safe HTML that preserves formatting and enriches content.
  // - Escapes HTML to prevent injection
  // - Converts URLs into clickable links (with basic hostname and protocol validation)
  // - Converts hashtags into LinkedIn search links
  // - Converts line breaks into visual <br> spans
  function convertToFauxPostHTML(text) {
    const escaped = escapeHtml(text);

    const looseUrlRegex =
      /\b(?=[^\s]*\.)[^\s<>]*[a-zA-Z0-9]\.[^\s<>]*[a-zA-Z0-9][^\s<>]*\b/g;
    const hashtagRegex = /(^|\s)(#\w+)/g;

    const withLinks = escaped.replace(looseUrlRegex, (match) => {
      const normalized = match.startsWith("http") ? match : `https://${match}`;

      try {
        const parsed = new URL(normalized);

        // ✅ Basic hostname sanity check
        if (!parsed.hostname.match(/^[\w.-]+\.[a-z]{2,}$/i)) return match;

        // ✅ Custom safety logic
        if (!isSafeUrl(normalized)) return match;

        return `<a target="_self" tabindex="0" href="${normalized}" rel="noopener noreferrer" data-test-app-aware-link="">${escapeHtml(
          match
        )}</a>`;
      } catch (e) {
        return match;
      }
    });

    const withHashtags = withLinks.replace(hashtagRegex, (_, prefix, tag) => {
      const tagName = tag.slice(1);
      const encoded = encodeURIComponent(`#${tagName.toLowerCase()}`);
      return `${prefix}<a tabindex="0" href="https://www.linkedin.com/search/results/all/?keywords=${encoded}&origin=HASH_TAG_FROM_FEED" data-test-app-aware-link=""><span class="visually-hidden">hashtag</span><span><span aria-hidden="true">#</span>${tagName}</span></a>`;
    });

    return withHashtags.replace(/\n/g, "<span><br></span>");
  }

  // Swap original with decoded post
  function showDecoded(spanWrapper, decodedText) {
    const original = spanWrapper.querySelector(".fauxPost-original");
    const clone = spanWrapper.querySelector(".fauxPost-clone");
    if (!clone || !original) return;
    clone.innerHTML = convertToFauxPostHTML(decodedText);
    clone.style.display = "inline";
    original.style.display = "none";
  }

  // Swap decoded back to original
  function showOriginal(spanWrapper) {
    const original = spanWrapper.querySelector(".fauxPost-original");
    const clone = spanWrapper.querySelector(".fauxPost-clone");
    if (!clone || !original) return;
    clone.style.display = "none";
    original.style.display = "inline";
  }

  // Function forces focus on popup
  function trapFocus(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([type="hidden"]):not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];
    const focusableElements = container.querySelectorAll(focusableSelectors.join(','));
    if (focusableElements.length === 0) return;
  
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
  
    container.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
  
      if (e.key === 'Escape') {
        container.remove();
      }
    });
  
    // Automatically focus first input
    first.focus();
  }

  // Full UI popup when clicking FauxPost button on a post
  async function openPopup(
    mainElement,
    originalElement,
    clonedElement,
    id,
    urn
  ) {
    if (document.getElementById("fauxPost-popup")) return;

    const savedData = await getFauxPostData(urn);
    const originalText = originalElement.innerText.trim();
    const fauxPostText = savedData?.decoded || "";
    const prefillKey = savedData?.key || "";

    const popup = document.createElement("div");
    popup.id = "fauxPost-popup";
    popup.innerHTML = `
    <style>
      .fauxPost-btn {
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
      }
      .btn-copy     { background: #c54aee; color: #fdcb00; border: 2px solid #fdcb00; }
      .btn-decode   { background: #005d3f; color: #fdcb00; border: 2px solid #fdcb00; }
      .btn-original { background: #652b92; color: #fdcb00; border: 2px solid #fdcb00; }
      
      .btn-copy:hover     { background: #ffffff; color: #c54aee; border: 2px solid #c54aee; }
      .btn-decode:hover   { background: #ffffff; color: #005d3f; border: 2px solid #005d3f; }
      .btn-original:hover { background: #ffffff; color: #652b92; border: 2px solid #652b92; }

      .fauxPost-popup {
        position: fixed;
        top: 100px;
        left: 100px;
        padding: 20px;
        background: #009781;
        border: 4px solid #652b92;
        border-radius: 12px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.15);
        z-index: 9999;
        font-family: 'Segoe UI', sans-serif;
        min-width: 300px;
        color: #652b92;
        width: 25vw;
        height: 50vh;
        resize: both;
        overflow: auto;
        transform-origin: top left;
        display: flex;
        flex-direction: column;
      }


      .fauxPost-header {
        display: flex;
        align-items: stretch;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 0px;
        cursor: move;
        height: 20%;
      }
      
      .fauxPost-inner {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        margin-top: 0;
        padding-top: 0;
      }
      
      #fauxPost-original-text, #fauxPost-decoded-text, 
      #fauxPost-key, #fauxPost-url  
      {
        outline: none;
        box-shadow: none;
        width: 100%;
        margin-bottom: 5px;
        padding: 5px;
        border-radius: 6px;
        border: 2px solid #652b92;
        background: #ffffff;
        white-space: pre-wrap;
        font-family: monospace;
        box-sizing: border-box;
      }
      
      #fauxPost-original-text, #fauxPost-decoded-text {
        height: 10vh;
        font-size: 1em;
        line-height: 1.2em;
        min-height: calc(2 * 1.2em + 20px);
        max-height: 40vh;
        resize: vertical;
      }
      
      #fauxPost-original-text:hover, #fauxPost-decoded-text:hover, 
      #fauxPost-key:hover, #fauxPost-url:hover  
      {
        border: none;
        box-shadow: inset 0 0 0 2px #c54aee;
      }

      /* Only for the title image (proportional resizing) */
      .popup-image {
        max-height: 70%;
        width: 60%;
        object-fit: contain;
        flex: 1;
      }

      /* For the icon image (fixed aspect and size) */
      .popup-image-icon {
        height: 70%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        flex: 0 0 auto;
      }
      
      
    </style>
    <div id="fauxPost-draggable" class="fauxPost-popup">

            <div class="fauxPost-inner">
        <div id="fauxPost-drag-handle" class="fauxPost-header">
          <img src="${chrome.runtime.getURL(
            "/images/icon.png"
          )}" alt="FauxPost Icon" class="popup-image-icon" style="border:2px solid #652b92;border-radius:12px;background-color: #ffffff">
           <img src="${chrome.runtime.getURL(
             "/images/title.png"
           )}" alt="FauxPost Title" class="popup-image" style="border:2px solid #652b92;border-radius:12px;background-color: #ffffff">
        </div>
        <p><strong style="color:#fdcb00;">URN:</strong></p>
        <div id="fauxPost-urn" style="margin-bottom:15px;word-break:break-word;font-family:monospace;"></div>
        <p><strong style="color:#fdcb00;">Original Content:</strong></p>
        <textarea id="fauxPost-original-text" readonly></textarea>
        <p><strong style="color:#fdcb00;">FauxPost Text:</strong></p>
        <textarea id="fauxPost-decoded-text"></textarea>
        <p><strong style="color:#fdcb00;">Key:</strong></p>
        <input id="fauxPost-key" type="text" readonly/>
        <p><strong style="color:#fdcb00;">FauxPost URL:</strong></p>
        <input id="fauxPost-url" type="text" readonly/>
        <div style="display:flex;justify-content:space-between;margin-top:10px;">
          <button id="fauxPost-copy-url" class="fauxPost-btn btn-copy">Copy URL</button>
          <button id="fauxPost-decode" class="fauxPost-btn btn-decode">FauxPost</button>
          <button id="fauxPost-original" class="fauxPost-btn btn-original">Original</button>
        </div>


    </div>
  `;


      // No scale-factor transform needed; responsive layout handles resizing
  

    document.body.appendChild(popup);

    // Prevent background scroll when hovering over the popup
    popup.addEventListener('mouseenter', () => {
      document.body.style.overflow = 'hidden';
    });

    popup.addEventListener('mouseleave', () => {
      document.body.style.overflow = '';
    });

    enableDrag();

    document.getElementById("fauxPost-urn").textContent = urn;
    document.getElementById("fauxPost-original-text").value = originalText;
    document.getElementById("fauxPost-decoded-text").value = fauxPostText;
    document.getElementById("fauxPost-key").value = prefillKey;
    document.getElementById(
      "fauxPost-url"
    ).value = `https://www.linkedin.com/feed/_#fauxPost?vkey=${prefillKey}`;

    const decodedTextarea = document.getElementById("fauxPost-decoded-text");
    const keyInput = document.getElementById("fauxPost-key");
    const urlInput = document.getElementById("fauxPost-url");

    decodedTextarea.addEventListener("input", () => {
      const plain = decodedTextarea.value.trim();

      const vkey = encodeURIComponent(encodeUtf8ToBase64(plain));
      const innerUrl = `https://www.linkedin.com/feed/update/${urn}#fauxPostDecodedData?vkey=${vkey}`;

      const finalKey = encodeURIComponent(encodeUtf8ToBase64(innerUrl));

      keyInput.value = finalKey;
      urlInput.value = `https://www.linkedin.com/feed/_#fauxPost?vkey=${finalKey}`;
    });

    document.getElementById("fauxPost-copy-url").onclick = () => {
      navigator.clipboard.writeText(urlInput.value).catch(() => {
        urlInput.select();
        document.execCommand("copy");
      });

      // Remove existing message if present
      const existingMessage = document.getElementById("fauxPost-shortener-msg");
      if (existingMessage) existingMessage.remove();

      // Create new message
      const msg = document.createElement("div");
      msg.id = "fauxPost-shortener-msg";
      msg.style.marginTop = "10px";
      msg.style.padding = "10px";
      msg.style.background = "#ffffff";
      msg.style.border = "1px solid #652b92";
      msg.style.borderRadius = "6px";
      msg.style.color = "#652b92";
      msg.style.fontSize = "14px";
      msg.style.fontFamily = "Segoe UI, sans-serif";
      msg.innerHTML = `URL copied! Consider shortening it via <a href="https://tinyurl.com" target="_blank">TinyURL</a>, <a href="https://bitly.com" target="_blank">Bitly</a>, or another shortener.`;

      // Append inside the popup (after the buttons)
      const container = document.querySelector(
        "#fauxPost-popup #fauxPost-draggable"
      );
      container.appendChild(msg);

      // Auto-remove after 8 seconds
      setTimeout(() => msg.remove(), 8000);
    };

    document.getElementById("fauxPost-original").onclick = () => {
      showOriginal(mainElement);
      popup.remove();
    };
    document.getElementById("fauxPost-decode").onclick = async () => {
      showDecoded(mainElement, decodedTextarea.value);

      if(keyInput.value){
        await saveFauxPostData(urn, {
          original: originalText,
          decoded: decodedTextarea.value,
          key: keyInput.value,
        });
      }
      
      popup.remove();
    };


    //Force user focus on popup
    trapFocus(popup);
  }

  // Enable dragging the popup window around
  function enableDrag() {
    const popup = document.getElementById("fauxPost-draggable");
    const handle = document.getElementById("fauxPost-drag-handle");
    let offsetX = 0,
      offsetY = 0,
      isDragging = false;
    handle.style.cursor = "move";
    handle.addEventListener("mousedown", (e) => {
      isDragging = true;
      const rect = popup.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.body.style.userSelect = "none";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      popup.style.left = `${e.clientX - offsetX}px`;
      popup.style.top = `${e.clientY - offsetY}px`;
    });
    document.addEventListener("mouseup", () => {
      isDragging = false;
      document.body.style.userSelect = "";
    });
  }

  // Inject buttons into each visible post
  async function injectFauxPostButtons() {
    const parentSpans = document.querySelectorAll(
      "span.break-words.tvm-parent-container"
    );

    if (!document.getElementById("fauxPost-style")) {
      const style = document.createElement("style");
      style.id = "fauxPost-style";
      style.textContent = `
        .fauxPost-wrapper { display: flex; justify-content: center; padding: 10px 0; }
        .fauxPost-button { display: flex; align-items: center; gap: 5px; cursor: pointer; border: 2px solid #652b92; border-radius: 6px; background: #ffffff; padding: 2px; color: #652b92; }
        .fauxPost-button:hover { background: #c54aee; color: #ffffff; border-color: #fffffff; }
        .fauxPost-button img { width: 24px; height: 24px; background: #ffffff }

        
        .fauxPart,
				.postPart {
  				display: inline;
  				padding: 0;
  				margin: 0;
  				font-weight: bold;
  				font-size: 14px;
				}

  			.fauxPart { color: #fdcb00; }
  			.postPart { color: #005d3f; }

  			
  			.fauxPost-label {
  				display: inline-block;
  				font-weight: bold;
  				font-size: 14px;
  				line-height: 1;
  				white-space: nowrap;
				}
      `;
      document.head.appendChild(style);
    }

    for (const parent of parentSpans) {
      const originalSpan = parent.querySelector("span");
      if (!originalSpan || originalSpan.dataset.fauxPostInjected) continue;
      const urn = findUrn(originalSpan);
      const text = originalSpan.innerText.trim();
      const hash = await hashText(text);

      originalSpan.dataset.fauxPostId = hash;
      originalSpan.dataset.fauxPostInjected = "true";

      const cloneSpan = originalSpan.cloneNode(true);
      cloneSpan.classList.add("fauxPost-clone");
      cloneSpan.style.display = "none";
      cloneSpan.dataset.prefillKey = "";
      originalSpan.classList.add("fauxPost-original");
      originalSpan.insertAdjacentElement("afterend", cloneSpan);

      const container = originalSpan.closest(".fie-impression-container");
      if (!container) continue;

      const actionBar = container.querySelector(
        ".feed-shared-social-action-bar"
      );
      if (!actionBar || container.querySelector(".fauxPost-wrapper")) continue;

      const wrapper = document.createElement("div");
      wrapper.className = "fauxPost-wrapper";

      const btn = document.createElement("button");
      btn.className = "fauxPost-button";
      const img = document.createElement("img");
      img.src = chrome.runtime.getURL("/images/icon.png");
      img.alt = "FauxPost Icon";
      const spanFauxPostLabel = document.createElement("span");
      spanFauxPostLabel.classList.add("fauxPost-label");
      const spanTextFauxPart = document.createElement("span");
      spanTextFauxPart.classList.add("fauxPart");
      spanTextFauxPart.textContent = "Faux";
      const spanTextPostPart = document.createElement("span");
      spanTextPostPart.classList.add("postPart");
      spanTextPostPart.textContent = "Post";

      spanFauxPostLabel.appendChild(spanTextFauxPart);
      spanFauxPostLabel.appendChild(spanTextPostPart);

      btn.appendChild(img);
      btn.appendChild(spanFauxPostLabel);
      wrapper.appendChild(btn);

      btn.onclick = () => openPopup(parent, originalSpan, cloneSpan, hash, urn);

      actionBar.insertAdjacentElement("afterend", wrapper);
    }
  }

  // Decodes a double-encoded FauxPost key from a URL.
  // Extracts the new redirect URL, LinkedIn URN, and the final decoded message text.
  // Used for reconstructing shared FauxPost links that encode rewritten post content.
  function decodeOuterFauxPostData(param) {
    const newUrl = decodeBase64ToUtf8(decodeURIComponent(param));
    const match = newUrl.match(/urn:li:activity:\d+/);
    const urn = match ? match[0] : null;

    const innerKeyValue = getQueryParam("vkey", newUrl);

    const decodedValue = decodeBase64ToUtf8(decodeURIComponent(innerKeyValue));

    return { newUrl, urn, innerKeyValue, decodedValue };
  }

  // Auto-trigger decoding on load if URL contains a fauxPost?vkey= param
  async function setupFauxPostAutoTrigger() {
    const fauxPostRedirect = window.location.href.includes("#fauxPost?");
    const fauxPostActive = window.location.href.includes(
      "fauxPostDecodedData?"
    );

    if (fauxPostRedirect) {
      const redirectPathParam = getQueryParam("vkey");

      if (!redirectPathParam) return;

      const redirectData = decodeOuterFauxPostData(redirectPathParam);

      await saveFauxPostData(redirectData.urn, {
        original: null,
        decoded: redirectData.decodedValue,
        key: redirectPathParam,
      });

      window.location.href = redirectData.newUrl;



      return;
    }

    const vkeyParam = getQueryParam("vkey");
    if (!fauxPostActive || !vkeyParam) return;

    let alreadyTriggered = false;
    let textToInject;

    try {
      textToInject = decodeBase64ToUtf8(decodeURIComponent(vkeyParam));
    } catch {
      console.warn("⚠️ Could not decode vkey");
      return;
    }

    async function tryToInjectOnce() {
      if (alreadyTriggered) return;

      const parentSpans = document.querySelectorAll(
        "span.break-words.tvm-parent-container"
      );
      for (const parent of parentSpans) {
        const originalSpan = parent.querySelector(".fauxPost-original");
        const urn = findUrn(originalSpan);
        if (urn && location.href.includes(urn)) {
          alreadyTriggered = true;
          showDecoded(parent, textToInject);

          await saveFauxPostData(urn, {
            original: originalSpan.textContent,
            decoded: textToInject,
            key: null,
          });

          autoTriggerObserver.disconnect(); // Stop watching DOM
          return;
        }
      }
    }

    const autoTriggerObserver = new MutationObserver(() => tryToInjectOnce());
    autoTriggerObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Check once immediately
    tryToInjectOnce();

    // Also listen for URL changes only once
    let lastUrl = location.href;
    const urlWatcher = setInterval(() => {
      const current = location.href;
      if (current !== lastUrl) {
        lastUrl = current;
        tryToInjectOnce();
        document.getElementById("fauxPost-popup")?.remove();
        clearInterval(urlWatcher); // Stop the watcher after it runs once
      }
    }, 400);
  }

  setupFauxPostAutoTrigger();

  const injectObserver = new MutationObserver(() => {
    clearTimeout(window.fauxPostDebounce);
    window.fauxPostDebounce = setTimeout(injectFauxPostButtons, 250);
  });
  injectObserver.observe(document.body, { childList: true, subtree: true });

  injectFauxPostButtons();
});
