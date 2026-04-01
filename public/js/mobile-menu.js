/**
 * 移动端菜单控制脚本
 * 法务合规管理系统
 */

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
});

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    // 创建移动端菜单按钮
    const menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    menuBtn.setAttribute('aria-label', '打开菜单');
    document.body.appendChild(menuBtn);

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);

    // 获取侧边栏
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // 切换菜单状态
    function toggleMenu() {
        const isActive = sidebar.classList.contains('active');
        
        if (isActive) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // 打开菜单
    function openMenu() {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        menuBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
        menuBtn.setAttribute('aria-label', '关闭菜单');
        document.body.style.overflow = 'hidden';
    }

    // 关闭菜单
    function closeMenu() {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        menuBtn.setAttribute('aria-label', '打开菜单');
        document.body.style.overflow = '';
    }

    // 绑定事件
    menuBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);

    // 点击导航项后关闭菜单
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });

    // ESC键关闭菜单
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            closeMenu();
        }
    });

    // 窗口大小改变时关闭菜单
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            closeMenu();
        }
    });

    // 触摸滑动关闭菜单
    let touchStartX = 0;
    let touchEndX = 0;

    sidebar.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    sidebar.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        // 向左滑动关闭菜单
        if (diff > swipeThreshold && sidebar.classList.contains('active')) {
            closeMenu();
        }
    }
}

/**
 * 检查是否为移动设备
 */
function isMobileDevice() {
    return window.innerWidth <= 768;
}

/**
 * 检查是否为触摸设备
 */
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 导出函数供其他脚本使用
window.MobileMenu = {
    toggle: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        
        if (sidebar && overlay && menuBtn) {
            const isActive = sidebar.classList.contains('active');
            
            if (isActive) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
                document.body.style.overflow = '';
            } else {
                sidebar.classList.add('active');
                overlay.classList.add('active');
                menuBtn.innerHTML = '<i class="fa-solid fa-times"></i>';
                document.body.style.overflow = 'hidden';
            }
        }
    },
    
    close: function() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.mobile-overlay');
        const menuBtn = document.querySelector('.mobile-menu-btn');
        
        if (sidebar && overlay && menuBtn) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            menuBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
            document.body.style.overflow = '';
        }
    },
    
    isOpen: function() {
        const sidebar = document.querySelector('.sidebar');
        return sidebar ? sidebar.classList.contains('active') : false;
    }
};
