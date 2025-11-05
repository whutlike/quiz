// 动态题库列表
let QUESTION_BANKS = [];

// 初始化首页
async function initHomePage() {
    const banksContainer = document.getElementById('banksContainer');
    
    // 显示加载状态
    banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">加载题库中...</div>';
    
    try {
        // 动态加载题库列表
        await loadQuestionBanks();
        
        // 清空加载状态
        banksContainer.innerHTML = '';
        
        if (QUESTION_BANKS.length === 0) {
            banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">暂无题库</div>';
            return;
        }
        
        // 渲染题库卡片
        QUESTION_BANKS.forEach(bank => {
            const bankCard = createBankCard(bank);
            banksContainer.appendChild(bankCard);
        });
        
    } catch (error) {
        console.error('加载题库失败:', error);
        banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">加载题库失败</div>';
    }
}

// 动态加载题库列表
async function loadQuestionBanks() {
    try {
        // 加载题库列表文件
        const listResponse = await fetch('data/question-banks/list.json');
        if (!listResponse.ok) throw new Error('无法加载题库列表');
        const listData = await listResponse.json();
        
        // 为每个题库加载基本信息
        const bankPromises = listData.banks.map(async (bankId) => {
            try {
                const bankResponse = await fetch(`data/question-banks/${bankId}.json`);
                if (!bankResponse.ok) throw new Error(`无法加载题库 ${bankId}`);
                const bankData = await bankResponse.json();
                
                return {
                    id: bankId,
                    name: bankData.bankInfo.name,
                    description: bankData.bankInfo.description || `${bankData.bankInfo.subject}题库`,
                    questionCount: bankData.questions.length,
                    lastUpdate: bankData.bankInfo.lastUpdate || '2024-01-01'
                };
            } catch (error) {
                console.warn(`加载题库 ${bankId} 失败:`, error);
                return null;
            }
        });
        
        const banks = await Promise.all(bankPromises);
        QUESTION_BANKS = banks.filter(bank => bank !== null);
        
    } catch (error) {
        console.error('加载题库列表失败，使用默认题库:', error);
        // 使用默认题库作为备选
        QUESTION_BANKS = [
            {
                id: 'math',
                name: '初中数学', 
                description: '数学题库，包含代数、几何等内容',
                questionCount: 203,
                lastUpdate: '2024-01-10'
            },
            {
                id: 'physics',
                name: '初中物理',
                description: '涵盖初中物理全部知识点',
                questionCount: 156,
                lastUpdate: '2024-01-15'
            }
        ];
    }
}

// 创建题库卡片
function createBankCard(bank) {
    const card = document.createElement('div');
    card.className = 'bank-card';
    card.innerHTML = `
        <h3>${bank.name}</h3>
        <p>${bank.description}</p>
        <div class="bank-meta">
            <span>${bank.questionCount} 道题</span>
            <span>更新: ${bank.lastUpdate}</span>
        </div>
    `;
    
    card.addEventListener('click', () => {
        window.location.href = `quiz.html?bank=${bank.id}`;
    });
    
    return card;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initHomePage);