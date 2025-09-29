/*
 * Professional Dropdown Enhancement
 * Custom dark mode dropdown implementation with keyboard navigation
 */

class ProfessionalDropdown {
  constructor(element) {
    this.element = element;
    this.trigger = null;
    this.dropdown = null;
    this.options = [];
    this.selectedOption = null;
    this.isOpen = false;
    
    this.init();
  }
  
  init() {
    this.createStructure();
    this.bindEvents();
    this.setupAccessibility();
  }
  
  createStructure() {
    const select = this.element.querySelector('select') || this.element;
    const selectedText = select.options[select.selectedIndex]?.text || 'Select an option';
    
    // Create custom dropdown structure
    this.element.classList.add('custom-select');
    
    // Create trigger
    this.trigger = document.createElement('div');
    this.trigger.className = 'custom-select-trigger';
    this.trigger.innerHTML = `
      <span class="custom-select-value">${selectedText}</span>
    `;
    
    // Create dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'custom-select-dropdown';
    
    // Create options
    Array.from(select.options).forEach((option, index) => {
      const optionElement = document.createElement('div');
      optionElement.className = 'custom-select-option';
      optionElement.textContent = option.text;
      optionElement.dataset.value = option.value;
      optionElement.dataset.index = index;
      
      if (option.selected) {
        optionElement.classList.add('selected');
        this.selectedOption = optionElement;
      }
      
      this.options.push(optionElement);
      this.dropdown.appendChild(optionElement);
    });
    
    // Hide original select
    select.style.display = 'none';
    this.originalSelect = select;
    
    // Insert custom dropdown
    this.element.appendChild(this.trigger);
    this.element.appendChild(this.dropdown);
  }
  
  bindEvents() {
    // Toggle dropdown
    this.trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggle();
    });
    
    // Option selection
    this.options.forEach(option => {
      option.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectOption(option);
      });
      
      option.addEventListener('mouseenter', () => {
        this.highlightOption(option);
      });
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.close();
      }
    });
    
    // Keyboard navigation
    this.trigger.addEventListener('keydown', (e) => {
      this.handleKeyboard(e);
    });
    
    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        this.trigger.focus();
      }
    });
  }
  
  setupAccessibility() {
    this.trigger.setAttribute('tabindex', '0');
    this.trigger.setAttribute('role', 'combobox');
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    
    this.dropdown.setAttribute('role', 'listbox');
    
    this.options.forEach((option, index) => {
      option.setAttribute('role', 'option');
      option.setAttribute('id', `option-${index}-${Math.random().toString(36).substr(2, 9)}`);
    });
  }
  
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  open() {
    this.isOpen = true;
    this.element.classList.add('active');
    this.trigger.setAttribute('aria-expanded', 'true');
    
    // Animate dropdown
    const dropdown = this.dropdown;
    dropdown.style.display = 'block';
    
    // Scroll to selected option
    if (this.selectedOption) {
      this.selectedOption.scrollIntoView({ block: 'nearest' });
    }
    
    // Focus management
    requestAnimationFrame(() => {
      if (this.selectedOption) {
        this.highlightOption(this.selectedOption);
      } else if (this.options.length > 0) {
        this.highlightOption(this.options[0]);
      }
    });
  }
  
  close() {
    this.isOpen = false;
    this.element.classList.remove('active');
    this.trigger.setAttribute('aria-expanded', 'false');
    
    // Remove highlight from all options
    this.options.forEach(option => {
      option.classList.remove('highlighted');
    });
  }
  
  selectOption(option) {
    // Remove previous selection
    if (this.selectedOption) {
      this.selectedOption.classList.remove('selected');
    }
    
    // Set new selection
    option.classList.add('selected');
    this.selectedOption = option;
    
    // Update trigger text
    const valueSpan = this.trigger.querySelector('.custom-select-value');
    valueSpan.textContent = option.textContent;
    
    // Update original select
    this.originalSelect.value = option.dataset.value;
    
    // Trigger change event
    const changeEvent = new Event('change', { bubbles: true });
    this.originalSelect.dispatchEvent(changeEvent);
    
    // Close dropdown
    this.close();
    
    // Return focus to trigger
    this.trigger.focus();
    
    // Add visual feedback
    this.trigger.style.transform = 'scale(0.98)';
    setTimeout(() => {
      this.trigger.style.transform = '';
    }, 150);
  }
  
  highlightOption(option) {
    // Remove highlight from all options
    this.options.forEach(opt => opt.classList.remove('highlighted'));
    
    // Highlight current option
    option.classList.add('highlighted');
    this.highlightedOption = option;
  }
  
  handleKeyboard(e) {
    if (!this.isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.open();
      }
      return;
    }
    
    let highlightedIndex = this.options.indexOf(this.highlightedOption);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, this.options.length - 1);
        this.highlightOption(this.options[highlightedIndex]);
        this.scrollToHighlighted();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        this.highlightOption(this.options[highlightedIndex]);
        this.scrollToHighlighted();
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (this.highlightedOption) {
          this.selectOption(this.highlightedOption);
        }
        break;
        
      case 'Home':
        e.preventDefault();
        this.highlightOption(this.options[0]);
        this.scrollToHighlighted();
        break;
        
      case 'End':
        e.preventDefault();
        this.highlightOption(this.options[this.options.length - 1]);
        this.scrollToHighlighted();
        break;
        
      case 'Tab':
        this.close();
        break;
    }
  }
  
  scrollToHighlighted() {
    if (this.highlightedOption) {
      this.highlightedOption.scrollIntoView({ 
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }
  
  setValue(value) {
    const option = this.options.find(opt => opt.dataset.value === value);
    if (option) {
      this.selectOption(option);
    }
  }
  
  destroy() {
    // Remove event listeners
    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleEscape);
    
    // Restore original select
    this.originalSelect.style.display = '';
    
    // Remove custom elements
    this.trigger.remove();
    this.dropdown.remove();
    
    // Remove classes
    this.element.classList.remove('custom-select', 'active');
  }
}

// Auto-initialize all selects with professional styling
function initializeProfessionalDropdowns() {
  const selects = document.querySelectorAll('select.form-input, select.form-select');
  
  selects.forEach(select => {
    // Skip if already initialized
    if (select.closest('.custom-select')) return;
    
    // Create wrapper if needed
    let wrapper = select.parentElement;
    if (!wrapper.classList.contains('form-group') && !wrapper.classList.contains('custom-select-wrapper')) {
      wrapper = document.createElement('div');
      wrapper.className = 'custom-select-wrapper';
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
    }
    
    // Initialize professional dropdown
    new ProfessionalDropdown(wrapper);
  });
}

// Enhanced form validation
function enhanceFormValidation() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      // Real-time validation
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => clearValidation(input));
    });
  });
}

