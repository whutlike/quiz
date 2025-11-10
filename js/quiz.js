class QuizManager {
    constructor() {
        this.currentBank = null;
        this.questions = [];
        this.filteredQuestions = [];
        this.displayQuestions = [];
        this.settings = {
            units: [],
            questionCount: '5',
            orderMode: 'sequential'
        };
        this.layoutMode = 'normal';
        this.sequentialStartIndex = 0;
        this.hasInitialized = false;
        this.allAnswersVisible = false;
        this.isSidebarCollapsed = false;
        this.isMobile = window.innerWidth <= 768;

        this.fontSizeScale = 1.0;
        this.minFontSize = 0.8;
        this.maxFontSize = 3.0;
        this.fontSizeStep = 0.1;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        this.bindEvents();

        const urlParams = new URLSearchParams(window.location.search);
        const bankId = urlParams.get('bank');
        
        if (!bankId) {
            alert('未选择题库');
            window.location.href = 'index.html';
            return;
        }

        await this.loadBankData(bankId);
        this.renderFilters();
        this.loadFontSize();
        this.applySettings(true);
        
        this.initSidebarState();
        this.adjustButtonPosition();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.id === 'layoutToggleBtn') {
                this.toggleLayout();
            }
            if (e.target.id === 'allAnswersBtn') {
                this.toggleAllAnswers();
            }
            if (e.target.id === 'backBtn') {
                window.location.href = 'index.html';
            }
            if (e.target.id === 'prevGroupBtn') {
                this.showPrevGroup();
            }
            if (e.target.id === 'nextGroupBtn') {
                this.showNextGroup();
            }
            if (e.target.id === 'sidebarToggle') {
                this.toggleSidebar();
            }
            if (e.target.id === 'filterOverlay') {
                this.closeSidebar();
            }
            if (e.target.id === 'fontSizeUp') {
                this.adjustFontSize(this.fontSizeStep);
            }
            if (e.target.id === 'fontSizeDown') {
                this.adjustFontSize(-this.fontSizeStep);
            }
        });

        const applyBtn = document.querySelector('button[onclick="applySettings()"]');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applySettings();
                if (this.isMobile) {
                    this.closeSidebar();
                }
            });
        }

        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    // 侧边栏控制方法
    toggleSidebar() {
        const sidebar = document.getElementById('filterPanel');
        const overlay = document.getElementById('filterOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        if (!sidebar) return;

        const isActive = sidebar.classList.contains('active') || 
                        (!this.isMobile && !sidebar.classList.contains('collapsed'));

        if (isActive) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('filterPanel');
        const overlay = document.getElementById('filterOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        const quizContainer = document.getElementById('quizContainer');
        
        if (this.isMobile) {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('collapsed');
            if (quizContainer) {
                quizContainer.classList.remove('with-collapsed-sidebar');
            }
            this.isSidebarCollapsed = false;
            this.saveSidebarState();
        }
        
        if (toggleBtn) {
            toggleBtn.textContent = '✕';
            toggleBtn.title = '折叠侧边栏';
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('filterPanel');
        const overlay = document.getElementById('filterOverlay');
        const toggleBtn = document.getElementById('sidebarToggle');
        const quizContainer = document.getElementById('quizContainer');
        
        if (this.isMobile) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        } else {
            sidebar.classList.add('collapsed');
            if (quizContainer) {
                quizContainer.classList.add('with-collapsed-sidebar');
            }
            this.isSidebarCollapsed = true;
            this.saveSidebarState();
        }
        
        if (toggleBtn) {
            toggleBtn.textContent = '☰';
            toggleBtn.title = '展开侧边栏';
        }
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            this.closeSidebar();
            this.adjustButtonPosition();
        }
    }

    adjustButtonPosition() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (!toggleBtn || !this.isMobile) return;

        const controlButtons = document.querySelector('.control-buttons');
        let offset = 80;

        if (controlButtons && controlButtons.children.length > 0) {
            const buttonHeight = controlButtons.offsetHeight;
            offset = 80 + buttonHeight + 10;
        }

        toggleBtn.style.top = `${offset}px`;
    }

    initSidebarState() {
        if (this.isMobile) {
            this.closeSidebar();
        } else {
            this.loadSidebarState();
            this.updateSidebarState();
        }
    }

    updateSidebarState() {
        if (!this.isMobile) {
            const sidebar = document.getElementById('filterPanel');
            const quizContainer = document.getElementById('quizContainer');
            const questionsContainer = document.getElementById('questionsContainer');
            const toggleBtn = document.getElementById('sidebarToggle');

            if (!sidebar) return;

            if (this.isSidebarCollapsed) {
                sidebar.classList.add('collapsed');
                if (quizContainer) {
                    quizContainer.classList.add('with-collapsed-sidebar');
                }
                if (questionsContainer) {
                    questionsContainer.classList.add('full-width');
                }
                if (toggleBtn) {
                    toggleBtn.textContent = '☰';
                    toggleBtn.title = '展开侧边栏';
                }
            } else {
                sidebar.classList.remove('collapsed');
                if (quizContainer) {
                    quizContainer.classList.remove('with-collapsed-sidebar');
                }
                if (questionsContainer) {
                    questionsContainer.classList.remove('full-width');
                }
                if (toggleBtn) {
                    toggleBtn.textContent = '✕';
                    toggleBtn.title = '折叠侧边栏';
                }
            }

            this.saveSidebarState();
        }
    }

    saveSidebarState() {
        if (!this.isMobile) {
            localStorage.setItem('sidebarCollapsed', this.isSidebarCollapsed.toString());
        }
    }

    loadSidebarState() {
        if (!this.isMobile) {
            const savedState = localStorage.getItem('sidebarCollapsed');
            if (savedState !== null) {
                this.isSidebarCollapsed = savedState === 'true';
            }
        }
    }

    async loadBankData(bankId) {
        const response = await fetch(`data/question-banks/${bankId}.json`);
        const data = await response.json();
        
        this.currentBank = data.bankInfo;
        this.questions = data.questions;
        
        document.getElementById('bankTitle').textContent = this.currentBank.name;
    }

    renderFilters() {
        this.renderUnitFilter();
        this.setOrderMode('sequential');
        this.loadSidebarState();
    }

    renderUnitFilter() {
        const container = document.getElementById('unitFilter');
        const units = Array.from({length: 11}, (_, i) => `单元${i + 1}`).concat(['中考复习']);
        
        container.innerHTML = units.map(unit => `
            <div class="unit-tag" data-unit="${unit}">${unit}</div>
        `).join('');

        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('unit-tag')) {
                e.target.classList.toggle('selected');
            }
        });

        const toggleAllBtn = document.getElementById('toggleAllUnits');
        toggleAllBtn.addEventListener('click', () => {
            const allTags = container.querySelectorAll('.unit-tag');
            const allSelected = Array.from(allTags).every(tag => tag.classList.contains('selected'));
            
            allTags.forEach(tag => {
                if (allSelected) {
                    tag.classList.remove('selected');
                } else {
                    tag.classList.add('selected');
                }
            });

            toggleAllBtn.textContent = allSelected ? '全选' : '取消全选';
        });
    }

    applySettings(isInitial = false) {
        this.updateSettings();
        
        this.filteredQuestions = this.questions.filter(question => {
            if (this.settings.units.length > 0) {
                const hasMatchingUnit = question.unit.some(unit => 
                    this.settings.units.includes(unit)
                );
                if (!hasMatchingUnit) return false;
            }
            return true;
        });
        
        this.updateToggleAllButton();
        
        if (isInitial || this.hasFilterChanged()) {
            this.sequentialStartIndex = 0;
        }
        
        this.processQuestions();
        this.renderQuestions();
        
        this.hasInitialized = true;
    }

    hasFilterChanged() {
        const currentUnits = this.getSelectedUnits().sort().join(',');
        const previousUnits = (this.lastAppliedUnits || []).sort().join(',');
        this.lastAppliedUnits = this.getSelectedUnits();
        return currentUnits !== previousUnits;
    }

    processQuestions() {
        let questionsToShow = [];
        
        if (this.settings.orderMode === 'random') {
            if (this.settings.questionCount !== 'all') {
                const count = parseInt(this.settings.questionCount);
                questionsToShow = this.shuffleArray([...this.filteredQuestions]).slice(0, count);
            } else {
                questionsToShow = this.shuffleArray([...this.filteredQuestions]);
            }
        } else {
            if (this.settings.questionCount !== 'all') {
                const count = parseInt(this.settings.questionCount);
                const endIndex = Math.min(this.sequentialStartIndex + count, this.filteredQuestions.length);
                questionsToShow = this.filteredQuestions.slice(this.sequentialStartIndex, endIndex);
            } else {
                questionsToShow = this.filteredQuestions.slice(this.sequentialStartIndex);
            }
        }
        
        this.displayQuestions = questionsToShow;
    }

    showPrevGroup() {
        if (this.settings.orderMode === 'sequential' && this.settings.questionCount !== 'all') {
            const count = parseInt(this.settings.questionCount);
            this.sequentialStartIndex -= count;
            
            if (this.sequentialStartIndex < 0) {
                const lastGroupStart = Math.max(0, this.filteredQuestions.length - count);
                this.sequentialStartIndex = lastGroupStart;
            }
            
            this.processQuestions();
            this.renderQuestions();
        }
    }

    showNextGroup() {
        if (this.settings.questionCount !== 'all') {
            if (this.settings.orderMode === 'sequential') {
                const count = parseInt(this.settings.questionCount);
                this.sequentialStartIndex += count;
                
                if (this.sequentialStartIndex >= this.filteredQuestions.length) {
                    this.sequentialStartIndex = 0;
                }
            }
            
            this.processQuestions();
            this.renderQuestions();
        }
    }

    updateSettings() {
        this.settings.units = this.getSelectedUnits();
        this.settings.questionCount = document.getElementById('questionCount').value;
    }

    getSelectedUnits() {
        const selectedTags = document.querySelectorAll('.unit-tag.selected');
        return Array.from(selectedTags).map(tag => tag.getAttribute('data-unit'));
    }

    updateToggleAllButton() {
        const toggleAllBtn = document.getElementById('toggleAllUnits');
        if (!toggleAllBtn) return;
        
        const allTags = document.querySelectorAll('.unit-tag');
        const allSelected = allTags.length > 0 && Array.from(allTags).every(tag => tag.classList.contains('selected'));
        
        toggleAllBtn.textContent = allSelected ? '取消全选' : '全选';
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    setOrderMode(mode) {
        this.settings.orderMode = mode;
        this.sequentialStartIndex = 0;
        
        const sequentialBtn = document.getElementById('sequentialBtn');
        const randomBtn = document.getElementById('randomBtn');
        
        if (mode === 'sequential') {
            sequentialBtn.style.background = '#667eea';
            sequentialBtn.style.color = 'white';
            randomBtn.style.background = '#e2e8f0';
            randomBtn.style.color = '#4a5568';
        } else {
            sequentialBtn.style.background = '#e2e8f0';
            sequentialBtn.style.color = '#4a5568';
            randomBtn.style.background = '#667eea';
            randomBtn.style.color = 'white';
        }
    }

    toggleLayout() {
        this.layoutMode = this.layoutMode === 'normal' ? 'compact' : 'normal';
        this.allAnswersVisible = false;
        
        const layoutBtn = document.getElementById('layoutToggleBtn');
        const allAnswersBtn = document.getElementById('allAnswersBtn');
        const fontSizeControls = document.querySelector('.font-size-controls');
        
        if (this.layoutMode === 'normal') {
            layoutBtn.textContent = '切换到紧凑布局';
            if (allAnswersBtn) {
                allAnswersBtn.style.display = 'none';
            }
            if (fontSizeControls) {
                fontSizeControls.style.display = 'none';
            }
        } else {
            layoutBtn.textContent = '切换到原始布局';
            if (allAnswersBtn) {
                allAnswersBtn.style.display = 'inline-block';
                allAnswersBtn.textContent = '展开所有答案';
            }
            if (fontSizeControls) {
                fontSizeControls.style.display = 'flex';
            }
        }
        
        this.applySettings();
        
        setTimeout(() => {
            this.adjustButtonPosition();
        }, 100);
    }

    toggleAllAnswers() {
        this.allAnswersVisible = !this.allAnswersVisible;
        
        const allAnswersBtn = document.getElementById('allAnswersBtn');
        allAnswersBtn.textContent = this.allAnswersVisible ? '折叠答案' : '展开答案';
        
        this.displayQuestions.forEach(question => {
            const answerSection = document.getElementById(`answer-${question.id}`);
            if (answerSection) {
                if (this.allAnswersVisible) {
                    answerSection.classList.remove('hidden');
                } else {
                    answerSection.classList.add('hidden');
                }
            }
        });
        
        this.renderMath();
    }

    renderQuestions() {
        const container = document.getElementById('questionsList');
        const loading = document.getElementById('loadingIndicator');
        const noResults = document.getElementById('noResults');
        
        if (!container) return;
        
        loading.style.display = 'none';
        
        if (this.displayQuestions.length === 0) {
            noResults.style.display = 'block';
            container.innerHTML = '<div style="text-align: center; color: #718096;">没有找到符合条件的题目</div>';
            return;
        }
        
        noResults.style.display = 'none';
        
        let startNumber = 1;
        if (this.settings.orderMode === 'sequential') {
            startNumber = this.sequentialStartIndex + 1;
        }
        
        let navigationButtons = '';
        if (this.settings.questionCount !== 'all' && this.filteredQuestions.length > 0) {
            navigationButtons = `
                <div class="navigation-buttons" style="display: flex; gap: 1rem; justify-content: center; margin: 1rem 0;">
                    ${this.settings.orderMode === 'sequential' ? `
                        <button id="prevGroupBtn" class="control-button" style="background: #ed8936;">
                            上一组
                        </button>
                    ` : ''}
                    <button id="nextGroupBtn" class="control-button" style="background: #48bb78;">
                        下一组
                    </button>
                </div>
            `;
        }
        
        if (this.layoutMode === 'compact') {
            container.innerHTML = this.displayQuestions.map((question, index) => {
                const questionNumber = startNumber + index;
                const answerVisible = this.allAnswersVisible ? '' : 'hidden';
                
                return `
                    <div class="question-card compact-card">
                        <div class="question-content compact-content">
                            <span class="question-number">${questionNumber}.</span>
                            ${question.content.replace(/\n/g, '<br>')}
                        </div>
                        
                        ${question.options ? `
                            <div class="question-options compact-options">
                                ${question.options.map(option => `
                                    <div class="option-item">${option.replace(/\n/g, '<br>')}</div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="answer-section compact-answer ${answerVisible}" id="answer-${question.id}">
                            <strong>答案：</strong> ${question.answer.replace(/\n/g, '<br>')}
                            ${question.explanation ? `
                                <div style="margin-top: 0.5rem;">
                                    <strong>解析：</strong> ${question.explanation.replace(/\n/g, '<br>')}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('') + navigationButtons;
        } else {
            container.innerHTML = this.displayQuestions.map((question, index) => {
                const questionNumber = startNumber + index;
                    
                return `
                    <div class="question-card">
                        <div class="question-content">
                            <span class="question-number">${questionNumber}.</span>
                            ${question.content.replace(/\n/g, '<br>')}
                        </div>
                        
                        ${question.options ? `
                            <div class="question-options">
                                ${question.options.map(option => `
                                    <div class="option-item">${option.replace(/\n/g, '<br>')}</div>
                                `).join('')}
                        </div>
                        ` : ''}
                        
                        <div class="answer-section hidden" id="answer-${question.id}">
                            <strong>答案：</strong> ${question.answer.replace(/\n/g, '<br>')}
                            ${question.explanation ? `
                                <div style="margin-top: 0.5rem;">
                                    <strong>解析：</strong> ${question.explanation.replace(/\n/g, '<br>')}
                                </div>
                            ` : ''}
                        </div>
                        
                        <button class="toggle-answer" onclick="quizManager.toggleAnswer('${question.id}')">
                            显示答案
                        </button>
                    </div>
                `;
            }).join('') + navigationButtons;
        }
        
        this.renderMath();
    }

    renderMath() {
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$', right: '$', display: false},
                    {left: '$$', right: '$$', display: true}
                ],
                throwOnError: false
            });
        }
    }

    toggleAnswer(questionId) {
        const answerSection = document.getElementById(`answer-${questionId}`);
        const button = answerSection.parentElement.querySelector('.toggle-answer');
        
        if (answerSection.classList.contains('hidden')) {
            answerSection.classList.remove('hidden');
            button.textContent = '隐藏答案';
            this.renderMath();
        } else {
            answerSection.classList.add('hidden');
            button.textContent = '显示答案';
        }
    }

    // 字体大小控制方法
    adjustFontSize(step) {
        const newScale = this.fontSizeScale + step;
        
        if (newScale >= this.minFontSize && newScale <= this.maxFontSize) {
            this.fontSizeScale = Math.round(newScale * 10) / 10;
            this.applyFontSize();
            this.saveFontSize();
        }
    }

    applyFontSize() {
        const styleId = 'compact-font-size';
        let style = document.getElementById(styleId);
        
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        const baseSizes = {
            compactContent: 1.4,
            compactOptions: 0.95,
            compactAnswer: 0.95,
            compactNumber: 1.3
        };

        style.textContent = `
            .question-content.compact-content { 
                font-size: ${(baseSizes.compactContent * this.fontSizeScale).toFixed(2)}rem !important; 
            }
            .question-options.compact-options .option-item { 
                font-size: ${(baseSizes.compactOptions * this.fontSizeScale).toFixed(2)}rem !important; 
            }
            .answer-section.compact-answer { 
                font-size: ${(baseSizes.compactAnswer * this.fontSizeScale).toFixed(2)}rem !important; 
            }
            .question-content.compact-content .question-number { 
                font-size: ${(baseSizes.compactNumber * this.fontSizeScale).toFixed(2)}rem !important; 
            }
        `;

        this.updateFontSizeDisplay();
        this.updateFontSizeButtons();
        
        if (this.layoutMode === 'compact') {
            this.renderMath();
        }
    }

    updateFontSizeDisplay() {
        const display = document.getElementById('fontSizeDisplay');
        if (display) {
            display.textContent = `${Math.round(this.fontSizeScale * 100)}%`;
        }
    }

    updateFontSizeButtons() {
        const downBtn = document.getElementById('fontSizeDown');
        const upBtn = document.getElementById('fontSizeUp');
        
        if (downBtn && upBtn) {
            downBtn.disabled = this.fontSizeScale <= this.minFontSize;
            upBtn.disabled = this.fontSizeScale >= this.maxFontSize;
            
            downBtn.style.opacity = this.fontSizeScale <= this.minFontSize ? '0.5' : '1';
            upBtn.style.opacity = this.fontSizeScale >= this.maxFontSize ? '0.5' : '1';
        }
    }

    saveFontSize() {
        localStorage.setItem('compactFontSize', this.fontSizeScale.toString());
    }

    loadFontSize() {
        const savedSize = localStorage.getItem('compactFontSize');
        if (savedSize !== null) {
            this.fontSizeScale = parseFloat(savedSize);
            this.fontSizeScale = Math.max(this.minFontSize, Math.min(this.maxFontSize, this.fontSizeScale));
            this.applyFontSize();
        }
    }
}

// 全局函数
function applySettings() {
    quizManager.applySettings();
}

function setOrderMode(mode) {
    quizManager.setOrderMode(mode);
}

// 初始化
let quizManager;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        quizManager = new QuizManager();
    });
} else {
    quizManager = new QuizManager();
}