// ============================================================
// 山啟快閃卡牌 - Flashcard App (MVP Fixes)
// ============================================================

const MiniMax_API_KEY = 'sk-cp-LAFqJ8zoM0LEHwXy4-7T1Fe-OMI-j-5y4IUFhAi_48AJdCE-ttvdzS0rQoDwkzjjJh1DUwz5PBci3Opntg3jRBw05LINQaVAInpiWDzkFfyLtjYDXPLtC98';
const MiniMax_ENDPOINT = 'https://api.minimax.io/v1/image_generation';
const MiniMax_MODEL = 'anycouple-01';

// Default fonts
const DEFAULT_ZH_FONT = "'ZCOOL KuaiLe', 'PingFang TC', 'Microsoft JhengHei', sans-serif";
const DEFAULT_EN_FONT = "'Comic Neue', 'Fredoka One', 'Arial Unicode MS', sans-serif";

// PDF layout constants (must match CSS exactly)
const PDF_PAGE_W = 595.28;
const PDF_PAGE_H = 841.89;
const PDF_MARGIN = 24;
const PDF_GAP = 16;
const PDF_PADDING = 24; // a4-page padding

// ============================================================
// State
// ============================================================
let cards = [];
let activeCardIndex = -1;
let cardsPerPage = 6;
let cardIdCounter = 0;

// ============================================================
// Init
// ============================================================
function init() {
  // Default: 6 cards with 2/3 image + 1/3 text allocation
  generateCardsForCount(cardsPerPage);
  renderCardList();
  selectCard(0);
  renderPreview();

  document.getElementById('addCardBtn').addEventListener('click', () => {
    addCard({});
    renderCardList();
    selectCard(cards.length - 1);
    renderPreview();
  });

  document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);

  // Per-page buttons
  document.querySelectorAll('.per-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.per-page-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const newCount = parseInt(btn.dataset.count);
      cardsPerPage = newCount;
      // Problem 4: Select N → generate N cards
      generateCardsForCount(newCount);
      renderCardList();
      activeCardIndex = -1;
      selectCard(0);
      renderPreview();
    });
  });
}

// ============================================================
// Problem 2 & 4: Generate N cards with 2/3 image / 1/3 text allocation
// ============================================================
function generateCardsForCount(n) {
  cards = [];
  cardIdCounter = 0;

  const imageCount = Math.round(n * 2 / 3);  // 2/3 image cards
  const textCount = n - imageCount;           // 1/3 text cards
  const zhCount = Math.floor(textCount / 2);   // half Chinese
  const enCount = textCount - zhCount;         // rest English

  for (let i = 0; i < imageCount; i++) {
    addCard({ showImage: true, showZh: true, showEn: false, isText: false });
  }
  for (let i = 0; i < zhCount; i++) {
    addCard({ showImage: false, showZh: true, showEn: false, isText: true });
  }
  for (let i = 0; i < enCount; i++) {
    addCard({ showImage: false, showZh: false, showEn: true, isText: true });
  }
}

function addCard(opts = {}) {
  cards.push({
    id: cardIdCounter++,
    image: null,
    imageSource: null,
    zh: opts.isText && opts.showZh ? getDefaultText('zh', cards.length) : '',
    en: opts.isText && opts.showEn ? getDefaultText('en', cards.length) : '',
    showImage: opts.showImage !== undefined ? opts.showImage : true,
    showZh: opts.showZh !== undefined ? opts.showZh : true,
    showEn: opts.showEn !== undefined ? opts.showEn : true,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    fontFamilyZh: 'ZCOOL KuaiLe',
    fontFamilyEn: 'Comic Neue'
  });
}

function getDefaultText(lang, index) {
  if (lang === 'zh') {
    const samples = ['苹果', '香蕉', '猫猫', '狗狗', '星星', '月亮', '太阳', '花朵', '书本', '车子', '飞机', '火车'];
    return samples[index % samples.length];
  } else {
    const samples = ['Apple', 'Banana', 'Cat', 'Dog', 'Star', 'Moon', 'Sun', 'Flower', 'Book', 'Car', 'Plane', 'Train'];
    return samples[index % samples.length];
  }
}

