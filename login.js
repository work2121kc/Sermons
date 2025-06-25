// تعريف عنوان API
const API_URL = 'https://script.google.com/macros/s/AKfycbyZ2JRMXfK2CROdfzlGM7gNk_A83MViajxPeW05JOZ4ekUP3K2Fg99vH-vq1BzMzH8hdQ/exec';

// تنفيذ عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // تحديث السنة في التذييل
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // التحقق مما إذا كان المستخدم مسجل الدخول بالفعل
    if (isLoggedIn()) {
        window.location.href = 'add-sermon.html';
        return;
    }
    
    // إضافة مستمع الحدث لنموذج تسجيل الدخول
    document.getElementById('login-form').addEventListener('submit', handleLogin);
});

// دالة معالجة تسجيل الدخول
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        showError('يرجى إدخال اسم المستخدم وكلمة المرور');
        return;
    }
    
    // إظهار أنيميشن التحميل
    const submitButton = document.querySelector('.submit-button');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<div class="loading-spinner-small"></div> جاري التحقق...';
    submitButton.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
        
        if (!response.ok) {
            throw new Error('فشل في الاتصال بالخادم');
        }
        
        const data = await response.json();
        
        if (data.success) {
            // تخزين معلومات تسجيل الدخول
            localStorage.setItem('auth', JSON.stringify({
                username: username,
                token: data.token,
                expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // صلاحية لمدة 24 ساعة
            }));
            
            // التوجيه إلى صفحة إضافة الخطب
            window.location.href = 'add-sermon.html';
        } else {
            showError(data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
            // إعادة زر التسجيل إلى حالته الأصلية
            submitButton.innerHTML = originalButtonText;
            submitButton.disabled = false;
        }
    } catch (error) {
        console.error('Error during login:', error);
        showError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
        // إعادة زر التسجيل إلى حالته الأصلية
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
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
function showError(message) {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}