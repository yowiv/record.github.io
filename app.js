// 检查依赖是否加载成功
if (typeof Vue === 'undefined') {
    console.error('Vue 未能正确加载，请检查网络连接');
    alert('页面依赖加载失败，请刷新页面重试');
}

if (typeof ElementPlus === 'undefined') {
    console.error('ElementPlus 未能正确加载，请检查网络连接');
}

const { createApp, ref, computed } = Vue;
const { ElMessage } = ElementPlus;

// 创建 Vue 应用实例
const app = createApp({
    setup() {
        // 响应式数据
        const playerName = ref('');
        const loading = ref(false);
        const apiResponse = ref(null);
        const errorMessage = ref('');
        const activeTab = ref('双排');

        // 计算当前选中模式对应的对局记录
        const currentBattles = computed(() => {
            if (!apiResponse.value) {
                return null;
            }
            
            // 优先使用对应模式的对局记录
            if (apiResponse.value.mode_battles && apiResponse.value.mode_battles[activeTab.value]) {
                return apiResponse.value.mode_battles[activeTab.value];
            }
            
            // 如果没有对应模式的对局记录，返回null（显示暂无数据）
            return null;
        });

        // Tab切换事件处理
        const onTabChange = (tabName) => {
            activeTab.value = tabName;
        };

        // 提取真实的角色ID
        const extractRoleId = (fullRoleId) => {
            if (!fullRoleId) return '未知';
            
            const match = fullRoleId.match(/(?:[a-zA-Z]+)?0*([0-9]+0163)/);
            if (match && match[1]) {
                return match[1];
            }
            
            return fullRoleId;
        };

        // 获取完整段位名称
        const getFullGradeName = (grade) => {
            if (!grade) return '未定级';
            
            const gradeName = grade.grade_name || '未知段位';
            const gradeLevel = grade.grade_level;
            
            if (gradeLevel && gradeLevel.trim()) {
                return `${gradeName}${gradeLevel}`;
            }
            
            return gradeName;
        };

        const getApiUrl = () => {
            const encodedUrl = 'aHR0cDovL2N6ai1ob2dnbGN0aXR1LmNuLWhhbmd6aG91LmZjYXBwLnJ1bi9hcGkvc2VhcmNo';
            return atob(encodedUrl);
        };        // 搜索玩家
        const searchPlayer = async () => {
            if (!playerName.value.trim()) {
                ElMessage?.warning('请输入玩家名称') || alert('请输入玩家名称');
                return;
            }

            loading.value = true;
            errorMessage.value = '';
            apiResponse.value = null;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
                
                const response = await fetch(getApiUrl(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        player_name: playerName.value.trim() 
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.error) {
                    errorMessage.value = data.error;
                    ElMessage?.error(data.error) || alert(data.error);
                } else {
                    apiResponse.value = data;
                    
                    // 设置默认选中的tab
                    const detailedStats = data.detailed_stats;
                    if (detailedStats) {
                        const availableTabs = Object.keys(detailedStats);
                        
                        if (availableTabs.includes('双排')) {
                            activeTab.value = '双排';
                        } else if (availableTabs.length > 0) {
                            activeTab.value = availableTabs[0];
                        }
                    }
                    
                    ElMessage?.success('查询成功！') || console.log('查询成功！');
                }
            } catch (error) {
                console.error('查询失败:', error);
                let errorMsg = '网络请求失败';
                
                if (error.name === 'AbortError') {
                    errorMsg = '请求超时，请重试';
                } else if (error.message.includes('HTTP')) {
                    errorMsg = `服务器错误: ${error.message}`;
                } else if (!navigator.onLine) {
                    errorMsg = '网络连接断开，请检查网络';
                }
                
                errorMessage.value = errorMsg;
                ElMessage?.error(errorMsg) || alert(errorMsg);
            } finally {
                loading.value = false;
            }
        };

        // 格式化游戏时长
        const formatGameTime = (seconds) => {
            if (!seconds) return '未知';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}小时${minutes}分钟`;
        };

        // 处理图片加载错误
        const handleImageError = (event) => {
            event.target.style.display = 'none';
        };

        // 获取排名样式类
        const getRankClass = (rank) => {
            if (rank === 1) return 'rank-1';
            if (rank === 2) return 'rank-2';
            if (rank === 3) return 'rank-3';
            if (rank <= 5) return 'rank-4';
            return 'rank-default';
        };

        // 获取模式文本
        const getModeText = (subtype) => {
            const modeMap = { 
                101: '单排', 
                102: '双排', 
                103: '三排',
                403: '天人之战单排',
                402: '天人之战双排',
                401: '天人之战三排'
            };
            return modeMap[subtype] || '未知';
        };

        // 获取分数变化
        const getScoreChange = (beginScore, endScore) => {
            const change = endScore - beginScore;
            if (change > 0) return `+${change}`;
            if (change < 0) return `${change}`;
            return '0';
        };

        // 获取分数变化样式类
        const getScoreChangeClass = (beginScore, endScore) => {
            const change = endScore - beginScore;
            if (change > 0) return 'score-positive';
            if (change < 0) return 'score-negative';
            return 'score-neutral';
        };

        // 格式化对局时间
        const formatBattleTime = (timestamp) => {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            
            const minutes = Math.floor(diff / (1000 * 60));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days > 0) return `${days}天前`;
            if (hours > 0) return `${hours}小时前`;
            if (minutes > 0) return `${minutes}分钟前`;
            return '刚刚';
        };

        return {
            playerName,
            loading,
            apiResponse,
            errorMessage,
            activeTab,
            currentBattles,
            onTabChange,
            searchPlayer,
            formatGameTime,
            handleImageError,
            getFullGradeName,
            extractRoleId,
            getRankClass,
            getModeText,
            getScoreChange,
            getScoreChangeClass,
            formatBattleTime
        };
    }
});

// 注册图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

// 使用 Element Plus 并挂载应用
try {
    if (typeof ElementPlus !== 'undefined') {
        app.use(ElementPlus);
    }
    app.mount('#app');
    console.log('应用启动成功');
} catch (error) {
    console.error('应用启动失败:', error);
    document.getElementById('app').innerHTML = `
        <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h2 style="color: #f56c6c;">应用加载失败</h2>
            <p>请刷新页面重试，或检查网络连接</p>
            <button onclick="location.reload()" style="padding: 10px 20px; background: #409eff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                刷新页面
            </button>
        </div>
    `;
}