// ============================================================
// Card Management
// ============================================================
function deleteCard(index) {
  cards.splice(index, 1);
  if (activeCardIndex >= cards.length) {
    activeCardIndex = cards.length - 1;
  }
  if (cards.length === 0) {
    addCard({});
    activeCardIndex = 0;
  }
  renderCardList();
  if (activeCardIndex >= 0) selectCard(activeCardIndex);
  else renderPreview();
  renderPreview();
}

function selectCard(index) {
  activeCardIndex = index;
  renderCardList();
  renderCardEditor();
}

function renderCardList() {
  const container = document.getElementById('cardList');
  container.innerHTML = '';
  cards.forEach((card, i) => {
    const item = document.createElement('div');
    item.className = 'card-list-item' + (i === activeCardIndex ? ' active' : '');
    item.onclick = (e) => {
      if (!e.target.classList.contains('card-delete-btn')) selectCard(i);
    };

    const typeTag = card.showImage ? '🖼️' : (card.showZh ? '中' : 'EN');
    const thumb = card.image
      ? `<img class="card-thumb" src="${card.image}" alt="thumb">`
      : `<div class="card-thumb-placeholder">${typeTag}</div>`;

    const name = card.zh || card.en || `卡片 ${i + 1}`;
    const lang = [card.showZh && '中文', card.showEn && '英文', card.showImage && '圖像'].filter(Boolean).join(' / ') || '未填';

    item.innerHTML = `
      ${thumb}
      <div class="card-info">
        <div class="card-info-name">${escapeHtml(name)}</div>
        <div class="card-info-lang">${lang}</div>
      </div>
      <button class="card-delete-btn" title="刪除">✕</button>
    `;

    item.querySelector('.card-delete-btn').onclick = (e) => {
      e.stopPropagation();
      deleteCard(i);
    };

    container.appendChild(item);
  });
}

