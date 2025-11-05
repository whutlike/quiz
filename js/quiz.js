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
        this.layoutMode = 'normal'; // 'normal' 或 'compact'
        this.sequentialStartIndex = 0;
        this.hasInitialized = false;
        this.allAnswersVisible = false;
        
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            setTimeout(() => this.init(), 100);
        }
    }

    async init() {
        console.log('初始化QuizManager');
        
        // 先绑定事件
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
        this.applySettings(true);
    }

    bindEvents() {
        console.log('绑定事件');
        
        // 使用事件委托
        document.addEventListener('click', (e) => {
            console.log('点击事件:', e.target.id);
            
            if (e.target.id === 'layoutToggleBtn') {
                this.toggleLayout();
            }
            if (e.target.id === 'allAnswersBtn') {
                this.toggleAllAnswers();
            }
            if (e.target.id === 'backBtn') {
                window.location.href = 'index.html';
            }
        });

        // 应用设置按钮
        const applyBtn = document.querySelector('button[onclick="applySettings()"]');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applySettings());
        }
    }

    async loadBankData(bankId) {
        try {
            const response = await fetch(`data/question-banks/${bankId}.json`);
            const data = await response.json();
            
            this.currentBank = data.bankInfo;
            this.questions = data.questions;
            
            document.getElementById('bankTitle').textContent = this.currentBank.name;
            
        } catch (error) {
            console.error('加载题库失败:', error);
            this.loadSampleData(bankId);
        }
    }

    loadSampleData(bankId) {
        this.currentBank = {
            name: '示例题库',
            version: '1.0'
        };
        
        this.questions = Array.from({length: 20}, (_, i) => ({
            id: `sample-${i + 1}`,
            unit: [`单元${Math.floor(i / 4) + 1}`],
            questionType: i % 2 === 0 ? '选择题' : '填空题',
            tags: ['示例'],
            content: `示例题目 ${i + 1}: 计算 $\\frac{${i + 1}}{${i + 2}}$ 的值`,
            options: i % 2 === 0 ? ['A. 选项1', 'B. 选项2', 'C. 选项3', 'D. 选项4'] : null,
            answer: `答案 ${i + 1}`,
            explanation: `解析 ${i + 1}`
        }));
    }

    renderFilters() {
        this.renderUnitFilter();
        this.setOrderMode('sequential');
    }

    renderUnitFilter() {
        const container = document.getElementById('unitFilter');
        const units = Array.from({length: 11}, (_, i) => `单元${i + 1}`).concat(['中考复习']);
        
        container.innerHTML = units.map(unit => `
            <div class="checkbox-item">
                <input type="checkbox" id="unit-${unit}" value="${unit}">
                <label for="unit-${unit}">${unit}</label>
            </div>
        `).join('');
    }

    applySettings(isInitial = false) {
        console.log('应用设置，布局模式:', this.layoutMode);
        
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
        
        if (isInitial || this.hasFilterChanged()) {
            this.sequentialStartIndex = 0;
        }
        
        this.processQuestions();
        this.renderQuestions();
        
        if (!isInitial && this.settings.orderMode === 'sequential') {
            this.updateSequentialIndex();
        }
        
        this.hasInitialized = true;
    }

    hasFilterChanged() {
        const currentUnits = this.getCheckedValues('unit').sort().join(',');
        const previousUnits = (this.lastAppliedUnits || []).sort().join(',');
        this.lastAppliedUnits = this.getCheckedValues('unit');
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
                const endIndex = this.sequentialStartIndex + count;
                questionsToShow = this.filteredQuestions.slice(this.sequentialStartIndex, endIndex);
            } else {
                questionsToShow = this.filteredQuestions.slice(this.sequentialStartIndex);
            }
        }
        
        this.displayQuestions = questionsToShow;
    }

    updateSequentialIndex() {
        if (this.settings.questionCount !== 'all') {
            const count = parseInt(this.settings.questionCount);
            this.sequentialStartIndex += count;
            
            if (this.sequentialStartIndex >= this.filteredQuestions.length) {
                this.sequentialStartIndex = 0;
            }
        } else {
            this.sequentialStartIndex = 0;
        }
    }

    updateSettings() {
        this.settings.units = this.getCheckedValues('unit');
        this.settings.questionCount = document.getElementById('questionCount').value;
    }

    getCheckedValues(prefix) {
        const checkboxes = document.querySelectorAll(`input[type="checkbox"][id^="${prefix}-"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
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
        console.log('=== 开始切换布局 ===');
        console.log('当前布局模式:', this.layoutMode);
        
        // 切换布局模式
        this.layoutMode = this.layoutMode === 'normal' ? 'compact' : 'normal';
        this.allAnswersVisible = false;
        
        const layoutBtn = document.getElementById('layoutToggleBtn');
        const allAnswersBtn = document.getElementById('allAnswersBtn');
        
        console.log('切换后布局模式:', this.layoutMode);
        console.log('找到的按钮 - layoutBtn:', layoutBtn, 'allAnswersBtn:', allAnswersBtn);
        
        if (this.layoutMode === 'normal') {
            layoutBtn.textContent = '切换到紧凑布局';
            if (allAnswersBtn) {
                allAnswersBtn.style.display = 'none';
            }
        } else {
            layoutBtn.textContent = '切换到原始布局';
            if (allAnswersBtn) {
                allAnswersBtn.style.display = 'inline-block';
                allAnswersBtn.textContent = '展开所有答案';
            }
        }
        
        // 强制重新应用设置来刷新题目显示
        console.log('重新渲染题目...');
        this.applySettings();
        
        console.log('=== 布局切换完成 ===');
    }

    toggleAllAnswers() {
        this.allAnswersVisible = !this.allAnswersVisible;
        
        const allAnswersBtn = document.getElementById('allAnswersBtn');
        allAnswersBtn.textContent = this.allAnswersVisible ? '折叠所有答案' : '展开所有答案';
        
        // 更新所有答案的显示状态
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
        console.log('渲染题目，布局模式:', this.layoutMode, '题目数量:', this.displayQuestions.length);
        
        const container = document.getElementById('questionsList');
        const loading = document.getElementById('loadingIndicator');
        const noResults = document.getElementById('noResults');
        
        if (!container) {
            console.error('找不到questionsList容器');
            return;
        }
        
        loading.style.display = 'none';
        
        if (this.displayQuestions.length === 0) {
            noResults.style.display = 'block';
            container.innerHTML = '<div style="text-align: center; color: #718096;">没有更多题目了，请调整筛选条件</div>';
            return;
        }
        
        noResults.style.display = 'none';
        
        let startNumber = 1;
        if (this.settings.orderMode === 'sequential') {
            startNumber = this.sequentialStartIndex + 1;
        }
        
        console.log('使用布局模式:', this.layoutMode);
        
        if (this.layoutMode === 'compact') {
            // 紧凑布局模式
            container.innerHTML = this.displayQuestions.map((question, index) => {
                const questionNumber = startNumber + index;
                const answerVisible = this.allAnswersVisible ? '' : 'hidden';
                
                return `
                    <div class="question-card compact-card" data-layout="compact">
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number">${questionNumber}.</span>
                                <span class="question-type">${question.questionType}</span>
                                <span>${question.unit.join(', ')}</span>
                            </div>
                        </div>
                        
                        <div class="question-content compact-content">
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
            }).join('');
        } else {
            // 原始布局模式
            container.innerHTML = this.displayQuestions.map((question, index) => {
                const questionNumber = startNumber + index;
                    
                return `
                    <div class="question-card" data-layout="normal">
                        <div class="question-header">
                            <div class="question-meta">
                                <span class="question-number">${questionNumber}.</span>
                                <span class="question-type">${question.questionType}</span>
                                <span>${question.unit.join(', ')}</span>
                            </div>
                        </div>
                        
                        <div class="question-content">
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
            }).join('');
        }
        
        console.log('题目渲染完成，容器内容长度:', container.innerHTML.length);
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