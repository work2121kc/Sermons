// تعريف عنوان API
const API_URL = 'https://script.google.com/macros/s/AKfycbyZ2JRMXfK2CROdfzlGM7gNk_A83MViajxPeW05JOZ4ekUP3K2Fg99vH-vq1BzMzH8hdQ/exec';

// متغيرات عامة
let allSermons = [];
let currentSermonId = null;

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحديث السنة في التذييل
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // التحقق مما إذا كان المستخدم مسجل الدخول
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    
    // تحميل الأقسام من الخادم
    loadCategories();
    
    // تحميل الخطب من الخادم
    loadSermons();
    
    // إضافة مستمع الحدث لنموذج إضافة الخطبة
    document.getElementById('add-sermon-form').addEventListener('submit', handleSaveSermon);
    
    // إضافة مستمع الحدث لنموذج إضافة قسم جديد
    document.getElementById('add-category-form').addEventListener('submit', handleAddCategory);
    
    // إضافة مستمع الحدث لزر تسجيل الخروج
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    // إضافة مستمع الحدث لمعاينة رابط الصوت
    document.getElementById('sermon-audio-url').addEventListener('input', handleAudioPreview);
    
    // إضافة مستمع الحدث لزر إلغاء التعديل
    document.getElementById('cancel-edit-btn').addEventListener('click', cancelEdit);
    
    // إضافة مستمعي الأحداث لنافذة تأكيد الحذف
    document.getElementById('confirm-delete').addEventListener('click', confirmDelete);
    document.getElementById('cancel-delete').addEventListener('click', cancelDelete);
});