// ============================================================
// Card Editor
// ============================================================
function renderCardEditor() {
  const container = document.getElementById('cardEditor');
  if (activeCardIndex < 0 || activeCardIndex >= cards.length) {
    container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">請先選擇一張卡片</p>';
    return;
  }

  const card = cards[activeCardIndex];

  container.innerHTML = `
    <div class="editor-row">
      <label>圖像</label>
      <div class="image-section">
        <div class="image-btn-row">
          <button class="image-btn ai-btn" id="aiImageBtn">🤖 AI 生成</button>
          <button class="image-btn" id="uploadImageBtn">📤 上載圖片</button>
          <button class="image-btn" id="clearImageBtn">🗑️ 清除</button>
        </div>
        <div class="ai-prompt-row">
          <input type="text" id="aiPromptInput" placeholder="輸入提示詞，例如：Cute panda, bright colors...">
        </div>
        <div class="ai-generate-row">
          <button class="btn-generate" id="generateImageBtn">✨ 生成圖像</button>
        </div>
        ${card.image
          ? `<img class="image-preview" id="imagePreview" src="${card.image}" alt="preview">`
          : `<div class="image-placeholder" id="imagePlaceholder"><span>🖼️</span><span>尚無圖像</span></div>`
        }
      </div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png" style="display:none">
    </div>

    <div class="editor-row">
      <label>中文文字</label>
      <input type="text" id="zhInput" value="${escapeHtml(card.zh)}" placeholder="輸入繁體中文">
    </div>

    <div class="editor-row">
      <label>英文文字</label>
      <input type="text" id="enInput" value="${escapeHtml(card.en)}" placeholder="Enter English text">
    </div>

    <div class="editor-row">
      <label>顯示設定</label>
      <div class="text-controls">
        <div class="text-toggle-row">
          <label class="text-toggle ${card.showImage ? 'active' : ''}" id="toggleShowImage">
            <input type="checkbox" ${card.showImage ? 'checked' : ''}> 🖼️ 圖像
          </label>
          <label class="text-toggle ${card.showZh ? 'active' : ''}" id="toggleShowZh">
            <input type="checkbox" ${card.showZh ? 'checked' : ''}> 中文
          </label>
          <label class="text-toggle ${card.showEn ? 'active' : ''}" id="toggleShowEn">
            <input type="checkbox" ${card.showEn ? 'checked' : ''}> EN
          </label>
        </div>
      </div>
    </div>

    <div class="editor-row">
      <label>文字編輯</label>
      <div class="text-controls">
        <div class="text-controls-grid">
          <div>
            <label style="font-size:0.75rem;color:var(--text-light)">中文字體</label>
            <select class="font-select" id="fontFamilyZhSelect">
              <option value="ZCOOL KuaiLe" ${card.fontFamilyZh === 'ZCOOL KuaiLe' ? 'selected' : ''}>ZCOOL 可愛</option>
              <option value="PingFang TC" ${card.fontFamilyZh === 'PingFang TC' ? 'selected' : ''}>PingFang TC</option>
              <option value="Microsoft JhengHei" ${card.fontFamilyZh === 'Microsoft JhengHei' ? 'selected' : ''}>Microsoft JhengHei</option>
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem;color:var(--text-light)">英文字體</label>
            <select class="font-select" id="fontFamilyEnSelect">
              <option value="Comic Neue" ${card.fontFamilyEn === 'Comic Neue' ? 'selected' : ''}>Comic Neue</option>
              <option value="Fredoka One" ${card.fontFamilyEn === 'Fredoka One' ? 'selected' : ''}>Fredoka One</option>
              <option value="Arial Unicode MS" ${card.fontFamilyEn === 'Arial Unicode MS' ? 'selected' : ''}>Arial Unicode MS</option>
            </select>
          </div>
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--text-light)">粗幼</label>
          <select class="font-select" id="fontWeightSelect">
            <option value="normal" ${card.fontWeight === 'normal' ? 'selected' : ''}>正常</option>
            <option value="bold" ${card.fontWeight === 'bold' ? 'selected' : ''}>粗體</option>
          </select>
        </div>
        <div class="font-size-row">
          <label style="font-size:0.75rem;color:var(--text-light)">字體大小</label>
          <input type="range" id="fontSizeRange" min="10" max="36" value="${card.fontSize}">
          <span id="fontSizeValue">${card.fontSize}px</span>
        </div>
        <div class="text-align-row">
          <button class="align-btn ${card.textAlign === 'left' ? 'active' : ''}" data-align="left" title="靠左">⬅ 左</button>
          <button class="align-btn ${card.textAlign === 'center' ? 'active' : ''}" data-align="center" title="置中">⬌ 中</button>
          <button class="align-btn ${card.textAlign === 'right' ? 'active' : ''}" data-align="right" title="靠右">➡ 右</button>
        </div>
      </div>
    </div>
  `;

  // Bind events
  document.getElementById('zhInput').addEventListener('input', (e) => {
    cards[activeCardIndex].zh = e.target.value;
    renderCardList();
    renderPreview();
  });

  document.getElementById('enInput').addEventListener('input', (e) => {
    cards[activeCardIndex].en = e.target.value;
    renderCardList();
    renderPreview();
  });

  // Toggle buttons
  ['Image', 'Zh', 'En'].forEach(field => {
    const btn = document.getElementById('toggleShow' + field);
    btn.addEventListener('click', () => {
      const key = 'show' + field;
      cards[activeCardIndex][key] = !cards[activeCardIndex][key];
      btn.classList.toggle('active', cards[activeCardIndex][key]);
      btn.querySelector('input').checked = cards[activeCardIndex][key];
      renderPreview();
    });
  });

  // Font controls
  document.getElementById('fontFamilyZhSelect').addEventListener('change', (e) => {
    cards[activeCardIndex].fontFamilyZh = e.target.value;
    renderPreview();
  });

  document.getElementById('fontFamilyEnSelect').addEventListener('change', (e) => {
    cards[activeCardIndex].fontFamilyEn = e.target.value;
    renderPreview();
  });

  document.getElementById('fontWeightSelect').addEventListener('change', (e) => {
    cards[activeCardIndex].fontWeight = e.target.value;
    renderPreview();
  });

  document.getElementById('fontSizeRange').addEventListener('input', (e) => {
    cards[activeCardIndex].fontSize = parseInt(e.target.value);
    document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
    renderPreview();
  });

  // Text align
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cards[activeCardIndex].textAlign = btn.dataset.align;
      document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPreview();
    });
  });

  // Image controls
  document.getElementById('uploadImageBtn').onclick = () => {
    document.getElementById('fileInput').click();
  };

  document.getElementById('fileInput').addEventListener('change', handleFileUpload);

  document.getElementById('clearImageBtn').onclick = () => {
    cards[activeCardIndex].image = null;
    cards[activeCardIndex].imageSource = null;
    renderCardEditor();
    renderCardList();
    renderPreview();
  };

  document.getElementById('generateImageBtn').onclick = generateImage;
}

