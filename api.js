// هذا الملف يجب رفعه إلى Google Apps Script

// معرف جدول البيانات - قم بتغييره إلى معرف جدول البيانات الخاص بك
const SPREADSHEET_ID = '1gq-3XeNqhzMw_--A5vnJ5cV-BdnnnDPtfdwhHQp00Ug';
const SHEET_NAME = 'الخطب'; // اسم ورقة البيانات
const USERS_SHEET_NAME = 'المستخدمين'; // اسم ورقة المستخدمين

// المفتاح السري لتشفير رموز التوثيق
const SECRET_KEY = 'AADFE4R454T4R';

// دالة لمعالجة الطلبات
function doGet(e) {
  // تمكين CORS للسماح بالوصول من أي مصدر
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // الحصول على نوع الإجراء من المعلمات
  var action = e.parameter.action;
  
  if (action === 'getSermons') {
    // استرجاع بيانات الخطب
    var sermons = getSermonData();
    output.setContent(JSON.stringify({ sermons: sermons }));
  } else if (action === 'getCategories') {
    // استرجاع بيانات الأقسام
    var categories = getCategoryData();
    output.setContent(JSON.stringify({ categories: categories }));
  } else if (action === 'login') {
    // التحقق من بيانات تسجيل الدخول
    var username = e.parameter.username;
    var password = e.parameter.password;
    var loginResult = authenticateUser(username, password);
    output.setContent(JSON.stringify(loginResult));
  } else {
    // إجراء غير معروف
    output.setContent(JSON.stringify({ error: 'إجراء غير معروف' }));
  }
  
  return output;
}

// دالة لمعالجة طلبات POST
function doPost(e) {
  // تمكين CORS للسماح بالوصول من أي مصدر
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // تحليز البيانات المرسلة
    var data = e.parameter;
    var action = data.action;
    
    if (action === 'addSermon') {
      // التحقق من صحة رمز التوثيق
      var username = data.username;
      var token = data.token;
      
      if (!validateToken(username, token)) {
        output.setContent(JSON.stringify({
          success: false,
          message: 'غير مصرح لك بإجراء هذه العملية'
        }));
        return output;
      }
      
      // إضافة خطبة جديدة
      var title = data.title;
      var category = data.category;
      var text = data.text;
      var audioUrl = data.audioUrl || ''; // استخدام الرابط المرسل مباشرة
      
      // إضافة الخطبة إلى جدول البيانات
      var result = addSermonToSheet(title, category, text, audioUrl, username);
      output.setContent(JSON.stringify(result));
    } else if (action === 'updateSermon') {
      // التحقق من صحة رمز التوثيق
      var username = data.username;
      var token = data.token;
      
      if (!validateToken(username, token)) {
        output.setContent(JSON.stringify({
          success: false,
          message: 'غير مصرح لك بإجراء هذه العملية'
        }));
        return output;
      }
      
      // تعديل خطبة موجودة
      var id = data.id;
      var title = data.title;
      var category = data.category;
      var text = data.text;
      var audioUrl = data.audioUrl || '';
      
      // تعديل الخطبة في جدول البيانات
      var result = updateSermonInSheet(id, title, category, text, audioUrl, username);
      output.setContent(JSON.stringify(result));
    } else if (action === 'deleteSermon') {
      // التحقق من صحة رمز التوثيق
      var username = data.username;
      var token = data.token;
      
      if (!validateToken(username, token)) {
        output.setContent(JSON.stringify({
          success: false,
          message: 'غير مصرح لك بإجراء هذه العملية'
        }));
        return output;
      }
      
      // حذف خطبة
      var id = data.id;
      
      // حذف الخطبة من جدول البيانات
      var result = deleteSermonFromSheet(id, username);
      output.setContent(JSON.stringify(result));
    } else if (action === 'addCategory') {
      // التحقق من صحة رمز التوثيق
      var username = data.username;
      var token = data.token;
      
      if (!validateToken(username, token)) {
        output.setContent(JSON.stringify({
          success: false,
          message: 'غير مصرح لك بإجراء هذه العملية'
        }));
        return output;
      }
      
      // إضافة قسم جديد
      var categoryId = data.categoryId;
      var categoryName = data.categoryName;
      
      // دالة لإضافة قسم جديد إلى جدول البيانات
      function addCategoryToSheet(categoryId, categoryName, username) {
        try {
          // فتح جدول البيانات
          const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
          
          // التحقق من وجود ورقة الأقسام، وإنشاؤها إذا لم تكن موجودة
          let categorySheet = spreadsheet.getSheetByName('الأقسام');
          if (!categorySheet) {
            categorySheet = spreadsheet.insertSheet('الأقسام');
            // إضافة رؤوس الأعمدة
            categorySheet.appendRow(['معرف القسم', 'اسم القسم', 'تمت الإضافة بواسطة', 'تاريخ الإضافة']);
          }
          
          // التحقق من عدم وجود قسم بنفس المعرف
          const data = categorySheet.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            if (data[i][0] === categoryId) {
              return { success: false, message: 'يوجد قسم بنفس المعرف بالفعل' };
            }
          }
          
          // إضافة القسم الجديد
          categorySheet.appendRow([
            categoryId,
            categoryName,
            username,
            new Date()
          ]);
          
          // تحديث قائمة الأقسام في الصفحة الرئيسية (يمكن تنفيذ هذا لاحقًا)
          // updateCategoryList();
          
          return { success: true, message: 'تمت إضافة القسم بنجاح' };
        } catch (error) {
          Logger.log('خطأ في إضافة القسم: ' + error.message);
          return { success: false, message: 'حدث خطأ أثناء إضافة القسم: ' + error.message };
        }
      }
      
      // دالة لتحديث قائمة الأقسام في الصفحة الرئيسية (يمكن تنفيذها لاحقًا)
      function updateCategoryList() {
        // هذه الدالة يمكن تنفيذها لاحقًا لتحديث قائمة الأقسام في الصفحة الرئيسية تلقائيًا
        // عند إضافة قسم جديد
      }
      var result = addCategoryToSheet(categoryId, categoryName, username);
      output.setContent(JSON.stringify(result));
    } else {
      // إجراء غير معروف
      output.setContent(JSON.stringify({
        success: false,
        message: 'إجراء غير معروف'
      }));
    }
  } catch (error) {
    // معالجة الأخطاء
    output.setContent(JSON.stringify({
      success: false,
      message: 'حدث خطأ: ' + error.message
    }));
  }
  
  return output;
}

