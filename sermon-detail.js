// تعريف عنوان API
const API_URL = 'https://script.google.com/macros/s/AKfycbyZ2JRMXfK2CROdfzlGM7gNk_A83MViajxPeW05JOZ4ekUP3K2Fg99vH-vq1BzMzH8hdQ/exec';

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحديث السنة في التذييل
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // الحصول على معرف الخطبة من عنوان URL
    const urlParams = new URLSearchParams(window.location.search);
    const sermonId = urlParams.get('id');
    
    if (sermonId) {
        // تحميل تفاصيل الخطبة
        fetchSermonDetails(sermonId);
    } else {
        // إذا لم يتم تحديد معرف الخطبة، عرض رسالة خطأ
        showError(true);
        document.getElementById('error').textContent = 'لم يتم تحديد الخطبة المطلوبة';
    }
    
    // إضافة مستمع الحدث لزر الطباعة
    document.getElementById('print-sermon').addEventListener('click', printSermon);
    
    // إضافة مستمعي الأحداث لأزرار المشاركة
    setupShareButtons();
});

// دالة جلب تفاصيل الخطبة من API
async function fetchSermonDetails(sermonId) {
    showLoading(true);
    showError(false);
    
    try {
        // تعديل: جلب الخطبة المحددة مباشرة بواسطة المعرف
        const response = await fetch(`${API_URL}?action=getSermon&id=${sermonId}`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        if (data.success && data.sermon) {
            renderSermonDetails(data.sermon);
            // تحديث عنوان الصفحة
            document.title = `${data.sermon.title} - موقع الخطب الدينية`;
        } else {
            throw new Error(data.message || 'الخطبة غير موجودة');
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Error fetching sermon details:', error);
        showLoading(false);
        showError(true);
        document.getElementById('error').textContent = error.message || 'حدث خطأ في تحميل البيانات';
    }
}

// دالة عرض تفاصيل الخطبة في الصفحة
function renderSermonDetails(sermon) {
    const container = document.getElementById('sermon-detail-container');
    
    container.innerHTML = `
        <span class="sermon-category">${getCategoryName(sermon.category)}</span>
        <h1 class="sermon-title">${sermon.title}</h1>
        <div class="sermon-text">${sermon.text.replace(/\n/g, '<br>')}</div>
        ${sermon.audioUrl ? `<audio class="sermon-audio" controls src="${sermon.audioUrl}"></audio>` : ''}
    `;
}

// دالة إعداد أزرار المشاركة
function setupShareButtons() {
    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(document.title);
    
    // مشاركة على فيسبوك
    document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    
    // مشاركة على تويتر
    document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
    
    // مشاركة على واتساب
    document.getElementById('share-whatsapp').href = `https://api.whatsapp.com/send?text=${pageTitle} ${pageUrl}`;
    
    // فتح نوافذ المشاركة في نافذة جديدة
    document.querySelectorAll('.share-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            window.open(e.target.closest('a').href, 'share-window', 'width=600,height=400');
        });
    });
}

// دالة طباعة الخطبة
function printSermon() {
    window.print();
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
function showLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    
    // إضافة تأثير تلاشي عند ظهور واختفاء التحميل
    if (show) {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading').style.opacity = '1';
        }, 10);
    } else {
        document.getElementById('loading').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 300);
    }
}

function showError(show) {
    document.getElementById('error').classList.toggle('hidden', !show);
}