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
        
        return `Create an interactive web application based on this Hacker News post:
Title: ${title}
Text: ${text}
URL: ${url}
The app should be visually engaging and relevant to the topic. Include animations and modern design.`;
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
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                // Generate HTML
                this.updateStatus('html', 'working', 'Generating HTML...');
                html = await this.generateHTML(prompt);
                this.updateStatus('html', 'completed', 'HTML generated ✓');

                // Generate CSS
                this.updateStatus('css', 'working', 'Designing CSS...');
                css = await this.generateCSS(prompt, html);
                this.updateStatus('css', 'completed', 'CSS designed ✓');

                // Generate JS
                this.updateStatus('js', 'working', 'Adding JavaScript...');
                js = await this.generateJS(prompt, html, css);
                this.updateStatus('js', 'completed', 'JavaScript added ✓');

                // Test
                this.updateStatus('test', 'working', 'Testing application...');
                const success = await this.testApplication(html, css, js);
                
                if (success) {
                    this.updateStatus('test', 'completed', 'Application ready ✓');
                    this.renderApplication(html, css, js);
                    return;
                }

                attempts++;
            } catch (error) {
                console.error('AI Generation error:', error);
                this.logError(`Attempt ${attempts + 1} failed: ${error.message}`);
                
                if (attempts < maxAttempts - 1) {
                    // Fix errors
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

    async generateHTML(prompt) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Generate complete HTML for an interactive web application. Include modern CSS and JavaScript. Return only valid HTML.' },
                { role: 'user', content: prompt }
            ]
        });
        return completion.content;
    }

    async generateCSS(prompt, html) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Generate modern, beautiful CSS for this application. Include animations and responsive design. Return only CSS.' },
                { role: 'user', content: `HTML: ${html}\nPrompt: ${prompt}` }
            ]
        });
        return completion.content;
    }

    async generateJS(prompt, html, css) {
        const completion = await websim.chat.completions.create({
            messages: [
                { role: 'system', content: 'Generate interactive JavaScript for this application. Include modern ES6+ features. Return only JavaScript.' },
                { role: 'user', content: `HTML: ${html}\nCSS: ${css}\nPrompt: ${prompt}` }
            ]
        });
        return completion.content;
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
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}</script>
            </body>
            </html>
        `;
        
        this.iframe.srcdoc = fullHTML;
        this.aiStatus.style.display = 'none';
        this.iframe.style.display = 'block';
    }

    updateStatus(stage, state, text) {
        const indicator = document.querySelector(`[data-stage="${stage}"]`);
        const textEl = indicator.nextElementSibling;
        
        indicator.textContent = state === 'completed' ? '✅' : '⏳';
        indicator.className = `status-indicator ${state}`;
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
        this.aiStatus.style.display = 'none';
        this.errorLog.style.display = 'block';
        document.getElementById('error-messages').innerHTML += 
            '<p>Failed to generate application. Please try again.</p>';
    }
}

// Initialize the app
new HNAIVisualizer();