// دالة للحصول على بيانات الخطب من جدول البيانات
// تعديل دالة الحصول على بيانات الخطب لدعم تقسيم الصفحات
function getSermonData(page = 1, limit = 10) {
  try {
    // فتح جدول البيانات باستخدام المعرف
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('لم يتم العثور على ورقة البيانات المحددة');
    }
    
    // الحصول على جميع البيانات من الورقة
    const data = sheet.getDataRange().getValues();
    
    // الصف الأول يحتوي على أسماء الأعمدة
    const headers = data[0];
    
    // حساب إجمالي عدد الخطب والصفحات
    const totalSermons = data.length - 1; // طرح 1 للصف الأول (العناوين)
    const totalPages = Math.ceil(totalSermons / limit);
    
    // حساب الصفوف المطلوبة لهذه الصفحة
    const startIndex = (page - 1) * limit + 1; // +1 لتجاوز صف العناوين
    const endIndex = Math.min(startIndex + limit, data.length);
    
    const sermons = [];
    
    // تحويل البيانات إلى مصفوفة من الكائنات للصفحة المطلوبة فقط
    for (let i = startIndex; i < endIndex; i++) {
      const row = data[i];
      const sermon = {};
      
      // تعيين قيم الخطبة بناءً على أسماء الأعمدة
      for (let j = 0; j < headers.length; j++) {
        sermon[headers[j]] = row[j];
      }
      
      sermons.push(sermon);
    }
    
    return {
      sermons: sermons,
      pagination: {
        page: page,
        limit: limit,
        totalSermons: totalSermons,
        totalPages: totalPages
      }
    };
  } catch (error) {
    Logger.log('خطأ في الحصول على بيانات الخطب: ' + error.message);
    // إرجاع بيانات افتراضية في حالة حدوث خطأ
    return {
      sermons: getDefaultSermons(),
      pagination: {
        page: 1,
        limit: 10,
        totalSermons: 1,
        totalPages: 1
      }
    };
  }
}

// دالة للتحقق من بيانات تسجيل الدخول
function authenticateUser(username, password) {
  try {
    // فتح جدول البيانات
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: 'لم يتم العثور على ورقة المستخدمين' };
    }
    
    // الحصول على بيانات المستخدمين
    const data = sheet.getDataRange().getValues();
    
    // البحث عن المستخدم
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedUsername = row[0]; // افتراض أن اسم المستخدم في العمود الأول
      const storedPassword = row[1]; // افتراض أن كلمة المرور في العمود الثاني
      
      if (storedUsername === username && storedPassword === password) {
        // إنشاء رمز توثيق
        const token = generateToken(username);
        return { success: true, token: token };
      }
    }
    
    // لم يتم العثور على المستخدم أو كلمة المرور غير صحيحة
    return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  } catch (error) {
    Logger.log('خطأ في التحقق من المستخدم: ' + error.message);
    return { success: false, message: 'حدث خطأ أثناء تسجيل الدخول' };
  }
}

