// 公共工具函数

// API 基础路径
const API_BASE = '/api';

// 获取存储的 token
function getToken() {
    return localStorage.getItem('token');
}

// 获取存储的用户信息
function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// 保存登录信息
function saveLoginInfo(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
}

// 清除登录信息
function clearLoginInfo() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

// 检查是否已登录
function isLoggedIn() {
    return getToken() !== null;
}

// 退出登录
function logout() {
    clearLoginInfo();
    window.location.href = '/';
}

// 设置用户信息显示
function setUserProfile() {
    const user = getUser();
    if (user) {
        const avatarEl = document.querySelector('.avatar');
        const userNameEl = document.querySelector('.user-profile .font-bold');
        const deptEl = document.querySelector('.user-profile .text-sm');
        
        if (avatarEl) {
            avatarEl.textContent = user.real_name.charAt(0);
        }
        if (userNameEl) {
            userNameEl.textContent = user.real_name;
        }
        if (deptEl) {
            deptEl.textContent = user.department;
        }
    }
}

// 通用请求函数
async function apiRequest(url, options = {}) {
    const token = getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${url}`, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                // 未授权，跳转到登录页
                clearLoginInfo();
                window.location.href = '/';
                return null;
            }
            throw new Error(data.message || '请求失败');
        }
        
        // 请求成功后，如果不是刷新token的请求，则自动刷新token
        if (url !== '/auth/refresh' && token) {
            refreshTokenSilently();
        }
        
        return data;
    } catch (error) {
        console.error('API 请求错误:', error);
        throw error;
    }
}

// 静默刷新token
let isRefreshing = false;
async function refreshTokenSilently() {
    if (isRefreshing) return;
    isRefreshing = true;
    
    try {
        const token = getToken();
        if (!token) return;
        
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.token) {
                localStorage.setItem('token', data.data.token);
            }
        }
    } catch (error) {
        // 静默失败，不影响用户体验
        console.error('刷新token失败:', error);
    } finally {
        isRefreshing = false;
    }
}

// GET 请求
async function apiGet(url) {
    return apiRequest(url, { method: 'GET' });
}

// POST 请求
async function apiPost(url, data) {
    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

// PUT 请求
async function apiPut(url, data) {
    return apiRequest(url, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

// DELETE 请求
async function apiDelete(url) {
    return apiRequest(url, { method: 'DELETE' });
}

// 显示提示信息
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(alertDiv, mainContent.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// 格式化金额
function formatAmount(amount) {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY'
    }).format(amount);
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待审核',
        'active': '已生效',
        'completed': '已完成',
        'high': '高风险',
        'medium': '中风险',
        'low': '低风险',
        'open': '待处理',
        'monitoring': '监控中',
        'closed': '已关闭'
    };
    return statusMap[status] || status;
}

// 获取状态样式类
function getStatusClass(status) {
    const classMap = {
        'pending': 'status-pending',
        'active': 'status-active',
        'completed': 'status-completed',
        'high': 'status-high',
        'medium': 'status-medium',
        'low': 'status-low',
        'open': 'status-open',
        'monitoring': 'status-monitoring',
        'closed': 'status-closed'
    };
    return classMap[status] || '';
}

// 创建分页 HTML
function createPagination(pagination, onPageChange) {
    const { page, totalPages, total } = pagination;
    
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '上一页';
    prevBtn.disabled = page <= 1;
    prevBtn.onclick = () => onPageChange(page - 1);
    paginationDiv.appendChild(prevBtn);
    
    // 页码信息
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `第 ${page} 页 / 共 ${totalPages} 页 (${total} 条记录)`;
    paginationDiv.appendChild(pageInfo);
    
    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '下一页';
    nextBtn.disabled = page >= totalPages;
    nextBtn.onclick = () => onPageChange(page + 1);
    paginationDiv.appendChild(nextBtn);
    
    return paginationDiv;
}

// 模态框控制
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
    }
}

// 页面初始化检查
function checkAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/';
        return false;
    }
    return true;
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 设置当前页面导航激活状态
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
});

// 获取可见模块配置
async function getVisibleModules() {
    try {
        const response = await apiGet('/auth/modules');
        if (response.success) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error('获取模块配置失败:', error);
        return [];
    }
}

// 动态生成侧边栏导航
async function generateSidebarNav() {
    const modules = await getVisibleModules();
    const sidebar = document.querySelector('.sidebar');
    
    if (!sidebar || modules.length === 0) {
        return;
    }
    
    // 找到用户信息区域
    const userProfile = sidebar.querySelector('.user-profile');
    
    // 移除现有的导航项（保留品牌和用户信息）
    const existingNavItems = sidebar.querySelectorAll('.nav-item');
    existingNavItems.forEach(item => item.remove());
    
    // 根据模块配置生成导航项
    const moduleIcons = {
        'dashboard': 'fa-chart-line',
        'contracts': 'fa-file-contract',
        'regulations': 'fa-book',
        'compliance': 'fa-clipboard-check',
        'risks': 'fa-triangle-exclamation',
        'department_work': 'fa-tasks',
        'admin': 'fa-cog'
    };
    
    const moduleNames = {
        'dashboard': '工作台',
        'contracts': '合同管理',
        'regulations': '制度管理',
        'compliance': '合规管理',
        'risks': '风险管理',
        'department_work': '部门工作',
        'admin': '后台管理'
    };
    
    const modulePages = {
        'dashboard': '/pages/dashboard.html',
        'contracts': '/pages/contracts.html',
        'regulations': '/pages/regulations.html',
        'compliance': '/pages/compliance.html',
        'risks': '/pages/risks.html',
        'department_work': '/pages/department_work.html',
        'admin': '/pages/admin.html'
    };
    
    // 在用户信息区域前插入导航项
    modules.forEach(module => {
        const navItem = document.createElement('a');
        navItem.href = modulePages[module.module_key] || '#';
        navItem.className = 'nav-item';
        navItem.innerHTML = `<i class="fa-solid ${moduleIcons[module.module_key] || 'fa-cube'}"></i> ${moduleNames[module.module_key] || module.module_name}`;
        
        sidebar.insertBefore(navItem, userProfile);
    });
    
    // 添加退出登录链接
    const logoutItem = document.createElement('a');
    logoutItem.href = '#';
    logoutItem.className = 'nav-item';
    logoutItem.style.marginTop = 'auto';
    logoutItem.style.borderTop = '1px solid rgba(255,255,255,0.1)';
    logoutItem.onclick = function() { logout(); return false; };
    logoutItem.innerHTML = '<i class="fa-solid fa-sign-out-alt"></i> 退出登录';
    
    // 根据用户角色决定退出登录按钮位置
    // 管理员：放在后台管理下面；普通用户：放在部门工作下面
    const isAdmin = modules.some(m => m.module_key === 'admin');
    const targetHref = isAdmin ? '/pages/admin.html' : '/pages/department_work.html';
    
    const targetNavItem = Array.from(sidebar.querySelectorAll('.nav-item')).find(item =>
        item.getAttribute('href') === targetHref
    );
    
    if (targetNavItem && targetNavItem.nextSibling) {
        sidebar.insertBefore(logoutItem, targetNavItem.nextSibling);
    } else {
        sidebar.insertBefore(logoutItem, userProfile);
    }
    
    // 设置当前页面激活状态
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = sidebar.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const href = item.getAttribute('href');
        if (href && href.includes(currentPage)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// 检查模块是否可见
async function isModuleVisible(moduleKey) {
    const modules = await getVisibleModules();
    return modules.some(m => m.module_key === moduleKey);
}