// ============================================================
// Image Upload & Crop
// ============================================================
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    cropToSquare(ev.target.result).then(dataUrl => {
      cards[activeCardIndex].image = dataUrl;
      cards[activeCardIndex].imageSource = 'upload';
      renderCardEditor();
      renderCardList();
      renderPreview();
    });
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

function cropToSquare(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = dataUrl;
  });
}

// ============================================================
// Problem 5: AI Image Generation with robust error handling
// ============================================================
async function generateImage() {
  const prompt = document.getElementById('aiPromptInput').value.trim();
  if (!prompt) {
    showToast('請輸入提示詞', 'error');
    return;
  }

  const btn = document.getElementById('generateImageBtn');
  btn.disabled = true;
  btn.textContent = '⏳ 生成中...';
  showToast('正在生成圖像...', 'info');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(MiniMax_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MiniMax_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MiniMax_MODEL,
        prompt: prompt,
        image_size: '1024x1024',
        num_images: 1
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      let errMsg = 'API 錯誤 (HTTP ' + response.status + ')';
      try {
        const errBody = await response.json();
        if (errBody.error && errBody.error.message) errMsg = errBody.error.message;
        else if (errBody.message) errMsg = errBody.message;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const data = await response.json();

    // Check for various response formats
    let imageUrl = null;

    if (data.data && data.data[0] && data.data[0].url) {
      imageUrl = data.data[0].url;
    } else if (data.data && data.data[0] && data.data[0].b64_json) {
      // Handle base64 response
      const b64 = data.data[0].b64_json;
      cards[activeCardIndex].image = 'data:image/png;base64,' + b64;
      cards[activeCardIndex].imageSource = 'ai';
      renderCardEditor();
      renderCardList();
      renderPreview();
      showToast('✅ 圖像生成成功！', 'success');
      btn.disabled = false;
      btn.textContent = '✨ 生成圖像';
      return;
    } else if (data.image_url || data.url || data.result_url) {
      imageUrl = data.image_url || data.url || data.result_url;
    }

    if (!imageUrl) {
      console.warn('MiniMax response:', JSON.stringify(data));
      throw new Error('回應格式不符，請稍後再試');
    }

    // Download and crop
    const imgResponse = await fetch(imageUrl);
    if (!imgResponse.ok) throw new Error('下載圖像失敗');

    const blob = await imgResponse.blob();
    const reader = new FileReader();
    reader.onload = (ev) => {
      cropToSquare(ev.target.result).then(dataUrl => {
        cards[activeCardIndex].image = dataUrl;
        cards[activeCardIndex].imageSource = 'ai';
        renderCardEditor();
        renderCardList();
        renderPreview();
        showToast('✅ 圖像生成成功！', 'success');
        btn.disabled = false;
        btn.textContent = '✨ 生成圖像';
      });
    };
    reader.readAsDataURL(blob);

  } catch (err) {
    console.error('MiniMax API error:', err);

    let userMsg = '生成失敗';
    if (err.name === 'AbortError' || err.message.includes('abort')) {
      userMsg = '⏱️ 生成超時（30秒），請稍後再試';
    } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      userMsg = '🌐 網絡連線失敗，請檢查網絡後再試';
    } else if (err.message.includes('API 錯誤') || err.message.includes('HTTP')) {
      userMsg = '⚙️ MiniMax API 故障：' + err.message;
    } else {
      userMsg = '⚙️ 生成失敗：' + err.message;
    }

    showToast(userMsg, 'error');
    btn.disabled = false;
    btn.textContent = '✨ 生成圖像';

    // Use placeholder image
    usePlaceholderImage();
  }
}

