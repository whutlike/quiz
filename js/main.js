// 动态题库列表
let QUESTION_BANKS = [];

// 初始化首页
async function initHomePage() {
    const banksContainer = document.getElementById('banksContainer');
    
    banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">加载题库中...</div>';
    
    try {
        await loadQuestionBanks();
        banksContainer.innerHTML = '';
        
        if (QUESTION_BANKS.length === 0) {
            banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">暂无题库</div>';
            return;
        }
        
        QUESTION_BANKS.forEach(bank => {
            const bankCard = createBankCard(bank);
            banksContainer.appendChild(bankCard);
        });
        
    } catch (error) {
        banksContainer.innerHTML = '<div style="text-align: center; color: white; padding: 2rem;">加载题库失败</div>';
    }
}

// 动态加载题库列表
async function loadQuestionBanks() {
    const listResponse = await fetch('data/question-banks/list.json');
    if (!listResponse.ok) throw new Error('无法加载题库列表');
    
    const listData = await listResponse.json();
    const bankPromises = listData.banks.map(async (bankId) => {
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
    });
    
    const banks = await Promise.all(bankPromises);
    QUESTION_BANKS = banks.filter(bank => bank !== null);
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