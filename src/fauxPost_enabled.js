/**
 * FauxPost Options Page Script
 * ----------------------------
 * This script powers the options UI for the FauxPost Chrome Extension.
 * It allows users to:
 * - Toggle the extension on/off
 * - View all saved FauxPosts (URNs with Base64-encoded keys)
 * - Copy shareable FauxPost URLs
 * - Select and delete individual or all saved records
 * 
 * Uses chrome.storage.local to manage extension state and saved posts.
 */

// Retrieves all saved FauxPost entries from chrome.storage.local
// Filters for keys starting with 'fauxPost_' and returns them keyed by URN
function getFauxPostData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (allItems) => {
      const fauxPostData = {};

      for (const key in allItems) {
        if (key.startsWith('fauxPost_')) {
          const urn = key.slice('fauxPost_'.length);
          fauxPostData[urn] = allItems[key];
        }
      }

      resolve(fauxPostData);
    });
  });
}

// Constructs shareable FauxPost URLs for all saved entries; includes placeholder for missing keys
async function buildFauxPostURLs() {
  const savedData = await getFauxPostData();
  return Object.entries(savedData).map(([urn, data]) => ({
    urn,
    url: data.key
      ? `https://www.linkedin.com/feed/_#fauxPost?vkey=${data.key}`
      : '(missing key)'
  }));
}

// Enables or disables the Clear button based on whether any checkboxes are selected
function updateClearButtonState() {
  const clearBtn = document.getElementById('clearDataBtn');
  const checked = document.querySelectorAll('.delete-checkbox:checked').length > 0;
  clearBtn.disabled = !checked;
}

// Renders the list of saved FauxPost links in a table
// Includes delete checkboxes and a 'Select All' control
async function renderFauxPostLinks(container) {
  const tbody = container.querySelector('tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const savedData = await getFauxPostData();
  const urls = await buildFauxPostURLs();
  const urns = Object.keys(savedData);

  const recordCount = document.getElementById('recordCount');
  const count = urns.length;
  recordCount.textContent = `${count} saved record${count === 1 ? '' : 's'}`;
	
	urls.forEach(({ urn, url }, index) => {
    const row = document.createElement('tr');

    const numberCell = document.createElement('td');
    numberCell.textContent = `${index + 1}.`;
    numberCell.style.fontWeight = 'bold';
    numberCell.style.color = '#fdcb00';
    numberCell.style.paddingRight = '6px';
    numberCell.style.whiteSpace = 'nowrap';

    const linkCell = document.createElement('td');
    linkCell.style.overflowX = 'auto';
    linkCell.style.whiteSpace = 'nowrap';
    linkCell.style.maxWidth = '100%';
    linkCell.style.display = 'block';

    const link = document.createElement('a');
    link.id = 'postLink';
    link.href = url; 
    link.textContent = link.href;
    link.target = '_blank';
    linkCell.appendChild(link);

    const deleteCell = document.createElement('td');
    deleteCell.style.left = '0';
		deleteCell.style.color = '#fdcb00';
		deleteCell.style.textAlign = 'right';
		deleteCell.style.whiteSpace = 'nowrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'delete-checkbox';
    checkbox.dataset.urn = urn;
    checkbox.addEventListener('change', updateClearButtonState);
    deleteCell.appendChild(checkbox);
    

    row.appendChild(numberCell);
    row.appendChild(linkCell);
    row.appendChild(deleteCell);
    tbody.appendChild(row);
  });

  // Set up "Select All"
const selectAll = document.getElementById('selectAllToDelete');
if (selectAll) {
  selectAll.checked = false;

  // 1. Clicking Select All updates all checkboxes
  selectAll.onclick = () => {
    const boxes = document.querySelectorAll('.delete-checkbox');
    boxes.forEach((box) => (box.checked = selectAll.checked));
    updateClearButtonState(); //  update after toggling
  };

  // 2. Any time a row checkbox is clicked, update Select All
  const boxes = document.querySelectorAll('.delete-checkbox');
  boxes.forEach((box) => {
    box.addEventListener('change', () => {
      const allBoxes = document.querySelectorAll('.delete-checkbox');
      const allChecked = [...allBoxes].every((b) => b.checked);
      selectAll.checked = allChecked;
    });
  });
}
}

// On page load:
// - Initialize toggle state
// - Render saved FauxPost links
// - Handle Clear button logic (bulk delete)
document.addEventListener('DOMContentLoaded', async () => {
  const checkbox = document.getElementById('toggleActive');
  const clearBtn = document.getElementById('clearDataBtn');
  const linkContainer = document.getElementById('fauxPostLinks');

  const { fauxPostEnabled } = await chrome.storage.local.get('fauxPostEnabled');
  checkbox.checked = !!fauxPostEnabled;

  checkbox.addEventListener('change', async () => {
    await chrome.storage.local.set({ fauxPostEnabled: checkbox.checked });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.reload(tab.id);
  });

  await renderFauxPostLinks(linkContainer);
  
  
  clearBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.delete-checkbox:checked');

    if (checkboxes.length > 0) {
      // Delete only selected records
      const keysToRemove = Array.from(checkboxes).map(
        (box) => `fauxPost_${box.dataset.urn}`
      );
      await chrome.storage.local.remove(keysToRemove);
    }

    await renderFauxPostLinks(linkContainer);

    updateClearButtonState();
});
  
  
updateClearButtonState(); // Refresh Clear button state on page load
  
});
