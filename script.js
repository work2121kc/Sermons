// تعريف عنوان API
const API_URL = 'https://script.google.com/macros/s/AKfycbyZ2JRMXfK2CROdfzlGM7gNk_A83MViajxPeW05JOZ4ekUP3K2Fg99vH-vq1BzMzH8hdQ/exec';

// المتغيرات العامة
let currentCategory = 'all';
let allSermons = [];

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحديث السنة في التذييل
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // التحقق مما إذا كان المستخدم مسجل الدخول
    const addSermonLink = document.getElementById('add-sermon-link');
    if (isLoggedIn()) {
        // إظهار رابط إضافة خطبة إذا كان المستخدم مسجل الدخول
        addSermonLink.classList.remove('hidden');
    } else {
        // إخفاء رابط إضافة خطبة إذا لم يكن المستخدم مسجل الدخول
        addSermonLink.classList.add('hidden');
    }
    
    // إضافة مستمعي الأحداث لأزرار التصنيف
    document.querySelectorAll('.categories a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('data-category');
            setActiveCategory(category);
            filterSermons(category);
        });
    });
    
    // تحميل الخطب
    fetchSermons();
});

// دالة البحث
function searchSermons() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (searchTerm === '') {
        filterSermons(currentCategory);
        return;
    }
    
    const filteredSermons = allSermons.filter(sermon => {
        return sermon.title.toLowerCase().includes(searchTerm) || 
               sermon.text.toLowerCase().includes(searchTerm);
    });
    
    renderSermons(filteredSermons);
}

// متغيرات إضافية لتقسيم الصفحات
let currentPage = 1;
let totalPages = 1;
let sermonLimit = 10;

// دالة جلب الخطب من API مع دعم تقسيم الصفحات
async function fetchSermons(page = 1) {
    showLoading(true);
    showError(false);
    
    try {
        // جلب الخطب مع معلمات تقسيم الصفحات
        const response = await fetch(`${API_URL}?action=getSermons&page=${page}&limit=${sermonLimit}`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'حدث خطأ في استرجاع البيانات');
        }
        
        allSermons = data.sermons || [];
        
        // تحديث معلومات تقسيم الصفحات
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        
        // جلب الأقسام وتحديث القائمة إذا كانت الصفحة الأولى فقط
        if (page === 1) {
            const categories = await fetchCategories();
            updateCategoryList(categories);
        }
        
        filterSermons(currentCategory);
        renderPagination();
        showLoading(false);
    } catch (error) {
        console.error('Error fetching sermons:', error);
        showLoading(false);
        showError(true, error.message);
    }
}

// دالة لعرض أزرار تقسيم الصفحات
function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) {
        return;
    }
    
    // إنشاء زر الصفحة السابقة
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    prevButton.className = 'pagination-button';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchSermons(currentPage - 1);
        }
    });
    paginationContainer.appendChild(prevButton);
    
    // إنشاء أزرار الصفحات
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'pagination-button' + (i === currentPage ? ' active' : '');
        pageButton.addEventListener('click', () => {
            if (i !== currentPage) {
                fetchSermons(i);
            }
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // إنشاء زر الصفحة التالية
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    nextButton.className = 'pagination-button';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            fetchSermons(currentPage + 1);
        }
    });
    paginationContainer.appendChild(nextButton);
}

// تعديل دالة showError لعرض رسالة الخطأ
function showError(show, message = 'حدث خطأ في تحميل البيانات') {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.classList.toggle('hidden', !show);
}

// دالة تصفية الخطب حسب التصنيف
function filterSermons(category) {
    currentCategory = category;
    
    if (category === 'all') {
        renderSermons(allSermons);
    } else {
        const filteredSermons = allSermons.filter(sermon => sermon.category === category);
        renderSermons(filteredSermons);
    }
}

// دالة عرض الخطب في الصفحة
function renderSermons(sermons) {
    const container = document.getElementById('sermons-container');
    container.innerHTML = '';
    
    if (sermons.length === 0) {
        container.innerHTML = '<div class="sermon-card"><p>لا توجد خطب متاحة في هذا القسم</p></div>';
        return;
    }
    
    sermons.forEach(sermon => {
        const sermonCard = document.createElement('div');
        sermonCard.className = 'sermon-card';
        
        // إنشاء نص مختصر للعرض في الصفحة الرئيسية
        const shortText = sermon.text.length > 200 ? 
            sermon.text.substring(0, 200) + '...' : 
            sermon.text;
        
        sermonCard.innerHTML = `
            <h2 class="sermon-title">${sermon.title}</h2>
            <div class="sermon-text">${shortText.replace(/\n/g, '<br>')}</div>
            ${sermon.audioUrl ? `<audio class="sermon-audio" controls src="${sermon.audioUrl}"></audio>` : ''}
            <span class="sermon-category">${getCategoryName(sermon.category)}</span>
            <a href="sermon.html?id=${sermon.id}" class="sermon-link">قراءة المزيد <i class="fas fa-arrow-left"></i></a>
        `;
        
        container.appendChild(sermonCard);
    });
}