function usePlaceholderImage() {
  // Generate a colorful SVG placeholder
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect fill="${color}" width="512" height="512"/><text x="256" y="270" font-family="sans-serif" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">🎴</text></svg>`;
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  cards[activeCardIndex].image = 'data:image/svg+xml;base64,' + b64;
  cards[activeCardIndex].imageSource = 'placeholder';
  renderCardEditor();
  renderCardList();
  renderPreview();
}

// ============================================================
// Problem 1: Preview matches PDF exactly
// ============================================================
function renderPreview() {
  const container = document.getElementById('previewContainer');
  const pages = Math.ceil(cards.length / cardsPerPage);

  let html = '';

  for (let p = 0; p < pages; p++) {
    const pageCards = cards.slice(p * cardsPerPage, (p + 1) * cardsPerPage);
    html += buildAPage(pageCards, p);
  }

  container.innerHTML = html;
}

function buildAPage(pageCards) {
  const n = pageCards.length;
  const cols = cardsPerPage <= 1 ? 1 : cardsPerPage <= 2 ? 2 : cardsPerPage <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);

  let gridStyle = `grid-template-columns: repeat(${cols}, 1fr);`;
  if (rows > 1 && cardsPerPage <= 4) {
    gridStyle += `grid-template-rows: repeat(${rows}, 1fr);`;
  }

  let cardsHtml = '';
  pageCards.forEach(card => {
    cardsHtml += buildFlashcard(card);
  });

  // Use same padding as PDF: PDF_PADDING=24
  return `<div class="a4-page" style="${gridStyle}">${cardsHtml}</div>`;
}

function buildFlashcard(card) {
  const imgHtml = card.showImage
    ? (card.image
        ? `<img class="flashcard-img" src="${card.image}" alt="card">`
        : `<div class="flashcard-img-placeholder">🖼️</div>`)
    : '';

  const zhStyle = `font-size:${card.fontSize}px;font-weight:${card.fontWeight};text-align:${card.textAlign};font-family:${card.fontFamilyZh},sans-serif;`;
  const enStyle = `font-size:${Math.max(10, card.fontSize - 4)}px;font-weight:${card.fontWeight};text-align:${card.textAlign};font-family:${card.fontFamilyEn},sans-serif;color:${card.showZh && card.showEn ? 'var(--text-light)' : 'var(--text)'};`;

  const zhHtml = card.showZh ? `<div class="flashcard-zh" style="${zhStyle}">${escapeHtml(card.zh)}</div>` : '';
  const enHtml = card.showEn ? `<div class="flashcard-en" style="${enStyle}">${escapeHtml(card.en)}</div>` : '';

  return `<div class="flashcard">
    ${imgHtml}
    <div class="flashcard-text">
      ${zhHtml}
      ${enHtml}
    </div>
  </div>`;
}

// ============================================================
// Problem 1: PDF generation via html2canvas screenshot
// of the actual preview DOM — guarantees PDF = preview
// ============================================================
async function downloadPDF() {
  showToast('正在生成 PDF...', 'info');
  const downloadBtn = document.getElementById('downloadPdfBtn');
  downloadBtn.disabled = true;
  downloadBtn.textContent = '⏳ 生成中...';

  try {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    const pageElements = document.querySelectorAll('#previewContainer .a4-page');
    if (pageElements.length === 0) {
      throw new Error('找不到預覽頁面');
    }

    for (let i = 0; i < pageElements.length; i++) {
      if (i > 0) pdf.addPage();

      const pageEl = pageElements[i];

      // Use html2canvas to screenshot the exact preview element
      const canvas = await html2canvas(pageEl, {
        scale: 2,                    // higher resolution
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: pageEl.offsetWidth,
        height: pageEl.offsetHeight,
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_PAGE_W, PDF_PAGE_H);
    }

    pdf.save('山啟快閃卡牌.pdf');
    showToast('✅ PDF 下載成功！', 'success');
  } catch (err) {
    console.error(err);
    showToast('PDF 生成失敗：' + err.message, 'error');
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇️ 下載 PDF';
  }
}

// ============================================================
// Utilities
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ============================================================
// Start
// ============================================================
document.addEventListener('DOMContentLoaded', init);
