document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const form = document.getElementById('creative-form');
    const outputArea = document.getElementById('output-area');
    const loadingState = document.getElementById('loading-state');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    
    // Modal Elements
    const apiModal = document.getElementById('api-modal');
    const settingsBtn = document.getElementById('settings-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const apiKeyInput = document.getElementById('apiKey');

    // --- State & Config ---
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let currentMode = 'text'; // 'text' or 'image'
    
    // Initialize Modal
    if (!apiKey) {
        apiModal.classList.remove('hidden');
    } else {
        apiKeyInput.value = apiKey;
    }

    // Toggle Events
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const imageFields = document.getElementById('image-fields');
    const creativeFormatGroup = document.getElementById('creativeFormat').parentElement;

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // State Update
            currentMode = btn.dataset.mode;

            // Fields Update
            if (currentMode === 'image') {
                imageFields.style.display = 'block';
                creativeFormatGroup.style.display = 'none';
                document.getElementById('gameGenre').parentElement.querySelector('label').innerText = 'Theme / Subject';
            } else {
                imageFields.style.display = 'none';
                creativeFormatGroup.style.display = 'flex';
                document.getElementById('gameGenre').parentElement.querySelector('label').innerText = 'Game Genre / Theme';
            }
        });
    });

    // Modal Events
    settingsBtn.addEventListener('click', () => {
        apiModal.classList.remove('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        apiModal.classList.add('hidden');
    });

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            apiKey = key;
            apiModal.classList.add('hidden');
        } else {
            alert('Please enter a valid API key.');
        }
    });

    // Copy Event
    copyBtn.addEventListener('click', () => {
        const textToCopy = outputArea.innerText; // Get raw text
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.classList.add('active');
            setTimeout(() => {
                copyBtn.classList.remove('active');
            }, 2000);
        });
    });

    // --- Core Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!apiKey) {
            alert("Please configure your Gemini API Key in Settings first.");
            apiModal.classList.remove('hidden');
            return;
        }

        // Gather Common Inputs
        const gameName = document.getElementById('gameName').value;
        const gameGenre = document.getElementById('gameGenre').value;
        const targetAudience = document.getElementById('targetAudience').value;
        const customPrompt = document.getElementById('customPrompt').value;

        // UI State: Loading
        loadingState.classList.remove('hidden');
        generateBtn.disabled = true;
        copyBtn.disabled = true;

        try {
            if (currentMode === 'text') {
                const creativeFormat = document.getElementById('creativeFormat').value;
                const promptParams = `
                You are an elite Mobile Game User Acquisition (UA) Creative Director. 
                Your goal is to generate a highly engaging, high-conversion creative concept based on the following parameters:
                
                Game Name: "${gameName}"
                Game Genre: "${gameGenre}"
                Target Audience: "${targetAudience}"
                Requested Format: "${creativeFormat}"
                Additional Context/Instructions: "${customPrompt || 'None'}"

                Instructions:
                1. Be bold, highly specific, and focus on psychological hooks that drive installs (e.g. failure mechanics, urgency, power fantasy).
                2. Format your response beautifully using Markdown with clear headers, bullet points, and bold text for emphasis.
                3. For video scripts, provide clear Scene/Visual and Audio/V0 breakdowns with timestamps if applicable.
                4. For static/playable concepts, describe the exact visual layout and interaction mechanics.
                5. DO NOT output code blocks for the markdown text, just output raw markdown.
                `;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptParams }] }],
                        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'API Error');
                }

                const data = await response.json();
                const textResponse = data.candidates[0].content.parts[0].text;
                outputArea.innerHTML = marked.parse(textResponse);
                copyBtn.disabled = false;

            } else if (currentMode === 'image') {
                const artStyle = document.getElementById('artStyle').value;
                const aspectRatio = document.getElementById('aspectRatio').value;
                
                const imagePrompt = `High quality, stunning concept art for an ad for the mobile game "${gameName}". 
                Theme: ${gameGenre}. Target audience vibe: ${targetAudience}. 
                Style: ${artStyle}.
                Additional requests: ${customPrompt || 'None'}.
                Make it incredibly eye-catching, vibrant, and optimized to get clicks. No text overlays.`;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        instances: [{
                            prompt: imagePrompt
                        }],
                        parameters: {
                            sampleCount: 1,
                            aspectRatio: aspectRatio
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'Imagen API Error');
                }

                const data = await response.json();
                const base64Image = data.predictions[0].bytesBase64Encoded;
                
                outputArea.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                        <img src="data:image/jpeg;base64,${base64Image}" alt="Generated AI Art" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
                        <a href="data:image/jpeg;base64,${base64Image}" download="${gameName.replace(/\s+/g, '_')}_creative.jpg" class="primary-btn" style="text-decoration: none; font-size: 0.9rem; padding: 0.75rem 1.5rem;">
                            <i class="ph ph-download-simple"></i> Download Image
                        </a>
                    </div>
                `;
                copyBtn.disabled = true; // Nothing to copy for images
            }
        } catch (error) {
            console.error(error);
            outputArea.innerHTML = `
                <div class="empty-state" style="color: #ef4444;">
                    <i class="ph-fill ph-warning-circle" style="color: #ef4444;"></i>
                    <p>Failed to generate creative.</p>
                    <p style="font-size: 0.8rem; margin-top: 0.5rem;">${error.message}</p>
                </div>
            `;
        } finally {
            loadingState.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });
});
