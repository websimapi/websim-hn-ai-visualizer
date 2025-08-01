class HNAIVisualizer {
    constructor() {
        this.currentType = 'top';
        this.baseUrl = 'https://hacker-news.firebaseio.com/v0';
        this.storiesContainer = document.getElementById('stories');
        this.loading = document.getElementById('loading');
        this.modal = document.getElementById('app-modal');
        this.appContainer = document.getElementById('app-container');
        this.iframe = document.getElementById('app-iframe');
        this.aiStatus = document.getElementById('ai-status');
        this.errorLog = document.getElementById('error-log');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadStories();
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentType = e.target.dataset.type;
                this.loadStories();
            });
        });

        // Modal close
        document.querySelector('.close-btn').addEventListener('click', () => {
            this.modal.style.display = 'none';
            this.iframe.srcdoc = '';
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.style.display = 'none';
                this.iframe.srcdoc = '';
            }
        });
    }

    async loadStories() {
        this.loading.style.display = 'block';
        this.storiesContainer.style.display = 'none';
        
        try {
            const response = await fetch(`${this.baseUrl}/${this.currentType}stories.json`);
            const storyIds = await response.json();
            const stories = await Promise.all(
                storyIds.slice(0, 30).map(id => this.fetchStory(id))
            );
            
            this.renderStories(stories.filter(s => s));
        } catch (error) {
            console.error('Error loading stories:', error);
            this.storiesContainer.innerHTML = '<p>Error loading stories. Please try again.</p>';
        } finally {
            this.loading.style.display = 'none';
            this.storiesContainer.style.display = 'block';
        }
    }

    async fetchStory(id) {
        try {
            const response = await fetch(`${this.baseUrl}/item/${id}.json`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching story ${id}:`, error);
            return null;
        }
    }

    renderStories(stories) {
        this.storiesContainer.innerHTML = stories.map(story => `
            <div class="story" data-id="${story.id}">
                <div class="story-header">
                    <a href="${story.url || '#'}" class="story-title" target="_blank">
                        ${story.title}
                        ${story.url ? `<span class="story-domain">(${new URL(story.url).hostname})</span>` : ''}
                    </a>
                </div>
                <div class="story-meta">
                    <span>👤 ${story.by || 'unknown'}</span>
                    <span>🔺 ${story.score || 0} points</span>
                    <span>💬 ${story.descendants || 0} comments</span>
                    <span>🕒 ${this.formatTime(story.time)}</span>
                </div>
                <div class="story-text" style="display: none;">
                    ${story.text || ''}
                </div>
            </div>
        `).join('');

        // Add click handlers for AI app generation
        document.querySelectorAll('.story').forEach(story => {
            story.addEventListener('click', (e) => {
                if (!e.target.href || !e.target.href.startsWith('http')) {
                    e.preventDefault();
                    this.generateAIApp(story.dataset.id);
                }
            });
        });
    }

    formatTime(timestamp) {
        const now = Date.now() / 1000;
        const diff = now - timestamp;
        const hours = Math.floor(diff / 3600);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    async generateAIApp(storyId) {
        const story = await this.fetchStory(storyId);
        if (!story) return;

        this.modal.style.display = 'block';
        this.resetAIStatus();
        
        const prompt = this.createPromptFromStory(story);
        this.startAIGeneration(prompt);
    }

    createPromptFromStory(story) {
        const title = story.title || '';
        const text = story.text ? this.stripHtml(story.text) : '';
        const url = story.url || '';
        const author = story.by || 'unknown';
        const score = story.score || 0;
        const comments = story.descendants || 0;
        
        return `Create a comprehensive, immersive web application based on this Hacker News post. The application should deeply engage with the post's topic and provide rich, interactive experiences.

POST DETAILS:
Title: ${title}
Author: ${author}
Score: ${score} points
Comments: ${comments} total
URL: ${url}
Content: ${text}

REQUIREMENTS:
1. Create a unique, theme-appropriate experience that reflects the post's essence
2. Include smooth animations and micro-interactions
3. Design for both desktop and mobile
4. Add contextual elements that relate to the post's domain/topic
5. Include interactive data visualizations where relevant
6. Implement engaging user interactions
7. Use modern web technologies and best practices
8. Make it feel alive and dynamic, not static

STYLE: Modern, clean, with subtle gradients and smooth transitions. Consider the emotional tone of the post's topic.

FOCUS: Create something that would make users want to explore and interact with the content, not just read it passively.`;
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    resetAIStatus() {
        document.querySelectorAll('[data-stage]').forEach(indicator => {
            indicator.textContent = '⏳';
            indicator.className = 'status-indicator';
        });
    }

    async startAIGeneration(prompt) {
        let html = '';
        let css = '';
        let js = '';
        let attempts = 0;
        const maxAttempts = 5;

        while (attempts < maxAttempts) {
            try {
                // Deep content analysis
                this.updateStatus('analyze', 'working', 'Analyzing post content...');
                const analysis = await this.analyzeContent(prompt);
                this.updateStatus('analyze', 'completed', 'Content analyzed ✓');

                // Concept development
                this.updateStatus('concept', 'working', 'Developing concept...');
                const concept = await this.developConcept(prompt, analysis);
                this.updateStatus('concept', 'completed', 'Concept developed ✓');

                // Generate HTML with structure
                this.updateStatus('html', 'working', 'Creating structure...');
                html = await this.generateStructuredHTML(prompt, concept);
                html = html.replace(/```html/g, '').replace(/```/g, '').trim();
                this.updateStatus('html', 'completed', 'Structure created ✓');

                // Generate CSS with enhanced styling
                this.updateStatus('css', 'working', 'Designing experience...');
                css = await this.generateEnhancedCSS(prompt, html, concept);
                css = css.replace(/```css/g, '').replace(/```/g, '').trim();
                this.updateStatus('css', 'completed', 'Experience designed ✓');

                // Generate JS with interactions
                this.updateStatus('js', 'working', 'Adding interactivity...');
                js = await this.generateRichJS(prompt, html, css, concept);
                js = js.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
                this.updateStatus('js', 'completed', 'Interactivity added ✓');

                // Enhance with additional features
                this.updateStatus('enhance', 'working', 'Enhancing & optimizing...');
                const enhanced = await this.enhanceApplication(html, css, js, concept);
                html = enhanced.html || html;
                css = enhanced.css || css;
                js = enhanced.js || js;
                this.updateStatus('enhance', 'completed', 'Optimized ✓');

                // Test
                this.updateStatus('test', 'working', 'Testing experience...');
                const success = await this.testApplication(html, css, js);
                
                if (success) {
                    this.updateStatus('test', 'completed', 'Experience ready ✓');
                    this.renderApplication(html, css, js);
                    return;
                }

                attempts++;
            } catch (error) {
                console.error('AI Generation error:', error);
                this.logError(`Attempt ${attempts + 1} failed: ${error.message}`);
                
                if (attempts < maxAttempts - 1) {
                    const fix = await this.fixError(error, html, css, js);
                    html = fix.html || html;
                    css = fix.css || css;
                    js = fix.js || js;
                }
                
                attempts++;
            }
        }

        this.showErrorFallback();
    }

    async analyzeContent(prompt) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Analyze the Hacker News post and return a JSON object with: {"topic": "main topic", "domain": "technical domain", "mood": "emotional tone", "interaction": "best interaction type", "visual": "visual theme"}' },
                { role: 'user', content: prompt }
            ]
        });
        return JSON.parse(completion.content);
    }

    async developConcept(prompt, analysis) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Develop a detailed concept for the interactive application based on the analysis. Return JSON with: {"concept": "app concept", "features": ["feature1", "feature2"], "colorScheme": "color palette", "animations": ["animation1", "animation2"]}' },
                { role: 'user', content: `Analysis: ${JSON.stringify(analysis)}\nPrompt: ${prompt}` }
            ]
        });
        return JSON.parse(completion.content);
    }

    async generateStructuredHTML(prompt, concept) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: `Generate complete, structured HTML for an interactive web application. Focus on semantic markup and accessibility. Include modern web components. Return only valid HTML without markdown.` },
                { role: 'user', content: `Concept: ${JSON.stringify(concept)}\nPrompt: ${prompt}` }
            ]
        });
        return completion.content;
    }

    async generateEnhancedCSS(prompt, html, concept) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: `Generate sophisticated CSS with modern features: CSS Grid, Flexbox, custom properties, animations, and responsive design. Include dark mode support. Return only CSS without markdown.` },
                { role: 'user', content: `HTML: ${html}\nConcept: ${JSON.stringify(concept)}\nPrompt: ${prompt}` }
            ]
        });
        return completion.content;
    }

    async generateRichJS(prompt, html, css, concept) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: `Generate rich JavaScript with modern ES6+ features, async/await, and smooth animations. Include error handling and performance optimizations. Return only JavaScript without markdown.` },
                { role: 'user', content: `HTML: ${html}\nCSS: ${css}\nConcept: ${JSON.stringify(concept)}\nPrompt: ${prompt}` }
            ]
        });
        return completion.content;
    }

    async enhanceApplication(html, css, js, concept) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Enhance the application by adding polish: micro-animations, hover effects, loading states, and responsive improvements. Return JSON with enhanced code.' },
                { role: 'user', content: `Current: ${JSON.stringify({html, css, js})}\nConcept: ${JSON.stringify(concept)}` }
            ]
        });
        return JSON.parse(completion.content);
    }

    async testApplication(html, css, js) {
        try {
            const fullHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>${css}</style>
                </head>
                <body>
                    ${html}
                    <script>
                        try {
                            ${js}
                            window.parent.postMessage({ type: 'test-success' }, '*');
                        } catch (error) {
                            window.parent.postMessage({ type: 'test-error', error: error.message }, '*');
                        }
                    </script>
                </body>
                </html>
            `;
            
            this.iframe.srcdoc = fullHTML;
            
            return new Promise((resolve) => {
                const handleMessage = (event) => {
                    if (event.data.type === 'test-success') {
                        resolve(true);
                    } else if (event.data.type === 'test-error') {
                        this.logError(`Runtime error: ${event.data.error}`);
                        resolve(false);
                    }
                    window.removeEventListener('message', handleMessage);
                };
                
                window.addEventListener('message', handleMessage);
                setTimeout(() => resolve(true), 2000); // Timeout after 2 seconds
            });
        } catch (error) {
            this.logError(`Test failed: ${error.message}`);
            return false;
        }
    }

    async fixError(error, html, css, js) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Fix the error in the provided code. Return JSON with fixed code.' },
                { role: 'user', content: `Error: ${error.message}\n\nHTML: ${html}\n\nCSS: ${css}\n\nJS: ${js}` }
            ]
        });

        try {
            const fix = JSON.parse(completion.content);
            return fix;
        } catch {
            return { html, css, js };
        }
    }

    renderApplication(html, css, js) {
        const fullHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { box-sizing: border-box; }
                    body { 
                        margin: 0; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                    }
                    ${css}
                </style>
            </head>
            <body>
                ${html}
                <script>
                    (function() {
                        'use strict';
                        ${js}
                    })();
                </script>
            </body>
            </html>
        `;
        
        this.iframe.srcdoc = fullHTML;
        this.iframe.style.display = 'block';
        
        // Make AI status smaller but keep it visible
        this.aiStatus.style.height = 'auto';
        this.aiStatus.style.overflow = 'auto';
    }

    updateStatus(stage, state, text) {
        const indicator = document.querySelector(`[data-stage="${stage}"]`);
        if (!indicator) return;
        
        const textEl = indicator.nextElementSibling;
        
        if (state === 'completed') {
            indicator.textContent = '✅';
            indicator.className = 'status-indicator completed';
            textEl.style.color = '#4CAF50';
        } else if (state === 'working') {
            indicator.textContent = '🔄';
            indicator.className = 'status-indicator working';
            textEl.style.color = '#ff6600';
        } else if (state === 'error') {
            indicator.textContent = '❌';
            indicator.className = 'status-indicator error';
            textEl.style.color = '#f44336';
        }
        
        textEl.textContent = text;
    }

    logError(message) {
        this.errorLog.style.display = 'block';
        const errorContainer = document.getElementById('error-messages');
        const errorEl = document.createElement('div');
        errorEl.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        errorContainer.appendChild(errorEl);
    }

    showErrorFallback() {
        this.errorLog.style.display = 'block';
        document.getElementById('error-messages').innerHTML += 
            '<p>Failed to generate application. Please try again.</p>';
    }
}

// Initialize the app
new HNAIVisualizer();