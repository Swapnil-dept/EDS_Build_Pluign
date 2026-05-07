export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  // First row = block-level config: [productImage, productName, benefits, apiEndpoint, successMsg, failureMsg, buttonText, privacyText]
  const configRow = rows[0];
  const configCells = [...configRow.children];
  const productImageCell = configCells[0];
  const productName = configCells[1]?.textContent.trim() || '';
  const benefitsCell = configCells[2];
  const apiEndpoint = configCells[3]?.textContent.trim() || '';
  const successMsg = configCells[4]?.textContent.trim() || 'Form submitted successfully!';
  const failureMsg = configCells[5]?.textContent.trim() || 'Something went wrong. Please try again.';
  const buttonText = configCells[6]?.textContent.trim() || 'Submit';
  const privacyHtml = configCells[7]?.innerHTML || '';

  // Remaining rows = form field definitions: [fieldType, fieldLabel, placeholder, options, required]
  const fieldRows = rows.slice(1);
  const fields = fieldRows.map((row) => {
    const cells = [...row.children];
    return {
      type: cells[0]?.textContent.trim().toLowerCase() || 'text',
      label: cells[1]?.textContent.trim() || '',
      placeholder: cells[2]?.textContent.trim() || '',
      options: cells[3]?.textContent.trim() || '',
      required: cells[4]?.textContent.trim().toLowerCase() === 'true',
      name: cells[5]?.textContent.trim() || cells[1]?.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || '',
    };
  });

  // Clear block
  block.textContent = '';

  // Build layout
  const wrapper = document.createElement('div');
  wrapper.className = 'lead-form-wrapper';

  // Left column — product info
  const leftCol = document.createElement('div');
  leftCol.className = 'lead-form-product';

  const picture = productImageCell?.querySelector('picture');
  if (picture) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'lead-form-product-image';
    imgWrap.append(picture);
    leftCol.append(imgWrap);
  }

  if (productName) {
    const nameEl = document.createElement('h3');
    nameEl.className = 'lead-form-product-name';
    nameEl.textContent = productName;
    leftCol.append(nameEl);
  }

  if (benefitsCell?.innerHTML.trim()) {
    const benefitsList = document.createElement('ul');
    benefitsList.className = 'lead-form-benefits';
    const items = benefitsCell.innerHTML.split(/<br\s*\/?>/).map((b) => b.trim()).filter(Boolean);
    items.forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="lead-form-check">✓</span> ${item}`;
      benefitsList.append(li);
    });
    leftCol.append(benefitsList);
  }

  wrapper.append(leftCol);

  // Right column — form
  const rightCol = document.createElement('div');
  rightCol.className = 'lead-form-fields';

  const form = document.createElement('form');
  form.className = 'lead-form-form';
  form.setAttribute('novalidate', '');

  const fieldsGrid = document.createElement('div');
  fieldsGrid.className = 'lead-form-grid';

  fields.forEach((field) => {
    const group = document.createElement('div');
    group.className = `lead-form-group lead-form-group-${field.type}`;

    const label = document.createElement('label');
    label.className = 'lead-form-label';
    label.textContent = field.label;
    label.setAttribute('for', `field-${field.name}`);
    group.append(label);

    let input;

    switch (field.type) {
      case 'toggle': {
        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'lead-form-toggle-wrap';
        const opts = field.options.split(',').map((o) => o.trim()).filter(Boolean);
        const optA = opts[0] || 'Yes';
        const optB = opts[1] || 'No';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'lead-form-toggle active';
        toggleBtn.dataset.value = optA;
        toggleBtn.setAttribute('aria-pressed', 'true');

        const labelA = document.createElement('span');
        labelA.className = 'lead-form-toggle-option active';
        labelA.textContent = optA;
        const labelB = document.createElement('span');
        labelB.className = 'lead-form-toggle-option';
        labelB.textContent = optB;

        toggleBtn.append(labelA, labelB);
        toggleBtn.addEventListener('click', () => {
          const isA = labelA.classList.contains('active');
          labelA.classList.toggle('active', !isA);
          labelB.classList.toggle('active', isA);
          toggleBtn.dataset.value = isA ? optB : optA;
        });

        input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.name;
        input.id = `field-${field.name}`;
        input.value = optA;
        toggleBtn.addEventListener('click', () => { input.value = toggleBtn.dataset.value; });

        toggleWrap.append(toggleBtn);
        group.append(toggleWrap);
        group.append(input);
        break;
      }

      case 'select':
      case 'dropdown': {
        input = document.createElement('select');
        input.className = 'lead-form-input lead-form-select';
        input.name = field.name;
        input.id = `field-${field.name}`;
        if (field.required) input.required = true;

        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = field.placeholder || 'Select';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        input.append(defaultOpt);

        const opts = field.options.split(',').map((o) => o.trim()).filter(Boolean);
        opts.forEach((opt) => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.append(option);
        });
        group.append(input);
        break;
      }

      case 'date': {
        input = document.createElement('input');
        input.type = 'date';
        input.className = 'lead-form-input';
        input.name = field.name;
        input.id = `field-${field.name}`;
        input.placeholder = field.placeholder || 'DD / MM / YYYY';
        if (field.required) input.required = true;
        group.append(input);
        break;
      }

      case 'phone':
      case 'tel': {
        const phoneWrap = document.createElement('div');
        phoneWrap.className = 'lead-form-phone-wrap';
        const prefix = document.createElement('span');
        prefix.className = 'lead-form-phone-prefix';
        prefix.textContent = field.options || '+91';
        input = document.createElement('input');
        input.type = 'tel';
        input.className = 'lead-form-input';
        input.name = field.name;
        input.id = `field-${field.name}`;
        input.placeholder = field.placeholder || 'Enter mobile number';
        input.pattern = '[0-9]{10}';
        if (field.required) input.required = true;
        phoneWrap.append(prefix, input);
        group.append(phoneWrap);
        break;
      }

      case 'email': {
        input = document.createElement('input');
        input.type = 'email';
        input.className = 'lead-form-input';
        input.name = field.name;
        input.id = `field-${field.name}`;
        input.placeholder = field.placeholder || 'Enter email';
        if (field.required) input.required = true;
        group.append(input);
        break;
      }

      default: {
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'lead-form-input';
        input.name = field.name;
        input.id = `field-${field.name}`;
        input.placeholder = field.placeholder || '';
        if (field.required) input.required = true;
        group.append(input);
        break;
      }
    }

    fieldsGrid.append(group);
  });

  form.append(fieldsGrid);

  // Privacy checkbox
  if (privacyHtml) {
    const privacyGroup = document.createElement('div');
    privacyGroup.className = 'lead-form-privacy';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'lead-form-privacy-check';
    checkbox.name = 'privacy';
    checkbox.required = true;
    const privacyLabel = document.createElement('label');
    privacyLabel.setAttribute('for', 'lead-form-privacy-check');
    privacyLabel.innerHTML = privacyHtml;
    privacyGroup.append(checkbox, privacyLabel);
    form.append(privacyGroup);
  }

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'lead-form-submit';
  submitBtn.textContent = buttonText;
  form.append(submitBtn);

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      showPopup(block, 'success', successMsg);
      form.reset();
    } catch (err) {
      showPopup(block, 'error', failureMsg);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = buttonText;
    }
  });

  rightCol.append(form);
  wrapper.append(rightCol);
  block.append(wrapper);
}

function showPopup(block, type, message) {
  // Remove any existing popup
  block.querySelector('.lead-form-popup')?.remove();

  const overlay = document.createElement('div');
  overlay.className = `lead-form-popup lead-form-popup-${type}`;

  const popup = document.createElement('div');
  popup.className = 'lead-form-popup-content';

  const icon = document.createElement('span');
  icon.className = 'lead-form-popup-icon';
  icon.textContent = type === 'success' ? '✓' : '✕';

  const msg = document.createElement('p');
  msg.className = 'lead-form-popup-message';
  msg.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lead-form-popup-close';
  closeBtn.textContent = 'OK';
  closeBtn.addEventListener('click', () => overlay.remove());

  popup.append(icon, msg, closeBtn);
  overlay.append(popup);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  block.append(overlay);
}