// دالة تحديد التصنيف النشط
function setActiveCategory(category) {
    document.querySelectorAll('.categories a').forEach(link => {
        if (link.getAttribute('data-category') === category) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// دالة الحصول على اسم التصنيف بالعربية
function getCategoryName(categoryId) {
    const categories = {
        'prayer': 'أهمية الصلاة',
        'fasting': 'الصيام',
        'charity': 'الصدقة',
        'hajj': 'الحج',
        'all': 'جميع الخطب'
    };
    
    return categories[categoryId] || categoryId;
}

// دوال إظهار وإخفاء رسائل التحميل والخطأ
// دالة إظهار/إخفاء رسالة التحميل
function showLoading(show) {
    const loadingElement = document.getElementById('loading');
    
    if (show) {
        loadingElement.classList.remove('hidden');
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.style.opacity = '1';
        }, 10);
    } else {
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.classList.add('hidden');
            loadingElement.style.opacity = '1';
        }, 300);
    }
}

function showError(show) {
    document.getElementById('error').classList.toggle('hidden', !show);
}

// دالة التحقق مما إذا كان المستخدم مسجل الدخول
function isLoggedIn() {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const now = new Date().getTime();
    
    // التحقق من وجود رمز التوثيق وأنه لم تنتهي صلاحيته
    return auth.token && auth.expiry && auth.expiry > now;
}

// دالة جلب الأقسام من API مع دعم التخزين المؤقت
async function fetchCategories() {
    try {
        // التحقق من وجود بيانات مخزنة مؤقتًا وأنها لم تنتهي صلاحيتها
        const cachedData = JSON.parse(localStorage.getItem('categories_cache') || '{}');
        const cacheExpiry = cachedData.expiry || 0;
        
        // استخدام البيانات المخزنة إذا كانت صالحة (لمدة ساعة)
        if (cachedData.categories && cacheExpiry > Date.now()) {
            return cachedData.categories;
        }
        
        // جلب البيانات من الخادم إذا لم تكن هناك بيانات مخزنة أو انتهت صلاحيتها
        const response = await fetch(`${API_URL}?action=getCategories`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        const categories = data.categories || [];
        
        // تخزين البيانات مؤقتًا لمدة ساعة
        localStorage.setItem('categories_cache', JSON.stringify({
            categories: categories,
            expiry: Date.now() + (60 * 60 * 1000) // ساعة واحدة
        }));
        
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        
        // محاولة استخدام البيانات المخزنة حتى لو انتهت صلاحيتها في حالة الخطأ
        const cachedData = JSON.parse(localStorage.getItem('categories_cache') || '{}');
        return cachedData.categories || [];
    }
}

// دالة تحديث قائمة الأقسام في الصفحة
function updateCategoryList(categories) {
    const categoryList = document.querySelector('.categories');
    
    // الاحتفاظ بالعنصر الأول (جميع الخطب)
    const allCategoriesItem = categoryList.querySelector('[data-category="all"]').parentElement;
    
    // إفراغ القائمة مع الاحتفاظ بالعنصر الأول
    categoryList.innerHTML = '';
    categoryList.appendChild(allCategoriesItem);
    
    // إضافة الأقسام
    categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" data-category="${category.id}">${category.name}</a>`;
        
        // إضافة مستمع الحدث للرابط
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('data-category');
            setActiveCategory(category);
            filterSermons(category);
        });
        
        categoryList.appendChild(li);
    });
}

// دالة لإعادة المحاولة عند فشل الاتصال
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`فشل في الاتصال بالخادم: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            retries++;
            
            if (retries >= maxRetries) {
                throw error;
            }
            
            // انتظار قبل إعادة المحاولة (1 ثانية، 2 ثانية، 4 ثانية، ...)
            const delay = Math.pow(2, retries - 1) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            
            console.log(`إعادة محاولة الاتصال (${retries}/${maxRetries})...`);
        }
    }
}

// استخدام دالة إعادة المحاولة في جلب الخطب
async function fetchSermons(page = 1) {
    showLoading(true);
    showError(false);
    
    try {
        // استخدام دالة إعادة المحاولة
        const data = await fetchWithRetry(`${API_URL}?action=getSermons&page=${page}&limit=${sermonLimit}`);
        
        if (!data.success) {
            throw new Error(data.message || 'حدث خطأ في استرجاع البيانات');
        }
        
        allSermons = data.sermons || [];
        
        // تحديث معلومات تقسيم الصفحات
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;
        
        // جلب الأقسام وتحديث القائمة إذا كانت الصفحة الأولى فقط
        if (page === 1) {
            const categories = await fetchCategories();
            updateCategoryList(categories);
        }
        
        filterSermons(currentCategory);
        renderPagination();
        showLoading(false);
    } catch (error) {
        console.error('Error fetching sermons:', error);
        showLoading(false);
        showError(true, `فشل في تحميل البيانات: ${error.message}`);
    }
}