// دالة تحميل الأقسام من الخادم
async function loadCategories() {
    try {
        // إظهار رسالة التحميل
        const categorySelect = document.getElementById('sermon-category');
        categorySelect.innerHTML = '<option value="">جاري تحميل الأقسام...</option>';
        
        // جلب الأقسام من الخادم
        const response = await fetch(`${API_URL}?action=getCategories`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        const categories = data.categories || [];
        
        // تحديث قائمة الأقسام
        updateCategorySelect(categories);
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('حدث خطأ أثناء تحميل الأقسام. يرجى تحديث الصفحة.', 'add-sermon-error');
    }
}

// دالة تحميل الخطب من الخادم
async function loadSermons() {
    try {
        // إظهار رسالة التحميل
        const loadingElement = document.getElementById('sermons-loading');
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">جاري تحميل الخطب...</div>
        `;
        loadingElement.style.display = 'flex';
        document.getElementById('sermons-list').innerHTML = '';
        
        // جلب الخطب من الخادم
        const response = await fetch(`${API_URL}?action=getSermons`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        allSermons = data.sermons || [];
        
        // عرض الخطب
        renderSermonsList(allSermons);
        
        // إخفاء رسالة التحميل بتأثير تلاشي
        loadingElement.style.opacity = '0';
        setTimeout(() => {
            loadingElement.style.display = 'none';
            loadingElement.style.opacity = '1';
        }, 300);
    } catch (error) {
        console.error('Error loading sermons:', error);
        document.getElementById('sermons-loading').style.display = 'none';
        showError('حدث خطأ أثناء تحميل الخطب. يرجى تحديث الصفحة.', 'sermons-management-error');
    }
}

// دالة عرض قائمة الخطب
function renderSermonsList(sermons) {
    const sermonsList = document.getElementById('sermons-list');
    sermonsList.innerHTML = '';
    
    if (sermons.length === 0) {
        sermonsList.innerHTML = '<p>لا توجد خطب متاحة.</p>';
        return;
    }
    
    // إنشاء جدول لعرض الخطب
    const table = document.createElement('table');
    table.className = 'sermons-table';
    
    // إنشاء رأس الجدول
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>العنوان</th>
            <th>التصنيف</th>
            <th>الإجراءات</th>
        </tr>
    `;
    table.appendChild(thead);
    
    // إنشاء جسم الجدول
    const tbody = document.createElement('tbody');
    
    sermons.forEach(sermon => {
        const tr = document.createElement('tr');
        
        // الحصول على اسم التصنيف
        const categoryName = getCategoryName(sermon.category);
        
        tr.innerHTML = `
            <td>${sermon.title}</td>
            <td>${categoryName}</td>
            <td>
                <button class="edit-button" data-id="${sermon.id}">
                    <i class="fas fa-edit"></i> تعديل
                </button>
                <button class="delete-button" data-id="${sermon.id}">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    sermonsList.appendChild(table);
    
    // إضافة مستمعي الأحداث لأزرار التعديل والحذف
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const sermonId = button.getAttribute('data-id');
            editSermon(sermonId);
        });
    });
    
    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const sermonId = button.getAttribute('data-id');
            showDeleteConfirmation(sermonId);
        });
    });
}

// دالة تحديث قائمة الأقسام في النموذج
function updateCategorySelect(categories) {
    const categorySelect = document.getElementById('sermon-category');
    
    // إفراغ القائمة وإضافة الخيار الافتراضي
    categorySelect.innerHTML = '<option value="">اختر التصنيف</option>';
    
    // إضافة الأقسام
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

// دالة معالجة حفظ الخطبة (إضافة أو تعديل)
async function handleSaveSermon(e) {
    e.preventDefault();
    
    // إخفاء رسائل النجاح والخطأ
    document.getElementById('add-sermon-success').classList.add('hidden');
    document.getElementById('add-sermon-error').classList.add('hidden');
    
    // الحصول على بيانات النموذج
    const sermonId = document.getElementById('sermon-id').value.trim();
    const title = document.getElementById('sermon-title').value.trim();
    const category = document.getElementById('sermon-category').value.trim();
    const text = document.getElementById('sermon-text').value.trim();
    const audioUrl = document.getElementById('sermon-audio-url').value.trim();
    
    // التحقق من البيانات المطلوبة
    if (!title || !category || !text) {
        showError('يرجى ملء جميع الحقول المطلوبة', 'add-sermon-error');
        return;
    }
    
    try {
        // الحصول على معلومات المستخدم
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        
        // إنشاء كائن FormData لإرسال البيانات
        const formData = new FormData();
        
        // تحديد نوع العملية (إضافة أو تعديل)
        if (sermonId) {
            formData.append('action', 'updateSermon');
            formData.append('id', sermonId);
        } else {
            formData.append('action', 'addSermon');
        }
        
        formData.append('title', title);
        formData.append('category', category);
        formData.append('text', text);
        formData.append('username', auth.username);
        formData.append('token', auth.token);
        
        // إضافة رابط الصوت إذا تم إدخاله
        if (audioUrl) {
            formData.append('audioUrl', audioUrl);
        }
        
        // إرسال البيانات إلى الخادم
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // عرض رسالة النجاح
            const successMessage = sermonId ? 'تم تعديل الخطبة بنجاح' : 'تمت إضافة الخطبة بنجاح';
            document.getElementById('add-sermon-success').textContent = successMessage;
            document.getElementById('add-sermon-success').classList.remove('hidden');
            
            // إعادة تعيين النموذج
            resetForm();
            
            // إعادة تحميل الخطب
            loadSermons();
        } else {
            showError(data.message || 'حدث خطأ أثناء حفظ الخطبة', 'add-sermon-error');
        }
    } catch (error) {
        console.error('Error saving sermon:', error);
        showError('حدث خطأ أثناء حفظ الخطبة. يرجى المحاولة مرة أخرى.', 'add-sermon-error');
    }
}

// دالة تعديل الخطبة
function editSermon(sermonId) {
    // البحث عن الخطبة بواسطة المعرف
    const sermon = allSermons.find(s => s.id.toString() === sermonId.toString());
    
    if (!sermon) {
        showError('لم يتم العثور على الخطبة المطلوبة', 'sermons-management-error');
        return;
    }
    
    // تعيين قيم النموذج
    document.getElementById('sermon-id').value = sermon.id;
    document.getElementById('sermon-title').value = sermon.title;
    document.getElementById('sermon-category').value = sermon.category;
    document.getElementById('sermon-text').value = sermon.text;
    document.getElementById('sermon-audio-url').value = sermon.audioUrl || '';
    
    // تحديث عنوان النموذج وزر الحفظ
    document.getElementById('form-title').textContent = 'تعديل الخطبة';
    document.getElementById('save-sermon-btn').innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
    
    // إظهار زر إلغاء التعديل
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
    // التمرير إلى النموذج
    document.getElementById('form-title').scrollIntoView({ behavior: 'smooth' });
    
    // تحديث معاينة الصوت إذا كان متاحًا
    if (sermon.audioUrl) {
        const previewContainer = document.querySelector('.audio-preview');
        const audioPlayer = document.getElementById('audio-preview-player');
        audioPlayer.src = sermon.audioUrl;
        previewContainer.classList.remove('hidden');
    }
    
    // تخزين معرف الخطبة الحالية
    currentSermonId = sermon.id;
}

// دالة إلغاء التعديل
function cancelEdit() {
    resetForm();
}

// دالة إعادة تعيين النموذج
function resetForm() {
    // إعادة تعيين قيم النموذج
    document.getElementById('add-sermon-form').reset();
    document.getElementById('sermon-id').value = '';
    
    // إعادة تعيين عنوان النموذج وزر الحفظ
    document.getElementById('form-title').textContent = 'إضافة خطبة جديدة';
    document.getElementById('save-sermon-btn').innerHTML = '<i class="fas fa-save"></i> حفظ الخطبة';
    
    // إخفاء زر إلغاء التعديل
    document.getElementById('cancel-edit-btn').style.display = 'none';
    
    // إخفاء معاينة الصوت
    document.querySelector('.audio-preview').classList.add('hidden');
    document.getElementById('audio-preview-player').src = '';
    
    // إعادة تعيين معرف الخطبة الحالية
    currentSermonId = null;
    
    // إخفاء رسائل النجاح والخطأ
    document.getElementById('add-sermon-success').classList.add('hidden');
    document.getElementById('add-sermon-error').classList.add('hidden');
}

// دالة عرض نافذة تأكيد الحذف
function showDeleteConfirmation(sermonId) {
    // تخزين معرف الخطبة المراد حذفها
    currentSermonId = sermonId;
    
    // إظهار نافذة التأكيد
    document.getElementById('delete-confirmation').classList.remove('hidden');
}

// دالة تأكيد الحذف
async function confirmDelete() {
    if (!currentSermonId) {
        cancelDelete();
        return;
    }
    
    try {
        // الحصول على معلومات المستخدم
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        
        // إنشاء كائن FormData لإرسال البيانات
        const formData = new FormData();
        formData.append('action', 'deleteSermon');
        formData.append('id', currentSermonId);
        formData.append('username', auth.username);
        formData.append('token', auth.token);
        
        // إرسال البيانات إلى الخادم
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        // إخفاء نافذة التأكيد
        cancelDelete();
        
        if (data.success) {
            // عرض رسالة النجاح
            document.getElementById('sermons-management-success').textContent = 'تم حذف الخطبة بنجاح';
            document.getElementById('sermons-management-success').classList.remove('hidden');
            
            // إعادة تحميل الخطب
            loadSermons();
            
            // إخفاء رسالة النجاح بعد 3 ثوانٍ
            setTimeout(() => {
                document.getElementById('sermons-management-success').classList.add('hidden');
            }, 3000);
        } else {
            showError(data.message || 'حدث خطأ أثناء حذف الخطبة', 'sermons-management-error');
        }
    } catch (error) {
        console.error('Error deleting sermon:', error);
        cancelDelete();
        showError('حدث خطأ أثناء حذف الخطبة. يرجى المحاولة مرة أخرى.', 'sermons-management-error');
    }
}

// دالة إلغاء الحذف
function cancelDelete() {
    // إخفاء نافذة التأكيد
    document.getElementById('delete-confirmation').classList.add('hidden');
    
    // إعادة تعيين معرف الخطبة الحالية
    currentSermonId = null;
}

// دالة الحصول على اسم التصنيف
function getCategoryName(categoryId) {
    // البحث عن التصنيف في قائمة الأقسام
    const categorySelect = document.getElementById('sermon-category');
    const options = categorySelect.options;
    
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === categoryId) {
            return options[i].textContent;
        }
    }
    
    // إرجاع معرف التصنيف إذا لم يتم العثور على الاسم
    return categoryId;
}

// دالة معالجة إضافة قسم جديد
async function handleAddCategory(e) {
    e.preventDefault();
    
    // إخفاء رسائل النجاح والخطأ
    document.getElementById('add-category-success').classList.add('hidden');
    document.getElementById('add-category-error').classList.add('hidden');
    
    // الحصول على بيانات النموذج
    const categoryId = document.getElementById('category-id').value.trim();
    const categoryName = document.getElementById('category-name').value.trim();
    
    // التحقق من البيانات المطلوبة
    if (!categoryId || !categoryName) {
        showError('يرجى ملء جميع حقول القسم المطلوبة', 'add-category-error');
        return;
    }
    
    // التحقق من أن معرف القسم يحتوي على أحرف إنجليزية فقط وأرقام وشرطات سفلية
    if (!/^[a-zA-Z0-9_-]+$/.test(categoryId)) {
        showError('معرف القسم يجب أن يحتوي على أحرف إنجليزية وأرقام وشرطات سفلية فقط', 'add-category-error');
        return;
    }
    
    try {
        // الحصول على معلومات المستخدم
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        
        // إنشاء كائن FormData لإرسال البيانات
        const formData = new FormData();
        formData.append('action', 'addCategory');
        formData.append('categoryId', categoryId);
        formData.append('categoryName', categoryName);
        formData.append('username', auth.username);
        formData.append('token', auth.token);
        
        // إرسال البيانات إلى الخادم
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // عرض رسالة النجاح
            document.getElementById('add-category-success').classList.remove('hidden');
            // إعادة تعيين النموذج
            document.getElementById('add-category-form').reset();
            
            // إعادة تحميل الأقسام من الخادم لتحديث القائمة
            loadCategories();
        } else {
            showError(data.message || 'حدث خطأ أثناء إضافة القسم', 'add-category-error');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showError('حدث خطأ أثناء إضافة القسم. يرجى المحاولة مرة أخرى.', 'add-category-error');
    }
}

// دالة معالجة تسجيل الخروج
function handleLogout() {
    // حذف معلومات تسجيل الدخول
    localStorage.removeItem('auth');
    // التوجيه إلى صفحة تسجيل الدخول
    window.location.href = 'login.html';
}

// دالة معالجة معاينة رابط الصوت
function handleAudioPreview(e) {
    const audioUrl = e.target.value.trim();
    const previewContainer = document.querySelector('.audio-preview');
    const audioPlayer = document.getElementById('audio-preview-player');
    
    if (audioUrl && isValidUrl(audioUrl)) {
        audioPlayer.src = audioUrl;
        previewContainer.classList.remove('hidden');
    } else {
        previewContainer.classList.add('hidden');
        audioPlayer.src = '';
    }
}

// دالة للتحقق من صحة الرابط
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// دالة التحقق مما إذا كان المستخدم مسجل الدخول
function isLoggedIn() {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    const now = new Date().getTime();
    
    // التحقق من وجود رمز التوثيق وأنه لم تنتهي صلاحيته
    return auth.token && auth.expiry && auth.expiry > now;
}

// دالة عرض رسالة الخطأ
function showError(message, elementId = 'add-sermon-error') {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}