// دالة لإنشاء رمز توثيق
function generateToken(username) {
  // إنشاء رمز بسيط باستخدام اسم المستخدم والوقت الحالي والمفتاح السري
  const timestamp = new Date().getTime();
  const data = username + '|' + timestamp + '|' + SECRET_KEY;
  
  // استخدام تجزئة MD5 كمثال بسيط (يمكن استخدام طرق أكثر أمانًا)
  const token = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, data, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(token);
}

// دالة للتحقق من صحة رمز التوثيق
function validateToken(username, token) {
  // في تطبيق حقيقي، يجب تخزين الرموز في قاعدة بيانات والتحقق منها
  // هذا مثال مبسط للتوضيح فقط
  return true;
}

// دالة لإضافة خطبة جديدة إلى جدول البيانات
function addSermonToSheet(title, category, text, audioUrl, username) {
  try {
    // فتح جدول البيانات
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: 'لم يتم العثور على ورقة البيانات' };
    }
    
    // الحصول على آخر معرف
    const data = sheet.getDataRange().getValues();
    let lastId = 0;
    
    if (data.length > 1) {
      // افتراض أن المعرف في العمود الأول
      lastId = data[data.length - 1][0];
    }
    
    // إنشاء معرف جديد
    const newId = lastId + 1;
    
    // إضافة الخطبة الجديدة
    sheet.appendRow([
      newId,
      title,
      text,
      category,
      audioUrl,
      username,
      new Date()
    ]);
    
    return { success: true, message: 'تمت إضافة الخطبة بنجاح', id: newId };
  } catch (error) {
    Logger.log('خطأ في إضافة الخطبة: ' + error.message);
    return { success: false, message: 'حدث خطأ أثناء إضافة الخطبة: ' + error.message };
  }
}

// دالة للحصول على بيانات افتراضية في حالة حدوث خطأ
function getDefaultSermons() {
  return [
    {
      id: 1,
      title: 'أهمية الصلاة في حياة المسلم',
      text: 'الصلاة هي عماد الدين، وهي الركن الثاني من أركان الإسلام. قال رسول الله صلى الله عليه وسلم: "الصلاة عماد الدين، فمن أقامها فقد أقام الدين، ومن هدمها فقد هدم الدين". تعتبر الصلاة صلة بين العبد وربه، وهي وسيلة للتقرب إلى الله تعالى وطلب رضاه...',
      category: 'prayer',
      audioUrl: 'https://example.com/audio/prayer1.mp3'
    },
    
  ];
}

// دالة للحصول على بيانات الأقسام من جدول البيانات
function getCategoryData() {
  try {
    // فتح جدول البيانات باستخدام المعرف
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName('الأقسام');
    
    if (!sheet) {
      // إرجاع الأقسام الافتراضية إذا لم يتم العثور على ورقة الأقسام
      return getDefaultCategories();
    }
    
    // الحصول على جميع البيانات من الورقة
    const data = sheet.getDataRange().getValues();
    
    // الصف الأول يحتوي على أسماء الأعمدة
    const categories = [];
    
    // تحويل البيانات إلى مصفوفة من الكائنات
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      categories.push({
        id: row[0],  // معرف القسم
        name: row[1]  // اسم القسم
      });
    }
    
    return categories;
  } catch (error) {
    Logger.log('خطأ في الحصول على بيانات الأقسام: ' + error.message);
    // إرجاع بيانات افتراضية في حالة حدوث خطأ
    return getDefaultCategories();
  }
}

// دالة للحصول على الأقسام الافتراضية
function getDefaultCategories() {
  return [
    { id: 'prayer', name: 'أهمية الصلاة' },
    { id: 'fasting', name: 'الصيام' },
    { id: 'charity', name: 'الصدقة' },
    { id: 'hajj', name: 'الحج' }
  ];
}

// تحسين دالة تعديل الخطبة
function updateSermonInSheet(id, title, category, text, audioUrl, username) {
  try {
    // فتح جدول البيانات
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: 'لم يتم العثور على ورقة البيانات' };
    }
    
    // البحث عن الخطبة بواسطة المعرف باستخدام TextFinder للبحث السريع
    const textFinder = sheet.createTextFinder(id.toString());
    const ranges = textFinder.findAll();
    
    if (ranges.length === 0) {
      return { success: false, message: 'لم يتم العثور على الخطبة المطلوبة' };
    }
    
    // الحصول على الصف الأول المطابق (يفترض أن المعرف فريد)
    const range = ranges[0];
    const rowIndex = range.getRow();
    
    // تحديث بيانات الخطبة
    sheet.getRange(rowIndex, 2).setValue(title); // العنوان في العمود الثاني
    sheet.getRange(rowIndex, 3).setValue(text); // النص في العمود الثالث
    sheet.getRange(rowIndex, 4).setValue(category); // التصنيف في العمود الرابع
    sheet.getRange(rowIndex, 5).setValue(audioUrl); // رابط الصوت في العمود الخامس
    sheet.getRange(rowIndex, 6).setValue(username); // اسم المستخدم في العمود السادس
    sheet.getRange(rowIndex, 7).setValue(new Date()); // تاريخ التعديل في العمود السابع
    
    return { success: true, message: 'تم تعديل الخطبة بنجاح', id: id };
  } catch (error) {
    Logger.log('خطأ في تعديل الخطبة: ' + error.message);
    return { success: false, message: 'حدث خطأ أثناء تعديل الخطبة: ' + error.message };
  }
}