function validateField(field) {
  const value = field.value.trim();
  const type = field.type;
  const required = field.hasAttribute('required');
  
  // Clear previous validation
  clearValidation(field);
  
  let isValid = true;
  let message = '';
  
  // Required validation
  if (required && !value) {
    isValid = false;
    message = 'This field is required';
  }
  
  // Email validation
  if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      isValid = false;
      message = 'Please enter a valid email address';
    }
  }
  
  // URL validation
  if (type === 'url' && value) {
    try {
      new URL(value);
    } catch {
      isValid = false;
      message = 'Please enter a valid URL';
    }
  }
  
  // Number validation
  if (type === 'number' && value) {
    const min = field.getAttribute('min');
    const max = field.getAttribute('max');
    const numValue = parseFloat(value);
    
    if (min && numValue < parseFloat(min)) {
      isValid = false;
      message = `Value must be at least ${min}`;
    } else if (max && numValue > parseFloat(max)) {
      isValid = false;
      message = `Value must be no more than ${max}`;
    }
  }
  
  // Apply validation state
  if (!isValid) {
    field.classList.add('error');
    showValidationMessage(field, message, 'error');
  } else if (value) {
    field.classList.add('success');
  }
}

function clearValidation(field) {
  field.classList.remove('error', 'success');
  hideValidationMessage(field);
}

function showValidationMessage(field, message, type) {
  hideValidationMessage(field);
  
  const messageElement = document.createElement('div');
  messageElement.className = `form-${type}`;
  messageElement.textContent = message;
  
  field.parentNode.appendChild(messageElement);
}

function hideValidationMessage(field) {
  const existingMessage = field.parentNode.querySelector('.form-error, .form-success');
  if (existingMessage) {
    existingMessage.remove();
  }
}

// Enhanced button interactions
function enhanceButtonInteractions() {
  const buttons = document.querySelectorAll('.btn');
  
  buttons.forEach(button => {
    // Ripple effect
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
    
    // Loading state management
    if (button.type === 'submit') {
      button.addEventListener('click', function() {
        if (!this.disabled) {
          this.classList.add('btn-loading');
          
          // Auto-remove loading state after 3 seconds
          setTimeout(() => {
            this.classList.remove('btn-loading');
          }, 3000);
        }
      });
    }
  });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initializeProfessionalDropdowns();
  enhanceFormValidation();
  enhanceButtonInteractions();
});

// Export for use in other scripts
window.ProfessionalUI = {
  initializeDropdowns: initializeProfessionalDropdowns,
  enhanceValidation: enhanceFormValidation,
  enhanceButtons: enhanceButtonInteractions,
  ProfessionalDropdown
};