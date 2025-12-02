// src/resources/js/journal.js
document.addEventListener('DOMContentLoaded', () => {

  // guided prompt data
  const prompts = {
    anxious: [
      "What is making me feel anxious right now?",
      "What can I control in this situation?",
      "What would I tell a friend feeling this way?"
    ],
    grateful: [
      "What are three things I'm grateful for today?",
      "Who has positively impacted my life recently?",
      "What small moment brought me joy today?"
    ],
    goals: [
      "What goal do I want to achieve this month?",
      "What's one step I can take today toward my goals?",
      "What have I learned recently that will help me grow?"
    ],
    reflective: [
      "What challenged me today and what did I learn?",
      "How have I changed in the past year?",
      "What patterns do I notice in my thoughts or behaviors?"
    ],
    happy: [
      "What accomplishment am I proud of today?",
      "What made me smile or laugh recently?",
      "What positive change have I noticed in my life?"
    ]
  };

  // prompt display
  const topicSelect = document.getElementById('topic');
  const promptsContainer = document.getElementById('promptsContainer');
  const promptsList = document.getElementById('promptsList');
  const responseContainer = document.getElementById('responseContainer');
  const guidedContent = document.getElementById('guidedContent');
  const submitBtn = document.getElementById('guidedSubmit');
  const selectedPromptDisplay = document.getElementById('selectedPromptDisplay');
  const hiddenTopic = document.getElementById('hidden-topic');
  const hiddenPrompt = document.getElementById('hidden-prompt');

  if (topicSelect) {
    topicSelect.addEventListener('change', function() {
      const topic = this.value;
      
      if (topic && prompts[topic]) {
        promptsList.innerHTML = '';
        prompts[topic].forEach((prompt, index) => {
          const div = document.createElement('div');
          div.className = 'form-check prompt-option mb-2';
          div.innerHTML = `
            <input 
              class="form-check-input" 
              type="radio" 
              name="prompt" 
              id="prompt${index}" 
              value="${prompt}" 
              required>
            <label class="form-check-label" for="prompt${index}">
              ${prompt}
            </label>
          `;
          promptsList.appendChild(div);
        });
        
        promptsContainer.style.display = 'block';
        
        // prompt slection
        promptsList.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', function() {
            if (this.checked) {
              const selectedPrompt = this.value;
              responseContainer.style.display = 'block';
              submitBtn.disabled = false;
              hiddenTopic.value = topic;
              hiddenPrompt.value = selectedPrompt;
              guidedContent.placeholder = `Respond to: ${selectedPrompt}`;
              selectedPromptDisplay.innerHTML = `<i class="bi bi-lightbulb-fill me-2"></i>${selectedPrompt}`;
              responseContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          });
        });
      } else {
        promptsContainer.style.display = 'none';
        responseContainer.style.display = 'none';
        submitBtn.disabled = true;
      }
    });
  }
  const quickContent = document.getElementById('quick-content');
  const quickCharCount = document.getElementById('quick-char-count');
  
  if (quickContent && quickCharCount) {
    quickContent.addEventListener('input', function() {
      quickCharCount.textContent = `${this.value.length} characters`;
    });
  }

  const guidedCharCount = document.getElementById('guided-char-count');
  
  if (guidedContent && guidedCharCount) {
    guidedContent.addEventListener('input', function() {
      guidedCharCount.textContent = `${this.value.length} characters`;
    });
  }

  // archives
  const entryModal = document.getElementById('entryModal');
  
  if (entryModal) {
    entryModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      
      const title = button.getAttribute('data-title') || 'Untitled Entry';
      const content = button.getAttribute('data-content') || '';
      const date = button.getAttribute('data-date') || '';
      const type = button.getAttribute('data-type') || '';
      const prompt = button.getAttribute('data-prompt') || '';
      
      // update modal
      document.getElementById('entryModalLabel').textContent = title;
      document.getElementById('entryModalDate').textContent = date;
      document.getElementById('entryModalContent').textContent = content;
      
      // show prompt if it's a guided entry
      const promptDiv = document.getElementById('entryModalPrompt');
      if (type === 'guided' && prompt) {
        document.getElementById('promptText').textContent = prompt;
        promptDiv.style.display = 'block';
      } else {
        promptDiv.style.display = 'none';
      }
    });
  }

  // form validation
  const guidedForm = document.getElementById('guidedForm');
  
  if (guidedForm) {
    guidedForm.addEventListener('submit', function(e) {
      const topic = topicSelect.value;
      const promptSelected = promptsList.querySelector('input[type="radio"]:checked');
      const content = guidedContent.value.trim();
      
      if (!topic || !promptSelected || !content) {
        e.preventDefault();
        alert('Please select a topic, choose a prompt, and write your response.');
        return false;
      }
    });
  }

});