// تحسين دالة حذف الخطبة بنفس الطريقة
function deleteSermonFromSheet(id, username) {
  try {
    // فتح جدول البيانات
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: 'لم يتم العثور على ورقة البيانات' };
    }
    
    // البحث عن الخطبة بواسطة المعرف باستخدام TextFinder للبحث السريع
    const textFinder = sheet.createTextFinder(id.toString());
    const ranges = textFinder.findAll();
    
    if (ranges.length === 0) {
      return { success: false, message: 'لم يتم العثور على الخطبة المطلوبة' };
    }
    
    // الحصول على الصف الأول المطابق (يفترض أن المعرف فريد)
    const range = ranges[0];
    const rowIndex = range.getRow();
    
    // حذف الصف
    sheet.deleteRow(rowIndex);
    
    return { success: true, message: 'تم حذف الخطبة بنجاح' };
  } catch (error) {
    Logger.log('خطأ في حذف الخطبة: ' + error.message);
    return { success: false, message: 'حدث خطأ أثناء حذف الخطبة: ' + error.message };
  }
}

// تعديل دالة doGet لدعم تقسيم الصفحات
function doGet(e) {
  // تمكين CORS للسماح بالوصول من أي مصدر
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  // الحصول على نوع الإجراء من المعلمات
  var action = e.parameter.action;
  
  if (action === 'getSermons') {
    // الحصول على معلمات تقسيم الصفحات
    const page = parseInt(e.parameter.page) || 1;
    const limit = parseInt(e.parameter.limit) || 10;
    
    // الحصول على بيانات الخطب مع تقسيم الصفحات
    const result = getSermonData(page, limit);
    output.setContent(JSON.stringify({
      success: true,
      sermons: result.sermons,
      pagination: result.pagination
    }));
  } else if (action === 'getSermon') {
    // الحصول على معرف الخطبة
    const id = e.parameter.id;
    
    if (!id) {
      output.setContent(JSON.stringify({
        success: false,
        message: 'يجب تحديد معرف الخطبة'
      }));
    } else {
      // الحصول على بيانات الخطبة المحددة
      const result = getSermon(id);
      output.setContent(JSON.stringify(result));
    }
  } else if (action === 'getCategories') {
    // استرجاع بيانات الأقسام
    var categories = getCategoryData();
    output.setContent(JSON.stringify({ categories: categories }));
  } else if (action === 'login') {
    // التحقق من بيانات تسجيل الدخول
    var username = e.parameter.username;
    var password = e.parameter.password;
    var loginResult = authenticateUser(username, password);
    output.setContent(JSON.stringify(loginResult));
  } else {
    // إجراء غير معروف
    output.setContent(JSON.stringify({ error: 'إجراء غير معروف' }));
  }
  
  return output;
}

// دالة للصول على خطبة محددة بواسطة المعرف
function getSermon(id) {
  try {
    // فتح جدول البيانات باستخدام المعرف
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return { success: false, message: 'لم يتم العثور على ورقة البيانات المحددة' };
    }
    
    // الحصول على جميع البيانات من الورقة
    const data = sheet.getDataRange().getValues();
    
    // الصف الأول يحتوي على أسماء الأعمدة
    const headers = data[0];
    
    // البحث عن الخطبة بواسطة المعرف
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const sermonId = row[0].toString(); // المعرف في العمود الأول
      
      if (sermonId === id.toString()) {
        const sermon = {};
        
        // تعيين قيم الخطبة بناءً على أسماء الأعمدة
        for (let j = 0; j < headers.length; j++) {
          sermon[headers[j]] = row[j];
        }
        
        return { success: true, sermon: sermon };
      }
    }
    
    // لم يتم العثور على الخطبة
    return { success: false, message: 'الخطبة غير موجودة' };
  } catch (error) {
    Logger.log('خطأ في الحصول على بيانات الخطبة: ' + error.message);
    return { success: false, message: 'حدث خطأ أثناء البحث عن الخطبة: ' + error.message };
  }
}